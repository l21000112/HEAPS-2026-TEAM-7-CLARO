const { db, hasFirebaseConfig } = require("../config/firebase");
const { createHttpError, SESSION_TTL_MS } = require("../utils/database");

// In-memory fallback ONLY when Firebase is not configured; when it IS configured, Firestore errors propagate as 503 (no silent fallback).
const memoryStore = new Map();

const DEFAULT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer = null;

async function create(sessionId, sessionData) {
  if (hasFirebaseConfig && db) {
    try {
      await db.collection("sessions").doc(sessionId).set(sessionData);
      return;
    } catch (error) {
      console.error(`Firestore session create failed (${sessionId}):`, error.message);
      throw createHttpError(503, "Session storage temporarily unavailable");
    }
  }

  memoryStore.set(sessionId, sessionData);
}

async function get(sessionId) {
  if (hasFirebaseConfig && db) {
    let doc;
    try {
      doc = await db.collection("sessions").doc(sessionId).get();
    } catch (error) {
      console.error(`Firestore session get failed (${sessionId}):`, error.message);
      throw createHttpError(503, "Session storage temporarily unavailable");
    }
    if (!doc.exists) {
      throw createHttpError(404, "Session not found");
    }
    return doc.data();
  }

  const session = memoryStore.get(sessionId);
  if (!session) {
    throw createHttpError(404, "Session not found");
  }

  session.updatedAtMs = Date.now();
  return session;
}

async function remove(sessionId) {
  if (hasFirebaseConfig && db) {
    try {
      await db.collection("sessions").doc(sessionId).delete();
    } catch (error) {
      console.error(`Firestore session delete failed (${sessionId}):`, error.message);
    }
  }

  memoryStore.delete(sessionId);
}

async function cleanupExpired(ttlMs, now = Date.now()) {
  const cutoff = now - ttlMs;

  for (const [sessionId, session] of memoryStore.entries()) {
    if (session.updatedAtMs < cutoff) {
      memoryStore.delete(sessionId);
    }
  }

  // Firestore: batch-delete in pages of 500 (safety net stops after 10 iterations to avoid infinite loops).
  if (hasFirebaseConfig && db) {
    try {
      const MAX_ITERATIONS = 10;
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const snapshot = await db
          .collection("sessions")
          .where("updatedAtMs", "<", cutoff)
          .limit(500)
          .get();

        if (snapshot.empty) break;

        const batch = db.batch();
        snapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (error) {
      console.error("Firestore session cleanup failed:", error.message);
    }
  }
}

function startCleanupInterval(intervalMs = DEFAULT_CLEANUP_INTERVAL_MS, ttlMs = SESSION_TTL_MS) {
  if (cleanupTimer) return cleanupTimer;
  cleanupTimer = setInterval(() => {
    cleanupExpired(ttlMs).catch((err) =>
      console.error("Session cleanup failed:", err.message)
    );
  }, intervalMs);
  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
  console.log(
    `Session cleanup interval started (every ${intervalMs / 1000}s, TTL=${ttlMs / 1000}s)`
  );
  return cleanupTimer;
}

function stopCleanupInterval() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

module.exports = {
  create,
  get,
  remove,
  cleanupExpired,
  startCleanupInterval,
  stopCleanupInterval,
};
