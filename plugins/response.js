const fp = require('fastify-plugin');;

module.exports = fp(async function (fastify, opts) {

  // --- SUCCESS RESPONSES ---

  // 200 OK
  fastify.decorateReply('success', function (data = null, message = 'Success') {
    this.status(200).send({
      success: true,
      message,
      data
    });
  });

  // 201 Created
  fastify.decorateReply('created', function (data = null, message = 'Resource created') {
    this.status(201).send({
      success: true,
      message,
      data
    });
  });

  // --- ERROR RESPONSES ---

  // 400 Bad Request (Validation Errors)
  fastify.decorateReply('badRequest', function (message = 'Bad Request', errors = null) {
    this.status(400).send({
      success: false,
      message,
      errors
    });
  });

  // 401 Unauthorized (Not Logged In)
  fastify.decorateReply('unauthorized', function (message = 'Unauthorized') {
    this.status(401).send({
      success: false,
      message
    });
  });

  // 403 Forbidden (Logged in, but wrong role)
  fastify.decorateReply('forbidden', function (message = 'Forbidden') {
    this.status(403).send({
      success: false,
      message
    });
  });

  // 404 Not Found
  fastify.decorateReply('notFound', function (message = 'Resource not found') {
    this.status(404).send({
      success: false,
      message
    });
  });

  // 409 Conflict (Duplicate Email, etc.)
  fastify.decorateReply('conflict', function (message = 'Conflict') {
    this.status(409).send({
      success: false,
      message
    });
  });

  // 500 Server Error
  fastify.decorateReply('serverError', function (error) {
    fastify.log.error(error); // Always log the real error system-side
    this.status(500).send({
      success: false,
      message: 'Internal Server Error'
    });
  });
});