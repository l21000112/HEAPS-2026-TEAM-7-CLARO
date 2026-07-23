const crypto = require("crypto");
const { db, hasFirebaseConfig } = require("../config/firebase");
const { sanitizeAssignmentMetadata } = require("./classroomAssignments");
const {
  sanitizePersistedText,
  MAX_REASON_CHARS,
  MAX_ACTION_TAKEN_CHARS,
} = require("../utils/database");

function sessionAttemptDocId(input) {
  if (!input.sessionId) {
    return null;
  }

  // Use client anonymousId so session attempts share the same deterministic doc ID as the attempts API.
  const ownerKey = input.ownerUid || input.anonymousId || "anonymous";
  const key = [
    ownerKey,
    input.scenarioType || "unknown",
    String(input.sessionId),
  ].join(":");
  const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 40);
  return `session_attempt_${hash}`;
}

async function logAttempt(input) {
  if (!hasFirebaseConfig || !db) {
    return;
  }

  try {
    const now = new Date().toISOString();
    const ownerEmail = input.ownerEmail != null ? input.ownerEmail : null;
    // Use client anonymousId (not "server-session") to match the attempts API owner key.
    const owner = input.ownerUid
      ? { uid: input.ownerUid, email: ownerEmail, anonymousId: null }
      : { uid: null, email: ownerEmail, anonymousId: input.anonymousId || "server-session" };

    const doc = {
      owner,
      scenarioType: input.scenarioType,
      scenarioId: String(input.scenarioId),
      sessionId: input.sessionId || null,
      selectedOptionId: input.selectedOptionId != null
        ? String(input.selectedOptionId)
        : null,
      isCorrect: input.isCorrect,
      reason: sanitizePersistedText(input.reason, { maxLength: MAX_REASON_CHARS }),
      actionTaken: input.actionTaken != null
        ? sanitizePersistedText(input.actionTaken, { maxLength: MAX_ACTION_TAKEN_CHARS })
        : null,
      metadata: sanitizeAssignmentMetadata(input.metadata) || null,
      createdAt: now,
      updatedAt: now,
    };

    const attempts = db.collection("attempts");
    const deterministicId = sessionAttemptDocId(input);

    if (deterministicId) {
      await db.runTransaction(async (transaction) => {
        const ref = attempts.doc(deterministicId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) {
          transaction.set(ref, doc);
        }
      }).catch((err) => console.error("Attempt log transaction failed:", err.message));
    } else {
      await attempts.add(doc).catch((err) => console.error("Attempt log add failed:", err.message));
    }
  } catch (error) {
    console.error("Failed to log attempt:", error.message);
  }
}

module.exports = { logAttempt };
