# LineWatch API

Express + MongoDB backend for LineWatch, the public transport incident
reporting system. This replaces the old client-only prototype's mock
`window.storage` with a real database, real password-based accounts, and
two AI-backed endpoints.

## Stack

- **Express** — REST API
- **MongoDB / Mongoose** — data, with a `2dsphere` geospatial index on
  report locations
- **JWT + bcrypt** — auth (no more name-only mock login)
- **Anthropic API** — category auto-suggestion + the conversational
  report-filing assistant
- **Multer** — photo uploads, served from `/uploads`

The React frontend (with the Google Map view) is a separate piece — this
repo is the API it talks to.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Local (`mongodb://localhost:27017/linewatch`) or an Atlas connection string |
| `JWT_SECRET` | yes | Any long random string |
| `JWT_EXPIRES_IN` | no | Defaults to `7d` |
| `CLIENT_URL` | no | Your React dev server origin, for CORS |
| `ANTHROPIC_API_KEY` | only for AI routes | From console.anthropic.com — without it, `/api/ai/*` returns `503` but everything else works fine |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-haiku-4-5-20251001` (cheap/fast — fine for classification and short chat turns) |

Then seed the database (built-in categories, default lines, and three demo
accounts) and start the dev server:

```bash
npm run seed
npm run dev
```

API runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

Demo accounts created by `npm run seed` (password for all: `password123`):
- `ops@linewatch.demo` — staff
- `maya@linewatch.demo` — rider
- `jon@linewatch.demo` — rider

## Auth

Every protected route expects `Authorization: Bearer <token>`, where
`<token>` comes from `POST /api/auth/register` or `/login`. Staff-only
routes additionally check `role === 'staff'` server-side — don't rely on
hiding buttons in the UI alone.

## Endpoints

**Auth**
```
POST   /api/auth/register     { name, email, password, role? }
POST   /api/auth/login        { email, password }
GET    /api/auth/me           (auth)
```

**Reports**
```
GET    /api/reports                     public feed (?category=)
GET    /api/reports/mine                (auth) current user's reports (?status=)
GET    /api/reports/nearby              ?lat=&lng=&radius=  (meters, default 2000)
GET    /api/reports/manage              (staff) full list (?status=&moderation=&q=)
POST   /api/reports/check-duplicates    { category, description, location } -> candidates
POST   /api/reports                     (auth) create — multipart/form-data if attaching `photo`
GET    /api/reports/:id                 public (identity hidden unless owner/staff)
POST   /api/reports/:id/confirm         (auth)
PATCH  /api/reports/:id/status          (staff) { status }
PATCH  /api/reports/:id/moderate        (staff) { decision: approved|rejected|spam }
```

**Updates (broadcasts)**
```
GET    /api/updates
POST   /api/updates        (staff) { title, message, severity }
```

**Users** (all staff-only)
```
GET    /api/users           ?role=&flagged=true
PATCH  /api/users/:id/flag  { flagged: true|false }
```

**Categories / Lines**
```
GET    /api/categories            POST (staff)   DELETE /:key (staff, blocked for built-ins)
GET    /api/lines                 POST (staff)   DELETE /:id (staff)
```

**Audit log & analytics** (all staff-only)
```
GET    /api/audit
GET    /api/analytics/dashboard
GET    /api/analytics/trend?days=7
GET    /api/analytics/categories?scope=open
GET    /api/analytics/hotspots
GET    /api/analytics/severity
```

**AI**
```
POST   /api/ai/suggest-category   (auth) { description } -> { category, confidence, reason }
POST   /api/ai/chat               { sessionId?, message } -> { sessionId, reply, draft }
```
`draft` is `null` until the assistant has gathered category + description +
severity + location, at which point it's `{category, description, severity, locationLabel}` —
pass that straight into `POST /api/reports` to create the report (still
requires the rider to be logged in for that final step).

## Notes for the frontend

- **Location is GeoJSON**: `report.location.coordinates` is `[lng, lat]` —
  the *opposite* order from Google Maps' `LatLng(lat, lng)`. Flip it when
  you plot markers or you'll get points on the wrong continent.
- A report only has `coordinates` if the rider used GPS; text-only
  locations just have `location.label`. Handle both on the map.
- `GET /api/reports/:id` strips `reportedBy` for anyone who isn't staff or
  the report's own author — the public UI shouldn't assume it's there.
- `/api/ai/*` returns `503` with a plain-English message when
  `ANTHROPIC_API_KEY` isn't set — build the UI to degrade gracefully
  (e.g. hide the "AI suggest" button, or show the manual category grid) rather
  than treating it as a hard error.

## What's deliberately simplified

- Role is chosen at registration (no staff invite/approval flow). Fine for
  a coursework prototype; flag it if this needs to be production-real.
- Photos are stored on local disk under `/uploads`, not object storage —
  fine for local dev, won't survive a redeploy on most hosts.
- No refresh tokens — JWT just expires after `JWT_EXPIRES_IN` and the user
  logs in again.
