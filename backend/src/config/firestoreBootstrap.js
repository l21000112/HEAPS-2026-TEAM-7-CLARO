const { db, hasFirebaseConfig } = require("./firebase");
const { seedPlayableScenarios } = require("../services/scenarioPool");
const { seedBootstrapTeacherInvite } = require("../services/invites");

const SETUP_DOC_ID = "firestore_setup_marker";
const SETUP_OWNER_UID = "system_firestore_setup";

function setupMetadata(now) {
  return {
    isSystemSetupDocument: true,
    purpose:
      "Keeps required Firestore collections visible before real app data is written.",
    createdAt: now,
    updatedAt: now,
  };
}

function callScenarioContent() {
  return {
    isScam: true,
    callerName: "Firestore Setup Marker",
    dialogue: "System setup marker for Firestore collection creation.",
    declineReason: "System setup marker; not served as playable content.",
    options: [
      {
        id: "setup",
        text: "System setup marker",
        isCorrect: true,
        reason: "System setup marker; not served as playable content.",
      },
    ],
  };
}

function markerDefinitions(now, nowMs) {
  const metadata = setupMetadata(now);

  return [
    {
      path: `users/${SETUP_DOC_ID}`,
      ref: db.collection("users").doc(SETUP_DOC_ID),
      data: {
        uid: SETUP_DOC_ID,
        email: null,
        displayName: "Firestore Setup Marker",
        role: "system",
        createdAt: now,
        updatedAt: now,
        _system: metadata,
      },
    },
    {
      path: `attempts/${SETUP_DOC_ID}`,
      ref: db.collection("attempts").doc(SETUP_DOC_ID),
      data: {
        owner: {
          uid: SETUP_OWNER_UID,
          email: null,
          anonymousId: SETUP_OWNER_UID,
        },
        scenarioType: "phone_call",
        scenarioId: SETUP_DOC_ID,
        sessionId: SETUP_DOC_ID,
        selectedOptionId: null,
        isCorrect: true,
        reason: "System setup marker; ignored by user-scoped queries.",
        durationSeconds: 0,
        metadata: {
          systemSetupDocument: true,
        },
        createdAt: now,
        updatedAt: now,
        _system: metadata,
      },
    },
    {
      path: `sessions/${SETUP_DOC_ID}`,
      ref: db.collection("sessions").doc(SETUP_DOC_ID),
      data: {
        sessionId: SETUP_DOC_ID,
        scenario: {
          id: SETUP_DOC_ID,
          ...callScenarioContent(),
        },
        messages: [],
        ownerUid: SETUP_OWNER_UID,
        completed: true,
        phase: "setup",
        createdAtMs: nowMs,
        updatedAtMs: Number.MAX_SAFE_INTEGER,
        _system: metadata,
      },
    },
    {
      path: `classrooms/${SETUP_DOC_ID}`,
      ref: db.collection("classrooms").doc(SETUP_DOC_ID),
      data: {
        name: "Firestore Setup Marker",
        description: "System setup marker; not shown in user classroom lists.",
        teacherUid: SETUP_OWNER_UID,
        teacherEmail: null,
        createdAt: now,
        updatedAt: now,
        _system: metadata,
      },
    },
    {
      path: `classrooms/${SETUP_DOC_ID}/students/${SETUP_DOC_ID}`,
      ref: db
        .collection("classrooms")
        .doc(SETUP_DOC_ID)
        .collection("students")
        .doc(SETUP_DOC_ID),
      data: {
        uid: SETUP_DOC_ID,
        studentUid: SETUP_OWNER_UID,
        email: null,
        displayName: "Firestore Setup Marker",
        createdAt: now,
        updatedAt: now,
        _system: metadata,
      },
    },
    {
      path: `templates/${SETUP_DOC_ID}`,
      ref: db.collection("templates").doc(SETUP_DOC_ID),
      data: {
        type: "phone_call",
        title: "Firestore Setup Marker",
        description: "System setup marker; not shown in published template lists.",
        status: "archived",
        content: callScenarioContent(),
        tags: ["system"],
        ownerUid: SETUP_OWNER_UID,
        ownerEmail: null,
        createdAt: now,
        updatedAt: now,
        _system: metadata,
      },
    },
    {
      path: `scenarios/${SETUP_DOC_ID}`,
      ref: db.collection("scenarios").doc(SETUP_DOC_ID),
      data: {
        type: "phone_call",
        title: "Firestore Setup Marker",
        description: "System setup marker; not served as playable content.",
        status: "archived",
        source: "system",
        sourceId: SETUP_DOC_ID,
        legacyId: null,
        visibility: "public",
        publicContent: {
          id: SETUP_DOC_ID,
          callerName: "Firestore Setup Marker",
          dialogue: "System setup marker for Firestore collection creation.",
          options: [{ id: "setup", text: "System setup marker" }],
        },
        evaluation: {
          isScam: true,
          declineReason: "System setup marker; not served as playable content.",
          options: [
            {
              id: "setup",
              isCorrect: true,
              reason: "System setup marker; not served as playable content.",
            },
          ],
        },
        simulation: null,
        tags: ["system"],
        ownerUid: SETUP_OWNER_UID,
        ownerEmail: null,
        randomKey: 0,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        _system: metadata,
      },
    },
    {
      path: `invites/${SETUP_DOC_ID}`,
      ref: db.collection("invites").doc(SETUP_DOC_ID),
      data: {
        type: "system",
        roleToAssign: "system",
        status: "revoked",
        maxUses: 0,
        useCount: 0,
        expiresAt: now,
        createdByUid: SETUP_OWNER_UID,
        createdByEmail: null,
        createdAt: now,
        updatedAt: now,
        _system: metadata,
      },
    },
  ];
}

async function ensureDocument(definition) {
  const snapshot = await definition.ref.get();
  if (snapshot.exists) {
    return false;
  }

  await definition.ref.set(definition.data);
  return true;
}

// Gate boot-time seeding behind FIREBASE_SEED_ON_BOOT (default true for backward compat; set false in prod after initial seed).
function shouldSeedOnBoot() {
  return process.env.FIREBASE_SEED_ON_BOOT !== "false";
}

async function ensureFirestoreCollections() {
  if (!shouldSeedOnBoot()) {
    console.log("Firestore bootstrap + seeding skipped (FIREBASE_SEED_ON_BOOT=false)");
    return { skipped: true, created: [] };
  }

  if (process.env.FIRESTORE_BOOTSTRAP_COLLECTIONS === "false") {
    console.log("Firestore setup-marker bootstrap skipped by FIRESTORE_BOOTSTRAP_COLLECTIONS=false");
  }

  if (!hasFirebaseConfig || !db) {
    console.warn("Firestore bootstrap skipped because Firebase is not configured.");
    return { skipped: true, created: [] };
  }

  const now = new Date().toISOString();
  const nowMs = Date.now();
  const created = [];

  for (const definition of markerDefinitions(now, nowMs)) {
    try {
      if (await ensureDocument(definition)) {
        created.push(definition.path);
      }
    } catch (error) {
      console.warn(
        `Firestore bootstrap could not create ${definition.path}: ${error.message}`
      );
    }
  }

  if (created.length > 0) {
    console.log(
      `Firestore bootstrap created setup documents: ${created.join(", ")}`
    );
  } else {
    console.log("Firestore bootstrap found setup documents already present.");
  }

  let scenarioSeed = null;
  if (process.env.FIRESTORE_BOOTSTRAP_COLLECTIONS !== "false") {
    try {
      scenarioSeed = await seedPlayableScenarios();
      if (!scenarioSeed.skipped) {
        console.log(
          `Firestore scenario seed complete: static created=${scenarioSeed.static.created}, updated=${scenarioSeed.static.updated}, unchanged=${scenarioSeed.static.unchanged}, skipped=${scenarioSeed.static.skipped}; templates upserted=${scenarioSeed.templates.upserted}, skipped=${scenarioSeed.templates.skipped}`
        );
      }
    } catch (error) {
      console.warn(`Firestore scenario seed failed: ${error.message}`);
    }
  }

  let bootstrapTeacher = null;
  try {
    bootstrapTeacher = await seedBootstrapTeacherInvite();
    if (bootstrapTeacher) {
      // Log status ONLY — never print the invite code; log access could allow self-elevation to teacher.
      console.log(`Bootstrap teacher invite ready (status: ${bootstrapTeacher.status})`);
    } else {
      console.log("No TEACHER_INVITE_CODE configured — bootstrap teacher invite skipped.");
    }
  } catch (error) {
    console.warn(`Bootstrap teacher invite seed failed: ${error.message}`);
  }

  return { skipped: false, created, scenarioSeed, bootstrapTeacher };
}

module.exports = {
  ensureFirestoreCollections,
};
