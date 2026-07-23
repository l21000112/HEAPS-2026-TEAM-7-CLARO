const express = require("express");
const { admin, auth, db, hasFirebaseConfig } = require("../config/firebase");
const { verifyToken, requireRole } = require("../middleware/auth");
const {
  createOrUpdateProfile,
  createTeacherInvite,
  deleteUserAccount,
  getBootstrapTeacherCode,
  redeemInvite,
} = require("../services/invites");
const { createHttpError } = require("../utils/database");

const router = express.Router();

const APP_LANGUAGES = new Set(["en", "zh", "ms", "ta"]);
const MAX_PUSH_TOKEN_LENGTH = 256;

router.use(verifyToken);

function parsePushToken(body) {
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    throw createHttpError(400, "token is required");
  }
  if (token.length > MAX_PUSH_TOKEN_LENGTH) {
    throw createHttpError(400, "token is too long");
  }
  return token;
}

function parseOptionalAppLanguage(body) {
  if (body?.appLanguage === undefined || body?.appLanguage === null || body?.appLanguage === "") {
    return undefined;
  }
  if (typeof body.appLanguage !== "string" || !APP_LANGUAGES.has(body.appLanguage)) {
    throw createHttpError(400, "appLanguage must be one of: en, zh, ms, ta");
  }
  return body.appLanguage;
}

router.post("/profile", async (req, res, next) => {
  if (!hasFirebaseConfig || !db) {
    return res.status(503).json({ error: "Profiles are not configured" });
  }

  try {
    const inviteCode =
      typeof req.body?.inviteCode === "string"
        ? req.body.inviteCode
        : typeof req.body?.teacherInviteCode === "string"
          ? req.body.teacherInviteCode
          : null;
    const result = await createOrUpdateProfile({
      user: req.user,
      displayName: req.body?.displayName,
      inviteCode,
    });
    if (result.invite) {
      return res.status(result.status).json({
        alreadyRedeemed: result.alreadyRedeemed,
        profile: result.profile,
        invite: result.invite,
        classroom: result.classroom,
      });
    }
    res.status(result.status).json(result.profile);
  } catch (err) {
    next(err);
  }
});

router.get("/profile", async (req, res, next) => {
  if (!hasFirebaseConfig || !db) {
    return res.status(503).json({ error: "Profiles are not configured" });
  }

  try {
    const doc = await db.collection("users").doc(req.user.uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(doc.data());
  } catch (err) {
    next(err);
  }
});

// Stored on the profile (not local AsyncStorage) so onboarding completion follows the account across devices.
router.patch("/profile/onboarding", async (req, res, next) => {
  if (!hasFirebaseConfig || !db) {
    return res.status(503).json({ error: "Profiles are not configured" });
  }

  try {
    const userRef = db.collection("users").doc(req.user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const now = new Date().toISOString();
    const existing = doc.data() || {};
    // Idempotent: keep the original completion timestamp if already set.
    const completedAt =
      typeof existing.onboardingTourCompletedAt === "string" && existing.onboardingTourCompletedAt
        ? existing.onboardingTourCompletedAt
        : now;

    await userRef.set(
      {
        onboardingTourComplete: true,
        onboardingTourCompletedAt: completedAt,
        updatedAt: now,
      },
      { merge: true },
    );

    const updated = await userRef.get();
    res.json(updated.data());
  } catch (err) {
    next(err);
  }
});

// Optional appLanguage stores the client's preferred language for push copy.
router.post("/me/push-token", async (req, res, next) => {
  if (!hasFirebaseConfig || !db || !admin) {
    return res.status(503).json({ error: "Profiles are not configured" });
  }

  try {
    const token = parsePushToken(req.body);
    const appLanguage = parseOptionalAppLanguage(req.body);
    const userRef = db.collection("users").doc(req.user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      throw createHttpError(404, "Profile not found");
    }

    const updates = {
      expoPushTokens: admin.firestore.FieldValue.arrayUnion(token),
      updatedAt: new Date().toISOString(),
    };
    if (appLanguage) {
      updates.appLanguage = appLanguage;
    }

    await userRef.set(updates, { merge: true });
    const updated = await userRef.get();
    res.json(updated.data());
  } catch (err) {
    next(err);
  }
});

router.delete("/me/push-token", async (req, res, next) => {
  if (!hasFirebaseConfig || !db || !admin) {
    return res.status(503).json({ error: "Profiles are not configured" });
  }

  try {
    const token = parsePushToken(req.body);
    const userRef = db.collection("users").doc(req.user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      throw createHttpError(404, "Profile not found");
    }

    await userRef.set(
      {
        expoPushTokens: admin.firestore.FieldValue.arrayRemove(token),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    const updated = await userRef.get();
    res.json(updated.data());
  } catch (err) {
    next(err);
  }
});

router.get("/teacher-code", requireRole("teacher"), async (req, res, next) => {
  try {
    const code = getBootstrapTeacherCode();
    if (!code) {
      return res.status(503).json({ error: "No teacher invite code is configured" });
    }
    res.json({ code });
  } catch (err) {
    next(err);
  }
});

router.post("/teacher-invites", requireRole("teacher"), async (req, res, next) => {
  try {
    const invite = await createTeacherInvite(req.user, req.body || {});
    res.status(201).json(invite);
  } catch (err) {
    next(err);
  }
});

router.post("/invites/redeem", async (req, res, next) => {
  try {
    const result = await redeemInvite({
      code: req.body?.code || req.body?.inviteCode,
      user: req.user,
      displayName: req.body?.displayName,
    });
    res.status(result.alreadyRedeemed ? 200 : 201).json(result);
  } catch (err) {
    next(err);
  }
});

// Delete Firestore data first, Auth user last — a partial failure leaves the ID token valid so the user can retry (not be locked out half-deleted).
router.delete("/profile", async (req, res, next) => {
  if (!hasFirebaseConfig || !db || !auth) {
    return res.status(503).json({ error: "Profiles are not configured" });
  }

  try {
    await deleteUserAccount(req.user.uid);

    try {
      await auth.deleteUser(req.user.uid);
    } catch (err) {
      // user-not-found on a retried request is success, not a failure.
      if (err?.code !== "auth/user-not-found") {
        throw err;
      }
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;