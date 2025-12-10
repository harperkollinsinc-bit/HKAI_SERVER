const { model, model2, groq } = require("../utils/model");
const {
  courseGenPrompt,
  ytVideoQuery,
  lessonGenPrompt,
  courseSkeleton,
} = require("../utils/prompts");
const { processor } = require("../transcriber/processor");
const { fetchytVideo } = require("../utils/youtube");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

module.exports = async function (app, opts) {
  // GET /courses - List all
  app.get(
    "/courses",
    {
      onRequest: [app.authenticate],
    },
    async (req, reply) => {
      if (!req.user || req.user.role !== "admin") reply.unauthorized();
      const client = await app.pg.connect();
      try {
        const { rows } = await client.query("SELECT * FROM courses");
        return rows;
      } finally {
        client.release();
      }
    }
  );

  // GET /workspace/:id/course - Get the course associated with a workspace
  app.get(
    "/workspace/:id/course",
    {
      onRequest: [app.authenticate],
    },
    async (req, reply) => {
      if (!req.user) reply.unauthorized();

      const workspaceId = req.params.id;
      const { getJobStatus } = require("../utils/inMemoryQueue");

      // Check if there's an ongoing job for this workspace
      const job = getJobStatus(String(workspaceId));
      if (job && (job.status === "queued" || job.status === "processing")) {
        // Course is being generated, return job status
        return reply.success({
          generating: true,
          jobStatus: job,
        });
      }

      // No ongoing job, fetch course from database
      const client = await app.pg.connect();
      try {
        const { rows } = await client.query(
          "SELECT * FROM courses WHERE workspace_id = $1",
          [workspaceId]
        );

        const course = rows[0];

        if (!course) {
          // Check if there was a failed job
          if (job && job.status === "failed") {
            return reply.success({
              generating: false,
              error: job.error,
              jobStatus: job,
            });
          }
          return reply.notFound();
        }

        // fetch lessons
        const { rows: lessons } = await client.query(
          "SELECT * FROM course_lessons WHERE course_id = $1",
          [course.id]
        );

        course.lessons = lessons.length > 0 ? lessons : [];

        reply.success(course);
      } finally {
        client.release();
      }
    }
  );

  // POST /workspace/:id/course - Enqueue course generation job
  app.post(
    "/workspace/:id/course",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      if (!req.user) reply.unauthorized();

      const workspaceId = req.params.id;
      const { enqueueCourseJob } = require("../utils/inMemoryQueue");

      try {
        // Enqueue the job instead of processing synchronously
        const jobId = enqueueCourseJob(workspaceId, req.user.id);

        return reply.success(
          {
            jobId,
            status: "queued",
            statusUrl: `/workspace/${workspaceId}/course/job/${jobId}`,
          },
          "Course generation job queued successfully"
        );
      } catch (err) {
        app.log.error(err);
        return reply.code(500).send({ error: err.message });
      }
    }
  );

  // GET /workspace/:id/course/job/:jobId - Get job status
  app.get(
    "/workspace/:id/course/job/:jobId",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      if (!req.user) reply.unauthorized();

      const { jobId } = req.params;
      const { getJobStatus } = require("../utils/inMemoryQueue");

      try {
        const job = getJobStatus(jobId);

        if (!job) {
          return reply.notFound("Job not found");
        }

        return reply.success(job);
      } catch (err) {
        app.log.error(err);
        return reply.code(500).send({ error: err.message });
      }
    }
  );
  
};