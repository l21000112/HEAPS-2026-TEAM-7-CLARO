let admin = null;

try {
  admin = require("firebase-admin");
} catch (error) {
  console.warn(
    `firebase-admin is not installed (${error.message}). Authenticated and Firestore-backed routes are disabled.`
  );
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^["']|["']$/g, "").trim()
  : undefined;

const hasFirebaseConfig = Boolean(
  admin &&
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    privateKey
);

let db = null;
let auth = null;

if (hasFirebaseConfig) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }

    db = admin.firestore();
    // Optional scenario/session fields can be undefined; without this, creating a session throws.
    db.settings({ ignoreUndefinedProperties: true });
    auth = admin.auth();
  } catch (error) {
    console.error(
      `Firebase initialization failed [${error.code || "unknown"}]: ${error.message}`
    );

    // Crash hard in prod: a silent broken 503 state is worse than a visible crash that restarts the orchestrator.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "Firebase is misconfigured in production. Aborting startup — fix FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars."
      );
      process.exit(1);
    }
  }
} else {
  console.warn(
    "Firebase config is missing. Authenticated and Firestore-backed routes are disabled."
  );

  // In prod, missing config is fatal (silent degraded state is worse than a visible crash); dev/CI may proceed.
  if (process.env.NODE_ENV === "production") {
    console.error(
      "Firebase configuration env vars are missing in production (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Aborting startup."
    );
    process.exit(1);
  }
}

module.exports = { admin, db, auth, hasFirebaseConfig };
