const app = require("fastify")({ logger: true });
const path = require("path");

app.register(require("./plugins/cors.js"));

// Register Cookie First
app.register(require("./plugins/cookie.js"));

// Register JWT Second
app.register(require("./plugins/jwt.js"));

// Register public folder
app.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

app.decorate("authenticate", async function (req, reply) {
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// 1. Database Connection (Pooling)
app.register(require("./plugins/postgress.js"));

app.register(require("./plugins/response.js"));

// 2. Register Routes
// We pass the prefix to keep URLs clean, or handle them inside the files
app.register(require("./routes/auth.js"));
app.register(require("./routes/workspaces.js"));
app.register(require("./routes/users.js"));
app.register(require("./routes/courses"));
app.register(require("./routes/videos.js"));
app.register(require("./routes/lessons.js"));
app.register(require("./routes/quizzes.js"));
app.register(require("./routes/messages.js"));

// 3. Global Error Handler
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply
    .status(500)
    .send({ error: "Internal Server Error", message: error.message });
});

// 4. Start Server
const start = async () => {
  try {
    await app.listen({ port: process.env.PORT || 3000, host: "0.0.0.0" });
    console.log(`🚀 Main Server running on port ${process.env.PORT || 3000}`);

    // Start in-memory worker for course generation
    const { startWorker } = require("./utils/inMemoryQueue");
    startWorker(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
