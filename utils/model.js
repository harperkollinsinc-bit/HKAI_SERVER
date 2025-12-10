const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const Groq = require("groq-sdk");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY2, {
  model: "gemini-2.5-flash",
});

// const genAI2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY2, {
//   model: "gemini-2.0-flash",
// });

// const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
// const model2 = genAI2.getGenerativeModel({ model: "gemini-2.0-flash" });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // This is the default and can be omitted
});

// llama-3.1-70b
// llama-3.3-70b-versatile
// openai/gpt-oss-20b
// gpt-oss-20b
// llama-3.1-8b-instant
// Note: We REMOVE response_format: { type: "json_object" } here
// because we want raw markdown text.

module.exports = { model, groq };
