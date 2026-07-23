// Whitelist of legitimate English words with long consonant runs (e.g. "strengths") so the consonant rule doesn't false-positive on them.
const CONSONANT_WHITELIST = new Set([
    "strengths",
    "catchphrase",
    "catchphrases",
    "twelfths",
    "witchcraft",
    "craftspeople",
    "backsplash",
    "archly",
    "rythsms",
]);

class SemanticFilter {
    static isGibberish(text) {
        const cleaned = text.trim().toLowerCase();
        
        // Threshold is 7 consonants (raised from 5) — high enough to avoid "strengths"/"catchphrase" false positives, low enough to catch "asdfghjkl".
        const consonantMatch = cleaned.match(/[bcdfghjklmnpqrstvwxyz]{7,}/g);
        if (consonantMatch) {
            const allWhitelisted = consonantMatch.every((run) =>
                CONSONANT_WHITELIST.has(run) ||
                CONSONANT_WHITELIST.has(cleaned)
            );
            if (!allWhitelisted) return true;
        }
        
        // 5+ repeated chars (raised from 4) so slang like "soooo" (4 o's) isn't flagged.
        if (/(.)\1{4,}/.test(cleaned)) return true;

        const words = cleaned.split(/\s+/);
        for (const rawWord of words) {
            const word = rawWord.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
            if (!word) continue;

            if (word.length > 9 && /[a-z]/.test(word) && /[0-9]/.test(word)) return true;

            if (/([a-z]+[0-9]+){2,}/.test(word) || /([0-9]+[a-z]+){2,}/.test(word)) return true;

            if (word.length >= 10) {
                const vowelCount = (word.match(/[aeiouy]/g) || []).length;
                if (vowelCount <= 1) return true;
            }
        }
        
        if (cleaned.length > 15 && !cleaned.includes(" ")) return true;

        return false;
    }

    static async evaluateMessage(firstArg, secondArg) {
        let contextMessage = '';
        let message;

        if (typeof firstArg === 'string') {
            // Legacy positional API: evaluateMessage(contextMessage, message)
            contextMessage = firstArg;
            message = secondArg;
        } else {
            // Named-argument API: evaluateMessage({ contextMessage, message })
            const opts = (firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg)) ? firstArg : {};
            contextMessage = opts.contextMessage || '';
            message = opts.message;
        }

        const reply = typeof message === 'string' ? message : '';
        const replyTrim = reply.trim();

        if (!replyTrim) {
            return { intent: "Empty reply", confidence: 1.0, isValid: false };
        }

        const lower = replyTrim.toLowerCase();

        if (["ok","okay","no","nope","nah","yes","yup","yeah","scam","stop","why","who","hello","hi"].includes(lower)) {
            return { intent: "Fast-pass valid", confidence: 1.0, isValid: true };
        }


        if (this.isGibberish(reply)) {
            return { intent: "Gibberish detected", confidence: 1.0, isValid: false };
        }

        // contextMessage is intentionally unused today (reserved for future relevance scoring).
        void contextMessage;
        return { intent: "Relevant", confidence: 1.0, isValid: true };
    }
}

module.exports = SemanticFilter;
