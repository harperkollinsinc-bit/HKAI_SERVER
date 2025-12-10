const { quizGenPrompt } = require("../utils/prompts");

module.exports = async function (app, opts) {
  // GET /quizzes/:id
  app.get("/quizzes/:id", {
    onRequest: [app.authenticate]
  }, async (req, reply) => {
    const client = await app.pg.connect();
    try {
      const { rows } = await client.query(
        "SELECT * FROM quizzes WHERE id = $1",
        [req.params.id]
      );
      if (rows.length === 0)
        return reply.code(404).send({ error: "Quiz not found" });
      return rows[0];
    } finally {
      client.release();
    }
  });

  // GET /lessons/:id/quizzes
  app.get("/lessons/:id/quizzes", async (req, reply) => {
    const client = await app.pg.connect();
    try {
      const { rows } = await client.query(
        "SELECT * FROM quizzes WHERE lesson_id = $1",
        [req.params.id]
      );
      return rows;
    } finally {
      client.release();
    }
  });

  // generate save and send quiz
  app.post("/lessons/:id/quizzes", {
    onRequest: [app.authenticate]
  }, async (req, reply) => {
    const lessonId = req.params.id;
    const client = await app.pg.connect();
    try {
      const { rows: quizzes } = await client.query(
        "SELECT id FROM course_quizzes WHERE lesson_id = $1",
        [lessonId]
      );
      if (quizzes.length > 0) return reply.success();

      const { rows } = await client.query(
        "SELECT * FROM course_lessons WHERE lesson_id = $1",
        [lessonId]
      );

      const lesson = rows[0];
      if (!lesson) return reply.code(404).send({ error: "Lesson not found" });

      const quizSystemPrompt = quizGenPrompt(lesson);

      const output = await groq.chat.completions.create({
        messages: [{ role: "system", content: quizSystemPrompt }],
        model: "openai/gpt-oss-20b",
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const rawQuizzes = output.choices[0]?.message?.content || "";

      let jsonData;
      try {
        // Clean up markdown wrapper just in case (e.g. ```json ... ```)
        const cleanedData = skeletonText
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        jsonData = JSON.parse(cleanedData);
      } catch (err) {
        console.error("❌ Invalid skeleton JSON:", rawQuizzes);
        throw new Error("AI returned invalid skeleton JSON: " + err.message);
      }

      const { questions } = jsonData;

      for (const question of questions) {
        const { rows: quiz } = await client.query(
          `INSERT INTO course_quizzes (lesson_id, question, type, options, answer)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING lesson_id, question, type, options`,
          [
            lessonId,
            question.question,
            question.type,
            question.options,
            question.answer,
          ]
        );
      }

      reply.success();
    } finally {
      client.release();
    }
  });
};
