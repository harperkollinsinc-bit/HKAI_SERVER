const { videoQueryPrompt } = require("./prompts");
const { fetchytVideo } = require("./youtube");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory job tracking to prevent duplicate processing
const processingJobs = new Map();

/**
 * Process video fetching in the background for a lesson
 * This prevents blocking the HTTP request with expensive AI/YouTube API calls
 *
 * @param {object} app - Fastify app instance (for database access)
 * @param {number} lessonId - The lesson ID to fetch video for
 * @param {string} courseTitle - Course title for video search
 * @param {string} lessonTitle - Lesson title for video search
 */
async function processVideoFetch(app, lessonId, courseTitle, lessonTitle) {
  const jobKey = `lesson-${lessonId}`;

  // Check if already processing
  if (processingJobs.has(jobKey)) {
    app.log.info(
      { lessonId },
      "Video fetch already in progress, skipping duplicate job"
    );
    return;
  }

  // Mark as processing
  processingJobs.set(jobKey, { startedAt: Date.now(), status: "processing" });

  try {
    app.log.info(
      { lessonId, courseTitle, lessonTitle },
      "Starting background video fetch"
    );

    // Generate video search query using AI
    const videoPrompt = videoQueryPrompt(courseTitle, lessonTitle);
    const videoQuery = await groq.chat.completions.create({
      messages: [{ role: "system", content: videoPrompt }],
      model: "openai/gpt-oss-20b",
      temperature: 0.1,
    });

    const rawVideoQueryText = videoQuery.choices[0]?.message?.content || "";
    const videoQueryText = rawVideoQueryText
      .replace(/```markdown\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    app.log.info({ lessonId, videoQueryText }, "Generated video search query");

    // Fetch video from YouTube
    const video = await fetchytVideo(videoQueryText);

    if (!video) {
      app.log.warn({ lessonId, videoQueryText }, "No video found for query");
      processingJobs.set(jobKey, {
        status: "failed",
        error: "Video not found",
      });
      return;
    }

    app.log.info({ lessonId, videoId: video.id }, "Video fetched successfully");

    // Update database with video information
    const client = await app.pg.connect();
    try {
      await client.query(
        `UPDATE course_lessons 
         SET video_id = $1, 
             video_provider_id = $2, 
             time_start = $3, 
             time_end = $4 
         WHERE id = $5`,
        [
          video.id,
          video.videoProviderId,
          video.startTimeSeconds,
          video.endTimeSeconds,
          lessonId,
        ]
      );

      app.log.info({ lessonId }, "Video information saved to database");
      processingJobs.set(jobKey, {
        status: "completed",
        completedAt: Date.now(),
      });

      // Clean up completed job after 5 minutes
      setTimeout(() => processingJobs.delete(jobKey), 5 * 60 * 1000);
    } finally {
      client.release();
    }
  } catch (error) {
    app.log.error(
      { lessonId, error: error.message },
      "Error processing video fetch"
    );
    processingJobs.set(jobKey, { status: "failed", error: error.message });

    // Clean up failed job after 1 minute to allow retry
    setTimeout(() => processingJobs.delete(jobKey), 60 * 1000);
  }
}

/**
 * Check if a video fetch job is currently processing for a lesson
 *
 * @param {number} lessonId - The lesson ID to check
 * @returns {boolean} True if job is processing
 */
function isProcessing(lessonId) {
  const jobKey = `lesson-${lessonId}`;
  const job = processingJobs.get(jobKey);
  return job && job.status === "processing";
}

/**
 * Get the status of a video fetch job
 *
 * @param {number} lessonId - The lesson ID to check
 * @returns {object|null} Job status or null if no job exists
 */
function getJobStatus(lessonId) {
  const jobKey = `lesson-${lessonId}`;
  return processingJobs.get(jobKey) || null;
}

module.exports = {
  processVideoFetch,
  isProcessing,
  getJobStatus,
};
