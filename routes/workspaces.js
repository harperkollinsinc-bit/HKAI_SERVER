module.exports = async function (app, opts) {
  // GET /workspaces - List all workspaces (Global)
  app.get("/workspaces", {
    onRequest: [app.authenticate]
  }, async (req, reply) => {
    if (!req.user || req.user.role !== 'admin') return reply.unauthorized();
    const client = await app.pg.connect();
    try {
      const { rows } = await client.query("SELECT * FROM workspaces");
      reply.success(rows);
    } finally {
      client.release();
    }
  });

  // GET /workspaces/:id - Get single module details
  app.get("/workspace/:id", {
    onRequest: [app.authenticate]
  }, async (req, reply) => {

    if (!req.user) return reply.unauthorized();

    const client = await app.pg.connect();
    try {
      const { rows } = await client.query(
        "SELECT * FROM workspaces WHERE id = $1",
        [req.params.id]
      );
      reply.success(rows[0]);
    } finally {
      client.release();
    }
  });
 
  // GET /users/:id/workspaces - Get all workspaces for a specific user
  app.get("/users/workspaces", {
    onRequest: [app.authenticate]
  }, async (req, reply) => {
    if (!req.user) return reply.unauthorized();

    const client = await app.pg.connect();
    try {
      const { rows } = await client.query(
        "SELECT * FROM workspaces WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user.id]
      );
      reply.success(rows);
    } finally {
      client.release();
    }
  });

  app.delete("/workspace/:id", {
    onRequest: [app.authenticate]
  }, async (req, reply) => {
    if (!req.user) return reply.unauthorized();
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const { rows } = await app.pg.query(
        `DELETE FROM workspaces WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );

      return reply.success(rows[0], "Workspace deleted");
    } catch (err) {
      app.log.error(err);
      return reply.serverError(err);
    }
  });

  app.put("/workspace/:id", {
    onRequest: [app.authenticate]
  }, async (req, reply) => {
    if (!req.user) return reply.unauthorized();
    const { id } = req.params;
    const userId = req.user.id;
    const { title } = req.body;

    try {
      const { rows } = await app.pg.query(
        `UPDATE workspaces SET title = $2 WHERE id = $1 AND user_id = $3 RETURNING *`,
        [id, title, userId]
      );

      return reply.success(rows[0], "Workspace updated");
    } catch (err) {
      app.log.error(err);
      return reply.serverError(err);
    }
  });

  // POST /workspaces - Start a blank session
  app.post("/workspace", {
    onRequest: [app.authenticate]
  }, async (req, reply) => {
    if (!req.user) return reply.unauthorized();
    const { title } = req.body;
    const userId = req.user.id;

    try {
      const { rows } = await app.pg.query(
        `INSERT INTO workspaces (user_id, title) 
         VALUES ($1, $2) 
         RETURNING *`,
        [userId, title || 'New Course Project']
      );

      return reply.created(rows[0], "Workspace started");

    } catch (err) {
      app.log.error(err);
      return reply.serverError(err);
    }
  });
};
