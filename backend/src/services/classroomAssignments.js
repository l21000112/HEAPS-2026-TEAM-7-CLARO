const scenarioPool = require("./scenarioPool");
const { cleanObject, createHttpError, createId, isPlainObject } = require("../utils/database");

const ASSIGNMENT_COLLECTION = "classroomAssignments";
const ASSIGNMENT_METADATA_KEYS = new Set([
  "assignmentId",
  "assignmentItemId",
  "classroomId",
  "assignedAt",
  "deadline",
  "feature",
  "source",
  "score",
  "vulnerabilityScore",
  "flagReason",
]);

function nowIso() {
  return new Date().toISOString();
}

function parseIsoDate(value, fieldName, { allowNull = true, requireFuture = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (allowNull) return null;
    throw createHttpError(400, `${fieldName} is required`);
  }
  if (typeof value !== "string") {
    throw createHttpError(400, `${fieldName} must be an ISO date string`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw createHttpError(400, `${fieldName} must be a valid ISO date string`);
  }
  const iso = date.toISOString();
  if (requireFuture && iso <= nowIso()) {
    throw createHttpError(400, `${fieldName} must be in the future`);
  }
  return iso;
}

function isExpired(assignment, now = nowIso()) {
  return Boolean(assignment?.deadline && assignment.deadline <= now);
}

function normalizeScenarioId(type, id) {
  const raw = id == null ? "" : String(id).trim();
  if (!raw) return "";

  const prefixes = {
    phone_call: ["call_"],
    whatsapp: ["whatsapp_"],
    marketplace: ["marketplace_"],
  };

  for (const prefix of prefixes[type] || []) {
    if (raw.startsWith(prefix)) {
      return raw.slice(prefix.length);
    }
  }
  return raw;
}

function validateScenarioType(type) {
  if (!["phone_call", "whatsapp", "marketplace"].includes(type)) {
    throw createHttpError(400, "Assignment scenario type is invalid");
  }
  return type;
}

function validateAssignmentScenarios(scenarios) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw createHttpError(400, "scenarios array is required");
  }
  if (scenarios.length > 50) {
    throw createHttpError(400, "scenarios must not exceed 50 items");
  }

  const itemIds = new Set();

  return scenarios.map((source, index) => {
    const type = validateScenarioType(typeof source?.type === "string" ? source.type.trim() : "");
    const id = normalizeScenarioId(type, source?.scenarioId ?? source?.id);
    if (!id) {
      throw createHttpError(400, `scenarios[${index}].id is required`);
    }

    let quantity = 1;
    if (source.quantity !== undefined && source.quantity !== null) {
      if (
        typeof source.quantity !== "number" ||
        !Number.isInteger(source.quantity) ||
        source.quantity < 1
      ) {
        throw createHttpError(400, `scenarios[${index}].quantity must be a positive integer`);
      }
      quantity = source.quantity;
    }
    if (quantity > 50) {
      throw createHttpError(400, `scenarios[${index}].quantity must be 50 or less`);
    }

    let maxAttempts = null;
    if (source.maxAttempts !== undefined && source.maxAttempts !== null) {
      if (
        typeof source.maxAttempts !== "number" ||
        !Number.isInteger(source.maxAttempts) ||
        source.maxAttempts < 1 ||
        source.maxAttempts > 100
      ) {
        throw createHttpError(400, `scenarios[${index}].maxAttempts must be between 1 and 100`);
      }
      maxAttempts = source.maxAttempts;
    }
    if (maxAttempts != null && maxAttempts < quantity) {
      throw createHttpError(
        400,
        `scenarios[${index}].maxAttempts must be at least quantity`
      );
    }

    const itemId = typeof source.itemId === "string" && source.itemId.trim()
      ? source.itemId.trim()
      : createId("assignment_item");
    if (itemId.length > 200) {
      throw createHttpError(400, `scenarios[${index}].itemId must be 200 characters or fewer`);
    }
    if (itemIds.has(itemId)) {
      throw createHttpError(400, "scenarios itemId values must be unique");
    }
    itemIds.add(itemId);

    return cleanObject({
      itemId,
      id,
      scenarioId: id,
      type,
      title: typeof source.title === "string" && source.title.trim()
        ? source.title.trim()
        : id,
      quantity,
      maxAttempts,
    });
  });
}

function normalizeAssignment(docOrData, fallbackId) {
  if (!docOrData) return null;
  const raw = typeof docOrData.data === "function"
    ? { id: docOrData.id, ...docOrData.data() }
    : { id: fallbackId || docOrData.id, ...docOrData };
  if (!raw || !Array.isArray(raw.scenarios)) return null;

  return cleanObject({
    id: raw.id || fallbackId,
    classroomId: raw.classroomId,
    teacherUid: raw.teacherUid,
    scenarios: raw.scenarios.map((scenario, index) => {
      const type = typeof scenario.type === "string" ? scenario.type : "";
      const id = normalizeScenarioId(type, scenario.scenarioId ?? scenario.id);
      const itemId =
        typeof scenario.itemId === "string" && scenario.itemId.trim()
          ? scenario.itemId.trim()
          : `legacy_item_${index}_${type}_${id}`;
      return cleanObject({
        itemId,
        id,
        scenarioId: id,
        type,
        title: typeof scenario.title === "string" ? scenario.title : id,
        quantity:
          typeof scenario.quantity === "number" && scenario.quantity >= 1
            ? scenario.quantity
            : 1,
        maxAttempts:
          typeof scenario.maxAttempts === "number" && scenario.maxAttempts >= 1
            ? scenario.maxAttempts
            : null,
      });
    }),
    deadline: raw.deadline || null,
    assignedAt: raw.assignedAt || raw.createdAt || null,
    createdAt: raw.createdAt || raw.assignedAt || null,
    updatedAt: raw.updatedAt || raw.assignedAt || null,
  });
}

async function createAssignment(database, classroomDoc, body) {
  const classroom = classroomDoc.data();
  const now = nowIso();
  const assignmentId = createId("assignment");
  const assignment = cleanObject({
    id: assignmentId,
    classroomId: classroomDoc.id,
    teacherUid: classroom.teacherUid,
    scenarios: validateAssignmentScenarios(Array.isArray(body?.scenarios) ? body.scenarios : []),
    deadline: parseIsoDate(body?.deadline, "deadline", { requireFuture: true }),
    assignedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // Wrap both writes in one transaction so the assignment doc and legacy classroom field stay in sync.
  await database.runTransaction(async (transaction) => {
    transaction.set(database.collection(ASSIGNMENT_COLLECTION).doc(assignmentId), assignment);
    transaction.update(classroomDoc.ref, {
      assignment,
      updatedAt: now,
    });
  });

  return assignment;
}

function legacyAssignmentForClassroom(classroomDoc) {
  const classroom = classroomDoc.data();
  if (!classroom.assignment) return null;
  return normalizeAssignment(
    {
      ...classroom.assignment,
      id: classroom.assignment.id || `legacy_${classroomDoc.id}`,
      classroomId: classroomDoc.id,
      teacherUid: classroom.teacherUid,
    },
    `legacy_${classroomDoc.id}`
  );
}

async function listAssignments(database, classroomDoc, options = {}) {
  const { includeExpired = false } = options;
  const snapshot = await database
    .collection(ASSIGNMENT_COLLECTION)
    .where("classroomId", "==", classroomDoc.id)
    .limit(200)
    .get();

  let assignments = snapshot.docs.map((doc) => normalizeAssignment(doc)).filter(Boolean);
  if (assignments.length === 0) {
    const legacy = legacyAssignmentForClassroom(classroomDoc);
    if (legacy) assignments = [legacy];
  }

  const now = nowIso();
  return assignments
    .filter((assignment) => includeExpired || !isExpired(assignment, now))
    .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
}

async function getAssignment(database, assignmentId, classroomDoc = null) {
  if (!assignmentId) return null;
  if (assignmentId.startsWith("legacy_") && classroomDoc) {
    const legacy = legacyAssignmentForClassroom(classroomDoc);
    return legacy?.id === assignmentId ? legacy : null;
  }

  const doc = await database.collection(ASSIGNMENT_COLLECTION).doc(assignmentId).get();
  if (!doc.exists) return null;
  return normalizeAssignment(doc);
}

async function getClassroomDoc(database, classroomId) {
  const doc = await database.collection("classrooms").doc(classroomId).get();
  if (!doc.exists) {
    throw createHttpError(404, "Classroom not found");
  }
  return doc;
}

async function getMembershipDoc(classroomDoc, studentUid) {
  const membership = await classroomDoc.ref.collection("students").doc(studentUid).get();
  return membership.exists ? membership : null;
}

async function requireStudentMembership(classroomDoc, studentUid) {
  const membership = await getMembershipDoc(classroomDoc, studentUid);
  if (!membership) {
    throw createHttpError(403, "Forbidden");
  }
  return membership;
}

// Assignment data is intentionally duplicated in classroomAssignments + the legacy classroom.assignment field for backward compat with older clients.
function assignmentMetadataFromContext(context) {
  if (!context) return null;
  return cleanObject({
    assignmentId: context.assignment.id,
    assignmentItemId: context.item.itemId,
    classroomId: context.assignment.classroomId,
    assignedAt: context.assignment.assignedAt,
    deadline: context.assignment.deadline,
  });
}

function sanitizeAssignmentMetadata(metadata) {
  if (!isPlainObject(metadata)) return null;
  const sanitized = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!ASSIGNMENT_METADATA_KEYS.has(key)) continue;
    if (["string", "number", "boolean"].includes(typeof value)) {
      sanitized[key] = typeof value === "string" ? value.slice(0, 300) : value;
    }
  }
  return Object.keys(sanitized).length ? sanitized : null;
}

function readAssignmentMetadata(metadata) {
  if (!isPlainObject(metadata)) return null;
  const assignmentId = typeof metadata.assignmentId === "string" ? metadata.assignmentId.trim() : "";
  const assignmentItemId =
    typeof metadata.assignmentItemId === "string" ? metadata.assignmentItemId.trim() : "";
  const classroomId = typeof metadata.classroomId === "string" ? metadata.classroomId.trim() : "";
  if (!assignmentId && !assignmentItemId && !classroomId) return null;
  if (!assignmentId || !assignmentItemId || !classroomId) {
    throw createHttpError(400, "assignmentId, assignmentItemId, and classroomId are required together");
  }
  return { assignmentId, assignmentItemId, classroomId };
}

function getAttemptCreatedAt(attempt) {
  const date = typeof attempt.createdAt === "string" ? attempt.createdAt : "";
  return date || "";
}

// `attempts` counts every try; `completed` counts only correct answers — an item completes after `quantity` correct answers, not on the first try.
function attemptCountsForAssignment(assignment, attempts) {
  const counts = new Map();
  for (const item of assignment.scenarios) {
    counts.set(item.itemId, { attempts: 0, completed: 0 });
  }

  for (const attempt of attempts) {
    const metadata = attempt.metadata || {};
    if (metadata.classroomId !== assignment.classroomId) continue;
    if (metadata.assignmentId !== assignment.id) continue;
    if (assignment.deadline && getAttemptCreatedAt(attempt) > assignment.deadline) continue;
    if (assignment.assignedAt && getAttemptCreatedAt(attempt) < assignment.assignedAt) continue;

    const itemId = metadata.assignmentItemId;
    if (!counts.has(itemId)) continue;

    const count = counts.get(itemId);
    count.attempts += 1;
    if (attempt.isCorrect === true) {
      count.completed += 1;
    }
  }

  return counts;
}

// Paginate all attempts instead of a hard limit(1000) that silently truncates; the cap bounds unbounded reads.
const LIST_ATTEMPTS_PAGE_SIZE = 500;
const LIST_ATTEMPTS_MAX = 5000;

async function listStudentAttempts(database, studentUid) {
  const allAttempts = [];
  let lastDoc = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = database
      .collection("attempts")
      .where("owner.uid", "==", studentUid)
      .orderBy("createdAt", "desc")
      .limit(LIST_ATTEMPTS_PAGE_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
      allAttempts.push(doc.data());
    }

    if (snapshot.size < LIST_ATTEMPTS_PAGE_SIZE) break;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    if (allAttempts.length >= LIST_ATTEMPTS_MAX) {
      console.warn(
        `listStudentAttempts hit safety cap (${LIST_ATTEMPTS_MAX}) for uid=${studentUid}`
      );
      break;
    }
  }

  return allAttempts;
}

function attachProgress(assignments, attempts) {
  return assignments.map((assignment) => {
    const counts = attemptCountsForAssignment(assignment, attempts);
    return {
      ...assignment,
      scenarios: assignment.scenarios.map((item) => {
        const count = counts.get(item.itemId) || { attempts: 0, completed: 0 };
        const completed = Math.min(count.completed, item.quantity);
        const maxAttemptsReached =
          item.maxAttempts != null && count.attempts >= item.maxAttempts;
        return {
          ...item,
          progress: {
            attempts: count.attempts,
            completed,
            remaining: Math.max(0, item.quantity - completed),
            complete: completed >= item.quantity,
            maxAttemptsReached,
          },
        };
      }),
    };
  });
}

async function listAssignmentsForUser(database, classroomDoc, user, options = {}) {
  const isTeacher = classroomDoc.data().teacherUid === user.uid;
  if (!isTeacher) {
    await requireStudentMembership(classroomDoc, user.uid);
  }

  const assignments = await listAssignments(database, classroomDoc, {
    includeExpired: isTeacher || false,
  });

  if (isTeacher) {
    return assignments.map((assignment) => ({
      ...assignment,
      expired: isExpired(assignment),
    }));
  }

  const attempts = await listStudentAttempts(database, user.uid);
  return attachProgress(assignments, attempts);
}

function ensureAssignmentActive(assignment) {
  if (isExpired(assignment)) {
    throw createHttpError(410, "Assignment deadline has passed");
  }
}

function ensureItemAvailable(item) {
  const progress = item.progress || {};
  if (progress.complete) {
    throw createHttpError(409, "Assignment item is already completed");
  }
  if (progress.maxAttemptsReached) {
    throw createHttpError(409, "Maximum attempts reached for this assignment item");
  }
}

async function resolveAssignmentLaunch(database, input, user, scenarioType) {
  const assignmentId = typeof input?.assignmentId === "string" ? input.assignmentId.trim() : "";
  const assignmentItemId =
    typeof input?.assignmentItemId === "string" ? input.assignmentItemId.trim() : "";
  const classroomId = typeof input?.classroomId === "string" ? input.classroomId.trim() : "";

  if (!assignmentId && !assignmentItemId && !classroomId) {
    return null;
  }
  if (!user?.uid) {
    throw createHttpError(401, "Login is required for classroom assignments");
  }
  if (!assignmentId || !assignmentItemId || !classroomId) {
    throw createHttpError(400, "assignmentId, assignmentItemId, and classroomId are required");
  }

  const classroomDoc = await getClassroomDoc(database, classroomId);
  await requireStudentMembership(classroomDoc, user.uid);

  const assignment = await getAssignment(database, assignmentId, classroomDoc);
  if (!assignment || assignment.classroomId !== classroomId) {
    throw createHttpError(404, "Assignment not found");
  }
  ensureAssignmentActive(assignment);

  const item = assignment.scenarios.find((candidate) => candidate.itemId === assignmentItemId);
  if (!item) {
    throw createHttpError(404, "Assignment item not found");
  }
  if (item.type !== scenarioType) {
    throw createHttpError(400, "Assignment item does not match this scenario type");
  }

  const attempts = await listStudentAttempts(database, user.uid);
  const assignmentWithProgress = attachProgress([assignment], attempts)[0];
  const itemWithProgress = assignmentWithProgress.scenarios.find(
    (candidate) => candidate.itemId === assignmentItemId
  );
  ensureItemAvailable(itemWithProgress);

  const scenario = await scenarioPool.getScenarioById(item.scenarioId || item.id, scenarioType);
  if (!scenario) {
    throw createHttpError(404, "Assigned scenario not found");
  }

  return {
    assignment,
    item: itemWithProgress,
    scenario,
    metadata: assignmentMetadataFromContext({ assignment, item: itemWithProgress }),
  };
}

function ensureSessionAssignmentActive(session) {
  if (!session?.assignment) return;
  if (session.assignment.deadline && session.assignment.deadline <= nowIso()) {
    throw createHttpError(410, "Assignment deadline has passed");
  }
}

// Derive server-authoritative isCorrect from the session; client body.isCorrect is never trusted. Returns undefined if the session can't determine it.
function deriveServerIsCorrect(session, attempt) {
  const scenario = session.scenario || {};

  if (attempt.scenarioType === "phone_call") {
    if (attempt.selectedOptionId != null) {
      const options = Array.isArray(scenario.options) ? scenario.options : [];
      const option = options.find(
        (o) => o != null && String(o.id) === String(attempt.selectedOptionId)
      );
      if (option && typeof option.isCorrect === "boolean") {
        return option.isCorrect;
      }
    }
    return scenario.isScam === true;
  }

  if (attempt.scenarioType === "marketplace") {
    return String(attempt.selectedOptionId) === String(scenario.targetProductId);
  }

  return undefined;
}

async function validateAttemptAssignment(database, attempt, user) {
  const metadata = readAssignmentMetadata(attempt.metadata);
  if (!metadata) return null;
  if (!user?.uid) {
    throw createHttpError(401, "Login is required for classroom assignment attempts");
  }

  // Assignment attempts require a valid server session (anti-forgery); marketplace is exempt — no server session, client result trusted.
  const requiresSession = attempt.scenarioType !== "marketplace";
  if (requiresSession && !attempt.sessionId) {
    throw createHttpError(
      400,
      "A valid completed sessionId is required for classroom assignment attempts"
    );
  }

  const classroomDoc = await getClassroomDoc(database, metadata.classroomId);
  await requireStudentMembership(classroomDoc, user.uid);

  const assignment = await getAssignment(database, metadata.assignmentId, classroomDoc);
  if (!assignment || assignment.classroomId !== metadata.classroomId) {
    throw createHttpError(404, "Assignment not found");
  }
  ensureAssignmentActive(assignment);

  const item = assignment.scenarios.find((candidate) => candidate.itemId === metadata.assignmentItemId);
  if (!item) {
    throw createHttpError(404, "Assignment item not found");
  }
  if (item.type !== attempt.scenarioType || String(item.scenarioId || item.id) !== String(attempt.scenarioId)) {
    throw createHttpError(400, "Attempt does not match assignment item");
  }

  let serverIsCorrect;
  if (requiresSession) {
    const sessionDoc = await database.collection("sessions").doc(attempt.sessionId).get();
    if (!sessionDoc.exists) {
      throw createHttpError(400, "Referenced session was not found");
    }
    const session = sessionDoc.data();
    if (session.completed !== true) {
      throw createHttpError(400, "Referenced session has not been completed");
    }
    if (session.ownerUid !== user.uid) {
      throw createHttpError(403, "Session does not belong to this user");
    }
    if (String(session.scenario?.id) !== String(attempt.scenarioId)) {
      throw createHttpError(400, "Session scenario does not match this attempt");
    }

    serverIsCorrect = deriveServerIsCorrect(session, attempt);
    if (serverIsCorrect === undefined) {
      throw createHttpError(
        422,
        "Session result could not be verified. Please complete the scenario again."
      );
    }
  }

  const attempts = await listStudentAttempts(database, user.uid);
  const assignmentWithProgress = attachProgress([assignment], attempts)[0];
  const itemWithProgress = assignmentWithProgress.scenarios.find(
    (candidate) => candidate.itemId === metadata.assignmentItemId
  );
  ensureItemAvailable(itemWithProgress);

  // Return maxAttempts info so the route can re-check inside its write transaction (closes a TOCTOU race).
  const maxAttemptsInfo = item.maxAttempts != null
    ? {
        studentUid: user.uid,
        classroomId: metadata.classroomId,
        assignmentId: metadata.assignmentId,
        assignmentItemId: metadata.assignmentItemId,
        maxAttempts: item.maxAttempts,
      }
    : null;

  return {
    metadata: assignmentMetadataFromContext({ assignment, item }),
    serverIsCorrect,
    maxAttemptsInfo,
  };
}

module.exports = {
  assignmentMetadataFromContext,
  createAssignment,
  ensureSessionAssignmentActive,
  isExpired,
  listAssignmentsForUser,
  normalizeAssignment,
  resolveAssignmentLaunch,
  sanitizeAssignmentMetadata,
  validateAttemptAssignment,
};
