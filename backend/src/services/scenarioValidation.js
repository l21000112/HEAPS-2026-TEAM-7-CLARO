const { cleanObject, clone, createHttpError, isPlainObject } = require("../utils/database");

const SCENARIO_TYPES = new Set(["phone_call", "whatsapp", "marketplace"]);
const SCENARIO_STATUSES = new Set(["draft", "published", "archived"]);
const MAX_SCENARIO_BYTES = 50000;
const MAX_TAGS = 20;

function byteLength(value) {
  return Buffer.byteLength(JSON.stringify(value || {}), "utf8");
}

function assertAllowedKeys(value, allowedKeys, path) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value || {})) {
    if (!allowed.has(key)) {
      throw createHttpError(400, `${path}.${key} is not allowed`);
    }
  }
}

function requirePlainObject(value, path) {
  if (!isPlainObject(value)) {
    throw createHttpError(400, `${path} must be an object`);
  }
  return value;
}

function requireString(value, path, maxLength) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw createHttpError(400, `${path} is required`);
  }
  if (text.length > maxLength) {
    throw createHttpError(400, `${path} must be at most ${maxLength} characters`);
  }
  return text;
}

function optionalString(value, path, maxLength) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw createHttpError(400, `${path} must be a string`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw createHttpError(400, `${path} must be at most ${maxLength} characters`);
  }
  return text;
}

function publicString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function publicId(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const id = value.trim();
    if (id && id.length <= 80 && !id.includes("/")) {
      return id;
    }
  }

  return fallback;
}

function sanitizePublicContact(contact, fallbackName = "Unknown") {
  const source = isPlainObject(contact) ? contact : {};
  const displayName = publicString(source.displayName, fallbackName) || fallbackName;
  const phoneNumber = publicString(source.phoneNumber);

  return cleanObject({
    displayName,
    phoneNumber: phoneNumber || undefined,
  });
}

function sanitizePublicOpeningMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message, index) => {
      const source = isPlainObject(message) ? message : {};
      const direction = publicString(source.direction, "inbound");

      return {
        id: publicId(source.id, `m${index + 1}`),
        direction: direction === "outbound" ? "outbound" : "inbound",
        body: publicString(source.body),
      };
    })
    .filter((message) => message.body);
}

function sanitizeStringList(value, maxItems = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeId(value, path) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const id = value.trim();
    if (id && id.length <= 80 && !id.includes("/")) {
      return id;
    }
  }

  throw createHttpError(400, `${path} must be a short string or number id`);
}

function validateStatus(value, fallback = "published") {
  if (value === undefined || value === null || value === "") return fallback;
  const status = typeof value === "string" ? value.trim() : "";
  if (!SCENARIO_STATUSES.has(status)) {
    throw createHttpError(400, "status must be draft, published, or archived");
  }
  return status;
}

function normalizeTags(tags) {
  if (tags === undefined) return [];
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
    throw createHttpError(400, "tags must be an array of strings");
  }
  if (tags.length > MAX_TAGS) {
    throw createHttpError(400, `tags must not exceed ${MAX_TAGS} items`);
  }

  const seen = new Set();
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TAGS);
}

function validatePhoneCallContent(content) {
  requirePlainObject(content, "content");
  assertAllowedKeys(
    content,
    [
      "isScam",
      "callerName",
      "dialogue",
      "declineReason",
      "declineReasonSimple",
      "correctReason",
      "correctReasonSimple",
      "options",
    ],
    "content"
  );

  if (typeof content.isScam !== "boolean") {
    throw createHttpError(400, "content.isScam boolean is required");
  }

  const callerName = requireString(content.callerName, "content.callerName", 120);
  const dialogue = requireString(content.dialogue, "content.dialogue", 6000);
  const declineReason = requireString(content.declineReason, "content.declineReason", 2500);
  const declineReasonSimple = optionalString(
    content.declineReasonSimple,
    "content.declineReasonSimple",
    2500
  );
  const correctReason = optionalString(content.correctReason, "content.correctReason", 2500);
  const correctReasonSimple = optionalString(
    content.correctReasonSimple,
    "content.correctReasonSimple",
    2500
  );

  if (!Array.isArray(content.options) || content.options.length === 0) {
    throw createHttpError(400, "content.options must be a non-empty array");
  }
  if (content.options.length > 8) {
    throw createHttpError(400, "content.options must not exceed 8 items");
  }

  const optionIds = new Set();
  const options = content.options.map((option, index) => {
    requirePlainObject(option, `content.options[${index}]`);
    assertAllowedKeys(
      option,
      ["id", "text", "isCorrect", "reason", "reasonSimple"],
      `content.options[${index}]`
    );

    const id = normalizeId(option.id, `content.options[${index}].id`);
    const key = String(id);
    if (optionIds.has(key)) {
      throw createHttpError(400, "content.options ids must be unique");
    }
    optionIds.add(key);

    if (typeof option.isCorrect !== "boolean") {
      throw createHttpError(400, `content.options[${index}].isCorrect boolean is required`);
    }

    return cleanObject({
      id,
      text: requireString(option.text, `content.options[${index}].text`, 1200),
      isCorrect: option.isCorrect,
      reason: requireString(option.reason, `content.options[${index}].reason`, 2500),
      reasonSimple: optionalString(
        option.reasonSimple,
        `content.options[${index}].reasonSimple`,
        2500
      ),
    });
  });

  if (!options.some((option) => option.isCorrect)) {
    throw createHttpError(400, "content.options must include at least one correct option");
  }

  return cleanObject({
    isScam: content.isScam,
    callerName,
    dialogue,
    declineReason,
    declineReasonSimple,
    correctReason,
    correctReasonSimple,
    options,
  });
}

function validateWhatsAppContent(content) {
  requirePlainObject(content, "content");
  assertAllowedKeys(
    content,
    ["isScam", "contact", "scenarioBrief", "declineReason", "declineReasonSimple", "correctReason", "correctReasonSimple", "openingMessages", "failPatterns", "passPatterns"],
    "content"
  );

  if (typeof content.isScam !== "boolean") {
    throw createHttpError(400, "content.isScam boolean is required");
  }

  const contact = requirePlainObject(content.contact, "content.contact");
  assertAllowedKeys(contact, ["displayName", "phoneNumber"], "content.contact");
  const phoneNumber = optionalString(contact.phoneNumber, "content.contact.phoneNumber", 40);
  if (phoneNumber !== undefined && phoneNumber && !/^[+\d\s().-]+$/.test(phoneNumber)) {
    throw createHttpError(400, "content.contact.phoneNumber contains invalid characters");
  }

  const declineReasonSimple = optionalString(
    content.declineReasonSimple,
    "content.declineReasonSimple",
    2500
  );
  const correctReason = optionalString(content.correctReason, "content.correctReason", 2500);
  const correctReasonSimple = optionalString(
    content.correctReasonSimple,
    "content.correctReasonSimple",
    2500
  );

  if (!Array.isArray(content.openingMessages) || content.openingMessages.length === 0) {
    throw createHttpError(400, "content.openingMessages must be a non-empty array");
  }
  if (content.openingMessages.length > 10) {
    throw createHttpError(400, "content.openingMessages must not exceed 10 items");
  }

  const messageIds = new Set();
  const openingMessages = content.openingMessages.map((message, index) => {
    requirePlainObject(message, `content.openingMessages[${index}]`);
    assertAllowedKeys(message, ["id", "direction", "body"], `content.openingMessages[${index}]`);
    const id = normalizeId(message.id, `content.openingMessages[${index}].id`);
    const key = String(id);
    if (messageIds.has(key)) {
      throw createHttpError(400, "content.openingMessages ids must be unique");
    }
    messageIds.add(key);

    const direction = typeof message.direction === "string" ? message.direction.trim() : "";
    if (direction !== "inbound") {
      throw createHttpError(400, "content.openingMessages must all have direction 'inbound'");
    }

    return {
      id,
      direction,
      body: requireString(message.body, `content.openingMessages[${index}].body`, 2000),
    };
  });

  function normalizePatterns(value, path) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
      throw createHttpError(400, `${path} must be an array of strings`);
    }
    if (value.length > 20) {
      throw createHttpError(400, `${path} must not exceed 20 items`);
    }
    return value.map((entry) => entry.trim()).filter(Boolean).slice(0, 20);
  }

  return cleanObject({
    isScam: content.isScam,
    contact: cleanObject({
      displayName: requireString(contact.displayName, "content.contact.displayName", 120),
      phoneNumber,
    }),
    scenarioBrief: requireString(content.scenarioBrief, "content.scenarioBrief", 6000),
    declineReason: requireString(content.declineReason, "content.declineReason", 2500),
    declineReasonSimple,
    correctReason,
    correctReasonSimple,
    openingMessages,
    failPatterns: normalizePatterns(content.failPatterns, "content.failPatterns"),
    passPatterns: normalizePatterns(content.passPatterns, "content.passPatterns"),
  });
}

function validateMarketplaceProduct(product, index) {
  requirePlainObject(product, `content.products[${index}]`);
  // Allow marketplace display keys (soldCount/rating/reviewCount/reviews/reason) that the UI and seed data depend on; `reason` is the per-product result explanation (was previously stripped).
  assertAllowedKeys(
    product,
    ["id", "name", "price", "description", "imageUrl", "sellerName", "isOfficialSeller", "soldCount", "rating", "reviewCount", "reviews", "reason"],
    `content.products[${index}]`
  );

  const id = normalizeId(product.id, `content.products[${index}].id`);
  const name = requireString(product.name, `content.products[${index}].name`, 200);
  const priceRaw = product.price;
  const price =
    typeof priceRaw === "number" && Number.isFinite(priceRaw)
      ? priceRaw
      : Number.parseFloat(priceRaw);
  if (!Number.isFinite(price) || price < 0) {
    throw createHttpError(400, `content.products[${index}].price must be a non-negative number`);
  }
  if (price > 1_000_000) {
    throw createHttpError(400, `content.products[${index}].price must not exceed 1000000`);
  }

  const description = requireString(
    product.description,
    `content.products[${index}].description`,
    1500
  );

  const imageUrl = optionalString(
    product.imageUrl,
    `content.products[${index}].imageUrl`,
    2000
  );
  if (imageUrl !== undefined && imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    throw createHttpError(400, `content.products[${index}].imageUrl must start with http(s)://`);
  }

  const sellerName = requireString(
    product.sellerName,
    `content.products[${index}].sellerName`,
    120
  );

  if (
    product.isOfficialSeller !== undefined &&
    typeof product.isOfficialSeller !== "boolean"
  ) {
    throw createHttpError(
      400,
      `content.products[${index}].isOfficialSeller must be a boolean`
    );
  }

  return cleanObject({
    id,
    name,
    price,
    description,
    imageUrl: imageUrl || "",
    sellerName,
    isOfficialSeller: product.isOfficialSeller === true,
    soldCount: typeof product.soldCount === "number" && Number.isFinite(product.soldCount) && product.soldCount >= 0
      ? Math.floor(product.soldCount)
      : 0,
    rating: typeof product.rating === "number" && Number.isFinite(product.rating) && product.rating >= 0 && product.rating <= 5
      ? product.rating
      : 0,
    reviewCount: typeof product.reviewCount === "number" && Number.isFinite(product.reviewCount) && product.reviewCount >= 0
      ? Math.floor(product.reviewCount)
      : 0,
    reviews: Array.isArray(product.reviews)
      ? sanitizeStringList(product.reviews, 20)
      : [],
    reason: optionalString(product.reason, `content.products[${index}].reason`, 2500),
  });
}

function validateMarketplaceContent(content) {
  requirePlainObject(content, "content");
  assertAllowedKeys(
    content,
    [
      "isScam",
      "taskDescription",
      "targetProductId",
      "declineReason",
      "declineReasonSimple",
      "correctReason",
      "correctReasonSimple",
      "products",
    ],
    "content"
  );

  if (typeof content.isScam !== "boolean") {
    throw createHttpError(400, "content.isScam boolean is required");
  }

  const taskDescription = requireString(
    content.taskDescription,
    "content.taskDescription",
    1000
  );
  // declineReason is optional for marketplace (no decline/hangup action; kept optional for seed-data compat and stale-doc repair).
  const declineReason = optionalString(
    content.declineReason,
    "content.declineReason",
    2500
  );
  const declineReasonSimple = optionalString(
    content.declineReasonSimple,
    "content.declineReasonSimple",
    2500
  );
  const correctReason = optionalString(content.correctReason, "content.correctReason", 2500);
  const correctReasonSimple = optionalString(
    content.correctReasonSimple,
    "content.correctReasonSimple",
    2500
  );

  if (!Array.isArray(content.products) || content.products.length === 0) {
    throw createHttpError(400, "content.products must be a non-empty array");
  }
  if (content.products.length > 30) {
    throw createHttpError(400, "content.products must not exceed 30 items");
  }

  const productIds = new Set();
  const products = content.products.map((product, index) => {
    const normalized = validateMarketplaceProduct(product, index);
    if (productIds.has(String(normalized.id))) {
      throw createHttpError(400, "content.products ids must be unique");
    }
    productIds.add(String(normalized.id));
    return normalized;
  });

  const targetProductId = normalizeId(
    content.targetProductId,
    "content.targetProductId"
  );
  if (!productIds.has(String(targetProductId))) {
    throw createHttpError(
      400,
      "content.targetProductId must match an id in content.products"
    );
  }

  return cleanObject({
    isScam: content.isScam,
    taskDescription,
    targetProductId,
    declineReason,
    declineReasonSimple,
    correctReason,
    correctReasonSimple,
    products,
  });
}

function validateScenarioContent(type, content) {
  if (!SCENARIO_TYPES.has(type)) {
    throw createHttpError(400, "type must be 'phone_call', 'whatsapp', or 'marketplace'");
  }
  if (byteLength(content) > MAX_SCENARIO_BYTES) {
    throw createHttpError(400, `content must not exceed ${MAX_SCENARIO_BYTES} bytes`);
  }

  if (type === "phone_call") return validatePhoneCallContent(content);
  if (type === "whatsapp") return validateWhatsAppContent(content);
  return validateMarketplaceContent(content);
}

function validateScenarioPayload(body, options = {}) {
  const partial = options.partial === true;
  // Moderation gate: body.status is ignored on CREATE (uploads start as draft); on UPDATE the existing status is the default.
  const bodyStatusOverride = !partial ? null : body.status;
  const defaultStatus = options.defaultStatus || "published";

  requirePlainObject(body, "Request body");
  assertAllowedKeys(body, ["type", "title", "description", "content", "status", "tags"], "body");

  if (byteLength(body) > MAX_SCENARIO_BYTES + 5000) {
    throw createHttpError(400, `request body must not exceed ${MAX_SCENARIO_BYTES + 5000} bytes`);
  }

  const data = {};
  const type = body.type === undefined && partial ? options.existingType : body.type;

  if (!partial || body.type !== undefined) {
    if (typeof type !== "string" || !SCENARIO_TYPES.has(type.trim())) {
      throw createHttpError(400, "type must be 'phone_call', 'whatsapp', or 'marketplace'");
    }
    data.type = type.trim();
  } else if (options.existingType) {
    data.type = options.existingType;
  }

  if (body.title !== undefined) {
    data.title = optionalString(body.title, "title", 160) || "";
  }

  if (body.description !== undefined) {
    data.description = optionalString(body.description, "description", 1000) || "";
  }

  if (!partial || body.content !== undefined) {
    data.content = validateScenarioContent(data.type || options.existingType, body.content);
  }

  if (!partial || body.status !== undefined) {
    data.status = validateStatus(bodyStatusOverride, defaultStatus);
  }

  if (body.tags !== undefined) {
    data.tags = normalizeTags(body.tags);
  } else if (!partial) {
    data.tags = [];
  }

  return data;
}

function scenarioTitle(type, content, explicitTitle) {
  if (explicitTitle) return explicitTitle;
  if (type === "phone_call") return content.callerName;
  if (type === "whatsapp") return content.contact.displayName;
  if (type === "marketplace") return content.taskDescription.slice(0, 80);
  return "Scenario";
}

function scenarioDescription(type, content, explicitDescription) {
  if (explicitDescription !== undefined) return explicitDescription;
  if (type === "phone_call") return content.dialogue.slice(0, 180);
  if (type === "whatsapp") {
    return content.openingMessages[0]?.body?.slice(0, 180) || "";
  }
  if (type === "marketplace") {
    return `${content.products.length} products · target: ${content.targetProductId}`;
  }
  return "";
}

function buildScenarioDocument({
  scenarioId,
  type,
  content,
  status = "published",
  source = "upload",
  sourceId,
  legacyId,
  title,
  description,
  tags = [],
  ownerUid = null,
  ownerEmail = null,
  now = new Date().toISOString(),
  createdAt,
  randomKey,
  extra = {},
}) {
  const normalizedContent = validateScenarioContent(type, content);
  const publishedAt = status === "published" ? (extra.publishedAt || now) : (extra.publishedAt || null);
  const base = {
    type,
    status,
    source,
    sourceId: sourceId || null,
    legacyId: legacyId ?? null,
    title: scenarioTitle(type, normalizedContent, title),
    description: scenarioDescription(type, normalizedContent, description),
    tags: normalizeTags(tags),
    visibility: extra.visibility || "public",
    ownerUid,
    ownerEmail: ownerEmail || null,
    randomKey: typeof randomKey === "number" ? randomKey : Math.random(),
    schemaVersion: 1,
    createdAt: createdAt || now,
    updatedAt: now,
    publishedAt,
  };

  if (type === "phone_call") {
    return cleanObject({
      ...base,
      publicContent: {
        id: scenarioId,
        callerName: normalizedContent.callerName,
        dialogue: normalizedContent.dialogue,
        options: normalizedContent.options.map((option) => ({
          id: option.id,
          text: option.text,
        })),
      },
      evaluation: {
        isScam: normalizedContent.isScam,
        declineReason: normalizedContent.declineReason,
        declineReasonSimple: normalizedContent.declineReasonSimple,
        correctReason: normalizedContent.correctReason,
        correctReasonSimple: normalizedContent.correctReasonSimple,
        options: normalizedContent.options.map((option) =>
          cleanObject({
            id: option.id,
            isCorrect: option.isCorrect,
            reason: option.reason,
            reasonSimple: option.reasonSimple,
          })
        ),
      },
      simulation: null,
      ...extra,
    });
  }

  if (type === "whatsapp") {
    return cleanObject({
      ...base,
      publicContent: {
        id: scenarioId,
        contact: clone(normalizedContent.contact),
        openingMessages: clone(normalizedContent.openingMessages),
      },
      evaluation: {
        isScam: normalizedContent.isScam,
        declineReason: normalizedContent.declineReason,
        declineReasonSimple: normalizedContent.declineReasonSimple,
        correctReason: normalizedContent.correctReason,
        correctReasonSimple: normalizedContent.correctReasonSimple,
      },
      simulation: {
        scenarioBrief: normalizedContent.scenarioBrief,
        failPatterns: normalizedContent.failPatterns || [],
        passPatterns: normalizedContent.passPatterns || [],
      },
      ...extra,
    });
  }

  return cleanObject({
    ...base,
    publicContent: {
      id: scenarioId,
      taskDescription: normalizedContent.taskDescription,
      targetProductId: normalizedContent.targetProductId,
      products: clone(normalizedContent.products),
    },
    evaluation: {
      isScam: normalizedContent.isScam,
      declineReason: normalizedContent.declineReason,
      declineReasonSimple: normalizedContent.declineReasonSimple,
      correctReason: normalizedContent.correctReason,
      correctReasonSimple: normalizedContent.correctReasonSimple,
      targetProductId: normalizedContent.targetProductId,
    },
    simulation: null,
    ...extra,
  });
}

function normalizeScenarioDoc(docOrData) {
  if (!docOrData) return null;
  if (typeof docOrData.data === "function") {
    return { id: docOrData.id, ...docOrData.data() };
  }
  return docOrData;
}

function toRuntimeScenario(docOrData) {
  const doc = normalizeScenarioDoc(docOrData);
  if (!doc) return null;
  const publicContent = doc.publicContent || {};
  const evaluation = doc.evaluation || {};
  const simulation = doc.simulation || {};

  if (doc.type === "marketplace") {
    return buildMarketplaceRuntime(doc, publicContent, evaluation);
  }

  if (doc.type === "phone_call") {
    const evalById = new Map(
      Array.isArray(evaluation.options)
        ? evaluation.options
            .filter(isPlainObject)
            .map((option) => [String(option.id), option])
        : []
    );

    return cleanObject({
      id: publicContent.id ?? doc.id,
      isScam: evaluation.isScam === true,
      callerName: publicString(publicContent.callerName, publicString(doc.title, "Unknown")),
      dialogue: publicString(publicContent.dialogue),
      declineReason: publicString(
        evaluation.declineReason,
        "Review the warning signs before deciding."
      ),
      declineReasonSimple: publicString(evaluation.declineReasonSimple) || undefined,
      correctReason: publicString(evaluation.correctReason) || undefined,
      correctReasonSimple: publicString(evaluation.correctReasonSimple) || undefined,
      options: Array.isArray(publicContent.options)
        ? publicContent.options.map((option, index) => {
            const source = isPlainObject(option) ? option : {};
            const id = publicId(source.id, index + 1);
            const evalOption = evalById.get(String(id)) || {};
            return cleanObject({
              id,
              text: publicString(source.text),
              isCorrect: evalOption.isCorrect === true,
              reason: publicString(evalOption.reason),
              reasonSimple: publicString(evalOption.reasonSimple) || undefined,
            });
          })
        : [],
    });
  }

  return {
    id: publicContent.id ?? doc.id,
    isScam: evaluation.isScam === true,
    contact: sanitizePublicContact(publicContent.contact, publicString(doc.title, "Unknown")),
    scenarioBrief: publicString(
      simulation.scenarioBrief,
      "Respond naturally in this WhatsApp simulation."
    ),
    declineReason: publicString(
      evaluation.declineReason,
      "Review the warning signs before deciding."
    ),
    declineReasonSimple: publicString(evaluation.declineReasonSimple) || undefined,
    correctReason: publicString(evaluation.correctReason) || undefined,
    correctReasonSimple: publicString(evaluation.correctReasonSimple) || undefined,
    openingMessages: sanitizePublicOpeningMessages(publicContent.openingMessages),
    failPatterns: sanitizeStringList(simulation.failPatterns),
    passPatterns: sanitizeStringList(simulation.passPatterns),
  };
}

function sanitizePublicProducts(products) {
  if (!Array.isArray(products)) return [];
  return products
    .map((product, index) => {
      const source = isPlainObject(product) ? product : {};
      const id = publicId(source.id, index + 1);
      const priceRaw = source.price;
      const priceNum =
        typeof priceRaw === "number" && Number.isFinite(priceRaw)
          ? priceRaw
          : Number.parseFloat(priceRaw);
      const safePrice = Number.isFinite(priceNum) ? priceNum : 0;
      const imageUrl = publicString(source.imageUrl);
      return cleanObject({
        id,
        name: publicString(source.name, "Untitled product"),
        price: safePrice,
        description: publicString(source.description),
        imageUrl,
        sellerName: publicString(source.sellerName, "Unknown seller"),
        isOfficialSeller: source.isOfficialSeller === true,
        soldCount: typeof source.soldCount === "number" ? source.soldCount : 0,
        rating: typeof source.rating === "number" ? source.rating : 0,
        reviewCount: typeof source.reviewCount === "number" ? source.reviewCount : 0,
        reviews: Array.isArray(source.reviews) ? sanitizeStringList(source.reviews) : [],
        reason: publicString(source.reason) || undefined,
      });
    })
    .filter((product) => product.name);
}

function buildMarketplaceRuntime(doc, publicContent, evaluation) {
  return cleanObject({
    id: publicContent.id ?? doc.id,
    isScam: evaluation.isScam === true,
    taskDescription: publicString(
      publicContent.taskDescription,
      publicString(doc.title, "Complete the marketplace challenge.")
    ),
    targetProductId: publicId(
      publicContent.targetProductId ?? evaluation.targetProductId,
      ""
    ),
    declineReason: publicString(
      evaluation.declineReason,
      "Review each seller carefully before buying."
    ),
    declineReasonSimple: publicString(evaluation.declineReasonSimple) || undefined,
    correctReason: publicString(evaluation.correctReason) || undefined,
    correctReasonSimple: publicString(evaluation.correctReasonSimple) || undefined,
    products: sanitizePublicProducts(publicContent.products),
  });
}

function detectScenarioTypeFromShape(scenario) {
  if (scenario && (scenario.taskDescription || Array.isArray(scenario.products))) {
    return "marketplace";
  }
  if (scenario && scenario.contact) return "whatsapp";
  return "phone_call";
}

function sanitizeScenarioForClient(scenario, explicitType) {
  if (!scenario) return null;
  const type = explicitType || detectScenarioTypeFromShape(scenario);

  if (type === "phone_call") {
    return {
      id: scenario.id,
      callerName: publicString(scenario.callerName),
      dialogue: publicString(scenario.dialogue),
      options: Array.isArray(scenario.options)
        ? scenario.options.map((option, index) => {
            const source = isPlainObject(option) ? option : {};
            return {
              id: publicId(source.id, index + 1),
              text: publicString(source.text),
            };
          })
        : [],
    };
  }

  if (type === "marketplace") {
    return cleanObject({
      id: scenario.id,
      taskDescription: publicString(
        scenario.taskDescription,
        "Complete the marketplace challenge."
      ),
      targetProductId: publicId(scenario.targetProductId, ""),
      products: sanitizePublicProducts(scenario.products),
    });
  }

  return {
    id: scenario.id,
    contact: sanitizePublicContact(scenario.contact),
    openingMessages: sanitizePublicOpeningMessages(scenario.openingMessages),
  };
}

function toPublicScenario(docOrData) {
  const doc = normalizeScenarioDoc(docOrData);
  if (!doc) return null;
  const publicContent = doc.publicContent || {};

  if (doc.type === "phone_call") {
    return sanitizeScenarioForClient(
      {
        id: publicContent.id ?? doc.id,
        callerName: publicContent.callerName || doc.title || "Unknown",
        dialogue: publicContent.dialogue || "",
        options: Array.isArray(publicContent.options) ? publicContent.options : [],
      },
      "phone_call"
    );
  }

  if (doc.type === "marketplace") {
    return sanitizeScenarioForClient(
      {
        id: publicContent.id ?? doc.id,
        taskDescription:
          publicContent.taskDescription || doc.description || doc.title || "Marketplace",
        targetProductId: publicContent.targetProductId || "",
        products: Array.isArray(publicContent.products) ? publicContent.products : [],
      },
      "marketplace"
    );
  }

  return sanitizeScenarioForClient(
    {
      id: publicContent.id ?? doc.id,
      contact: publicContent.contact || { displayName: doc.title || "Unknown" },
      openingMessages: Array.isArray(publicContent.openingMessages) ? publicContent.openingMessages : [],
    },
    "whatsapp"
  );
}

function toOwnerScenario(docOrData) {
  const doc = normalizeScenarioDoc(docOrData);
  if (!doc) return null;
  return cleanObject({
    id: doc.id,
    scenarioId: doc.publicContent?.id ?? doc.id,
    type: doc.type,
    status: doc.status,
    source: doc.source,
    title: doc.title,
    description: doc.description,
    tags: clone(doc.tags || []),
    ownerUid: doc.ownerUid || null,
    ownerEmail: doc.ownerEmail || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    publishedAt: doc.publishedAt || null,
    content: toRuntimeScenario(doc),
  });
}

module.exports = {
  MAX_SCENARIO_BYTES,
  SCENARIO_STATUSES,
  SCENARIO_TYPES,
  buildScenarioDocument,
  sanitizeScenarioForClient,
  toOwnerScenario,
  toPublicScenario,
  toRuntimeScenario,
  validateScenarioContent,
  validateScenarioPayload,
  validateStatus,
};
