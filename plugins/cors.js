const fp = require("fastify-plugin");

module.exports = fp(async function (app, opts) {
  app.register(require("@fastify/cors"), {
    origin: ["https://hkai-web.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // required for cookies
  });
});

// "http://127.0.0.1:8080", "http://192.168.23.176:8080", 
