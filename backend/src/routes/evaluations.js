const express = require('express');
const SemanticFilter = require('../services/semanticFilter');
const { optionalVerifyToken } = require('../middleware/auth');
const { validateBoundedText } = require('../utils/database');

const MAX_EVALUATION_MESSAGE_CHARS = 500;

const router = express.Router();

router.use(optionalVerifyToken);

// Return the same { intent, confidence, isValid } envelope on both success (200) and validation error (400).
router.post('/whatsAppMessage', async (req, res, next) => {
    try {
        const message = validateBoundedText(req.body?.message, "message", {
            maxLength: MAX_EVALUATION_MESSAGE_CHARS,
        });

        const evaluation = await SemanticFilter.evaluateMessage({ message });

        return res.status(200).json(evaluation);

    } catch (error) {
        if (error.status === 400) {
            return res.status(400).json({
                intent: 'Invalid input',
                confidence: 1.0,
                isValid: false,
                error: error.message || 'Invalid message format.',
            });
        }

        return next(error);
    }
});

module.exports = router;
