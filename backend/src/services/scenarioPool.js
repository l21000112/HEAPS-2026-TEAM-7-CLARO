// Static seed data is import-only for first-boot seeding; runtime reads come exclusively from Firestore and throw 503 (no in-memory fallback) so missing env vars fail loud.
const { scenarios: staticCallScenarios } = require("../data/scenarios");
const { whatsappScenarios: staticWhatsAppScenarios } = require("../data/whatsappScenarios");
const { marketplaceScenarios: staticMarketplaceScenarios } = require("../data/marketplaceScenarios");
const crypto = require("crypto");
const { db, hasFirebaseConfig } = require("../config/firebase");
const { cleanObject, clone, createHttpError, createId } = require("../utils/database");
const {
  buildScenarioDocument,
  sanitizeScenarioForClient,
  toOwnerScenario,
  toPublicScenario,
  toRuntimeScenario,
  validateScenarioContent,
  validateScenarioPayload,
  validateStatus,
} = require("./scenarioValidation");

const SCENARIO_COLLECTION = "scenarios";
const STATIC_SEED_VERSION = 1;

const FIRESTORE_NOT_CONFIGURED_ERROR = createHttpError(
  503,
  "Database is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to enable scenarios."
);

function requireFirestore() {
  if (!hasFirebaseConfig || !db) {
    throw FIRESTORE_NOT_CONFIGURED_ERROR;
  }
  return db;
}

function collection(database = db) {
  return database.collection(SCENARIO_COLLECTION);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function contentHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function seedComparableDocument(doc) {
  const cloneDoc = clone(doc);
  delete cloneDoc._seed;
  delete cloneDoc.createdAt;
  delete cloneDoc.updatedAt;
  delete cloneDoc.publishedAt;
  delete cloneDoc.randomKey;
  return cloneDoc;
}

function seedHashForDocument(doc) {
  return contentHash(seedComparableDocument(doc));
}

async function getPublishedScenarioDocs(type, { ownerUid = null, limit = 500 } = {}) {
  const database = requireFirestore();

  const publishedSnapshot = await collection(database)
    .where("status", "==", "published")
    .where("type", "==", type)
    .limit(limit)
    .get();

  let docs = publishedSnapshot.docs;

  if (ownerUid) {
    docs = docs.filter((doc) => {
      const data = doc.data();
      if (data.source !== "upload") return true;
      return data.ownerUid === ownerUid;
    });

    const ownSnapshot = await collection(database)
      .where("ownerUid", "==", ownerUid)
      .where("type", "==", type)
      .limit(limit)
      .get();

    const seenIds = new Set(docs.map((d) => d.id));
    for (const doc of ownSnapshot.docs) {
      if (!seenIds.has(doc.id)) {
        docs.push(doc);
        seenIds.add(doc.id);
      }
    }
  } else {
    docs = docs.filter((doc) => {
      const data = doc.data();
      if (data.source === "upload") return false;
      return true;
    });
  }

  return docs;
}

async function pickPublishedScenario(type, ownerUid = null) {
  const database = requireFirestore();

  // Try O(1) randomKey-based selection first (needs a composite index on status/type/randomKey); fall back to batch loading if the index is missing.
  try {
    const doc = await pickByRandomKey(database, type, ownerUid);
    if (doc) {
      return toRuntimeScenario(doc);
    }
  } catch (error) {
    console.warn(
      `randomKey pick failed for ${type} (index may be missing), falling back to batch: ${error.message}`
    );
  }

  let docs;
  try {
    docs = await getPublishedScenarioDocs(type, { ownerUid, limit: 50 });
  } catch (error) {
    console.error(`Failed to load ${type} scenarios from Firestore:`, error.message);
    throw createHttpError(500, "Failed to load scenarios");
  }

  if (docs.length === 0) {
    const label = type === "phone_call" ? "call" : type === "whatsapp" ? "WhatsApp" : type;
    throw createHttpError(404, `No ${label} scenarios available`);
  }

  const doc = docs[Math.floor(Math.random() * docs.length)];
  return toRuntimeScenario(doc);
}

async function pickByRandomKey(database, type, ownerUid) {
  const rand = Math.random();
  const baseQuery = collection(database)
    .where("status", "==", "published")
    .where("type", "==", type);

  let snapshot = await baseQuery
    .where("randomKey", ">=", rand)
    .orderBy("randomKey")
    .limit(5)
    .get();

  // Wrap around if nothing found (rand was near 1.0).
  if (snapshot.empty) {
    snapshot = await baseQuery
      .where("randomKey", "<", rand)
      .orderBy("randomKey")
      .limit(5)
      .get();
  }

  if (snapshot.empty) return null;

  const matching = snapshot.docs.filter((doc) => {
    const data = doc.data();
    if (ownerUid) {
      return data.source !== "upload" || data.ownerUid === ownerUid;
    }
    return data.source !== "upload";
  });

  if (matching.length === 0) return null;
  return matching[Math.floor(Math.random() * matching.length)];
}

async function listPublishedScenarios(type, ownerUid = null) {
  const database = requireFirestore();

  let docs;
  try {
    docs = await getPublishedScenarioDocs(type, { ownerUid });
  } catch (error) {
    console.error(`Failed to list ${type} scenarios from Firestore:`, error.message);
    throw createHttpError(500, "Failed to load scenarios");
  }

  return docs.map(toPublicScenario).filter(Boolean);
}

async function pickCallScenario(ownerUid) {
  return pickPublishedScenario("phone_call", ownerUid);
}

async function pickWhatsAppScenario(ownerUid) {
  return pickPublishedScenario("whatsapp", ownerUid);
}

async function pickMarketplaceScenario(ownerUid) {
  return pickPublishedScenario("marketplace", ownerUid);
}

async function pickPublicCallScenario(ownerUid) {
  return sanitizeScenarioForClient(await pickCallScenario(ownerUid), "phone_call");
}

async function pickPublicWhatsAppScenario(ownerUid) {
  return sanitizeScenarioForClient(await pickWhatsAppScenario(ownerUid), "whatsapp");
}

// Deprecated: use pickPublishedScenario("marketplace", ownerUid) instead.
function pickRandomStaticMarketplaceScenario() {
  if (staticMarketplaceScenarios.length === 0) {
    throw createHttpError(404, `No marketplace scenarios available`);
  }
  const randomIndex = Math.floor(Math.random() * staticMarketplaceScenarios.length);
  return staticMarketplaceScenarios[randomIndex];
}

// Deprecated: use getPublicScenarioById(id, "marketplace") instead.
function getStaticMarketplaceScenarioById(id) {
  const scenario = staticMarketplaceScenarios.find(s => String(s.id) === String(id));
  if (!scenario) {
    throw createHttpError(404, `Marketplace scenario with ID ${id} not found`);
  }
  return scenario;
}

function sanitizeMarketplaceScenarioForClient(scenario) {
  if (!scenario) return null;
  const resolvedType = scenario.products ? "marketplace" : null;
  // If it came from Firestore, use the shared sanitizer which already handles all marketplace fields.
  if (resolvedType) {
    return sanitizeScenarioForClient(scenario, "marketplace");
  }
  // Legacy static-data path (seed only).
  return {
    id: scenario.id,
    type: "marketplace",
    isScam: scenario.isScam,
    taskDescription: scenario.taskDescription,
    targetProductId: scenario.targetProductId,
    products: scenario.products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description,
      imageUrl: p.imageUrl,
      sellerName: p.sellerName,
      isOfficialSeller: p.isOfficialSeller,
      soldCount: p.soldCount,
      rating: p.rating,
      reviewCount: p.reviewCount,
      reviews: p.reviews,
      reason: p.reason,
    })),
  };
}

async function pickPublicMarketplaceScenario(ownerUid) {
  const scenario = await pickPublishedScenario("marketplace", ownerUid);
  return sanitizeScenarioForClient(scenario, "marketplace");
}

async function listCallScenarios(ownerUid) {
  return listPublishedScenarios("phone_call", ownerUid);
}

async function listWhatsAppScenarios(ownerUid) {
  return listPublishedScenarios("whatsapp", ownerUid);
}

async function listMarketplaceScenarios(ownerUid) {
  return listPublishedScenarios("marketplace", ownerUid);
}

async function getScenarioDocByIdOrPublicId(database, scenarioId, type) {
  const id = scenarioId == null ? "" : String(scenarioId).trim();
  if (!id) return null;

  const direct = await collection(database).doc(id).get();
  if (direct.exists && (!type || direct.data().type === type)) {
    return direct;
  }

  const publicIdCandidates = [id];
  const numericId = Number(id);
  if (Number.isFinite(numericId) && String(numericId) === id) {
    publicIdCandidates.push(numericId);
  }

  for (const publicId of publicIdCandidates) {
    const snapshot = await collection(database)
      .where("publicContent.id", "==", publicId)
      .limit(10)
      .get();
    const match = snapshot.docs.find((doc) => !type || doc.data().type === type);
    if (match) return match;
  }

  if (Number.isFinite(numericId)) {
    const snapshot = await collection(database)
      .where("legacyId", "==", numericId)
      .limit(10)
      .get();
    const match = snapshot.docs.find((doc) => !type || doc.data().type === type);
    if (match) return match;
  }

  return null;
}

async function getScenarioById(scenarioId, type) {
  const database = requireFirestore();
  const doc = await getScenarioDocByIdOrPublicId(database, scenarioId, type);
  if (!doc || !doc.exists) {
    return null;
  }
  return toRuntimeScenario(doc);
}

async function getPublicScenarioById(scenarioId, type) {
  const runtime = await getScenarioById(scenarioId, type);
  if (!runtime) return null;
  const resolvedType =
    type ||
    (runtime.contact ? "whatsapp" : runtime.products ? "marketplace" : "phone_call");
  return sanitizeScenarioForClient(runtime, resolvedType);
}

function createScenarioId() {
  return createId("upload").replace(/[^A-Za-z0-9_-]/g, "_");
}

async function createScenario(payload, user) {
  const database = requireFirestore();
  // Moderation gate: uploads default to "draft" and don't surface to students until PATCHed to "published".
  const data = validateScenarioPayload(payload, { defaultStatus: "draft" });
  const now = new Date().toISOString();
  const scenarioId = createScenarioId();
  const scenario = buildScenarioDocument({
    scenarioId,
    type: data.type,
    content: data.content,
    status: data.status,
    source: "upload",
    sourceId: scenarioId,
    title: data.title,
    description: data.description,
    tags: data.tags,
    ownerUid: user.uid,
    ownerEmail: user.email,
    now,
  });

  await collection(database).doc(scenarioId).set(scenario);
  return toOwnerScenario({ id: scenarioId, ...scenario });
}

async function getOwnedUploadedScenario(scenarioId, ownerUid) {
  const database = requireFirestore();
  const doc = await collection(database).doc(scenarioId).get();
  if (!doc.exists) {
    throw createHttpError(404, "Scenario not found");
  }

  const scenario = doc.data();
  if (scenario.ownerUid !== ownerUid) {
    throw createHttpError(403, "Forbidden");
  }
  if (scenario.source !== "upload") {
    throw createHttpError(403, "Only uploaded scenarios can be modified here");
  }

  return doc;
}

async function updateScenario(scenarioId, payload, ownerUid) {
  const doc = await getOwnedUploadedScenario(scenarioId, ownerUid);
  const existing = doc.data();
  if (payload?.type !== undefined && payload.type !== existing.type) {
    throw createHttpError(400, "Scenario type cannot be changed");
  }
  const data = validateScenarioPayload(payload, {
    partial: true,
    existingType: existing.type,
    defaultStatus: existing.status || "published",
  });

  const now = new Date().toISOString();
  const patch = { updatedAt: now };

  if (data.status !== undefined) {
    patch.status = validateStatus(data.status, existing.status || "published");
    if (patch.status === "published" && existing.status !== "published") {
      patch.publishedAt = now;
    }
  }

  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;

  if (data.content !== undefined) {
    const rebuilt = buildScenarioDocument({
      scenarioId: existing.publicContent?.id ?? doc.id,
      type: existing.type,
      content: data.content,
      status: patch.status || existing.status || "published",
      source: existing.source,
      sourceId: existing.sourceId || doc.id,
      legacyId: existing.legacyId,
      title: data.title !== undefined ? data.title : existing.title,
      description:
        data.description !== undefined ? data.description : existing.description,
      tags: data.tags !== undefined ? data.tags : existing.tags || [],
      ownerUid: existing.ownerUid,
      ownerEmail: existing.ownerEmail,
      now,
      createdAt: existing.createdAt,
      randomKey: existing.randomKey,
      extra: { publishedAt: patch.publishedAt || existing.publishedAt || null },
    });

    Object.assign(patch, {
      title: rebuilt.title,
      description: rebuilt.description,
      tags: rebuilt.tags,
      publicContent: rebuilt.publicContent,
      evaluation: rebuilt.evaluation,
      simulation: rebuilt.simulation,
      schemaVersion: rebuilt.schemaVersion,
      publishedAt: rebuilt.publishedAt,
    });
  }

  await doc.ref.update(cleanObject(patch));
  const updated = await doc.ref.get();
  return toOwnerScenario(updated);
}

async function deleteScenario(scenarioId, ownerUid) {
  const doc = await getOwnedUploadedScenario(scenarioId, ownerUid);
  await doc.ref.update({ status: "archived", updatedAt: new Date().toISOString() });
}

function templateScenarioId(templateId, type) {
  if (type === "phone_call") return `tpl_call_${templateId}`;
  if (type === "whatsapp") return `tpl_wa_${templateId}`;
  if (type === "marketplace") return `tpl_mkt_${templateId}`;
  return `tpl_${type}_${templateId}`;
}

function normalizeTemplateContent(template, type) {
  const content = template.content || {};

  if (type === "phone_call") {
    const options = Array.isArray(content.options) ? content.options : [];
    if (options.length === 0) return null;
    return validateScenarioContent("phone_call", {
      isScam: content.isScam !== false,
      callerName: content.callerName || template.title || "Unknown",
      dialogue: content.dialogue || template.description || "",
      declineReason:
        content.declineReason ||
        (content.isScam !== false
          ? "Hanging up is the safest response to a suspicious call."
          : "Answer cautiously, but be ready to hang up if they ask for personal details."),
      declineReasonSimple: content.declineReasonSimple,
      correctReason: content.correctReason,
      correctReasonSimple: content.correctReasonSimple,
      options: options.map((option, index) => ({
        id: option.id != null ? option.id : index + 1,
        text: option.text || "",
        isCorrect: option.isCorrect === true,
        reason: option.reason || "Review this choice against the warning signs.",
        reasonSimple: option.reasonSimple,
      })),
    });
  }

  if (type === "marketplace") {
    const products = Array.isArray(content.products) ? content.products : [];
    if (products.length === 0) return null;
    return validateScenarioContent("marketplace", {
      isScam: content.isScam !== false,
      taskDescription: content.taskDescription || template.title || "Find the right product.",
      targetProductId: content.targetProductId,
      declineReason:
        content.declineReason ||
        "Always verify the seller and compare prices before paying.",
      declineReasonSimple: content.declineReasonSimple,
      correctReason: content.correctReason,
      correctReasonSimple: content.correctReasonSimple,
      products: products.map((product, index) => ({
        id: product.id != null ? product.id : `prod_${index + 1}`,
        name: product.name || "Untitled product",
        price: typeof product.price === "number" ? product.price : 0,
        description: product.description || "",
        imageUrl: product.imageUrl,
        sellerName: product.sellerName || "Unknown seller",
        isOfficialSeller: product.isOfficialSeller === true,
        soldCount: product.soldCount,
        rating: product.rating,
        reviewCount: product.reviewCount,
        reviews: product.reviews,
      })),
    });
  }

  const openingMessages = Array.isArray(content.openingMessages) ? content.openingMessages : [];
  if (openingMessages.length === 0) return null;
  return validateScenarioContent("whatsapp", {
    isScam: content.isScam !== false,
    contact: {
      displayName: content.contact?.displayName || template.title || "Unknown",
      phoneNumber: content.contact?.phoneNumber,
    },
    scenarioBrief:
      content.scenarioBrief ||
      (content.isScam !== false
        ? "You are a scammer on WhatsApp. Stay in character."
        : "You are a regular contact on WhatsApp."),
    declineReason:
      content.declineReason ||
      (content.isScam !== false
        ? "Blocking and reporting is the safest response."
        : "That was a genuine message. Verify before blocking."),
      correctReason: content.correctReason,
    openingMessages: openingMessages.map((message, index) => ({
      id: message.id || `m${index + 1}`,
      direction: "inbound",
      body: message.body || "",
    })),
    failPatterns: Array.isArray(content.failPatterns) ? content.failPatterns : [],
    passPatterns: Array.isArray(content.passPatterns) ? content.passPatterns : [],
  });
}

async function archiveTemplateScenario(templateId, type) {
  if (!hasFirebaseConfig || !db || !["phone_call", "whatsapp", "marketplace"].includes(type)) return;
  const scenarioId = templateScenarioId(templateId, type);
  const ref = collection().doc(scenarioId);
  const doc = await ref.get();
  if (doc.exists && doc.data().source === "template") {
    await ref.update({ status: "archived", updatedAt: new Date().toISOString() });
  }
}

async function syncTemplateScenarioFromTemplate(templateId, template) {
  if (!hasFirebaseConfig || !db) return { skipped: true };
  if (!template || !["phone_call", "whatsapp", "marketplace"].includes(template.type)) {
    return { skipped: true };
  }

  if (template.status !== "published") {
    await archiveTemplateScenario(templateId, template.type);
    return { archived: true };
  }

  const content = normalizeTemplateContent(template, template.type);
  if (!content) return { skipped: true };

  const scenarioId = templateScenarioId(templateId, template.type);
  const ref = collection().doc(scenarioId);
  const existing = await ref.get();
  const now = new Date().toISOString();
  const scenario = buildScenarioDocument({
    scenarioId,
    type: template.type,
    content,
    status: "published",
    source: "template",
    sourceId: templateId,
    title: template.title,
    description: template.description,
    tags: Array.isArray(template.tags) ? template.tags : [],
    ownerUid: template.ownerUid || null,
    ownerEmail: template.ownerEmail || null,
    now,
    createdAt: existing.exists ? existing.data().createdAt : template.createdAt,
    randomKey: existing.exists ? existing.data().randomKey : undefined,
  });

  await ref.set(scenario);
  return { upserted: true, scenarioId };
}

// Public for seed/migration parity; the `target: <productId>` suffix was dropped because it leaked an internal field into the teacher library.
function marketplaceSeedDescription(scenario) {
  return `${scenario.products.length} products`;
}

function staticScenarioDefinitions(now) {
  function stripLegacyId(scenario) {
    const { id, ...rest } = scenario;
    return rest;
  }

  return [
    ...staticCallScenarios.map((scenario) => ({
      scenarioId: scenario.id,
      docId: `static_phone_call_${scenario.id}`,
      seedKey: `static:phone_call:${scenario.id}`,
      doc: buildScenarioDocument({
        scenarioId: scenario.id,
        type: "phone_call",
        content: stripLegacyId(scenario),
        status: "published",
        source: "static",
        sourceId: String(scenario.id),
        legacyId: scenario.id,
        title: scenario.callerName,
        description: scenario.dialogue.slice(0, 180),
        tags: [],
        ownerUid: "system_static_seed",
        ownerEmail: null,
        now,
      }),
    })),
    ...staticWhatsAppScenarios.map((scenario) => ({
      scenarioId: scenario.id,
      docId: `static_whatsapp_${scenario.id}`,
      seedKey: `static:whatsapp:${scenario.id}`,
      doc: buildScenarioDocument({
        scenarioId: scenario.id,
        type: "whatsapp",
        content: stripLegacyId(scenario),
        status: "published",
        source: "static",
        sourceId: String(scenario.id),
        legacyId: scenario.id,
        title: scenario.contact.displayName,
        description: scenario.openingMessages[0]?.body?.slice(0, 180) || "",
        tags: [],
        ownerUid: "system_static_seed",
        ownerEmail: null,
        now,
      }),
    })),
    ...staticMarketplaceScenarios.map((scenario) => ({
      scenarioId: scenario.id,
      docId: `static_marketplace_${scenario.id}`,
      seedKey: `static:marketplace:${scenario.id}`,
      doc: buildScenarioDocument({
        scenarioId: scenario.id,
        type: "marketplace",
        content: stripLegacyId(scenario),
        status: "published",
        source: "static",
        sourceId: String(scenario.id),
        legacyId: scenario.id,
        title: scenario.taskDescription.slice(0, 80),
        description: marketplaceSeedDescription(scenario),
        tags: [],
        ownerUid: "system_static_seed",
        ownerEmail: null,
        now,
      }),
    })),
  ];
}

// Re-seeds a single scenario with backup for revert; { force: true } bypasses the `skipped_manual_change` guard to repair drifted docs.
async function reseedStaticScenario(type, scenarioId, { force = false } = {}) {
  if (!hasFirebaseConfig || !db) {
    throw new Error("Firebase is not configured");
  }
  const now = new Date().toISOString();
  const definition = staticScenarioDefinitions(now).find(
    (d) => d.seedKey === `static:${type}:${scenarioId}`
  );
  if (!definition) {
    throw new Error(`No static seed definition for ${type}:${scenarioId}`);
  }

  const ref = collection().doc(definition.docId);
  const existing = await ref.get();
  const backup = existing.exists ? { id: definition.docId, ...existing.data() } : null;

  const target = clone(definition.doc);
  const targetHash = seedHashForDocument(target);
  target._seed = {
    key: definition.seedKey,
    seedVersion: STATIC_SEED_VERSION,
    contentHash: targetHash,
    lastSeededAt: now,
  };

  if (existing.exists) {
    const existingData = existing.data();
    target.createdAt = existingData.createdAt || target.createdAt;
    target.randomKey =
      typeof existingData.randomKey === "number" ? existingData.randomKey : target.randomKey;
    if (
      !force &&
      existingData._seed?.key &&
      existingData._seed.key !== definition.seedKey
    ) {
      return { action: "skipped_existing_non_seed", backup, docId: definition.docId };
    }
  }

  await ref.set(target);
  return {
    action: existing.exists ? "updated" : "created",
    backup,
    docId: definition.docId,
    contentHash: targetHash,
  };
}

async function upsertSeededScenario(definition) {
  const ref = collection().doc(definition.docId);
  const existing = await ref.get();
  const target = clone(definition.doc);
  const targetHash = seedHashForDocument(target);
  target._seed = {
    key: definition.seedKey,
    seedVersion: STATIC_SEED_VERSION,
    contentHash: targetHash,
    lastSeededAt: new Date().toISOString(),
  };

  if (!existing.exists) {
    await ref.set(target);
    return "created";
  }

  const existingData = existing.data();
  if (existingData._seed?.key !== definition.seedKey) {
    return "skipped_existing_non_seed";
  }

  const existingHash = seedHashForDocument(existingData);
  if (existingData._seed?.contentHash && existingHash !== existingData._seed.contentHash) {
    return "skipped_manual_change";
  }

  if (existingData._seed?.contentHash === targetHash) {
    await ref.update({ "_seed.lastSeededAt": target._seed.lastSeededAt });
    return "unchanged";
  }

  target.createdAt = existingData.createdAt || target.createdAt;
  target.randomKey = typeof existingData.randomKey === "number" ? existingData.randomKey : target.randomKey;
  await ref.set(target);
  return "updated";
}

async function seedPublishedTemplates() {
  const result = { upserted: 0, skipped: 0, archived: 0 };
  const snapshot = await db
    .collection("templates")
    .where("status", "==", "published")
    .get();

  for (const doc of snapshot.docs) {
    const template = { id: doc.id, ...doc.data() };
    if (!["phone_call", "whatsapp", "marketplace"].includes(template.type)) {
      result.skipped += 1;
      continue;
    }

    try {
      const sync = await syncTemplateScenarioFromTemplate(doc.id, template);
      if (sync.upserted) result.upserted += 1;
      else if (sync.archived) result.archived += 1;
      else result.skipped += 1;
    } catch (error) {
      result.skipped += 1;
      console.warn(`Could not port template ${doc.id} to scenarios: ${error.message}`);
    }
  }

  return result;
}

async function seedPlayableScenarios() {
  if (process.env.FIRESTORE_SEED_SCENARIOS === "false") {
    return { skipped: true, reason: "FIRESTORE_SEED_SCENARIOS=false" };
  }
  if (!hasFirebaseConfig || !db) {
    return { skipped: true, reason: "Firebase is not configured" };
  }

  const now = new Date().toISOString();
  const result = {
    skipped: false,
    static: { created: 0, updated: 0, unchanged: 0, skipped: 0 },
    templates: { upserted: 0, skipped: 0, archived: 0 },
  };

  for (const definition of staticScenarioDefinitions(now)) {
    try {
      const status = await upsertSeededScenario(definition);
      if (status === "created") result.static.created += 1;
      else if (status === "updated") result.static.updated += 1;
      else if (status === "unchanged") result.static.unchanged += 1;
      else result.static.skipped += 1;
    } catch (error) {
      result.static.skipped += 1;
      console.warn(`Could not seed scenario ${definition.docId}: ${error.message}`);
    }
  }

  try {
    result.templates = await seedPublishedTemplates();
  } catch (error) {
    console.warn(`Could not port published templates to scenarios: ${error.message}`);
  }

  return result;
}

module.exports = {
  archiveTemplateScenario,
  createScenario,
  deleteScenario,
  getPublicScenarioById,
  getScenarioById,
  listCallScenarios,
  listMarketplaceScenarios,
  listWhatsAppScenarios,
  marketplaceSeedDescription,
  pickCallScenario,
  pickMarketplaceScenario,
  pickPublicCallScenario,
  pickPublicMarketplaceScenario,
  pickPublicWhatsAppScenario,
  pickWhatsAppScenario,
  reseedStaticScenario,
  seedPlayableScenarios,
  syncTemplateScenarioFromTemplate,
  updateScenario,
};
