const { auth, db, hasFirebaseConfig } = require("../config/firebase");
const { createHttpError } = require("../utils/database");

// Regex (not split) handles Authorization headers with extra internal whitespace.
function extractBearerToken(header) {
  if (typeof header !== "string") return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

async function verifyToken(req, res, next) {
  if (!hasFirebaseConfig || !auth) {
    return res.status(503).json({ error: "Authentication is not configured" });
  }

  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

async function optionalVerifyToken(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header) {
    return next();
  }

  if (!hasFirebaseConfig || !auth) {
    return res.status(503).json({ error: "Authentication is not configured" });
  }

  const token = extractBearerToken(header);
  if (!token) {
    return res.status(401).json({ error: "Invalid authorization header" });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Per-request role cache avoids redundant Firestore reads when multiple role-checking middleware run for the same request.
function requireRole(role) {
  return async function roleMiddleware(req, res, next) {
    if (!hasFirebaseConfig || !db) {
      return next(createHttpError(503, "Authentication is not configured"));
    }
    if (!req.user?.uid) {
      return res.status(401).json({ error: "Missing authenticated user" });
    }

    if (req._resolvedRole !== undefined) {
      if (req._resolvedRole !== role) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return next();
    }

    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const userRole = userDoc.exists ? userDoc.data().role : null;
      req._resolvedRole = userRole;

      if (userRole !== role) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

function requireRoleOrSelf(role, paramName) {
  return async function roleOrSelfMiddleware(req, res, next) {
    if (!hasFirebaseConfig || !db) {
      return next(createHttpError(503, "Authentication is not configured"));
    }
    if (!req.user?.uid) {
      return res.status(401).json({ error: "Missing authenticated user" });
    }

    // Self-access (own data) doesn't require the role.
    if (req.params[paramName] === req.user.uid) {
      return next();
    }

    if (req._resolvedRole !== undefined) {
      if (req._resolvedRole !== role) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return next();
    }

    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const userRole = userDoc.exists ? userDoc.data().role : null;
      req._resolvedRole = userRole;

      if (userRole !== role) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { optionalVerifyToken, verifyToken, requireRole, requireRoleOrSelf };
