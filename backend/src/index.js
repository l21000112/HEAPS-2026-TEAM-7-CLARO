require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const scenarioRoutes = require("./routes/scenarios");
const userRoutes = require("./routes/users");
const sessionRoutes = require("./routes/sessions");
const evaluationRoutes = require("./routes/evaluations");
const attemptRoutes = require("./routes/attempts");
const classroomRoutes = require("./routes/classrooms");
const templateRoutes = require("./routes/templates");
const { ensureFirestoreCollections } = require("./config/firestoreBootstrap");
const { SESSION_TTL_MS } = require("./utils/database");
const sessionStore = require("./services/sessionStore");

const app = express();
const port = process.env.PORT || 3000;

// In prod, require an explicit CORS_ORIGIN and fail closed at startup; localhost/LAN origins are a security risk.
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : null;

if (isProduction && !allowedOrigins) {
  throw new Error(
    "CORS_ORIGIN must be set in production (NODE_ENV=production). Refusing to start with an open/localhost CORS policy."
  );
}

app.use(
  cors(
    allowedOrigins
      ? {
          origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
              return;
            }
            callback(new Error("Origin is not allowed by CORS"));
          },
        }
      : {
          origin(origin, callback) {
            callback(
              null,
              !origin ||
                /^http:\/\/localhost:\d+$/.test(origin) ||
                /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
                /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)
            );
          },
        }
  )
);

app.use(helmet());

app.use(express.json({ limit: "80kb" }));

// Trust the first proxy hop so rate-limiting keys and req.ip are correct behind a reverse proxy.
app.set("trust proxy", process.env.TRUST_PROXY_HOPS ? Number(process.env.TRUST_PROXY_HOPS) : 1);

// Rate limiters mount before routes; the try/catch keeps an in-memory fallback if express-rate-limit is unavailable.
let rateLimit = null;
try {
  rateLimit = require("express-rate-limit");
} catch (_) {
  console.warn(
    "express-rate-limit is not installed — falling back to per-process in-memory limiter. Run `npm install` to enable the production limiter."
  );
}

function createMemoryRateLimiter(options) {
  const { windowMs, max, message = "Too many requests" } = options;
  const buckets = new Map();

  return function memoryRateLimiter(req, res, next) {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `${ip}:${req.baseUrl || req.path}`;
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (buckets.size > 10000) {
      for (const [bucketKey, value] of buckets.entries()) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

function buildRateLimiter(options) {
  if (rateLimit) {
    return rateLimit({
      ...options,
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  return createMemoryRateLimiter(options);
}

const generalLimiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 4000,
});

const strictLimiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1200,
});

const evaluationLimiter = buildRateLimiter({
  windowMs: 60 * 1000,
  max: 200,
});

app.use("/api/", generalLimiter);
app.use("/api/sessions", strictLimiter);
// /api/users/profile also redeems invites, so it gets the strict limiter.
app.use("/api/users/profile", strictLimiter);
app.use("/api/users/invites/redeem", strictLimiter);
app.use("/api/evaluations", evaluationLimiter);

app.use("/api/scenarios", scenarioRoutes);
app.use("/api/users", userRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/templates", templateRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness probe: returns 200 only if Firestore is reachable (or in no-firebase mode).
app.get("/ready", async (req, res) => {
  const { hasFirebaseConfig, db } = require("./config/firebase");

  if (!hasFirebaseConfig || !db) {
    return res.status(200).json({
      status: "ok",
      firebase: "not-configured",
    });
  }

  try {
    // List with limit(1) — Firestore reserves "__" ids and rejected the old "__ready_probe__", falsely reporting not-ready.
    await db.collection("users").limit(1).get();
    res.status(200).json({ status: "ok", firebase: "connected" });
  } catch (error) {
    res.status(503).json({
      status: "not-ready",
      error: `Firebase unreachable: ${error.message}`,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  // Log only message/status — the full error object may contain sensitive data.
  const numericStatus = Number(err.status);
  const status = Number.isInteger(numericStatus) ? numericStatus : 500;
  const message = status === 500 ? "Internal server error" : err.message;

  if (status === 500) {
    console.error(`[500] ${err.message}`);
  } else {
    console.warn(`[${status}] ${err.message}`);
  }

  res.status(status).json({ error: message });
});

// Cleanup runs on a 5-minute interval (not per-request) to avoid write-on-read cost on the hot path.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer = null;

function startSessionCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    sessionStore
      .cleanupExpired(SESSION_TTL_MS)
      .catch((err) => console.error("Session cleanup failed:", err.message));
  }, CLEANUP_INTERVAL_MS);
  // Don't keep the process alive just for cleanup.
  cleanupTimer.unref();
  console.log(`Session cleanup interval started (every ${CLEANUP_INTERVAL_MS / 1000}s, TTL=${SESSION_TTL_MS / 1000}s)`);
}

function stopSessionCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  stopSessionCleanup();

  if (server) {
    server.close(() => {
      console.log("All connections closed. Exiting.");
      process.exit(0);
    });

    // Force-exit after 10s if connections don't close.
    setTimeout(() => {
      console.error("Forcing exit after 10s timeout.");
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled promise rejection:", reason instanceof Error ? reason.message : reason);
});

process.on("uncaughtException", (error) => {
  console.error(`Uncaught exception: ${error.message}`);
  // Process state may be corrupted — attempt graceful shutdown.
  gracefulShutdown("uncaughtException");
});

let server = null;

async function startServer() {
  await ensureFirestoreCollections();

  startSessionCleanup();

  server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});
