const util = require("node:util");
const child_process = require("node:child_process");
const exec = util.promisify(child_process.exec);
const fs = require("fs");
const path = require("path");
const { gemini } = require("./gemini");

const TEMP_FOLDER = path.join(__dirname, "temp");

function checkFolder(folderPath){
  if(!fs.existsSync(folderPath)){
    fs.mkdirSync(folderPath);
  }
}

checkFolder(TEMP_FOLDER)

const transcribeVideo = async (videoUrl) => {
  checkFolder(`${TEMP_FOLDER}/transcript`);
  const tempPath = `${TEMP_FOLDER}/transcript/${Date.now()}`;
  let { stdout, stderr } = await exec(
    `yt-dlp --write-auto-sub --sub-lang "en" --skip-download --output "${tempPath}" "${videoUrl}"`
  );

  fs.appendFileSync(
    "./.logs",
    `\n[TRANSCRIBE MESSAGE] {\n ${stdout} ${stderr}}`
  );

  if (fs.existsSync(tempPath + ".en.vtt")) return tempPath + ".en.vtt";


  return await transcribeAudioWithGemini(
    videoUrl,
    tempPath + ".en.vtt"
  );;
};

// --- DOWNLOAD AUDIO ---
async function downloadAudio(yt_url) {
  checkFolder(`${TEMP_FOLDER}/audio`);
  console.log("🎧 Downloading audio stream with yt-dlp...");
  // console.log(`📂 Saving temp file to: ${TEMP_AUDIO_FILE}`);
  const tempFileUrl = `${TEMP_FOLDER}/audio/${Date.now()}.m4a`;

  if (fs.existsSync(tempFileUrl)) fs.rmSync(tempFileUrl);

  const command = `yt-dlp \
  -x \
  --audio-format m4a \
  -o "${tempFileUrl}" \
  --extractor-args "youtube:player_client=default" \
  --no-playlist \
  "${yt_url}"`;

  try {
    const { stdout, stderr } = await exec(command);
    return stdout ? tempFileUrl : null;
  } catch (err) {
    throw new Error("yt-dlp failed to download audio. " + err.message);
  }
}

// --- TRANSCRIBE AUDIO WITH GEMINI 2.0 FLASH ---
async function transcribeAudioWithGemini(yt_url, transcriptPath) {
  console.log("🧠 Sending audio to Gemini 2.0 Flash for transcription...");

  const tempAudio = await downloadAudio(yt_url);

  const audioBytes = fs.readFileSync(tempAudio).toString("base64");

  console.log("🎙️ Falling back to Gemini 2.0 Flash audio transcription...");
  const result = await gemini([
    {
      inlineData: {
        mimeType: "audio/m4a",
        data: audioBytes,
      },
    },
    {
      text: "Transcribe this audio accurately. Respond only with the full plain text transcript.",
    },
  ]);

  const transcript = result.response.text()?.trim();

  fs.writeFileSync(transcriptPath, transcript);

  fs.rmSync(tempAudio);

  console.log("✅ Transcription complete!");
  return transcriptPath;
}

module.exports = { transcribeVideo, transcribeAudioWithGemini, downloadAudio };
