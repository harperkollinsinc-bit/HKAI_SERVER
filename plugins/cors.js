const fp = require("fastify-plugin");

module.exports = fp(async function (app, opts) {
  app.register(require("@fastify/cors"), {
    origin: ["http://localhost:8080", "http://127.0.0.1:8080", "http://192.168.23.176:8080"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
});
