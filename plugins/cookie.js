const fp = require("fastify-plugin");

module.exports = fp(async function (app, opts) {
  app.register(require("@fastify/cookie"), {
    secret: "cookie-secret-signature-key",
    hook: "onRequest",
  });
});
