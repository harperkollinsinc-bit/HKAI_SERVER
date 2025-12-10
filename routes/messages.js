const { groq } = require("../utils/model");
const { chatPrompt } = require("../utils/prompts");

module.exports = async function (app, opts) {
  app.get(
    "/workspaces/:id/messages",
    {
      onRequest: [app.authenticate],
    },
    async (req, reply) => {
      if (!req.user) reply.unauthorized();

      const client = await app.pg.connect();
      try {
        const { rows } = await client.query(
          "SELECT * FROM messages WHERE workspace_id = $1 ORDER BY created_at ASC",
          [req.params.id]
        );
        reply.success(rows);
      } finally {
        client.release();
      }
    }
  );

  app.post(
    "/workspaces/:id/messages",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      if (!req.user) reply.unauthorized();

      /** ------------------------------------------------------------------
       * 0. Extract Basic Data
       * ------------------------------------------------------------------*/
      const workspaceId = req.params.id;
      const { content } = req.body;
      const client = await app.pg.connect(); // Kept from your original logic

      try {
        /** ------------------------------------------------------------------
         * 1. Check if Workspace Has Courses
         * ------------------------------------------------------------------*/
        const { rows: userRows } = await client.query(
          "SELECT name FROM hkai_users WHERE id = $1 LIMIT 1",
          [req.user.id]
        );

        const { rows: courseRows } = await client.query(
          "SELECT id FROM courses WHERE workspace_id = $1 LIMIT 1",
          [workspaceId]
        );

        const hasCourse = courseRows.length > 0;

        /** ------------------------------------------------------------------
         * 2. Load Memory Context
         * ------------------------------------------------------------------*/
        const { rows: memoryRows } = await app.pg.query(
          "SELECT key, value FROM memories WHERE workspace_id = $1",
          [workspaceId]
        );

        const memoryContext = memoryRows.length
          ? memoryRows.map((m) => `- ${m.key}: ${m.value}`).join("\n")
          : "No previous memories.";

        /** ------------------------------------------------------------------
         * 3. Fetch Last 10 Chat Messages (Formatted for Groq)
         * ------------------------------------------------------------------*/
        const { rows: historyRows } = await app.pg.query(
          `SELECT role, content 
         FROM messages 
         WHERE workspace_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
          [workspaceId]
        );

        // Groq expects roles: 'user', 'assistant', or 'system'
        const chatHistory = historyRows.reverse().map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        }));

        /** ------------------------------------------------------------------
         * 4. Save User Message to DB
         * ------------------------------------------------------------------*/
        await app.pg.query(
          `INSERT INTO messages (workspace_id, role, content) 
         VALUES ($1, 'user', $2)`,
          [workspaceId, content]
        );

        /** ------------------------------------------------------------------
         * 5. Build System Prompt & Messages Array
         * ------------------------------------------------------------------*/
        const systemPrompt = chatPrompt(
          memoryContext,
          hasCourse,
          userRows[0].name
        );

        // Construct the stateless message array for Groq
        const messages = [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: content }, // The current new message
        ];

        /** ------------------------------------------------------------------
         * 6. Call Groq API
         * ------------------------------------------------------------------*/
        const completion = await groq.chat.completions.create({
          messages: messages,
          model: "llama-3.3-70b-versatile", // Or "openai/gpt-oss-20b, llama-3.3-70b-versatile "
          temperature: 0.2, // Low temp for reliable JSON structure
          response_format: { type: "json_object" }, // Enforce JSON mode
        }); 

        const aiRawText = completion.choices[0]?.message?.content || "";

        /** ------------------------------------------------------------------
         * 7. Attempt JSON Parse, fallback if needed
         * ------------------------------------------------------------------*/
        let aiData;

        try {
          // Even with JSON mode, models sometimes wrap in markdown (```json ... ```)
          // We clean that just in case.
          const cleaned = aiRawText
            .replace(/^```json\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();

          aiData = JSON.parse(cleaned);
        } catch (err) {
          app.log.error("AI JSON Parse Failed:", err);
          app.log.error("Raw Response:", aiRawText);

          aiData = {
            response: aiRawText, // Fallback to raw text
            new_memories: [],
            trigger_generation: false,
            off_topic: false,
          };
        }  

        /** ------------------------------------------------------------------
         * 8. Upsert Any New Memories
         * ------------------------------------------------------------------*/
        if (!aiData.off_topic && Array.isArray(aiData.new_memories)) {
          for (const mem of aiData.new_memories) {
            if (mem.key && mem.value) {
              await app.pg.query(
                `INSERT INTO memories (workspace_id, key, value)
               VALUES ($1, $2, $3)
               ON CONFLICT (workspace_id, key)
               DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                [workspaceId, mem.key, mem.value]
              );
            }
          }
        }

        /** ------------------------------------------------------------------
         * 9. Save Assistant Response
         * ------------------------------------------------------------------*/
        const { rows: savedAiRows } = await app.pg.query(
          `INSERT INTO messages (workspace_id, role, content)
         VALUES ($1, 'assistant', $2)
         RETURNING *`,
          [workspaceId, aiData.response]
        );

        /** ------------------------------------------------------------------
         * 10. Final Response
         * ------------------------------------------------------------------*/
        reply.success({
          message: savedAiRows[0],
          trigger_generation: aiData.trigger_generation || false,
          off_topic: aiData.off_topic || false,
        });
      } finally {
        // Best practice: release the client if you manually connected in step 0
        client.release();
      }
    }
  );
};