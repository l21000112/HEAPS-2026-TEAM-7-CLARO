const { cleanObject, createHttpError, parseLimit } = require("../utils/database");

const SCENARIO_TYPES = new Set([
  "phone_call",
  "chat_message",
  "whatsapp",
  "instagram_story",
  "marketplace",
]);

function parseIsoDate(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw createHttpError(400, `${fieldName} must be an ISO date string`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw createHttpError(400, `${fieldName} must be a valid ISO date string`);
  }
  return date.toISOString();
}

function parsePageToken(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(value)) {
    throw createHttpError(400, "pageToken is invalid");
  }
  return value;
}

function parseBooleanFlag(value) {
  return value === true || value === "true" || value === "1";
}

function truncateText(value, maxLength) {
  if (typeof value !== "string") return value;
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const allowedKeys = new Set(["feature", "vulnerabilityScore", "flagReason", "score", "source"]);
  const sanitized = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!allowedKeys.has(key)) continue;
    if (["string", "number", "boolean"].includes(typeof value)) {
      sanitized[key] = typeof value === "string" ? truncateText(value, 200) : value;
    }
  }
  return Object.keys(sanitized).length ? sanitized : null;
}

function sanitizeAttempt(doc) {
  const attempt = doc.data();
  return cleanObject({
    id: doc.id,
    scenarioType: attempt.scenarioType || null,
    scenarioId: attempt.scenarioId || null,
    sessionId: attempt.sessionId || null,
    selectedOptionId: attempt.selectedOptionId || null,
    isCorrect: typeof attempt.isCorrect === "boolean" ? attempt.isCorrect : null,
    reason: truncateText(attempt.reason || "", 1000),
    durationSeconds: typeof attempt.durationSeconds === "number" ? attempt.durationSeconds : undefined,
    metadata: sanitizeMetadata(attempt.metadata),
    createdAt: attempt.createdAt || null,
  });
}

function addToSummary(summary, attempt) {
  summary.totalAttempts += 1;
  if (attempt.isCorrect === true) {
    summary.correctAttempts += 1;
  }

  const type = attempt.scenarioType || "unknown";
  if (!summary.byScenarioType[type]) {
    summary.byScenarioType[type] = { total: 0, correct: 0, accuracy: 0 };
  }
  summary.byScenarioType[type].total += 1;
  if (attempt.isCorrect === true) {
    summary.byScenarioType[type].correct += 1;
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

function buildAttemptQuery(database, filters) {
  let query = database
    .collection("attempts")
    .where("owner.uid", "==", filters.studentUid);

  if (filters.scenarioType) {
    query = query.where("scenarioType", "==", filters.scenarioType);
  }
  if (filters.from) {
    query = query.where("createdAt", ">=", filters.from);
  }
  if (filters.to) {
    query = query.where("createdAt", "<=", filters.to);
  }

  return query.orderBy("createdAt", "desc");
}

async function getStudentResults(database, { classroomId, studentUid, requesterUid, query }) {
  const classroomDoc = await database.collection("classrooms").doc(classroomId).get();
  if (!classroomDoc.exists) {
    throw createHttpError(404, "Classroom not found");
  }
  const classroom = classroomDoc.data();
  const isTeacher = classroom.teacherUid === requesterUid;
  const isSelf = requesterUid === studentUid;

  if (!isTeacher && !isSelf) {
    throw createHttpError(403, "Forbidden");
  }

  const membershipDoc = await classroomDoc.ref.collection("students").doc(studentUid).get();
  if (!membershipDoc.exists) {
    throw createHttpError(404, "Student is not a member of this classroom");
  }

  const scenarioType = typeof query.scenarioType === "string" && query.scenarioType.trim()
    ? query.scenarioType.trim()
    : null;
  if (scenarioType && !SCENARIO_TYPES.has(scenarioType)) {
    throw createHttpError(400, "scenarioType is invalid");
  }

  const filters = {
    studentUid,
    scenarioType,
    from: parseIsoDate(query.from, "from"),
    to: parseIsoDate(query.to, "to"),
  };
  if (filters.from && filters.to && filters.from > filters.to) {
    throw createHttpError(400, "from must be before to");
  }

  const limit = parseLimit(query.limit, 50, 200);
  const pageToken = parsePageToken(query.pageToken);
  let attemptsQuery = buildAttemptQuery(database, filters).limit(limit + 1);

  if (pageToken) {
    const tokenDoc = await database.collection("attempts").doc(pageToken).get();
    if (!tokenDoc.exists) {
      throw createHttpError(400, "pageToken does not reference an attempt");
    }
    const tokenAttempt = tokenDoc.data();
    if (tokenAttempt.owner?.uid !== studentUid) {
      throw createHttpError(400, "pageToken does not match this student");
    }
    if (filters.scenarioType && tokenAttempt.scenarioType !== filters.scenarioType) {
      throw createHttpError(400, "pageToken does not match this scenarioType filter");
    }
    if (!tokenAttempt.createdAt) {
      throw createHttpError(400, "pageToken attempt cannot be used for pagination");
    }
    if (filters.from && tokenAttempt.createdAt < filters.from) {
      throw createHttpError(400, "pageToken does not match this from filter");
    }
    if (filters.to && tokenAttempt.createdAt > filters.to) {
      throw createHttpError(400, "pageToken does not match this to filter");
    }
    attemptsQuery = attemptsQuery.startAfter(tokenDoc);
  }

  const snapshot = await attemptsQuery.get();
  const docs = snapshot.docs.slice(0, limit);
  const hasMore = snapshot.docs.length > limit;
  const attempts = docs.map(sanitizeAttempt);

  const response = {
    classroomId,
    student: cleanObject({
      uid: studentUid,
      email: membershipDoc.data().email || undefined,
      displayName: membershipDoc.data().displayName || undefined,
    }),
    attempts,
    page: {
      limit,
      nextPageToken: hasMore && docs.length ? docs[docs.length - 1].id : null,
      hasMore,
    },
  };

  if (parseBooleanFlag(query.includeSummary)) {
    const summary = {
      totalAttempts: 0,
      correctAttempts: 0,
      accuracy: 0,
      byScenarioType: {},
      truncated: false,
    };

    const summarySnapshot = await buildAttemptQuery(database, filters).limit(1000).get();
    summarySnapshot.forEach((doc) => addToSummary(summary, doc.data()));
    summary.truncated = summarySnapshot.size >= 1000;
    response.summary = finalizeSummary(summary);
  }

  return response;
}

module.exports = { getStudentResults };
