/**
 * In-Memory Job Queue for Course Generation
 * No external dependencies - uses JavaScript Map for storage
 */

const { randomUUID } = require("crypto");
const { getCachedContext } = require("./contextCache");
const { courseSkeleton, lessonGenPrompt } = require("./prompts");
const { fetchytVideo } = require("./youtube");
const { groq } = require("./model");

// In-memory storage
const jobs = new Map();
const jobQueue = [];
let isProcessing = false;

/**
 * Enqueue a course generation job
 * Uses workspaceId as jobId to ensure one job per workspace
 * @param {number} workspaceId - Workspace ID (also used as job ID)
 * @param {number} userId - User ID who requested the course
 * @returns {string} Job ID (same as workspaceId)
 */
function enqueueCourseJob(workspaceId, userId) {
  const jobId = String(workspaceId); // Use workspace ID as job ID

  // Check if job already exists for this workspace
  const existingJob = jobs.get(jobId);
  if (
    existingJob &&
    (existingJob.status === "queued" || existingJob.status === "processing")
  ) {
    // Job already in progress, return existing job ID
    return jobId;
  }

  const job = {
    id: jobId,
    workspaceId,
    userId,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
  };

  jobs.set(jobId, job);
  jobQueue.push(jobId);

  return jobId;
}

/**
 * Get job status and data
 * @param {string} jobId - Job ID
 * @returns {object|null} Job data or null if not found
 */
function getJobStatus(jobId) {
  return jobs.get(jobId) || null;
}

/**
 * Update job progress
 * @param {string} jobId - Job ID
 * @param {string} status - Job status (queued, processing, completed, failed)
 * @param {number} progress - Progress percentage (0-100)
 * @param {object} additionalData - Additional data to merge into job
 */
function updateJobProgress(jobId, status, progress, additionalData = {}) {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const updatedJob = {
    ...job,
    status,
    progress,
    ...additionalData,
    updatedAt: Date.now(),
  };

  jobs.set(jobId, updatedJob);
}

/**
 * Process a single job
 * @param {object} app - Fastify app instance
 * @param {string} jobId - Job ID to process
 */
async function processJob(app, jobId) {
  const { pg, log } = app;

  try {
    log.info({ jobId }, "Processing course generation job");

    updateJobProgress(jobId, "processing", 5, {
      currentStep: "Gathering context",
    });

    const job = getJobStatus(jobId);
    if (!job) {
      log.error({ jobId }, "Job not found");
      return;
    }

    const { workspaceId } = job;
    const client = await pg.connect();

    try {
      await client.query("BEGIN");

      // STEP 1: Gather context (with caching)
      const { memoryContext, chatContext } = await getCachedContext(
        client,
        workspaceId
      );

      updateJobProgress(jobId, "processing", 15, {
        currentStep: "Generating course skeleton",
      });

      // STEP 2: Generate course skeleton
      const skeletonSystemPrompt = courseSkeleton(memoryContext, chatContext);
      const skeletonCompletion = await groq.chat.completions.create({
        messages: [{ role: "system", content: skeletonSystemPrompt }],
        model: "openai/gpt-oss-20b",
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const skeletonText =
        skeletonCompletion.choices[0]?.message?.content || "";
      let skeletonData;

      try {
        const cleanedSkeleton = skeletonText
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        skeletonData = JSON.parse(cleanedSkeleton);
      } catch (err) {
        log.error({ jobId, skeletonText }, "Invalid skeleton JSON");
        throw new Error("AI returned invalid skeleton JSON: " + err.message);
      }

      updateJobProgress(jobId, "processing", 25, {
        currentStep: "Creating course in database",
      });

      // STEP 3: Insert course into DB
      const { rows: courseRows } = await client.query(
        `INSERT INTO courses (workspace_id, title, description, difficulty, estimated_time, video_url, video_provider_id)
         VALUES ($1,$2,$3,$4,$5,NULL,NULL)
         RETURNING *`,
        [
          workspaceId,
          skeletonData.course.title,
          skeletonData.course.description,
          skeletonData.course.difficulty,
          skeletonData.course.estimated_time,
        ]
      );

      const course = { ...courseRows[0], lessons: [] };
      const courseId = course.id;

      // STEP 4: Generate lessons
      const totalLessons = skeletonData.lessons.length;
      let currentTimeOffset = 0;

      for (let i = 0; i < totalLessons; i++) {
        const lesson = skeletonData.lessons[i];
        const lessonProgress = 25 + Math.floor((i / totalLessons) * 70);

        updateJobProgress(jobId, "processing", lessonProgress, {
          currentStep: `Generating lesson ${i + 1}/${totalLessons}: ${
            lesson.title
          }`,
          lessonsCompleted: i,
          totalLessons,
        });

        // Generate lesson content
        const lessonSystemPrompt = lessonGenPrompt(
          skeletonData,
          memoryContext,
          chatContext,
          lesson
        );

        const lessonCompletion = await groq.chat.completions.create({
          messages: [{ role: "system", content: lessonSystemPrompt }],
          model: "openai/gpt-oss-20b",
          temperature: 0.3,
        });

        const rawText = lessonCompletion.choices[0]?.message?.content || "";

        let finalContent = rawText
          .replace(/^```(markdown)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();

        // Sanity check for JSON
        if (finalContent.trim().startsWith('{"content":')) {
          try {
            const parsed = JSON.parse(finalContent);
            if (parsed.content) finalContent = parsed.content;
          } catch (e) {
            // Ignore, use as is
          }
        }

        // Fetch video from YouTube
        let video = await fetchytVideo(
          `${lesson.title} in ${skeletonData.course.title}`
        );

        const duration = 600;
        const start = currentTimeOffset;
        const end = currentTimeOffset + duration;
        currentTimeOffset += duration;

        // Insert lesson
        const { rows: lessonRow } = await client.query(
          `INSERT INTO course_lessons (course_id, title, time_start, time_end, objectives, content, video_id, video_provider_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING *`,
          [
            courseId,
            lesson.title,
            start,
            end,
            Array.isArray(lesson.objectives)
              ? lesson.objectives
              : [lesson.objectives],
            finalContent,
            video?.id || null,
            video?.videoProviderId || null,
          ]
        );

        course.lessons.push(lessonRow[0]);
      }

      await client.query("COMMIT");

      // Mark job as completed
      updateJobProgress(jobId, "completed", 100, {
        currentStep: "Course generation completed",
        course,
        completedAt: Date.now(),
      });

      log.info({ jobId, courseId }, "Course generation completed successfully");
    } catch (err) {
      await client.query("ROLLBACK");
      log.error({ jobId, err }, "Error processing course generation job");

      updateJobProgress(jobId, "failed", 0, {
        error: err.message,
        failedAt: Date.now(),
      });
    } finally {
      client.release();
    }
  } catch (err) {
    log.error({ jobId, err }, "Fatal error processing job");
    updateJobProgress(jobId, "failed", 0, {
      error: err.message,
      failedAt: Date.now(),
    });
  }
}

/**
 * Start the background worker
 * Processes jobs from the queue continuously
 * @param {object} app - Fastify app instance
 */
async function startWorker(app) {
  app.log.info("In-memory course generation worker started");

  // Process queue continuously
  const processQueue = async () => {
    if (isProcessing || jobQueue.length === 0) {
      return;
    }

    isProcessing = true;
    const jobId = jobQueue.shift();

    if (jobId) {
      await processJob(app, jobId);
    }

    isProcessing = false;

    // Continue processing if there are more jobs
    if (jobQueue.length > 0) {
      setImmediate(processQueue);
    }
  };

  // Check queue every 2 seconds
  setInterval(() => {
    if (!isProcessing && jobQueue.length > 0) {
      processQueue();
    }
  }, 2000);

  // Start processing immediately if there are jobs
  if (jobQueue.length > 0) {
    processQueue();
  }
}

/**
 * Clean up old completed/failed jobs
 * Call this periodically to prevent memory leaks
 */
function cleanupOldJobs() {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();

  for (const [jobId, job] of jobs.entries()) {
    const isOld = now - job.createdAt > ONE_HOUR;
    const isFinished = job.status === "completed" || job.status === "failed";

    if (isOld && isFinished) {
      jobs.delete(jobId);
    }
  }
}

// Clean up old jobs every 10 minutes
setInterval(cleanupOldJobs, 10 * 60 * 1000);

module.exports = {
  enqueueCourseJob,
  getJobStatus,
  updateJobProgress,
  startWorker,
};
