module.exports = async function (app, opts) {

  app.get("/team", async (req, reply) => {
    try {
      const team = require("../utils/team.json");
      reply.send(team);
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  })
};
