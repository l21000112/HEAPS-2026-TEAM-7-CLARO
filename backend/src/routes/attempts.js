const crypto = require("crypto");
const express = require("express");
const { optionalVerifyToken } = require("../middleware/auth");
const {
  sanitizeAssignmentMetadata,
  validateAttemptAssignment,
} = require("../services/classroomAssignments");
const {
  cleanObject,
  createHttpError,
  getDbOrThrow,
  isPlainObject,
  parseLimit,
  sanitizePersistedText,
  validateBoundedText,
  MAX_REASON_CHARS,
  MAX_USER_MESSAGE_CHARS,
} = require("../utils/database");

const router = express.Router();

const SCENARIO_TYPES = new Set([
  "phone_call",
  "chat_message",
  "whatsapp",
  "instagram_story",
  "marketplace",
]);

router.use(optionalVerifyToken);

function getAttemptOwner(req, body) {
  if (req.user?.uid) {
    return {
      uid: req.user.uid,
      email: req.user.email || null,
      anonymousId: null,
    };
  }

  const anonymousId = validateBoundedText(body.anonymousId, "anonymousId", {
    maxLength: 200,
  });

  return {
    uid: null,
    email: null,
    anonymousId,
  };
}

function getOwnerQuery(req) {
  if (req.user?.uid) {
    return { field: "owner.uid", value: req.user.uid };
  }

  const anonymousId = validateBoundedText(req.query.anonymousId, "anonymousId", {
    maxLength: 200,
  });

  return { field: "owner.anonymousId", value: anonymousId };
}

function validateAttemptBody(body) {
  if (!isPlainObject(body)) {
    throw createHttpError(400, "Request body is required");
  }

  const scenarioType =
    typeof body.scenarioType === "string" ? body.scenarioType.trim() : "";
  if (!SCENARIO_TYPES.has(scenarioType)) {
    throw createHttpError(400, "Valid scenarioType is required");
  }

  const rawScenarioId =
    typeof body.scenarioId === "string" || typeof body.scenarioId === "number"
      ? String(body.scenarioId)
      : "";
  const scenarioId = validateBoundedText(rawScenarioId, "scenarioId", { maxLength: 200 });

  if (typeof body.isCorrect !== "boolean") {
    throw createHttpError(400, "isCorrect boolean is required");
  }

  const reason = sanitizePersistedText(
    validateBoundedText(body.reason, "reason", { maxLength: MAX_REASON_CHARS }),
    { maxLength: MAX_REASON_CHARS }
  );

  // actionTaken is sanitized like reason to strip PII.
  let actionTaken;
  if (body.actionTaken !== undefined && body.actionTaken !== null) {
    actionTaken = sanitizePersistedText(
      validateBoundedText(body.actionTaken, "actionTaken", {
        maxLength: MAX_USER_MESSAGE_CHARS,
      }),
      { maxLength: MAX_USER_MESSAGE_CHARS }
    );
  }

  if (
    body.metadata !== undefined &&
    (!isPlainObject(body.metadata) || JSON.stringify(body.metadata).length > 5000)
  ) {
    throw createHttpError(400, "metadata must be a small object");
  }

  let durationSeconds;
  if (body.durationSeconds !== undefined && body.durationSeconds !== null) {
    if (
      typeof body.durationSeconds !== "number" ||
      !Number.isFinite(body.durationSeconds) ||
      body.durationSeconds < 0 ||
      body.durationSeconds > 86400
    ) {
      throw createHttpError(400, "durationSeconds must be between 0 and 86400");
    }
    durationSeconds = body.durationSeconds;
  }

  return {
    scenarioType,
    scenarioId,
    sessionId: body.sessionId == null || body.sessionId === ""
      ? undefined
      : validateBoundedText(body.sessionId, "sessionId", { maxLength: 200 }),
    selectedOptionId:
      typeof body.selectedOptionId === "string" ||
      typeof body.selectedOptionId === "number"
        ? validateBoundedText(String(body.selectedOptionId), "selectedOptionId", {
            maxLength: 200,
          })
        : undefined,
    isCorrect: body.isCorrect,
    reason,
    actionTaken,
    durationSeconds,
    metadata: body.metadata,
  };
}

function serializeDoc(doc) {
  // Expose only uid/anonymousId to stay consistent with attemptResults.sanitizeAttempt.
  const data = doc.data();
  const owner = data.owner || {};
  return {
    id: doc.id,
    ...data,
    owner: cleanObject({
      uid: owner.uid || null,
      anonymousId: owner.anonymousId || null,
    }),
  };
}

function deterministicAttemptId(attempt) {
  if (!attempt.sessionId) return null;
  const owner = attempt.owner || {};
  const ownerKey = owner.uid || owner.anonymousId || "anonymous";
  const key = [ownerKey, attempt.scenarioType || "unknown", attempt.sessionId].join(":");
  const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 40);
  return `session_attempt_${hash}`;
}

function existingAttemptForIdentity(snapshot, expectedAttempt) {
  if (!snapshot.exists) return null;

  const existing = snapshot.data();
  const existingOwner = existing.owner || {};
  const expectedOwner = expectedAttempt.owner || {};
  const sameOwner = expectedOwner.uid
    ? existingOwner.uid === expectedOwner.uid
    : existingOwner.anonymousId === expectedOwner.anonymousId;
  const sameIdentity =
    sameOwner &&
    existing.scenarioType === expectedAttempt.scenarioType &&
    String(existing.sessionId) === String(expectedAttempt.sessionId);

  if (!sameIdentity) {
    throw createHttpError(409, "Session attempt identity conflict");
  }

  return { id: snapshot.id, ...existing };
}

function createSummary() {
  return {
    totalAttempts: 0,
    correctAttempts: 0,
    accuracy: 0,
    byScenarioType: {},
  };
}

function addAttemptToSummary(summary, attempt) {
  summary.totalAttempts += 1;
  if (attempt.isCorrect === true) {
    summary.correctAttempts += 1;
  }

  const key = attempt.scenarioType || "unknown";
  if (!summary.byScenarioType[key]) {
    summary.byScenarioType[key] = { total: 0, correct: 0, accuracy: 0 };
  }
  summary.byScenarioType[key].total += 1;
  if (attempt.isCorrect === true) {
    summary.byScenarioType[key].correct += 1;
  }
}

function finalizeSummary(summary) {
  summary.accuracy = summary.totalAttempts
    ? summary.correctAttempts / summary.totalAttempts
    : 0;
  for (const stats of Object.values(summary.byScenarioType)) {
    stats.accuracy = stats.total ? stats.correct / stats.total : 0;
  }
  return summary;
}

router.post("/", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const now = new Date().toISOString();
    const validated = validateAttemptBody(req.body);
    const owner = getAttemptOwner(req, req.body);
    const identityAttempt = { ...validated, owner };
    const deterministicId = deterministicAttemptId(identityAttempt);
    const deterministicRef = deterministicId
      ? database.collection("attempts").doc(deterministicId)
      : null;

    if (deterministicRef) {
      const existing = existingAttemptForIdentity(
        await deterministicRef.get(),
        identityAttempt
      );
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    let assignmentResult;
    try {
      assignmentResult = await validateAttemptAssignment(
        database,
        validated,
        req.user
      );
    } catch (error) {
      if (deterministicRef && [409, 410, 422].includes(Number(error.status))) {
        const existing = existingAttemptForIdentity(
          await deterministicRef.get(),
          identityAttempt
        );
        if (existing) {
          return res.status(200).json(existing);
        }
      }
      throw error;
    }

    // For assignment-gated attempts, trust only the server-derived isCorrect.
    const serverIsCorrect =
      assignmentResult && typeof assignmentResult.serverIsCorrect === "boolean"
        ? assignmentResult.serverIsCorrect
        : validated.isCorrect;

    const sanitizedMetadata = {
      ...(sanitizeAssignmentMetadata(validated.metadata) || {}),
      ...((assignmentResult && assignmentResult.metadata) || {}),
    };
    const attempt = cleanObject({
      ...validated,
      isCorrect: serverIsCorrect,
      metadata: Object.keys(sanitizedMetadata).length ? sanitizedMetadata : undefined,
      owner,
      createdAt: now,
      updatedAt: now,
    });

    if (deterministicRef) {
      const result = await database.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(deterministicRef);
        const existing = existingAttemptForIdentity(snapshot, attempt);
        if (existing) {
          return { created: false, data: existing };
        }

        // Re-check maxAttempts inside the transaction to close the TOCTOU race between concurrent requests.
        if (assignmentResult && assignmentResult.maxAttemptsInfo) {
          const m = assignmentResult.maxAttemptsInfo;
          const countSnap = await transaction.get(
            database
              .collection("attempts")
              .where("owner.uid", "==", m.studentUid)
              .orderBy("createdAt", "desc")
              .limit(m.maxAttempts)
          );
          let matching = 0;
          countSnap.forEach((d) => {
            const meta = d.data().metadata || {};
            if (
              meta.classroomId === m.classroomId &&
              meta.assignmentId === m.assignmentId &&
              meta.assignmentItemId === m.assignmentItemId
            ) {
              matching += 1;
            }
          });
          if (matching >= m.maxAttempts) {
            throw createHttpError(
              409,
              "Maximum attempts reached for this assignment item"
            );
          }
        }

        transaction.set(deterministicRef, attempt);
        return { created: true, data: { id: deterministicRef.id, ...attempt } };
      });
      return res.status(result.created ? 201 : 200).json(result.data);
    }

    const doc = await database.collection("attempts").add(attempt);
    res.status(201).json({ id: doc.id, ...attempt });
  } catch (err) {
    next(err);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const ownerQuery = getOwnerQuery(req);
    const limit = parseLimit(req.query.limit, 200, 500);

    const snapshot = await database
      .collection("attempts")
      .where(ownerQuery.field, "==", ownerQuery.value)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const summary = createSummary();
    snapshot.forEach((doc) => addAttemptToSummary(summary, doc.data()));

    // Truncated signals the summary is approximate (hit the limit, not all attempts considered).
    const truncated = snapshot.size >= limit;

    res.json({ ...finalizeSummary(summary), truncated });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const ownerQuery = getOwnerQuery(req);
    const limit = parseLimit(req.query.limit);
    let query = database
      .collection("attempts")
      .where(ownerQuery.field, "==", ownerQuery.value);

    if (req.query.scenarioType !== undefined) {
      const scenarioType =
        typeof req.query.scenarioType === "string" ? req.query.scenarioType.trim() : "";
      if (!SCENARIO_TYPES.has(scenarioType)) {
        throw createHttpError(400, "scenarioType is invalid");
      }
      query = query.where("scenarioType", "==", scenarioType);
    }

    query = query.orderBy("createdAt", "desc");

    // Cursor pagination: accept `cursor` (doc ID), return X-Next-Cursor; response stays a plain array for backward compat.
    const cursor = req.query.cursor;
    if (cursor) {
      const cursorDoc = await database.collection("attempts").doc(cursor).get();
      if (!cursorDoc.exists) {
        throw createHttpError(400, "cursor does not reference an attempt");
      }
      const cursorOwner = cursorDoc.data().owner || {};
      if (
        ownerQuery.field === "owner.uid" && cursorOwner.uid !== ownerQuery.value
      ) {
        throw createHttpError(400, "cursor does not match this owner");
      }
      if (
        ownerQuery.field === "owner.anonymousId" &&
        cursorOwner.anonymousId !== ownerQuery.value
      ) {
        throw createHttpError(400, "cursor does not match this owner");
      }
      query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.limit(limit + 1).get();
    const docs = snapshot.docs.slice(0, limit);
    const hasNext = snapshot.docs.length > limit;
    if (hasNext && docs.length) {
      res.setHeader("X-Next-Cursor", docs[docs.length - 1].id);
    }

    res.json(docs.map(serializeDoc));
  } catch (err) {
    next(err);
  }
});

router.get("/:attemptId", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const ownerQuery = getOwnerQuery(req);
    const doc = await database.collection("attempts").doc(req.params.attemptId).get();

    if (!doc.exists) {
      throw createHttpError(404, "Attempt not found");
    }

    const attempt = doc.data();
    const owner = attempt.owner || {};
    if (ownerQuery.field === "owner.uid" && owner.uid !== ownerQuery.value) {
      throw createHttpError(403, "Forbidden");
    }
    if (
      ownerQuery.field === "owner.anonymousId" &&
      owner.anonymousId !== ownerQuery.value
    ) {
      throw createHttpError(403, "Forbidden");
    }

    res.json({ id: doc.id, ...attempt });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
