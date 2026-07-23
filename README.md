# CLARO - A Safe Learning Space for All
<img width="300" height="300" alt="logo" src="https://raw.githubusercontent.com/l21000112/HEAPS-2026-TEAM-7-CLARO/refs/heads/master/frontend/assets/images/logo.png" />

**CLARO** is an android mobile scam-awareness platform where teachers assign simulated scams as homework and students play through them as if they were real - a phone call, a WhatsApp-style chat, a marketplace listing. Students decide: scam, or not a scam? Then, they receive immediate feedback and are told why they were right or wrong.

This project was created as a submission to [SMU .Hack's HEAP 2026 Challenge](https://dothack-heap-2026.devpost.com/).

## Inspiration
With the relentless rise in scams globally, frauds are meticulously engineered to exploit trust and urgency. Unfortunately, Persons With Disabilities (PWD) and the Elderly are disproportionately targeted. Scammer tactics like artificial time pressure and confusing jargon land much harder on individuals with cognitive disabilities, low vision, or limited digital literacy. Whilst traditional scam education relies on passive lectures, there is growing understanding that activities are what engages PWDs. We want to support this cause by gamifying the experience, putting the user inside realistic simulated scams. This lets the learner experience the pressure, make a decision, and safely understand exactly what they missed. Educators also lack an easy to use and convenient platform to orchestrate such scenarios, so we put in an equal amount of effort to ensure easy use and intuitive design on the educators' side of the platform as well.

---

## Table of Contents
- [Features](#features)
  - [Students](#students)
  - [Teachers](#teachers)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [1. Clone & Install Dependencies](#1-clone--install-dependencies)
  - [2. Backend Environment](#2-backend-environment)
  - [3. Frontend Environment](#3-frontend-environment)
  - [4. Run the App](#4-run-the-app)
- [Roles & Invites](#roles--invites)
- [Scenario Types](#scenario-types)
- [Push Notifications](#push-notifications)
- [Building the APK](#building-the-apk)
- [Deployment (VPS + Nginx)](#deployment-vps--nginx)
  - [1. Copy the `backend/` folder onto the VPS](#1-copy-the-backend-folder-onto-the-vps)
  - [2. Configure `backend/.env`](#2-configure-backendenv)
  - [3. Run the backend and keep it alive](#3-run-the-backend-and-keep-it-alive)
  - [4. Put the TLS certificate in place](#4-put-the-tls-certificate-in-place)
  - [5. Install Nginx and apply the config](#5-install-nginx-and-apply-the-config)
  - [6. Point the frontend at the URL](#6-point-the-frontend-at-the-url)
  - [How it all ties together](#how-it-all-ties-together)
- [Video Demo](#video-demo)
- [Important notes](#important-notes)

---

## Features

### Students
- Join a classroom with an invite code
- Complete assigned homework: **Calls**, **WhatsApp Chats**, and **Marketplace** evaluations
- Multilingual UI and scenario content: **English**, **Chinese**, **Malay**, **Tamil**
- Accessibility options (theme, text size, simpler explanations, reduced motion)
- Access detailed overview of personal stats, including overall/scenario accuracy and unlock Badges based on performance
- Homework push notifications when a teacher assigns work (requires Physical Android device, with Expo Push + FCM)

### Teachers
- Redeem a teacher invite to register as a teacher (Default: `test12345`)
- Create classrooms and share classroom invite codes with your students
- Browse / Create scenarios in the Scenario Library
- Assign homework (customize quantities, attempt limits, deadlines)
- View Classroom Analytics and student results for improved teaching

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Mobile app | [Expo](https://expo.dev) (~56), React Native, [Expo Router](https://docs.expo.dev/router/introduction/) |
| UI | NativeWind / Tailwind, React Native Reanimated |
| Auth | Firebase Authentication (email/password) via client SDK |
| API | Node.js, Express |
| Data | Cloud Firestore (via `firebase-admin` on the backend) |
| AI | Google Gemini / DeepSeek / MiniMax for WhatsApp replies (select via `LLM_PROVIDER`; rule-based fallback) |
| i18n | `i18next` / `react-i18next` + per-scenario translation registries |
| Push | `expo-notifications` → Expo Push Service → FCM (Android) |
| Builds | Local Gradle APK via `build-apk.bat` (`frontend/eas.json` keeps optional EAS profiles) |

---

## Repository Layout

```text
heaps/
│
├── README.md                          # Project overview & setup guide
├── firestore.indexes.json             # Firestore composite / collection-group indexes
│
├── frontend/                          # Expo React Native app (CLARO)
│   ├── app.json                       # Expo config (name, package, plugins, EAS projectId)
│   ├── eas.json                       # EAS Build profiles (dev / preview / production)
│   ├── package.json                   # Frontend dependencies & scripts
│   ├── google-services-example.json   # Android FCM client config (push notifications)
│   ├── .env.example                   # Template for Expo public env vars
│   ├── assets/                        # Images, icons, audio (ringtone, etc.)
│   │
│   └── src/
│       ├── app/                       # Expo Router screens (file-based routes)
│       │   ├── _layout.tsx            # Root layout (providers, navigation shell)
│       │   ├── index.tsx              # Entry / auth redirect
│       │   ├── (auth)/                # Sign-in & sign-up
│       │   ├── student/               # Student tabs (home, classroom, profile, settings)
│       │   ├── teacher/               # Teacher tabs (home, classes, scenarios, analytics, …)
│       │   ├── scam-call/             # Call simulation flow (incoming → mid-call → result)
│       │   ├── scam-whatsapp/         # WhatsApp simulation flow (notification → thread → result)
│       │   └── marketplace/           # Marketplace simulation (browse → detail → result)
│       │
│       ├── api/                       # HTTP API clients (talk to backend `/api`)
│       │   ├── client.ts              # Shared fetch wrapper, auth headers, API_URL
│       │   ├── users.ts               # Profile, onboarding, push token, delete account
│       │   ├── classrooms.ts          # Classes, invites, assignments
│       │   ├── scenarios.ts           # Scenario CRUD / listing
│       │   ├── scam-call.ts           # Call session endpoints
│       │   ├── marketshop.ts          # Marketplace scenarios
│       │   └── …
│       │
│       ├── components/                # Reusable UI
│       │   ├── ui/                    # Shared primitives (button, card, theme, logout, …)
│       │   ├── student/               # Student-specific cards / rows / sheets
│       │   ├── teacher/               # Teacher tiles, stats, classroom strips
│       │   ├── scam-call/             # Call UI pieces
│       │   ├── scam-whatsapp/         # Chat bubbles, composer, headers
│       │   ├── marketplace/           # Product cards
│       │   └── onboarding/            # Tour overlay, spotlight, targets
│       │
│       ├── context/                   # React context (auth, theme, language, cart, …)
│       ├── features/                  # Domain models for call / WhatsApp flows
│       ├── i18n/                      # Localization
│       │   ├── resources/             # UI strings (en, zh, ms, ta)
│       │   └── scenarios/             # Bundled scenario text overlays (non-English)
│       ├── lib/                       # Helpers (Firebase, push, scenario i18n, TTS, …)
│       └── styles/                    # Shared style modules
│
└── backend/                           # Express API + Firebase Admin
    ├── package.json                   # Backend dependencies & scripts
    ├── .env.example                   # Template for server secrets / config
    └── src/
        ├── index.js                   # App entry (Express, CORS, rate limits, routes)
        ├── config/
        │   ├── firebase.js            # Firebase Admin init
        │   └── firestoreBootstrap.js  # Seed setup docs / bootstrap teacher invite
        ├── middleware/
        │   └── auth.js                # Verify ID token, role checks
        ├── routes/                    # HTTP route handlers (`/api/...`)
        │   ├── users.js               # Profiles, invites, push tokens, delete account
        │   ├── classrooms.js          # Classrooms, students, assignments
        │   ├── scenarios.js           # Scenario pool & marketplace APIs
        │   ├── sessions.js            # Live simulation sessions
        │   ├── attempts.js            # Attempt logging / results
        │   ├── evaluations.js         # Evaluation helpers
        │   └── templates.js           # Scenario templates
        ├── services/                  # Business logic
        │   ├── invites.js             # Invite create / redeem / account delete cleanup
        │   ├── scenarioPool.js        # Load / sanitize scenarios from Firestore
        │   ├── callSessions.js        # Phone-call session state
        │   ├── whatsappSessions.js    # WhatsApp sessions + LLM replies (Gemini/DeepSeek/MiniMax)
        │   ├── classroomAssignments.js
        │   ├── pushNotifications.js   # Expo Push fan-out on homework assign
        │   ├── translation.js         # Best-effort marketplace / AI text translation
        │   └── …
        ├── data/                      # Static seed scenarios (call / WhatsApp / marketplace)
        └── utils/                     # Shared helpers (HTTP errors, DB utils, …)
```

---

## Prerequisites

- **Node.js** 20+ (recommended)
- **npm**
- A **Firebase** project (Auth + Firestore)
- For physical Android push testing: a Firebase Android app, `google-services.json`, and an FCM V1 service-account key configured on your Expo project
- Optional: Android Studio (emulator + Android SDK + JDK 17 for local APK builds), or a physical device
- Optional: Web Domain for hosting the backend on the cloud

---

## Setup

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd heaps

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Backend Environment

```bash
cp backend/.env.example backend/.env
```

Fill in at least:

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `3000`) |
| `FIREBASE_PROJECT_ID` | Firebase project id |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (keep quotes; preserve `\n`) |
| `CORS_ORIGIN` | Required in production (comma-separated origins) |
| `FIRESTORE_BOOTSTRAP_COLLECTIONS` | `true` to seed setup docs / invites on boot |
| `LLM_PROVIDER` | WhatsApp AI provider: `gemini` (default), `deepseek`, or `minimax` |
| `GEMINI_API_KEY` | Used when `LLM_PROVIDER=gemini` |
| `GEMINI_MODEL` | e.g. `gemini-3.1-flash-lite` |
| `DEEPSEEK_API_KEY` | Used when `LLM_PROVIDER=deepseek` |
| `DEEPSEEK_MODEL` | DeepSeek model (default `deepseek-v4-flash`) |
| `MINIMAX_API_KEY` | Used when `LLM_PROVIDER=minimax` |
| `MINIMAX_API_URL` | MiniMax endpoint (default `https://api.minimax.io/v1/chat/completions`) |
| `MINIMAX_MODEL` | MiniMax model (default `MiniMax-M3`) |
| `TEACHER_INVITE_CODE` | Bootstrap code used to grant the first teacher role |

Start the API:

```bash
cd backend
npm run dev    # nodemon
# or
npm start
```

### 3. Frontend Environment

```bash
cp frontend/.env.example frontend/.env
```

Set:

| Variable | Purpose |
| --- | --- |
| **`EXPO_PUBLIC_API_URL`** | Backend URL ending in `/api` |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web/client config |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional (Analytics) |

**EXPO_PUBLIC_API_URL Guide**

| Runtime | Typical `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Android emulator | `http://10.0.2.2:3000/api` |
| Physical device (same LAN) | `http://<your-lan-ipv4>:3000/api` |
| Production | Your deployed API, e.g. `https://api.example.com/api` |

_Firebase client values must be present or the app fails at startup (`frontend/src/lib/firebase.ts`)._

### 4. Run the App

```bash
cd frontend
npx expo start -c
```

apk binary: http://lucasleow.com/share/8lQ1CLQeS-Ankd7iIln9wA

mirror: https://drive.google.com/file/d/1PpPYVUyjZolYhjXwTdN1yDqCp-MeYire/view?usp=sharing

Then:

- Press `a` / `i` for Android / iOS simulator  
- Or scan the QR code from a **development build** / supported Expo workflow  

> **NOTE: Push notifications and some native modules require a custom/dev build**, not Expo Go. Use `npx expo run:android` or build an APK (see [Building the APK](#building-the-apk) below) after configuring FCM.

---

## Roles & Invites

Roles are **not** self-assigned from the client. Instead, they are redeemed via specific Invite Codes on the Sign-up page.

- **To Register as a Teacher:** Redeem a Teacher invite (set via `TEACHER_INVITE_CODE` in `backend/.env`, default: `test12345`)
- **To Register as a Student:** Redeem a Classroom invite (`CLASS-*`), or leave it blank on sign-up to register without enrolling in a class

_Profile and invite APIs live under `/api/users` (see `backend/src/routes/users.js`)._

---

## Scenario Types

| Type | Student Experience |
| --- | --- |
| `phone_call` | Incoming call UI, dialogue, options / decline |
| `whatsapp` | Chat thread; AI turns via Gemini / DeepSeek / MiniMax (set by `LLM_PROVIDER`) when configured |
| `marketplace` | Product list, Reviews, evaluate listings |

_Bundled call/WhatsApp copy is English in Firestore; the client overlays translations from `frontend/src/i18n/scenarios/` via `frontend/src/lib/scenarioI18n.ts`. Marketplace listing endpoints can accept a `lang` query for best-effort translation._

---

## Push Notifications

Students register an Expo push token after login (`POST /api/users/me/push-token`). Teachers assigning homework for their class pushes notifications to their enrolled students via Expo Push (`backend/src/services/pushNotifications.js`).

**Android Requirements**

1. Firebase Android app with package `com.catcanexpo.frontend`
2. `frontend/google-services.json` and `expo.android.googleServicesFile` in `app.json`
3. FCM V1 service-account key configured on your Expo project (so Expo Push can deliver to Android)
4. `extra.eas.projectId` set in `app.json`
5. **Rebuild** the native app after adding Google services (JS reload is not enough)

_Confirm success in Firestore after student account allows notifications: `users/{uid}.expoPushTokens` contains `ExponentPushToken[...]`._

---

## Building the APK

Production APKs are built **locally** with `build-apk.bat` (run it from the repo root on Windows). No `eas login` or cloud build is required: the script runs `expo prebuild` and then Gradle `assembleRelease`, baking your `frontend/.env` (API URL + Firebase config) into the JS bundle.

**Prerequisites (install once):** Android Studio, which provides the Android SDK, build-tools, and JDK 17.

```bat
build-apk.bat
```

Output APK: `frontend/android/app/build/outputs/apk/release/app-release.apk`. It is signed with the debug keystore, so it installs on any phone with "install unknown apps" enabled; use a real release keystore for Google Play.

Edit `frontend/.env` before building, and rebuild whenever the API URL or Firebase keys change.

> `frontend/eas.json` still defines `development` / `preview` / `production` EAS profiles if you ever want cloud builds (`eas build`), but the standard flow here is the local script above.

---

## Deployment (VPS + Nginx)

The frontend ships as a compiled APK that talks to **one backend URL**. In production you host the **Express backend on a VPS** behind an **Nginx reverse proxy** that terminates TLS and forwards traffic to `127.0.0.1:3000`. The APK's baked-in `EXPO_PUBLIC_API_URL` then points at `https://api.example.com/api`.

```text
  Android APK (EXPO_PUBLIC_API_URL baked in)
        │  HTTPS
        ▼
   api.example.com  ──►  Nginx (TLS :443)  ──►  Express backend (127.0.0.1:3000)
   (HTTP :80 → 301 → :443)        │  injects X-Forwarded-*        └─► Firebase Admin (Auth / Firestore)
```

### 1. Copy the `backend/` folder onto the VPS

Only `backend/` needs to be on the server — the frontend is compiled into the APK, not hosted here.

From your local machine:

```bash
# Option A — rsync (recommended)
rsync -av --exclude node_modules --exclude .env ./backend/ user@your-vps:/opt/claro/backend/

# Option B — scp a zip
cd backend && zip -r ../backend.zip . -x node_modules/\* .env && cd ..
scp backend.zip user@your-vps:/opt/claro/
# then on the VPS:  cd /opt/claro && unzip backend.zip -d backend
```

On the VPS:

```bash
ssh user@your-vps
sudo apt update && sudo apt install -y nodejs npm   # Node.js 20+
cd /opt/claro/backend
npm ci --omit=dev          # install production dependencies
cp .env.example .env       # then edit .env (see Step 2)
```

### 2. Configure `backend/.env`

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (Nginx proxies here) |
| `CORS_ORIGIN` | `https://api.example.com` (add any web origins, comma-separated) |
| `TRUST_PROXY_HOPS` | `1` — Nginx is exactly one proxy hop, so Express trusts `X-Forwarded-For` / `X-Forwarded-Proto` |
| Firebase + LLM keys | as in [Backend Environment](#2-backend-environment) |

### 3. Run the backend and keep it alive

```bash
sudo npm install -g pm2
pm2 start src/index.js --name claro-api
pm2 save
pm2 startup        # run the command it prints to auto-restart on reboot
```

Smoke-test (the backend exposes a root `/health` route, not `/api/health`):

```bash
curl http://127.0.0.1:3000/health
```

> The backend must only listen on loopback. Do **not** expose port `3000` to the public internet — Nginx is the only thing that should listen on `0.0.0.0:443`.

### 4. Put the TLS certificate in place

The config below reads the cert from `/aws_cert/`:

```bash
sudo mkdir -p /aws_cert
sudo cp fullchain.pem   /aws_cert/fullchain.pem
sudo cp private_key.txt /aws_cert/private_key.txt
sudo cp passphrase.txt  /aws_cert/passphrase.txt      # only if your key is passphrase-protected
sudo chmod 600 /aws_cert/*
```

### 5. Install Nginx and apply the config

```bash
sudo apt install -y nginx
sudo cp nginx.conf /etc/nginx/nginx.conf    # save the block below as nginx.conf
sudo nginx -t              # validate
sudo systemctl reload nginx
sudo systemctl enable nginx
```

`nginx.conf`:

```nginx
user nginx;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log warn;

events {
    worker_connections 1024;
    multi_accept on;
    use epoll;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 4;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name api.example.com;

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS reverse proxy
    server {
        listen 443 ssl http2;
        server_name api.example.com;

        ssl_password_file /aws_cert/passphrase.txt;
        ssl_certificate /aws_cert/fullchain.pem;
        ssl_certificate_key /aws_cert/private_key.txt;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH;
        ssl_session_cache shared:SSL:50m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        add_header Strict-Transport-Security "max-age=63072000" always;

        client_max_body_size 10M;

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Port 443;
            proxy_redirect off;

            proxy_connect_timeout 60s;
            proxy_send_timeout 120s;
            proxy_read_timeout 120s;
        }
    }
}
```

### 6. Point the frontend at the URL

Build the APK with the backend's public URL baked in. Set it in `frontend/.env`:

```bash
EXPO_PUBLIC_API_URL=https://api.example.com/api
```

Then run `build-apk.bat` (see [Building the APK](#building-the-apk)). **Rebuild the APK whenever the API URL changes** — `EXPO_PUBLIC_*` values are inlined into the JS bundle at build time and cannot be changed after install.

### How it all ties together

- **Frontend (APK)** — only knows `https://api.example.com/api` (from `EXPO_PUBLIC_API_URL`, baked into the bundle). It sends each Firebase Auth ID token as a Bearer header on API calls.
- **Nginx** — the public edge. Terminates TLS on `:443`, redirects `:80 → :443`, caps request size at `10M`, injects `X-Forwarded-*` headers, and reverse-proxies everything to `127.0.0.1:3000`. No app code runs here.
- **Backend** — runs under `pm2` on loopback `:3000`. With `TRUST_PROXY_HOPS=1` it trusts Nginx's forwarded headers, so rate limiting, logging, and `X-Real-IP` see the real client. It talks to Firebase Auth + Firestore server-side using your Admin service-account key.

DNS: point an A record for `api.example.com` at the VPS public IP, then confirm with `curl https://api.example.com/health`.

---

## Video Demo

https://www.youtube.com/watch?v=flH72JjwwYY

## Important notes

- **Secrets:** Never commit `backend/.env`, Firebase Admin private keys, or FCM service-account JSON. `google-services.json` is client config and is commonly committed; Admin keys are not.
- **Undefined Firestore fields:** The Admin SDK is configured with `ignoreUndefinedProperties: true` so optional scenario fields do not break writes.
- **Production CORS:** `CORS_ORIGIN` is required when `NODE_ENV=production`.
- **AI provider / quota:** WhatsApp AI may fail with location or quota errors on the free tier or restricted regions. Set `LLM_PROVIDER=deepseek` or `LLM_PROVIDER=minimax` to switch providers.

---
