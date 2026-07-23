const fetch = require("node-fetch");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100;

const HOMEWORK_COPY = {
  en: {
    title: "New homework",
    body: (classroomName) => `New assignment in ${classroomName}`,
  },
  zh: {
    title: "新作业",
    body: (classroomName) => `${classroomName}有新作业`,
  },
  ms: {
    title: "Kerja rumah baharu",
    body: (classroomName) => `Tugasan baharu dalam ${classroomName}`,
  },
  ta: {
    title: "புதிய வீட்டுப்பாடம்",
    body: (classroomName) => `${classroomName}-இல் புதிய பணி`,
  },
};

function resolveCopy(appLanguage, classroomName) {
  const lang =
    typeof appLanguage === "string" && HOMEWORK_COPY[appLanguage]
      ? appLanguage
      : "en";
  const copy = HOMEWORK_COPY[lang];
  const name =
    typeof classroomName === "string" && classroomName.trim()
      ? classroomName.trim()
      : "your class";
  return {
    title: copy.title,
    body: copy.body(name),
  };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Fan-out Expo push to enrolled students; never throws — assignment success must not depend on push delivery.
async function notifyClassroomStudents(database, classroomDoc, assignment) {
  try {
    if (!database || !classroomDoc || !assignment?.id) {
      return;
    }

    const classroom = classroomDoc.data() || {};
    const classroomName = classroom.name || "your class";
    const classroomId = classroomDoc.id;
    const assignmentId = assignment.id;

    const studentsSnapshot = await classroomDoc.ref.collection("students").get();
    if (studentsSnapshot.empty) {
      return;
    }

    const studentUids = studentsSnapshot.docs.map((doc) => doc.id).filter(Boolean);
    if (studentUids.length === 0) {
      return;
    }

    // Firestore getAll accepts at most ~100 refs per call; chunk for safety.
    const userRefs = studentUids.map((uid) => database.collection("users").doc(uid));
    const userDocs = [];
    for (const refs of chunkArray(userRefs, 100)) {
      const batch = await database.getAll(...refs);
      userDocs.push(...batch);
    }

    // Dedupe by token; keep first-seen language for that token.
    const tokenLanguage = new Map();
    for (const userDoc of userDocs) {
      if (!userDoc.exists) continue;
      const data = userDoc.data() || {};
      const tokens = Array.isArray(data.expoPushTokens) ? data.expoPushTokens : [];
      const appLanguage =
        typeof data.appLanguage === "string" ? data.appLanguage : undefined;
      for (const token of tokens) {
        if (typeof token !== "string" || !token.trim()) continue;
        const normalized = token.trim();
        if (!tokenLanguage.has(normalized)) {
          tokenLanguage.set(normalized, appLanguage);
        }
      }
    }

    if (tokenLanguage.size === 0) {
      return;
    }

    const messages = [];
    for (const [token, appLanguage] of tokenLanguage.entries()) {
      const { title, body } = resolveCopy(appLanguage, classroomName);
      messages.push({
        to: token,
        title,
        body,
        sound: "default",
        data: {
          type: "homework_assigned",
          classroomId,
          assignmentId,
        },
      });
    }

    for (const chunk of chunkArray(messages, CHUNK_SIZE)) {
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error(
            `Expo push send failed (${response.status}): ${text.slice(0, 500)}`
          );
          continue;
        }

        const payload = await response.json().catch(() => null);
        const tickets = Array.isArray(payload?.data) ? payload.data : [];
        for (const ticket of tickets) {
          if (ticket?.status === "error") {
            console.error(
              `Expo push ticket error [${ticket.details?.error || "unknown"}]: ${ticket.message || ""}`
            );
          }
        }
      } catch (err) {
        console.error(`Expo push chunk failed: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`notifyClassroomStudents failed: ${err.message}`);
  }
}

module.exports = {
  notifyClassroomStudents,
  HOMEWORK_COPY,
};
