const express = require("express");
const { optionalVerifyToken, verifyToken, requireRole } = require("../middleware/auth");
const scenarioPool = require("../services/scenarioPool");
const { createHttpError } = require("../utils/database");
const {
  translateMarketplaceScenario,
  normalizeLanguage,
} = require("../services/translation");

const router = express.Router();

// Scope scenarios to system + the authenticated user's own uploads.
function ownerParam(req) {
  return req.user?.uid || null;
}

// In-memory cursor pagination: cursor is the last item's id; sets X-Next-Cursor.
function paginateScenarios(res, scenarios, req) {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const cursor = req.query.cursor;

  let startIndex = 0;
  if (cursor) {
    const idx = scenarios.findIndex((s) => String(s.id) === String(cursor));
    if (idx === -1) {
      throw createHttpError(400, "cursor does not reference a scenario in this list");
    }
    startIndex = idx + 1;
  }

  const page = scenarios.slice(startIndex, startIndex + limit);
  if (startIndex + limit < scenarios.length && page.length) {
    res.setHeader("X-Next-Cursor", page[page.length - 1].id);
  }
  return page;
}

// Public reads always return client-safe shapes; static arrays are a dev fallback when Firebase isn't configured.

router.get("/", optionalVerifyToken, async (req, res, next) => {
  try {
    const type = (req.query.type || "phone_call").toString();
    const uid = ownerParam(req);
    let scenarios;
    if (type === "whatsapp") scenarios = await scenarioPool.listWhatsAppScenarios(uid);
    else if (type === "marketplace") scenarios = await scenarioPool.listMarketplaceScenarios(uid);
    else scenarios = await scenarioPool.listCallScenarios(uid);
    return res.json(paginateScenarios(res, scenarios, req));
  } catch (err) {
    next(err);
  }
});

router.get("/random", optionalVerifyToken, async (req, res, next) => {
  try {
    const type = (req.query.type || "phone_call").toString();
    const uid = ownerParam(req);
    if (type === "whatsapp") return res.json(await scenarioPool.pickPublicWhatsAppScenario(uid));
    if (type === "marketplace") return res.json(await scenarioPool.pickPublicMarketplaceScenario(uid));
    return res.json(await scenarioPool.pickPublicCallScenario(uid));
  } catch (err) {
    next(err);
  }
});

router.get("/whatsapp", optionalVerifyToken, async (req, res, next) => {
  try {
    res.json(await scenarioPool.listWhatsAppScenarios(ownerParam(req)));
  } catch (err) {
    next(err);
  }
});

router.get("/whatsapp/random", optionalVerifyToken, async (req, res, next) => {
  try {
    res.json(await scenarioPool.pickPublicWhatsAppScenario(ownerParam(req)));
  } catch (err) {
    next(err);
  }
});

// `lang` drives best-effort marketplace translation; English/unknown langs pass through untouched.
function marketplaceLang(req) {
  return normalizeLanguage(req.query.lang);
}

router.get("/marketplace", optionalVerifyToken, async (req, res, next) => {
  try {
    const lang = marketplaceLang(req);
    const scenarios = await scenarioPool.listMarketplaceScenarios(ownerParam(req));
    if (lang !== "en") {
      res.json(await Promise.all(scenarios.map((s) => translateMarketplaceScenario(s, lang))));
    } else {
      res.json(scenarios);
    }
  } catch (err) {
    next(err);
  }
});

router.get("/marketplace/random", optionalVerifyToken, async (req, res, next) => {
  try {
    const lang = marketplaceLang(req);
    const scenario = await scenarioPool.pickPublicMarketplaceScenario(ownerParam(req));
    res.json(lang !== "en" ? await translateMarketplaceScenario(scenario, lang) : scenario);
  } catch (err) {
    next(err);
  }
});

router.get("/marketplace/:id", optionalVerifyToken, async (req, res, next) => {
  try {
    const scenario = await scenarioPool.getPublicScenarioById(req.params.id, "marketplace");
    if (!scenario) {
      throw createHttpError(404, "Marketplace scenario not found");
    }
    const lang = marketplaceLang(req);
    res.json(lang !== "en" ? await translateMarketplaceScenario(scenario, lang) : scenario);
  } catch (err) {
    next(err);
  }
});

router.post("/marketplace", verifyToken, requireRole("teacher"), async (req, res, next) => {
  try {
    const payload = { ...(req.body || {}), type: "marketplace" };
    const scenario = await scenarioPool.createScenario(payload, req.user);
    res.status(201).json(scenario);
  } catch (err) {
    next(err);
  }
});

// Bulk create writes sequentially so one failed entry doesn't abort the whole batch.

router.post("/bulk", verifyToken, requireRole("teacher"), async (req, res, next) => {
  try {
    const list = Array.isArray(req.body?.scenarios) ? req.body.scenarios : null;
    if (!list) {
      throw createHttpError(400, "scenarios must be an array");
    }
    if (list.length === 0) {
      return res.status(201).json({ created: 0, failed: 0, results: [] });
    }
    if (list.length > 50) {
      throw createHttpError(400, "scenarios must not exceed 50 items per request");
    }

    const results = [];
    let created = 0;
    let failed = 0;

    for (let index = 0; index < list.length; index += 1) {
      try {
        const scenario = await scenarioPool.createScenario(list[index], req.user);
        created += 1;
        results.push({ index, status: "ok", id: scenario.id });
      } catch (error) {
        failed += 1;
        results.push({
          index,
          status: "error",
          message: error.message || "Failed to create scenario",
        });
      }
    }

    res.status(201).json({ created, failed, results });
  } catch (err) {
    next(err);
  }
});

router.post("/", verifyToken, requireRole("teacher"), async (req, res, next) => {
  try {
    const scenario = await scenarioPool.createScenario(req.body, req.user);
    res.status(201).json(scenario);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", verifyToken, requireRole("teacher"), async (req, res, next) => {
  try {
    const scenario = await scenarioPool.updateScenario(
      req.params.id,
      req.body,
      req.user.uid
    );
    res.json(scenario);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", verifyToken, requireRole("teacher"), async (req, res, next) => {
  try {
    const scenario = await scenarioPool.updateScenario(
      req.params.id,
      req.body,
      req.user.uid
    );
    res.json(scenario);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", verifyToken, requireRole("teacher"), async (req, res, next) => {
  try {
    await scenarioPool.deleteScenario(req.params.id, req.user.uid);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
