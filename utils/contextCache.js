/**
 * Context caching utility using in-memory Map
 * Caches expensive database queries for memories and chat history
 */

const CACHE_TTL = 300000; // 5 minutes in milliseconds

// In-memory cache storage
const cache = new Map();

/**
 * Get cached context (memories + chat history) for a workspace
 * @param {object} pgClient - PostgreSQL client
 * @param {number} workspaceId - Workspace ID
 * @returns {Promise<{memoryContext: string, chatContext: string}>}
 */
async function getCachedContext(pgClient, workspaceId) {
  const cacheKey = `context:${workspaceId}`;

  // Try to get from cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Cache miss or expired - fetch from database
  const { rows: memories } = await pgClient.query(
    "SELECT key, value FROM memories WHERE workspace_id=$1",
    [workspaceId]
  );
  const memoryContext =
    memories.map((m) => `${m.key}: ${m.value}`).join(", ") || "None";

  const { rows: chat } = await pgClient.query(
    "SELECT role, content FROM messages WHERE workspace_id=$1 ORDER BY created_at ASC LIMIT 20",
    [workspaceId]
  );

  const chatContext =
    chat.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n") ||
    "No chat history";

  const context = { memoryContext, chatContext };

  // Store in cache with timestamp
  cache.set(cacheKey, {
    data: context,
    timestamp: Date.now(),
  });

  return context;
}

/**
 * Invalidate context cache for a workspace
 * Call this when memories or messages are updated
 * @param {number} workspaceId - Workspace ID
 */
function invalidateContextCache(workspaceId) {
  const cacheKey = `context:${workspaceId}`;
  cache.delete(cacheKey);
}

/**
 * Clean up expired cache entries
 * Call this periodically to prevent memory leaks
 */
function cleanupExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Clean up expired entries every 5 minutes
setInterval(cleanupExpiredCache, 5 * 60 * 1000);

module.exports = {
  getCachedContext,
  invalidateContextCache,
};
