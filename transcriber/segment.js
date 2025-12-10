const { gemini } = require("./gemini");

// --- SEGMENT TRANSCRIPT (Enhanced with Headlines + Timestamps) ---
async function segment(transcript) {
  console.log(
    "✂️ Sending transcript to Gemini 2.0 Flash for smart segmentation..."
  );

  const prompt = `
You are an AI course builder.

Using ONLY the transcript below, generate a structured course object.  
Do NOT invent content that is not present in the transcript.  
If something important is missing, include it in "missingCoverage".

Return ONLY a JSON object in this exact structure:

{
  "moduleTitle": "",
  "category" : "",
  "course": {
    "title": "",
    "description": "",
    "level": "",
    "estimatedCompletionTime": "",
    "videos": [
      {
        "videoId": "",    // leave empty
        "videoUrl": "",   // leave empty
        "transcriptProvided": true
      }
    ],
    "lessons": [
      {
        "title": "",
        "videoTimestamp": [start, end],
        "keyConcepts": [],
        "quizzes": [
          {
            "question": "",
            "options": [],
            "answer": ""
          }
        ]
      }
    ],
    "glossary": {},
    "missingCoverage": [],
    "practiceQuestions": []
  }
}

Rules:
- Use only the provided transcript.  
- Ensure timestamps follow the actual flow of the transcript.  
- Keep language simple and educational.  
- If a concept appears but isn’t explained, include it in “missingCoverage”.  
- Do NOT add videoId or videoUrl values.  
- Lessons should follow the natural structure of the transcript.  
- Every lesson must include at least 1 quiz question.  
- Do NOT output anything outside the JSON object.

Here is the transcript to analyze:
---
${transcript.substring(0, 8000)}
---
  `;

  const result = await gemini(prompt)
  let text = result.response.text();

  // Handle Gemini’s markdown formatting if present
  if (text.startsWith("```json")) {
    text = text.replace(/^```json|```$/g, "").trim();
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("⚠️ Gemini returned malformed JSON. Attempting cleanup...");
    const fixed = text
      .replace(/[\u0000-\u001F]+/g, "")
      .replace(/,\s*]/g, "]")
      .replace(/,\s*}/g, "}");
    return JSON.parse(fixed);
  }
}

module.exports = { segment }