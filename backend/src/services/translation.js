// Post-hoc translation: the LLM always writes in English (its strongest language), and we translate its output here with a keyless free library (@vitalets/google-translate-api).

const { translate } = require("@vitalets/google-translate-api");

// Race against this timeout so a hanging free endpoint can't stall the WhatsApp flow (falls back to English).
const TRANSLATE_TIMEOUT_MS = 10000;

// In-process cache: translation is deterministic per (text, lang), so caching cuts latency and is polite to the rate-limited free endpoint.
const cache = new Map();
const MAX_CACHE_ENTRIES = 500;

function cacheKey(text, targetLang) {
  return `${targetLang}::${text}`;
}

function remember(key, value) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Evict the oldest entry to bound memory (good enough for a session-scope cache; no strict LRU needed).
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

// Best-effort: any error (network/rate-limit) is swallowed and the original text returned — translation must NEVER break the chat flow.
async function translateText(text, targetLang) {
  if (typeof text !== "string" || !text.trim()) return text;
  if (!targetLang || targetLang === "en") return text;

  const key = cacheKey(text, targetLang);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  try {
    const result = await Promise.race([
      translate(text, { to: targetLang }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Translation timed out")),
          TRANSLATE_TIMEOUT_MS
        )
      ),
    ]);
    const translated = typeof result?.text === "string" && result.text.trim()
      ? result.text
      : text;
    remember(key, translated);
    return translated;
  } catch (error) {
    console.warn(
      `translation to "${targetLang}" failed, returning English text:`,
      error?.message || error
    );
    return text;
  }
}

// Translate reply + reason + redFlags in parallel; falls back to the original English turn on any failure so the simulation always continues.
async function translateAiTurn(turn, targetLang) {
  if (!turn || !targetLang || targetLang === "en") return turn;

  try {
    const evaluation = turn.evaluation || {};
    const reasonJob =
      typeof evaluation.reason === "string" && evaluation.reason.trim()
        ? translateText(evaluation.reason, targetLang)
        : Promise.resolve(evaluation.reason);
    const redFlagJobs = Array.isArray(evaluation.redFlags)
      ? evaluation.redFlags.map((flag) => translateText(flag, targetLang))
      : [];

    const [reply, reason, redFlags] = await Promise.all([
      translateText(turn.reply, targetLang),
      reasonJob,
      Promise.all(redFlagJobs),
    ]);

    return {
      ...turn,
      reply,
      evaluation: {
        ...evaluation,
        reason,
        ...(Array.isArray(evaluation.redFlags) ? { redFlags } : {}),
      },
    };
  } catch (error) {
    console.warn(
      `translateAiTurn to "${targetLang}" failed, returning English turn:`,
      error?.message || error
    );
    return turn;
  }
}

/** Test-only: clear the in-memory cache. */
function _clearCacheForTests() {
  cache.clear();
}

// Feature flag: set MARKETPLACE_TRANSLATION_ENABLED=false to revert to serving marketplace content untranslated (one-line revert, no data change).
const MARKETPLACE_TRANSLATION_ENABLED = true;

const SUPPORTED_TRANSLATION_LANGUAGES = new Set(["en", "zh", "ms", "ta"]);

function normalizeLanguage(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "en";
  const base = raw.split("-")[0];
  return SUPPORTED_TRANSLATION_LANGUAGES.has(base) ? base : "en";
}

// Translates user-facing marketplace strings (taskDescription, product name/desc/reason/reviews, result copy) but leaves seller names/prices/ratings/images untouched. Best-effort; no-op for English or when the flag is off.
async function translateMarketplaceScenario(scenario, targetLang) {
  if (!scenario || !MARKETPLACE_TRANSLATION_ENABLED) return scenario;
  const lang = normalizeLanguage(targetLang);
  if (lang === "en") return scenario;

  const tr = (s) =>
    typeof s === "string" && s.trim() ? translateText(s, lang) : Promise.resolve(s);

  try {
    const products = await Promise.all(
      (Array.isArray(scenario.products) ? scenario.products : []).map(async (product) => {
        const [name, description, reason, reviews] = await Promise.all([
          tr(product.name),
          tr(product.description),
          tr(product.reason),
          Array.isArray(product.reviews)
            ? Promise.all(product.reviews.map(tr))
            : product.reviews,
        ]);
        return { ...product, name, description, reason, reviews };
      })
    );

    const [taskDescription, correctReason, declineReason, correctReasonSimple, declineReasonSimple] =
      await Promise.all([
        tr(scenario.taskDescription),
        tr(scenario.correctReason),
        tr(scenario.declineReason),
        tr(scenario.correctReasonSimple),
        tr(scenario.declineReasonSimple),
      ]);

    return {
      ...scenario,
      taskDescription,
      products,
      correctReason,
      declineReason,
      correctReasonSimple,
      declineReasonSimple,
    };
  } catch (error) {
    console.warn(
      `translateMarketplaceScenario to "${lang}" failed, returning English scenario:`,
      error?.message || error
    );
    return scenario;
  }
}

module.exports = {
  translateText,
  translateAiTurn,
  translateMarketplaceScenario,
  normalizeLanguage,
  MARKETPLACE_TRANSLATION_ENABLED,
  _clearCacheForTests,
};
