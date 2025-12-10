const fp = require("fastify-plugin");

module.exports = fp(async function (app, opts) {
  app.register(require("@fastify/jwt"), {
    secret: process.env.JWT_SECRET,
    cookie: {
      cookieName: "hkai_access_token",
      signed: false,
    },
  });
});
