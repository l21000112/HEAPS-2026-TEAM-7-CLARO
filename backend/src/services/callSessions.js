const crypto = require("crypto");
const { db, hasFirebaseConfig } = require("../config/firebase");
const scenarioPool = require("./scenarioPool");
const { logAttempt } = require("./attemptLogger");
const {
  ensureSessionAssignmentActive,
  resolveAssignmentLaunch,
} = require("./classroomAssignments");
const store = require("./sessionStore");
const { createHttpError, clone, createId } = require("../utils/database");

const NON_SCAM_DECLINE_REASON =
  "There were no red flags to confirm this call was a scam. It is better to answer cautiously, listen for warning signs, and avoid sharing personal information.";
const NON_SCAM_DECLINE_REASON_SIMPLE =
  "This call did not look like a scam. Answer carefully, listen for warnings, and never share private details.";

const sessionLocks = new Map();

async function withSessionLock(sessionId, fn) {
  const prev = sessionLocks.get(sessionId) || Promise.resolve();
  let resolveLock;
  const current = new Promise((resolve) => { resolveLock = resolve; });
  sessionLocks.set(sessionId, current);
  await prev;
  try {
    return await fn();
  } finally {
    resolveLock();
    if (sessionLocks.get(sessionId) === current) {
      sessionLocks.delete(sessionId);
    }
  }
}

function preferSimpleReason(fullReason, simpleReason, simpleLanguage) {
  if (
    simpleLanguage &&
    typeof simpleReason === "string" &&
    simpleReason.trim()
  ) {
    return simpleReason.trim();
  }
  return fullReason;
}

function publicScenario(scenario) {
  return {
    id: scenario.id,
    callerName: scenario.callerName,
    dialogue: scenario.dialogue,
    options: scenario.options.map((option) => ({
      id: option.id,
      text: option.text,
    })),
  };
}

function serializeSession(session) {
  const serialized = {
    sessionId: session.sessionId,
    scenario: publicScenario(session.scenario),
    assignment: session.assignment || null,
    completed: session.completed === true,
    phase: session.phase || (session.completed ? "completed" : "incoming"),
  };
  // Return accessToken only for anonymous sessions (auth via X-Anonymous-Session-Token).
  if (!session.ownerUid && session.accessToken) {
    serialized.accessToken = session.accessToken;
  }
  return serialized;
}

// cleanupExpired runs from a background interval (sessionStore.startCleanupInterval), not per request.
async function getSession(sessionId) {
  return store.get(sessionId);
}

function ensureSessionAccess(session, user, accessToken) {
  if (session.ownerUid) {
    if (session.ownerUid !== user?.uid) {
      throw createHttpError(403, "Forbidden");
    }
  } else {
    if (!session.accessToken || session.accessToken !== accessToken) {
      throw createHttpError(403, "Forbidden");
    }
  }
}

function hasAssignmentInput(input) {
  return Boolean(input?.assignmentId || input?.assignmentItemId || input?.classroomId);
}

async function startCallSession(user, input = {}) {
  if (hasAssignmentInput(input) && (!hasFirebaseConfig || !db)) {
    throw createHttpError(503, "Database is not configured");
  }

  const assignmentContext = hasAssignmentInput(input)
    ? await resolveAssignmentLaunch(db, input, user, "phone_call")
    : null;

  const ownerUid = user?.uid || null;
  const session = {
    sessionId: createId("call"),
    scenario: assignmentContext?.scenario || await scenarioPool.pickCallScenario(),
    assignment: assignmentContext?.metadata || null,
    phase: "incoming",
    ownerUid,
    accessToken: ownerUid ? null : crypto.randomUUID(),
    simpleLanguage: input.simpleLanguage === true,
    anonymousId: input.anonymousId || null,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  };

  await store.create(session.sessionId, session);
  return serializeSession(session);
}

async function getCallSession(sessionId, user, accessToken) {
  const session = await getSession(sessionId);
  ensureSessionAccess(session, user, accessToken);
  return serializeSession(session);
}

async function persistCompletedSession(sessionId, session, user, accessToken) {
  if (hasFirebaseConfig && db) {
    try {
      const ref = db.collection("sessions").doc(sessionId);
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) {
          throw createHttpError(404, "Session not found");
        }

        const latest = snapshot.data();
        ensureSessionAccess(latest, user, accessToken);
        if (latest.completed) {
          throw createHttpError(409, "This call session has already been completed");
        }

        transaction.set(ref, session);
      });
      return;
    } catch (error) {
      if (error.status) {
        throw error;
      }
      // Don't fall through to unconditional write — a failed transaction guard risks a double-write race.
      console.error(`Firestore completed-session transaction failed (${sessionId}):`, error.message);
      throw createHttpError(503, "Session state could not be verified");
    }
  }

  await store.create(sessionId, session);
}

function evaluateCallAction(scenario, action, simpleLanguage) {
  if (action === "decline") {
    const reason = scenario.isScam
      ? preferSimpleReason(
          scenario.declineReason,
          scenario.declineReasonSimple,
          simpleLanguage
        )
      : preferSimpleReason(
          NON_SCAM_DECLINE_REASON,
          NON_SCAM_DECLINE_REASON_SIMPLE,
          simpleLanguage
        );

    return {
      completed: true,
      isCorrect: scenario.isScam,
      reason,
    };
  }

  if (action === "hangup") {
    return {
      completed: true,
      isCorrect: scenario.isScam,
      reason: preferSimpleReason(
        scenario.declineReason,
        scenario.declineReasonSimple,
        simpleLanguage
      ),
    };
  }

  throw createHttpError(400, "Invalid action. Must be 'decline' or 'hangup'");
}

async function answerCall(sessionId, selectedOptionId, user, accessToken) {
  return withSessionLock(sessionId, async () => {
    const session = await getSession(sessionId);
    ensureSessionAccess(session, user, accessToken);

    if (session.completed) {
      throw createHttpError(409, "This call session has already been completed");
    }
    ensureSessionAssignmentActive(session);

    const option = session.scenario.options.find(
      (candidate) => String(candidate.id) === String(selectedOptionId)
    );
    if (!option) {
      throw createHttpError(400, "Valid selectedOptionId is required");
    }

    const evaluation = {
      completed: true,
      isCorrect: option.isCorrect,
      reason: preferSimpleReason(option.reason, option.reasonSimple, session.simpleLanguage),
      selectedOptionId: String(option.id),
    };

    session.completed = true;
    session.phase = "completed";
    session.updatedAtMs = Date.now();
    await persistCompletedSession(session.sessionId, session, user, accessToken);

    await logAttempt({
      ownerUid: user?.uid || null,
      anonymousId: session.anonymousId || null,
      scenarioType: "phone_call",
      scenarioId: session.scenario.id,
      sessionId: session.sessionId,
      selectedOptionId: option.id,
      isCorrect: evaluation.isCorrect,
      reason: evaluation.reason,
      metadata: session.assignment || undefined,
    });

    return { evaluation };
  });
}

async function performCallAction(sessionId, action, user, accessToken) {
  return withSessionLock(sessionId, async () => {
    const session = await getSession(sessionId);
    ensureSessionAccess(session, user, accessToken);

    if (session.completed) {
      throw createHttpError(409, "This call session has already been completed");
    }
    ensureSessionAssignmentActive(session);

    const evaluation = evaluateCallAction(
      session.scenario,
      action,
      session.simpleLanguage === true
    );

    session.completed = true;
    session.phase = "completed";
    session.updatedAtMs = Date.now();
    await persistCompletedSession(session.sessionId, session, user, accessToken);

    await logAttempt({
      ownerUid: user?.uid || null,
      anonymousId: session.anonymousId || null,
      scenarioType: "phone_call",
      scenarioId: session.scenario.id,
      sessionId: session.sessionId,
      isCorrect: evaluation.isCorrect,
      reason: evaluation.reason,
      metadata: session.assignment || undefined,
    });

    return { evaluation };
  });
}

module.exports = {
  answerCall,
  getCallSession,
  performCallAction,
  startCallSession,
};
