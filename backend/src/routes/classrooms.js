const express = require("express");
const { requireRole, requireRoleOrSelf, verifyToken } = require("../middleware/auth");
const { createClassroomInvite } = require("../services/invites");
const { getStudentResults } = require("../services/attemptResults");
const {
  createAssignment,
  listAssignmentsForUser,
} = require("../services/classroomAssignments");
const { notifyClassroomStudents } = require("../services/pushNotifications");
const {
  cleanObject,
  createHttpError,
  getDbOrThrow,
  parseLimit,
} = require("../utils/database");

const router = express.Router();

router.use(verifyToken);

function serializeDoc(doc) {
  return {
    id: doc.id,
    ...doc.data(),
  };
}

// Filter sensitive/internal invite fields (createdByEmail, createdByUid, useCount) from list responses.
function serializeInviteForList(doc) {
  const invite = doc.data();
  return cleanObject({
    id: doc.id,
    type: invite.type,
    roleToAssign: invite.roleToAssign,
    classroomId: invite.classroomId || undefined,
    classroomName: invite.classroomName || undefined,
    status: invite.status,
    maxUses: invite.maxUses,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt,
  });
}

async function getProfile(database, uid) {
  const doc = await database.collection("users").doc(uid).get();
  return doc.exists ? doc.data() : null;
}

async function getOwnedClassroom(database, classroomId, uid) {
  const doc = await database.collection("classrooms").doc(classroomId).get();

  if (!doc.exists) {
    throw createHttpError(404, "Classroom not found");
  }

  const classroom = doc.data();
  if (classroom.teacherUid !== uid) {
    throw createHttpError(403, "Forbidden");
  }

  return doc;
}

async function getClassroomForStudent(database, classroomId, uid) {
  const doc = await database.collection("classrooms").doc(classroomId).get();

  if (!doc.exists) {
    throw createHttpError(404, "Classroom not found");
  }

  const classroom = doc.data();
  if (classroom.teacherUid === uid) {
    return { doc, isTeacher: true };
  }

  const studentDoc = await doc.ref.collection("students").doc(uid).get();
  if (!studentDoc.exists) {
    throw createHttpError(403, "Forbidden");
  }

  return { doc, isTeacher: false };
}

function validateClassroomBody(body, partial = false) {
  const data = {};

  if (!partial || body?.name !== undefined) {
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      throw createHttpError(400, "name is required");
    }
    data.name = name;
  }

  if (body?.description !== undefined) {
    data.description =
      typeof body.description === "string" ? body.description.trim() : "";
  }

  return data;
}

router.post("/", requireRole("teacher"), async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const teacherProfile = await getProfile(database, req.user.uid);
    const now = new Date().toISOString();
    const classroom = cleanObject({
      ...validateClassroomBody(req.body),
      teacherUid: req.user.uid,
      teacherEmail: req.user.email,
      teacherDisplayName: teacherProfile?.displayName,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await database.collection("classrooms").add(classroom);
    res.status(201).json({ id: doc.id, ...classroom });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const profile = await getProfile(database, req.user.uid);
    const limit = parseLimit(req.query.limit);

    if (!profile) {
      throw createHttpError(403, "Create a profile before listing classrooms");
    }

    if (profile.role === "teacher") {
      let query = database
        .collection("classrooms")
        .where("teacherUid", "==", req.user.uid)
        .orderBy("updatedAt", "desc");

      const cursor = req.query.cursor;
      if (cursor) {
        const cursorDoc = await database.collection("classrooms").doc(cursor).get();
        if (!cursorDoc.exists) {
          throw createHttpError(400, "cursor does not reference a classroom");
        }
        if (cursorDoc.data().teacherUid !== req.user.uid) {
          throw createHttpError(400, "cursor does not match this teacher");
        }
        query = query.startAfter(cursorDoc);
      }

      const snapshot = await query.limit(limit + 1).get();
      const docs = snapshot.docs.slice(0, limit);
      if (snapshot.docs.length > limit && docs.length) {
        res.setHeader("X-Next-Cursor", docs[docs.length - 1].id);
      }
      return res.json(docs.map(serializeDoc));
    }

    const memberships = await database
      .collectionGroup("students")
      .where("studentUid", "==", req.user.uid)
      .limit(limit)
      .get();

    const classroomRefs = [];
    for (const membership of memberships.docs) {
      const classroomRef = membership.ref.parent.parent;
      if (classroomRef) {
        classroomRefs.push(classroomRef);
      }
    }

    if (classroomRefs.length === 0) {
      return res.json([]);
    }

    const classroomDocs = await database.getAll(...classroomRefs);
    const classrooms = classroomDocs
      .filter((doc) => doc.exists)
      .map(serializeDoc);

    res.json(classrooms);
  } catch (err) {
    next(err);
  }
});

router.get("/:classroomId", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const doc = await database.collection("classrooms").doc(req.params.classroomId).get();

    if (!doc.exists) {
      throw createHttpError(404, "Classroom not found");
    }

    const classroom = doc.data();
    if (classroom.teacherUid === req.user.uid) {
      return res.json({ id: doc.id, ...classroom });
    }

    const studentDoc = await doc.ref.collection("students").doc(req.user.uid).get();
    if (!studentDoc.exists) {
      throw createHttpError(403, "Forbidden");
    }

    res.json({ id: doc.id, ...classroom });
  } catch (err) {
    next(err);
  }
});

router.patch("/:classroomId", requireRole("teacher"), async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const doc = await getOwnedClassroom(database, req.params.classroomId, req.user.uid);
    const updates = cleanObject({
      ...validateClassroomBody(req.body, true),
      updatedAt: new Date().toISOString(),
    });

    await doc.ref.update(updates);
    const updated = await doc.ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:classroomId/students",
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const database = getDbOrThrow();
      const classroom = await getOwnedClassroom(
        database,
        req.params.classroomId,
        req.user.uid
      );
      const studentUid =
        typeof req.body?.studentUid === "string" ? req.body.studentUid.trim() : "";

      if (!studentUid) {
        throw createHttpError(400, "studentUid is required");
      }
      const studentProfile = await getProfile(database, studentUid);
      if (!studentProfile || studentProfile.role !== "student") {
        throw createHttpError(400, "studentUid must belong to a student profile");
      }

      const now = new Date().toISOString();
      const studentRef = classroom.ref.collection("students").doc(studentUid);
      const existingStudent = await studentRef.get();
      const student = cleanObject({
        studentUid, // use studentUid (matches doc ID/path/query); a redundant `uid` field was removed
        email:
          typeof req.body.email === "string" && req.body.email.trim()
            ? req.body.email.trim()
            : studentProfile.email || undefined,
        displayName:
          typeof req.body.displayName === "string" && req.body.displayName.trim()
            ? req.body.displayName.trim()
            : studentProfile.displayName || undefined,
        createdAt: existingStudent.exists ? existingStudent.data().createdAt || now : now,
        updatedAt: now,
      });

      await studentRef.set(student, {
        merge: true,
      });

      res.status(existingStudent.exists ? 200 : 201).json(student);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:classroomId/invites",
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const invite = await createClassroomInvite(
        req.params.classroomId,
        req.user,
        req.body || {}
      );
      res.status(201).json(invite);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:classroomId/students/:studentUid/results",
  requireRoleOrSelf('teacher', 'studentUid'),
  async (req, res, next) => {
    try {
      const database = getDbOrThrow();
      const results = await getStudentResults(database, {
        classroomId: req.params.classroomId,
        studentUid: req.params.studentUid,
        requesterUid: req.user.uid,
        query: req.query,
      });
      res.json(results);
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:classroomId/invites", requireRole("teacher"), async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    await getOwnedClassroom(database, req.params.classroomId, req.user.uid);

    const now = new Date().toISOString();
    const snapshot = await database
      .collection("invites")
      .where("classroomId", "==", req.params.classroomId)
      .orderBy("createdAt", "desc")
      .limit(parseLimit(req.query.limit))
      .get();

    const invites = snapshot.docs
      .map(serializeInviteForList)
      .filter(
        (inv) => inv.status === "active" && (!inv.expiresAt || inv.expiresAt > now)
      );

    res.json(invites);
  } catch (err) {
    next(err);
  }
});

router.put(
  "/:classroomId/assignment",
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const database = getDbOrThrow();
      const doc = await getOwnedClassroom(database, req.params.classroomId, req.user.uid);
      const assignment = await createAssignment(database, doc, req.body || {});
      // Fire-and-forget: never fail the assign if push delivery fails.
      void notifyClassroomStudents(database, doc, assignment);
      res.json(assignment);
    } catch (err) {
      next(err);
    }
  }
);

// Students receive only active assignments plus their own per-item progress.
router.get("/:classroomId/assignments", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const doc = await database.collection("classrooms").doc(req.params.classroomId).get();

    if (!doc.exists) {
      throw createHttpError(404, "Classroom not found");
    }

    res.json(await listAssignmentsForUser(database, doc, req.user));
  } catch (err) {
    next(err);
  }
});

router.get("/:classroomId/assignment", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const doc = await database.collection("classrooms").doc(req.params.classroomId).get();

    if (!doc.exists) {
      throw createHttpError(404, "Classroom not found");
    }

    const classroom = doc.data();
    const isTeacher = classroom.teacherUid === req.user.uid;

    if (!isTeacher) {
      const studentDoc = await doc.ref
        .collection("students")
        .doc(req.user.uid)
        .get();
      if (!studentDoc.exists) {
        throw createHttpError(403, "Forbidden");
      }
    }

    const assignments = await listAssignmentsForUser(database, doc, req.user);
    res.json(assignments[0] || null);
  } catch (err) {
    next(err);
  }
});

router.get("/:classroomId/students", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const { doc: classroom, isTeacher } = await getClassroomForStudent(
      database,
      req.params.classroomId,
      req.user.uid
    );
    const snapshot = await classroom.ref.collection("students").limit(parseLimit(req.query.limit)).get();

    const students = snapshot.docs.map(serializeDoc);

    // Classmates can't see each other's emails.
    const payload = isTeacher ? students : students.map(({ email, ...rest }) => rest);

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
