const express = require("express");
const { requireRole, verifyToken } = require("../middleware/auth");
const scenarioPool = require("../services/scenarioPool");
const {
  cleanObject,
  createHttpError,
  getDbOrThrow,
  isPlainObject,
  parseLimit,
} = require("../utils/database");

const router = express.Router();

const TEMPLATE_TYPES = new Set([
  "phone_call",
  "chat_message",
  "whatsapp",
  "instagram_story",
  "marketplace",
]);
const TEMPLATE_STATUSES = new Set(["draft", "published", "archived"]);

router.use(verifyToken);

function serializeDoc(doc, requesterUid) {
  const template = {
    id: doc.id,
    ...doc.data(),
  };

  if (template.ownerUid === requesterUid) {
    return template;
  }

  // Non-owners get metadata only — published templates contain answer keys (playable content is via /api/scenarios).
  const { content, ownerEmail, ownerUid, ...metadata } = template;
  return metadata;
}

async function syncPlayableTemplate(templateId, template) {
  try {
    await scenarioPool.syncTemplateScenarioFromTemplate(templateId, template);
  } catch (error) {
    console.warn(`Template ${templateId} was saved but not synced as a scenario: ${error.message}`);
  }
}

function validateTemplateBody(body, partial = false) {
  if (!isPlainObject(body)) {
    throw createHttpError(400, "Request body is required");
  }

  const data = {};

  if (!partial || body.type !== undefined) {
    const type = typeof body.type === "string" ? body.type.trim() : "";
    if (!TEMPLATE_TYPES.has(type)) {
      throw createHttpError(400, "Valid type is required");
    }
    data.type = type;
  }

  if (!partial || body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      throw createHttpError(400, "title is required");
    }
    data.title = title;
  }

  if (body.description !== undefined) {
    data.description =
      typeof body.description === "string" ? body.description.trim() : "";
  }

  if (!partial || body.content !== undefined) {
    if (!isPlainObject(body.content)) {
      throw createHttpError(400, "content object is required");
    }
    if (JSON.stringify(body.content).length > 50000) {
      throw createHttpError(400, "content must not exceed 50000 bytes");
    }
    data.content = body.content;
  }

  if (body.status !== undefined) {
    const status = typeof body.status === "string" ? body.status.trim() : "";
    if (!TEMPLATE_STATUSES.has(status)) {
      throw createHttpError(400, "Valid status is required");
    }
    data.status = status;
  } else if (!partial) {
    data.status = "draft";
  }

  if (body.tags !== undefined) {
    if (
      !Array.isArray(body.tags) ||
      body.tags.some((tag) => typeof tag !== "string")
    ) {
      throw createHttpError(400, "tags must be an array of strings");
    }
    if (body.tags.length > 1000) {
      throw createHttpError(400, "tags must not exceed 1000 items");
    }
    data.tags = body.tags.slice(0, 20).map((tag) => tag.trim()).filter(Boolean);
  }

  return data;
}

async function getOwnedTemplate(database, templateId, uid) {
  const doc = await database.collection("templates").doc(templateId).get();

  if (!doc.exists) {
    throw createHttpError(404, "Template not found");
  }

  const template = doc.data();
  if (template.ownerUid !== uid) {
    throw createHttpError(403, "Forbidden");
  }

  return doc;
}

router.post("/", requireRole("teacher"), async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const now = new Date().toISOString();
    const template = cleanObject({
      ...validateTemplateBody(req.body),
      ownerUid: req.user.uid,
      ownerEmail: req.user.email,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await database.collection("templates").add(template);
    await syncPlayableTemplate(doc.id, { id: doc.id, ...template });
    res.status(201).json({ id: doc.id, ...template });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const limit = parseLimit(req.query.limit);
    let query = database.collection("templates");

    if (req.query.mine === "true") {
      query = query.where("ownerUid", "==", req.user.uid);
    } else {
      query = query.where("status", "==", "published");
    }

    if (
      typeof req.query.type === "string" &&
      TEMPLATE_TYPES.has(req.query.type)
    ) {
      query = query.where("type", "==", req.query.type);
    }

    const snapshot = await query.orderBy("updatedAt", "desc").limit(limit).get();
    res.json(snapshot.docs.map((doc) => serializeDoc(doc, req.user.uid)));
  } catch (err) {
    next(err);
  }
});

router.get("/:templateId", async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const doc = await database.collection("templates").doc(req.params.templateId).get();

    if (!doc.exists) {
      throw createHttpError(404, "Template not found");
    }

    const template = doc.data();
    if (template.status !== "published" && template.ownerUid !== req.user.uid) {
      throw createHttpError(403, "Forbidden");
    }

    res.json(serializeDoc(doc, req.user.uid));
  } catch (err) {
    next(err);
  }
});

router.patch("/:templateId", requireRole("teacher"), async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const doc = await getOwnedTemplate(database, req.params.templateId, req.user.uid);
    const updates = cleanObject({
      ...validateTemplateBody(req.body, true),
      updatedAt: new Date().toISOString(),
    });

    await doc.ref.update(updates);
    const updated = await doc.ref.get();
    await syncPlayableTemplate(updated.id, { id: updated.id, ...updated.data() });
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    next(err);
  }
});

router.delete("/:templateId", requireRole("teacher"), async (req, res, next) => {
  try {
    const database = getDbOrThrow();
    const doc = await getOwnedTemplate(database, req.params.templateId, req.user.uid);
    const template = doc.data();
    await doc.ref.delete();
    await scenarioPool.archiveTemplateScenario(doc.id, template.type).catch((error) => {
      console.warn(`Template ${doc.id} scenario archive failed: ${error.message}`);
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
