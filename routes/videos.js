module.exports = async function (fastify, opts) {
  // GET /videos/:id
  fastify.get("/videos/:id", async (req, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        "SELECT * FROM videos WHERE id = $1",
        [req.params.id]
      );
      if (rows.length === 0)
        return reply.code(404).send({ error: "Video not found" });
      return rows[0];
    } finally {
      client.release();
    }
  });

  // GET /courses/:id/videos - Get videos for a course
  fastify.get("/courses/:id/videos", async (req, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        "SELECT * FROM videos WHERE course_id = $1",
        [req.params.id]
      );
      return rows;
    } finally {
      client.release();
    }
  });

  // POST /videos
  fastify.post("/videos", async (req, reply) => {
    const {
      course_id,
      video_title,
      video_url,
      video_thumbnail,
      duration_seconds,
    } = req.body;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        "INSERT INTO videos (course_id, video_title, video_url, video_thumbnail, duration_seconds) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [course_id, video_title, video_url, video_thumbnail, duration_seconds]
      );
      reply.code(201).send(rows[0]);
    } finally {
      client.release();
    }
  });
};
