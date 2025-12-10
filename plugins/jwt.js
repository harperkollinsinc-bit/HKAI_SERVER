const fp = require("fastify-plugin");

module.exports = fp(async function (app, opts) {
  app.register(require("@fastify/jwt"), {
    secret: "j9jr-9ctmj-9splrpck-2vvjmin3ijidj3ij0c-uv6",
    cookie: {
      cookieName: "hkai_access_token",
      signed: false,
    },
  });
});
