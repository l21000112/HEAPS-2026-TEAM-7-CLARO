const express = require("express");
const { optionalVerifyToken } = require("../middleware/auth");
const {
  getWhatsAppSession,
  performWhatsAppAction,
  sendWhatsAppMessage,
  startWhatsAppSession,
} = require("../services/whatsappSessions");
const {
  answerCall,
  getCallSession,
  performCallAction,
  startCallSession,
} = require("../services/callSessions");

const router = express.Router();

router.use(optionalVerifyToken);

// Anonymous session token (X-Anonymous-Session-Token) gates anonymous-practice sessions.
function anonymousToken(req) {
  const value = req.headers["x-anonymous-session-token"];
  return typeof value === "string" ? value : null;
}

router.post("/call/start", async (req, res, next) => {
  try {
    const result = await startCallSession(req.user, req.body || {});
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/call/:sessionId", async (req, res, next) => {
  try {
    res.json(await getCallSession(req.params.sessionId, req.user, anonymousToken(req)));
  } catch (err) {
    next(err);
  }
});

router.post("/call/:sessionId/answer", async (req, res, next) => {
  try {
    const result = await answerCall(
      req.params.sessionId,
      req.body?.selectedOptionId,
      req.user,
      anonymousToken(req)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/call/:sessionId/action", async (req, res, next) => {
  try {
    const result = await performCallAction(
      req.params.sessionId,
      req.body?.action,
      req.user,
      anonymousToken(req)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/whatsapp/start", async (req, res, next) => {
  try {
    res.status(201).json(await startWhatsAppSession(req.user, req.body || {}));
  } catch (err) {
    next(err);
  }
});

router.get("/whatsapp/:sessionId", async (req, res, next) => {
  try {
    res.json(await getWhatsAppSession(req.params.sessionId, req.user, anonymousToken(req)));
  } catch (err) {
    next(err);
  }
});

router.post("/whatsapp/:sessionId/message", async (req, res, next) => {
  try {
    const result = await sendWhatsAppMessage(
      req.params.sessionId,
      req.body?.text,
      req.user,
      anonymousToken(req)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/whatsapp/:sessionId/action", async (req, res, next) => {
  try {
    res.json(
      await performWhatsAppAction(req.params.sessionId, req.body?.action, req.user, anonymousToken(req))
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
