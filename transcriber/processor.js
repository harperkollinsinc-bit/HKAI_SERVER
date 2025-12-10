const fs = require("fs");
const { transcribeVideo } = require("./transcribe");
const { segment } = require("./segment");
const { cleanTranscript } = require("../utils");

// --- TEST LINK ---
// const YOUTUBE_URL = "http://www.youtube.com/watch?v=-FOCpMAww28";


// --- FETCH TRANSCRIPT OR FALLBACK TO GEMINI ---
async function getTranscript(yt_url) {
  console.log("🔍 Fetching transcript...");
  try {
    let transcriptPath = await transcribeVideo(yt_url);

    let transcript =  fs.readFileSync(transcriptPath, "utf-8");

    transcript = cleanTranscript(transcript);
    fs.writeFileSync(transcriptPath, transcript);

    return { transcript, transcriptPath };
  } catch (err) {
    console.log(`⚠️ ${err.message}`);
    return;
  }
}

// --- MAIN PIPELINE ---
async function processor(videoId) {
  try {
    const timer = new Date();
    console.log(`🚀 Starting processing for video ${videoId}`);
    const YOUTUBE_URL = `http://www.youtube.com/watch?v=${videoId}`;

    console.log("⏱️ Timer started");

    // 1. Get Transcript

    const { transcript, transcriptPath } = await getTranscript(YOUTUBE_URL);
    console.log(timer.getSeconds().toString() + " seconds elapsed");

    if (!transcript) throw new Error("Failed to get transcript.");

    console.log(timer.getSeconds().toString() + " seconds elapsed");

    return { transcript, transcriptPath };
  } catch (err) {
    console.error("❌ Error:", err.message);
    return { transcript: "", transcriptPath: "" }
  }
}


module.exports = { processor };