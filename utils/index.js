function cleanTranscript(rawData) {
  if (!rawData) return "";

  const lines = rawData.split('\n');
  const output = [];
  
  let lastText = "";
  let lastSavedTimeSeconds = -1;
  const TIME_INTERVAL = 180; // Keep a timestamp every 3 minutes

  // Helper: "00:00:05.000" -> 5
  const parseSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    
    const h = parts.length === 3 ? parseInt(parts[0]) : 0;
    const m = parts.length === 3 ? parseInt(parts[1]) : parseInt(parts[0]);
    const s = parseFloat(parts.length === 3 ? parts[2] : parts[1]);
    
    return (h * 3600) + (m * 60) + s;
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line || line.startsWith('WEBVTT') || line.startsWith('Kind:') || line.startsWith('Language:') || line.startsWith('NOTE')) {
      continue;
    }

    // Handle Timestamps
    if (line.includes('-->')) {
      const startTimeStr = line.split(' --> ')[0].trim(); // "10:59:39.470"
      const currentSeconds = parseSeconds(startTimeStr);

      if (currentSeconds - lastSavedTimeSeconds >= TIME_INTERVAL) {
        // CHANGED: Use ">" instead of "[ ]" to save tokens
        // Example output: ">10:59:39"
        const timeShort = startTimeStr.split('.')[0]; 
        output.push(`\n>${timeShort}`);
        lastSavedTimeSeconds = currentSeconds;
      }
      continue;
    }

    // Clean Text & Remove Tags
    let cleanText = line.replace(/<[^>]+>/g, '').trim();
    cleanText = cleanText.replace(/align:.*?%/g, '').trim();

    if (!cleanText) continue;

    // Deduplication (Roll-up fix)
    if (lastText.includes(cleanText)) continue;
    if (cleanText.includes(lastText) && lastText.length > 0) {
      output.pop(); 
    }

    output.push(cleanText);
    lastText = cleanText;
  }

  return output.join(' ');
}

module.exports = { cleanTranscript };