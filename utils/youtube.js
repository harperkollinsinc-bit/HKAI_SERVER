// services/youtube.js
const axios = require("axios");

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const API_KEY = process.env.YOUTUBE_API_KEY;

async function fetchytVideo(query) {
  try {
    // 1. Fetch a "bunch" of videos (e.g., Top 5 by relevance)
    const searchResponse = await axios.get(YOUTUBE_API_URL, {
      params: {
        part: "snippet",
        q: query,
        type: "video",
        videoEmbeddable: "true",
        maxResults: 5,
        key: API_KEY,
      },
    });

    if (searchResponse.data.items.length === 0) return null;

    // 2. Extract the Video IDs
    const videoIds = searchResponse.data.items
      .map((item) => item.id.videoId)
      .join(",");

    // 3. Fetch details (including contentDetails for duration)
    const statsResponse = await axios.get(YOUTUBE_VIDEOS_URL, {
      params: {
        part: "statistics,snippet,contentDetails",
        id: videoIds,
        key: API_KEY,
      },
    });

    const videosWithStats = statsResponse.data.items;

    // 4. Sort the candidates by highest view count
    const bestVideo = videosWithStats.sort((a, b) => {
      return Number(b.statistics.viewCount) - Number(a.statistics.viewCount);
    })[0];

    if (!bestVideo) return null;

    // 5. Convert ISO8601 YouTube duration into seconds
    const isoDuration = bestVideo.contentDetails.duration;
    const durationSeconds = iso8601ToSeconds(isoDuration);

    // Define the segment (full video by default)
    const startTimeSeconds = 0;
    const endTimeSeconds = durationSeconds;

    return {
      providerId: bestVideo.id,
      title: bestVideo.snippet.title,
      thumbnail: bestVideo.snippet.thumbnails.high.url,
      url: `https://www.youtube.com/watch?v=${bestVideo.id}`,
      videoProviderId: "Youtube",
      id: bestVideo.id,
      views: bestVideo.statistics.viewCount,
      durationSeconds,
      startTimeSeconds,
      endTimeSeconds,
    };
  } catch (error) {
    console.error("YouTube Search Error:", error.message);
    return null;
  }
}

// Helper function: Convert ISO8601 (e.g., PT10M12S) → seconds
function iso8601ToSeconds(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}


module.exports = { fetchytVideo };
