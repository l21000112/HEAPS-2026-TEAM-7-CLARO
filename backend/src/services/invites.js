const crypto = require("crypto");
const { db, hasFirebaseConfig } = require("../config/firebase");
const { cleanObject, createHttpError, isPlainObject } = require("../utils/database");

const INVITE_TYPES = new Set(["teacher", "classroom"]);
const DEFAULT_TTL_HOURS = 24 * 14;
const MAX_TTL_HOURS = 24 * 365;

function getBootstrapTeacherCode() {
  const code = (process.env.TEACHER_INVITE_CODE || "").trim();
  if (!code) return null;
  if (code.length < 3 || code.length > 64) {
    console.warn("TEACHER_INVITE_CODE is invalid (3–64 characters required)");
    return null;
  }
  return code;
}

function getDatabase() {
  if (!hasFirebaseConfig || !db) {
    throw createHttpError(503, "Database is not configured");
  }
  return db;
}

function normalizeInviteCode(code) {
  const normalized = typeof code === "string" ? code.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  if (normalized.length < 4 || normalized.length > 64) {
    throw createHttpError(400, "A valid invite code is required");
  }
  return normalized;
}

function hashInviteCode(code) {
  return crypto.createHash("sha256").update(normalizeInviteCode(code)).digest("hex");
}

function formatCode(prefix, bytes = 9) {
  const body = crypto
    .randomBytes(bytes)
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 14);
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4, 9)}-${body.slice(9)}`;
}

function displayInviteCode(code) {
  const normalized = normalizeInviteCode(code);
  const match = /^(TCHR|CLASS)([A-Z0-9]+)$/.exec(normalized);
  if (!match) return normalized;

  const [, prefix, body] = match;
  if (body.length <= 4) return `${prefix}-${body}`;
  if (body.length <= 9) return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4, 9)}-${body.slice(9)}`;
}

function parsePositiveInteger(value, fallback, max, fieldName) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) {
    throw createHttpError(400, `${fieldName} must be between 1 and ${max}`);
  }
  return parsed;
}

function parseExpiry(body = {}) {
  if (!isPlainObject(body)) {
    throw createHttpError(400, "Request body must be an object when provided");
  }

  if (body.expiresAt !== undefined) {
    const date = new Date(body.expiresAt);
    if (!Number.isFinite(date.getTime())) {
      throw createHttpError(400, "expiresAt must be a valid ISO date");
    }
    if (date.getTime() <= Date.now()) {
      throw createHttpError(400, "expiresAt must be in the future");
    }
    return date.toISOString();
  }

  const ttlHours = parsePositiveInteger(body.ttlHours, DEFAULT_TTL_HOURS, MAX_TTL_HOURS, "ttlHours");
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
}

function invitePath(code) {
  return `/invite/${encodeURIComponent(code)}`;
}

function serializeInvite(invite, code) {
  return cleanObject({
    type: invite.type,
    roleToAssign: invite.roleToAssign,
    classroomId: invite.classroomId || undefined,
    classroomName: invite.classroomName || undefined,
    code,
    displayCode: displayInviteCode(code),
    invitePath: invitePath(code),
    status: invite.status,
    maxUses: invite.maxUses,
    useCount: invite.useCount || 0,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
    createdByUid: invite.createdByUid,
    createdByEmail: invite.createdByEmail || null,
  });
}

async function createInviteDocument(database, code, invite) {
  const ref = database.collection("invites").doc(hashInviteCode(code));
  const existing = await ref.get();
  if (existing.exists) return false;
  await ref.set(invite);
  return true;
}

async function createInvite({ type, classroom, createdBy, body = {} }) {
  if (!INVITE_TYPES.has(type)) {
    throw createHttpError(400, "Invalid invite type");
  }
  if (!isPlainObject(body)) {
    throw createHttpError(400, "Request body must be an object");
  }
  for (const key of Object.keys(body)) {
    if (!["maxUses", "ttlHours", "expiresAt"].includes(key)) {
      throw createHttpError(400, `body.${key} is not allowed`);
    }
  }

  const database = getDatabase();
  const now = new Date().toISOString();
  const maxUses = parsePositiveInteger(
    body.maxUses,
    type === "teacher" ? 1 : 100,
    type === "teacher" ? 50 : 500,
    "maxUses"
  );
  const expiresAt = parseExpiry(body);
  const prefix = type === "teacher" ? "TCHR" : "CLASS";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = formatCode(prefix);
    const invite = cleanObject({
      type,
      roleToAssign: type === "teacher" ? "teacher" : "student",
      classroomId: classroom?.id,
      classroomName: classroom?.name,
      createdByUid: createdBy.uid,
      createdByEmail: createdBy.email || null,
      status: "active",
      maxUses,
      useCount: 0,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      // Never persist raw invite codes — the doc ID is the SHA-256 hash; code is returned only in the create response.
    });

    if (await createInviteDocument(database, code, invite)) {
      return serializeInvite(invite, code);
    }
  }

  throw createHttpError(500, "Could not create invite code");
}

async function createTeacherInvite(user, body = {}) {
  return createInvite({ type: "teacher", createdBy: user, body });
}

async function createClassroomInvite(classroomId, user, body = {}) {
  const database = getDatabase();
  const classroomDoc = await database.collection("classrooms").doc(classroomId).get();
  if (!classroomDoc.exists) {
    throw createHttpError(404, "Classroom not found");
  }

  const classroom = classroomDoc.data();
  if (classroom.teacherUid !== user.uid) {
    throw createHttpError(403, "Forbidden");
  }

  return createInvite({
    type: "classroom",
    classroom: { id: classroomDoc.id, name: classroom.name },
    createdBy: user,
    body,
  });
}

function validateDisplayName(displayName, required) {
  const cleanDisplayName = typeof displayName === "string" ? displayName.trim() : "";
  if (!cleanDisplayName && required) {
    throw createHttpError(400, "displayName is required");
  }
  if (cleanDisplayName.length > 200) {
    throw createHttpError(400, "displayName must be at most 200 characters");
  }
  return cleanDisplayName || null;
}

function assertInviteUsable(invite, { requireRemainingUse = true } = {}) {
  if (!invite || invite.status !== "active") {
    throw createHttpError(400, "Invite is not active");
  }
  if (invite.expiresAt) {
    const expiresAtMs = new Date(invite.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      throw createHttpError(400, "Invite has expired");
    }
  }
  if (requireRemainingUse && Number(invite.useCount || 0) >= Number(invite.maxUses || 0)) {
    throw createHttpError(400, "Invite has no remaining uses");
  }
}

function buildProfile({ existingProfile, user, displayName, role, now }) {
  const existingName = existingProfile?.displayName || null;
  const cleanDisplayName = displayName || existingName || user.email || "User";
  const profile = {
    uid: user.uid,
    email: user.email || existingProfile?.email || null,
    displayName: cleanDisplayName,
    role,
    createdAt: existingProfile?.createdAt || now,
    updatedAt: now,
  };
  // Preserve tour completion so redemption/profile updates don't drop the cross-device onboarding flag.
  if (existingProfile?.onboardingTourComplete === true) {
    profile.onboardingTourComplete = true;
    if (existingProfile.onboardingTourCompletedAt) {
      profile.onboardingTourCompletedAt = existingProfile.onboardingTourCompletedAt;
    }
  }
  return profile;
}

function sanitizeInviteForRedemption(invite, code) {
  return cleanObject({
    type: invite.type,
    roleToAssign: invite.roleToAssign,
    classroomId: invite.classroomId,
    classroomName: invite.classroomName,
    code,
    invitePath: code ? invitePath(code) : undefined,
    status: invite.status,
    expiresAt: invite.expiresAt,
  });
}

async function redeemInvite({ code, user, displayName }) {
  const database = getDatabase();
  const normalizedCode = normalizeInviteCode(code);
  const responseCode = displayInviteCode(normalizedCode);
  const inviteRef = database.collection("invites").doc(hashInviteCode(normalizedCode));
  const requestedDisplayName = validateDisplayName(displayName, false);

  return database.runTransaction(async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);
    if (!inviteSnap.exists) {
      throw createHttpError(404, "Invite not found");
    }

    const invite = inviteSnap.data();
    if (!INVITE_TYPES.has(invite.type)) {
      throw createHttpError(400, "Invite type is invalid");
    }
    const userRef = database.collection("users").doc(user.uid);
    const redemptionRef = inviteRef.collection("redemptions").doc(user.uid);
    const userSnap = await transaction.get(userRef);
    const redemptionSnap = await transaction.get(redemptionRef);
    const existingProfile = userSnap.exists ? userSnap.data() : null;
    const alreadyRedeemed = redemptionSnap.exists;

    assertInviteUsable(invite, { requireRemainingUse: !alreadyRedeemed });

    if (!existingProfile && !requestedDisplayName) {
      throw createHttpError(400, "displayName is required for first-time invite redemption");
    }

    const now = new Date().toISOString();
    let classroom = null;
    let membershipRef = null;
    let membershipSnap = null;

    if (invite.type === "classroom") {
      if (!invite.classroomId) {
        throw createHttpError(400, "Invite is missing classroom information");
      }
      const classroomRef = database.collection("classrooms").doc(invite.classroomId);
      const classroomSnap = await transaction.get(classroomRef);
      if (!classroomSnap.exists) {
        throw createHttpError(404, "Classroom not found");
      }
      classroom = { id: classroomSnap.id, ...classroomSnap.data() };
      membershipRef = classroomRef.collection("students").doc(user.uid);
      membershipSnap = await transaction.get(membershipRef);
    }

    const existingRole = existingProfile?.role;
    const role = invite.type === "teacher"
      ? "teacher"
      : existingRole === "teacher"
        ? "teacher"
        : "student";
    const profile = buildProfile({
      existingProfile,
      user,
      displayName: requestedDisplayName,
      role,
      now,
    });

    transaction.set(userRef, profile, { merge: true });

    if (invite.type === "classroom" && membershipRef) {
      const existingMembership = membershipSnap?.exists ? membershipSnap.data() : {};
      const membership = cleanObject({
        studentUid: user.uid,
        email: profile.email,
        displayName: profile.displayName,
        inviteId: inviteSnap.id,
        joinedViaInvite: true,
        createdAt: existingMembership.createdAt || now,
        updatedAt: now,
      });
      transaction.set(membershipRef, membership, { merge: true });
    }

    if (!alreadyRedeemed) {
      transaction.set(redemptionRef, {
        uid: user.uid,
        email: user.email || null,
        roleAssigned: role,
        classroomId: invite.classroomId || null,
        redeemedAt: now,
      });
      transaction.update(inviteRef, {
        useCount: Number(invite.useCount || 0) + 1,
        lastUsedAt: now,
        updatedAt: now,
      });
    }

    return cleanObject({
      alreadyRedeemed,
      profile,
      invite: sanitizeInviteForRedemption(invite, responseCode),
      classroom: classroom
        ? { id: classroom.id, name: classroom.name, teacherUid: classroom.teacherUid }
        : undefined,
    });
  });
}

async function createOrUpdateProfile({ user, displayName, inviteCode }) {
  const cleanDisplayName = validateDisplayName(displayName, !inviteCode);

  if (inviteCode) {
    const redeemed = await redeemInvite({
      code: inviteCode,
      user,
      displayName: cleanDisplayName,
    });
    return {
      status: redeemed.alreadyRedeemed ? 200 : 201,
      alreadyRedeemed: redeemed.alreadyRedeemed,
      profile: redeemed.profile,
      invite: redeemed.invite,
      classroom: redeemed.classroom,
    };
  }

  const database = getDatabase();
  const now = new Date().toISOString();
  const userRef = database.collection("users").doc(user.uid);
  const existingDoc = await userRef.get();
  const existingProfile = existingDoc.exists ? existingDoc.data() : null;
  const role = existingProfile?.role === "teacher" ? "teacher" : "student";
  const profile = buildProfile({
    existingProfile,
    user,
    displayName: cleanDisplayName,
    role,
    now,
  });

  await userRef.set(profile, { merge: true });
  return { status: existingDoc.exists ? 200 : 201, profile };
}

async function seedBootstrapTeacherInvite() {
  const code = getBootstrapTeacherCode();
  if (!code || !hasFirebaseConfig || !db) return null;

  const hash = hashInviteCode(code);
  const ref = db.collection("invites").doc(hash);
  const existing = await ref.get();
  if (existing.exists) {
    await ref.update({ "_bootstrap.lastRefreshedAt": new Date().toISOString() });
    return { code, status: "existing" };
  }

  const now = new Date().toISOString();
  // Bound the bootstrap invite (default 5 uses / 7 days) so a leaked TEACHER_INVITE_CODE can't grant unlimited teacher accounts.
  const bootstrapMaxUses = (() => {
    const n = Number(process.env.BOOTSTRAP_TEACHER_MAX_USES);
    return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 50) : 5;
  })();
  const bootstrapTtlHours = (() => {
    const n = Number(process.env.BOOTSTRAP_TEACHER_TTL_HOURS);
    return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 24 * 30) : 24 * 7;
  })();
  await ref.set(cleanObject({
    type: "teacher",
    roleToAssign: "teacher",
    status: "active",
    maxUses: bootstrapMaxUses,
    useCount: 0,
    expiresAt: new Date(Date.now() + bootstrapTtlHours * 3600 * 1000).toISOString(),
    createdByUid: "system_bootstrap",
    createdByEmail: null,
    createdAt: now,
    updatedAt: now,
    _bootstrap: { lastRefreshedAt: now },
  }));

  return { code, status: "created" };
}

// Clean up invite data for a deleted user: their redemptions, plus invites they created (students who redeemed keep their role/membership).
async function deleteInviteDataForUser(database, uid, isTeacher) {
  // Requires a COLLECTION_GROUP index on redemptions.uid (see firestore.indexes.json); if missing, log and continue so orphans don't block account deletion.
  try {
    const redemptionsSnap = await database
      .collectionGroup("redemptions")
      .where("uid", "==", uid)
      .get();

    if (!redemptionsSnap.empty) {
      const batchSize = 400;
      for (let i = 0; i < redemptionsSnap.size; i += batchSize) {
        const batch = database.batch();
        redemptionsSnap.docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }
  } catch (err) {
    console.error(
      `[deleteUserAccount] Failed to clean redemptions for ${uid}: ${err.message}`
    );
  }

  if (isTeacher) {
    try {
      let lastDoc = null;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let query = database
          .collection("invites")
          .where("createdByUid", "==", uid)
          .limit(400);
        if (lastDoc) query = query.startAfter(lastDoc);
        const snap = await query.get();
        if (snap.empty) break;
        const batch = database.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        if (snap.size < 400) break;
        lastDoc = snap.docs[snap.docs.length - 1];
      }
    } catch (err) {
      console.error(
        `[deleteUserAccount] Failed to clean invites for teacher ${uid}: ${err.message}`
      );
    }
  }
}

// Idempotently deletes user data (missing profile = already cleaned). Teacher students are never deleted — only unenrolled + attempts wiped — so they can rejoin another classroom.
const ATTEMPTS_DELETE_PAGE_SIZE = 400; // stays comfortably under Firestore's 500-op batch limit

async function deleteAllAttemptsForStudent(database, studentUid) {
  // Paginate + delete in chunks (a long-enrolled student can exceed one batch); re-running on a wiped student is a no-op.
  while (true) {
    const snapshot = await database
      .collection("attempts")
      .where("owner.uid", "==", studentUid)
      .limit(ATTEMPTS_DELETE_PAGE_SIZE)
      .get();

    if (snapshot.empty) return;

    const batch = database.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size < ATTEMPTS_DELETE_PAGE_SIZE) return;
  }
}

async function deleteUserAccount(uid) {
  const database = getDatabase();
  const userRef = database.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    await deleteInviteDataForUser(database, uid, false);
    return;
  }

  const profile = userSnap.data();
  const isTeacher = profile.role === "teacher";

  if (isTeacher) {
    const classroomsSnap = await database
      .collection("classrooms")
      .where("teacherUid", "==", uid)
      .get();

    for (const classroomDoc of classroomsSnap.docs) {
      const studentsSnap = await classroomDoc.ref.collection("students").get();

      // Wipe activity first while classroom docs still exist, so a partway failure stays retry-safe (already-wiped students are skipped on retry).
      for (const studentDoc of studentsSnap.docs) {
        await deleteAllAttemptsForStudent(database, studentDoc.id);
      }

      const batch = database.batch();
      studentsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      batch.delete(classroomDoc.ref);
      await batch.commit();
    }
  } else if (profile.role === "student") {
    try {
      await deleteAllAttemptsForStudent(database, uid);
    } catch (err) {
      console.error(
        `[deleteUserAccount] Failed to clean attempts for ${uid}: ${err.message}`
      );
    }

    try {
      const memberships = await database
        .collectionGroup("students")
        .where("studentUid", "==", uid)
        .get();

      if (!memberships.empty) {
        const batch = database.batch();
        memberships.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (err) {
      console.error(
        `[deleteUserAccount] Failed to clean classroom memberships for ${uid}: ${err.message}`
      );
    }
  }

  await deleteInviteDataForUser(database, uid, isTeacher);

  await userRef.delete();
}

module.exports = {
  createClassroomInvite,
  createTeacherInvite,
  createOrUpdateProfile,
  deleteUserAccount,
  getBootstrapTeacherCode,
  hashInviteCode,
  normalizeInviteCode,
  redeemInvite,
  seedBootstrapTeacherInvite,
};