# Strangr — an Omegle-style random chat app

Random 1-on-1 **video + text** chat with strangers.

- **Backend:** Java 21 + Spring Boot 3.5 — matchmaking, WebRTC signaling over a raw WebSocket, report/ban moderation
- **Frontend:** React 18 + Vite — WebRTC video, text chat, interest tags
- **Video/audio** flows peer-to-peer (WebRTC); the server only pairs people and relays the handshake + text messages.

## Features

- **Mood match**: pick a mood (🥳 hyped, 😴 bored, 😮‍💨 need to vent, 👂 here to listen, 🤔 deep talks, 🎲 any); venters get listeners, compatible moods pair first, falls back to anyone after 12 s
- **Safety controls**: 💬 *Text first* (video + audio only when BOTH people tap “Turn on video”, enforced on both ends), 🎭 *Blur until I reveal*, personal-info warnings (phone/email/UPI/socials/links/addresses), hidden links from strangers, one-tap 🚨 Leave & Report
- Random matching, with **interest-based matching** (shared tags first, falls back to random after 8 s)
- Video + audio chat, or **text-only** mode (text-only users can still see/hear the stranger)
- Text chat with "Stranger is typing…" indicator
- **Next / Skip** (button or `Esc`), won't instantly re-pair you with the person you just skipped
- **Block** (never matched with them again this session) and **Report** (report + block; 3 reports from distinct IPs within 1 h = 24 h IP ban)
- Mute mic / camera off, 18+ agreement gate, responsive layout for phones
- Docker Compose setup with nginx serving the SPA and proxying `/api` + `/ws`

## Project layout

```
omegle-clone/
├── backend/                     Spring Boot app (port 8080), built with Gradle
│   └── src/main/java/com/strangerchat/
│       ├── core/                Framework-free logic (unit-tested)
│       │   ├── MatchmakingService.java   queue, pairing, relaying
│       │   ├── ModerationService.java    reports + temporary IP bans
│       │   └── Client.java, MessageSender.java
│       ├── ws/                  WebSocket handler, IP interceptor, scheduler
│       ├── web/ConfigController.java     GET /api/config (ICE servers)
│       └── config/              properties + bean wiring
├── frontend/                    React + Vite app (dev port 5173)
│   └── src/
│       ├── hooks/useStrangerChat.js      WebSocket + WebRTC state machine
│       └── components/                   Landing, ChatRoom, ChatPanel, VideoTile, ReportDialog
└── docker-compose.yml
```

## Run locally (dev)

Prerequisites: **JDK 21** (`brew install openjdk@21`) and **Node 18+**. Gradle is not needed — the project ships with the Gradle wrapper (`./gradlew`), which downloads Gradle 8.14.3 on first run.

```bash
# terminal 1 — backend
cd backend
./gradlew bootRun

# terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in two different browser windows (or one normal + one incognito), tick the
18+ box in both and click **Start video chat**. They'll be paired with each other.

> Browsers only allow camera access on `https://` or `localhost`. To test from your phone on the same Wi-Fi,
> you need HTTPS (e.g. `ngrok http 5173`, or deploy behind a TLS proxy).

Run the backend tests with `./gradlew test`, and build a runnable jar with `./gradlew bootJar` (→ `build/libs/app.jar`, run it with `java -jar build/libs/app.jar`).

## Run with Docker

```bash
docker compose up --build
```

Then open **http://localhost:3000**.

## Deploy for free on Render

The root `Dockerfile` builds the React app and bundles it inside the Spring Boot jar, so the whole app
(page + WebSocket) runs as **one free Render web service** on one HTTPS URL.

1. Push this folder to a GitHub repo (public or private).
2. Sign in at [render.com](https://render.com) with GitHub → **New → Blueprint** → pick the repo.
   Render reads `render.yaml` and creates the `strangr` service on the free plan. First build takes ~5–8 min.
3. Open `https://strangr-xxxx.onrender.com` on two devices and chat.

Free-plan notes: the service sleeps after 15 min without traffic and takes ~1 min to wake on the next visit;
750 free hours/month is enough for one service running all month. Everything is in memory, so a restart or
sleep clears the queue and bans.

### Free TURN (makes video work across different networks / mobile data)

Without a relay, video fails between many networks ("Video couldn't connect on this network").

1. Sign up free at [metered.ca](https://www.metered.ca/tools/openrelay/) (20 GB/month of relay traffic).
2. Your app name is the `xxx` in `xxx.metered.live`. In the dashboard open **TURN Server → Credentials / API key**
   and copy the API key.
3. In Render → your service → **Environment**, add:
   - `METERED_APP` = `xxx`
   - `METERED_API_KEY` = your API key
4. Save (Render redeploys). The logs should show `Metered TURN enabled for app 'xxx'`.

The key stays on the server; `/api/config` hands browsers the relay credentials (cached 30 min).

### Custom domain

Render → service → **Settings → Custom Domains**; free TLS is included. Then add your domain to
`APP_ALLOWED_ORIGINS` (comma-separated, e.g. `https://*.onrender.com,https://strangr.com`).

## Deploying to production

1. **HTTPS is required** for camera/mic. Put the stack behind a TLS-terminating proxy (Caddy, nginx + Let's Encrypt, Cloudflare, …).
2. Add your domain to `app.allowed-origins` (env `APP_ALLOWED_ORIGINS=https://yourdomain.com`).
3. Keep `app.trust-proxy-headers=true` only when the backend is reachable *solely* through your proxy.
4. **Add a TURN server.** STUN works for most home networks, but ~10–20 % of users (mobile carriers, corporate
   networks) need a TURN relay or video won't connect. Run `coturn` (a commented example is in
   `docker-compose.yml`) or use a hosted TURN service, then add it to `app.ice-servers`.
5. Everything (queue, bans) is in memory on a single node. To run several backend instances, move the waiting
   queue, pairings and bans to Redis (pub/sub for relaying messages between nodes).

## Configuration (`backend/src/main/resources/application.yml`)

| Property | Default | Meaning |
|---|---|---|
| `app.allowed-origins` | localhost:5173/8080/3000 | Origins allowed to open the WebSocket |
| `app.trust-proxy-headers` | `false` | Use `X-Forwarded-For` for client IP (bans) |
| `app.matching.interest-wait` | `8s` | How long to wait for a shared-interest match before going random |
| `app.matching.mood-wait` | `12s` | How long to wait for a compatible mood before matching anyone |
| `app.moderation.report-threshold` | `3` | Distinct reporter IPs needed to ban |
| `app.moderation.report-window` | `1h` | Reports older than this are forgotten |
| `app.moderation.ban-duration` | `24h` | Ban length |
| `app.ice-servers` | Google STUN | STUN/TURN servers sent to browsers |

Any property can be overridden with an env var, e.g. `APP_MATCHING_INTEREST_WAIT=5s`.

## WebSocket protocol (`/ws`, JSON)

| Client → server | Server → client |
|---|---|
| `{type:"join", interests:["music"], mood:"vent"}` | `{type:"hello", id}` |
| `{type:"next"}` / `{type:"stop"}` | `{type:"waiting", interests}` |
| `{type:"signal", data:{sdp}\|{candidate}}` | `{type:"matched", initiator, commonInterests, myMood, partnerMood, perfectMood}` |
| `{type:"chat", text}` | `{type:"signal", data}` / `{type:"chat", text}` |
| `{type:"typing", typing:true}` | `{type:"typing", typing}` |
| `{type:"block"}` / `{type:"report", reason}` | `{type:"partner_left"}` / `{type:"blocked"}` / `{type:"reported"}` |
| `{type:"ping"}` | `{type:"banned", until}` / `{type:"pong"}` |

The user who has waited longer is the WebRTC *initiator* and sends the offer.

## Ideas for v2

- Online user count, country/language filters
- AI/NSFW moderation on video frames (e.g. sample frames client-side and run a classifier)
- Captcha on connect to slow down bots; per-IP connection limits
- Redis-backed horizontal scaling
- Moderator dashboard for reports
