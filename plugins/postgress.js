const fp = require("fastify-plugin");
const path = require("node:path");
const fs = require('fs');

const schemaPath = path.join(__dirname, "..", "model", "newSchema.sql")

module.exports = fp(async function (app, opts) {
  await app.register(require("@fastify/postgres"), {
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "test123/",
    host: "127.0.0.1",
    port: 5432,
    database: "hkai_db",
  });

  app.ready(async (err) => {
    if (err) return app.log.error(err);

    // run the schema scripts
    try {
      app.log.info("🔄 Syncing Database Schema...");
      const sqlQuery = fs.readFileSync(schemaPath, "utf8")
      await app.pg.query(sqlQuery);
      app.log.info("✅ Database Schema Synced!");
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  });
});
