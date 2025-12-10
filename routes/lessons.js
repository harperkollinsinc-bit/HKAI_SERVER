const { processVideoFetch, isProcessing } = require("../utils/videoJobs");

module.exports = async function (app, opts) {
  /**
   * GET lesson video information
   *
   * OPTIMIZATIONS:
   * 1. Single JOIN query instead of two separate queries
   * 2. Background job processing for expensive AI/YouTube calls
   * 3. Race condition prevention with job deduplication
   * 4. Immediate response (no blocking on external APIs)
   *
   * RESPONSE CODES:
   * - 200: Video cached and returned immediately
   * - 202: Video not cached, processing in background (client should retry)
   * - 404: Lesson not found
   * - 500: Server error
   */
  app.get(
    "/lessons/:id/video",
    {
      onRequest: [app.authenticate],
    },
    async (req, reply) => {
      if (!req.user) return reply.unauthorized();

      const client = await app.pg.connect();
      try {
        // OPTIMIZATION: Single JOIN query instead of two separate queries
        // Only select columns we need instead of SELECT *
        const { rows } = await client.query(
          `SELECT 
            cl.id,
            cl.video_id,
            cl.video_provider_id,
            cl.time_start,
            cl.time_end,
            c.title as course_title,
            cl.title as lesson_title
           FROM course_lessons cl
           JOIN courses c ON c.id = cl.course_id
           WHERE cl.id = $1`,
          [req.params.id]
        );

        if (rows.length === 0) {
          return reply.notFound("Lesson not found");
        }

        const lesson = rows[0];

        // If video is already cached, return immediately
        if (lesson.video_id) {
          return reply.success({
            video_id: lesson.video_id,
            video_provider_id: lesson.video_provider_id,
            time_start: lesson.time_start,
            time_end: lesson.time_end,
          });
        }

        // OPTIMIZATION: Process video fetch in background instead of blocking
        // Check if already processing to prevent race conditions
        if (!isProcessing(lesson.id)) {
          // Trigger background job (non-blocking)
          processVideoFetch(
            app,
            lesson.id,
            lesson.course_title,
            lesson.lesson_title
          ).catch((err) => {
            // Log error but don't crash - job will handle its own errors
            app.log.error(
              { lessonId: lesson.id, error: err.message },
              "Background job error"
            );
          });
        }

        // Return 202 Accepted - client should poll/retry
        return reply.code(202).send({
          status: "processing",
          message: "Video is being fetched. Please retry in a few seconds.",
          lesson_id: lesson.id,
        });
      } catch (error) {
        app.log.error(
          { error: error.message, lessonId: req.params.id },
          "Error fetching lesson video"
        );
        return reply.serverError(error.message);
      } finally {
        client.release();
      }
    }
  );
};
