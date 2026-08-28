# WAR KELAS

> Real-time, first-come-first-served classroom claiming for schools.
> **Siapa cepat, dia dapat.** Backend-enforced. Race-condition proof.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Key Features](#key-features)
3. [Screens & URLs](#screens--urls)
4. [Tech Stack](#tech-stack)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [Usage: Admin Flow](#usage-admin-flow)
8. [Usage: Student Flow](#usage-student-flow)
9. [CSV Import Format](#csv-import-format)
10. [Data Model](#data-model)
11. [API Reference](#api-reference)
12. [Atomic Claim Algorithm](#atomic-claim-algorithm-the-core)
13. [WAR Lifecycle](#war-lifecycle)
14. [Project Structure](#project-structure)
15. [Security Notes](#security-notes)
16. [Testing](#testing)
17. [FAQ / Troubleshooting](#faq--troubleshooting)

---

## What It Does

WAR KELAS lets an administrator open a **timed "rush event"** where students race to claim a limited number of classroom slots. Whoever taps first, wins. The backend guarantees that no room can ever go over capacity — even if a hundred students tap the same room in the same millisecond.

It is **not** a voting system, **not** a booking marketplace, and **not** a polling app. It is a real-time slot-claiming system.

Example:
```
ROOM A — capacity 10
9 students already in.
Jonathan, Michael, Kevin all tap "REBUT" at the exact same moment.

Result:
Jonathan → SUCCESS
Michael  → ROOM FULL
Kevin    → ROOM FULL
```

---

## Key Features

- 🔒 **Atomic room claiming** — MongoDB `findOneAndUpdate` with conditional query prevents over-capacity under any concurrency.
- ⏱️ **Server-authoritative countdown** — all participants see the same start time, computed from server clock offset.
- 🚦 **Full WAR lifecycle** — DRAFT → LOBBY → LIVE → COMPLETED / CANCELLED, with auto-transitions at scheduled times.
- 📱 **Mobile-first UI** — big touch targets, sticky header, 3-2-1-GO countdown overlay.
- 🔑 **Admin password gate** — separate `/admin` URL, hidden from public home page. Token sent via `x-admin-token` header on every admin call.
- 🧑‍🎓 **NISN-restricted join** — admin pre-imports students; only imported NISNs can join. Case-insensitive matching.
- 📤 **CSV import** — upload a `.csv` file OR paste rows. Auto-detects header. Deduplicates by NISN.
- 📊 **Live admin dashboard** — real-time room progress bars, activity feed of successful claims, live participant/assignment stats.
- 🗑️ **Full CRUD** — create WAR, add/remove rooms in the create form, add/remove students, delete an entire WAR (cascade), manual assign/unassign, reset assignments.
- 📥 **CSV export** — download final allocation (NISN, Name, Room, Time).
- 🔁 **Adaptive polling** — 700 ms during LIVE (fast enough to feel real-time), 900 ms on admin dashboard, 1.5 s in lobby. No websockets required.

---

## Screens & URLs

| URL | Who | What |
|---|---|---|
| `/` | Public | Enter a WAR CODE to join |
| `/#join/<CODE>` | Public | Join form (NISN + optional Name) |
| `/#war/<CODE>` | Student | Lobby → LIVE room cards → result |
| `/admin` | Admin | Password login → WAR list |
| `/admin#dashboard/<warId>` | Admin | Live dashboard for a specific WAR |

The admin panel has **no link from the public home page**. Admins access it by typing/bookmarking `/admin` directly.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router) with a single catch-all API route
- **Database:** MongoDB 6 (embedded rooms inside the `wars` document → atomic single-document updates)
- **Styling:** Tailwind CSS + shadcn/ui components (Radix primitives)
- **Icons:** lucide-react
- **Notifications:** sonner
- **Runtime:** Node.js, managed by supervisor

**No websockets, no realtime backend service.** Concurrency is handled by MongoDB's atomic `findOneAndUpdate` and near-real-time UX by adaptive short-interval polling.

---

## Quick Start

```bash
# From /app
yarn install
sudo supervisorctl restart nextjs
```

Open:
- Public: `http://localhost:3000/`
- Admin:  `http://localhost:3000/admin`  (default password: `admin123`)

Or, in this environment, use the public URL from `/app/.env` → `NEXT_PUBLIC_BASE_URL`.

---

## Environment Variables

Located in `/app/.env`:

| Variable | Purpose | Example |
|---|---|---|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name (fallback: `warkelas` if unset or placeholder) | `warkelas` |
| `NEXT_PUBLIC_BASE_URL` | Public app URL | `https://your-app.example.com` |
| `CORS_ORIGINS` | CORS whitelist | `*` |
| `ADMIN_PASSWORD` | Password for the admin console | `admin123` |

**To change the admin password:**
```bash
# 1. edit /app/.env
ADMIN_PASSWORD=your-new-strong-password
# 2. restart
sudo supervisorctl restart nextjs
```

All existing browser sessions will be invalidated (401) on the next admin call, forcing re-login.

---

## Usage: Admin Flow

1. Go to `/admin` and enter the password.
2. Click **Buat WAR Baru** (Create New WAR).
   - Fill in name, description, start/end datetime.
   - Add/remove classrooms with **Nama**, **Kode**, **Cap** (capacity).
   - Optional: toggle **Boleh Pindah Ruangan** (allow room switching after claim).
3. On the dashboard:
   - **Upload CSV** or **Paste List** to import students (see [CSV format](#csv-import-format)).
   - Copy the share link (`Copy` button) and distribute to students.
   - Click **Mulai WAR Sekarang** (Start WAR Now) whenever you want to open the race, or let it auto-start at the scheduled time.
4. Watch the live dashboard: room progress bars, activity feed, stats.
5. When the WAR ends (time up, all slots filled, or manual **Akhiri WAR**):
   - Click **Export CSV** to download the final allocation.
6. To remove a WAR entirely: **Hapus WAR** (cascades: deletes WAR + participants + activity logs).

**Admin dashboard controls:**

| Button | Effect |
|---|---|
| Mulai WAR Sekarang | Force status → `LIVE` immediately |
| Akhiri WAR | Force status → `COMPLETED` |
| Reset | Clear all assignments, restore all slot counts, set status → `LOBBY` |
| Batalkan | Status → `CANCELLED` (soft close) |
| Export CSV | Download NISN/Name/Room/Time as CSV |
| Hapus WAR | Permanently delete WAR + all its data |
| ➕ (per student) | Add a single student inline |
| 🔄 (per assigned student) | Reset that student's assignment (frees the slot) |
| 🗑️ (per student) | Remove that student from the WAR |

---

## Usage: Student Flow

1. Student opens the share link `https://<host>/#join/KLS26` (or types WAR CODE on the home page).
2. Enters **NISN** on the join screen.
   - If the WAR has pre-imported students, the NISN must match one on the roster — the name is pulled automatically.
   - If the WAR has no imports (open registration), student also enters their name.
3. Lands in the **lobby**:
   - Shows WAR name, countdown to start, number of peserta, room list (disabled).
4. When start time hits, a full-screen **3 → 2 → 1 → GO!** overlay plays.
5. Rooms become active. Student taps **REBUT** on the desired room.
6. Instantly sees one of:
   - **✓ ROOM SECURED** — with the room name and millisecond-precision selection time.
   - **TOO LATE** — someone else got the last slot; the student can try another room.
7. When the WAR ends, the student sees the **FINAL ALLOCATION** table plus their own room.

Their assignment persists in `localStorage` under `wk_pid_<CODE>` so refreshing the browser keeps them in.

---

## CSV Import Format

Any of the following work. Header row is auto-detected. Separators supported: `,` `;` `\t` `|`.

**With header:**
```
NISN,Nama
0012345678,Jonathan Wijaya
0012345679,Michael Tan
0012345680,Kevin Susanto
```

**Without header:**
```
0012345678, Jonathan Wijaya
0012345679, Michael Tan
0012345680, Kevin Susanto
```

Rules:
- Both columns required per row; rows missing NISN or Name are skipped.
- NISN is uppercased server-side (case-insensitive matching on join).
- Duplicates within the same WAR are silently skipped.
- Every imported student is flagged `preImported: true` → the WAR then enforces NISN-only join.

---

## Data Model

MongoDB collections (all IDs are UUIDv4, no ObjectID exposed):

### `wars`
```js
{
  id: "uuid",                    // primary key
  code: "KLS26",                 // 5-char uppercase, unique
  name: "Pembagian Kelas Semester 1",
  description: "",
  startAt: "2026-08-28T13:00:00.000Z",
  endAt:   "2026-08-28T13:10:00.000Z",
  status: "LOBBY",               // DRAFT | LOBBY | LIVE | COMPLETED | CANCELLED
  allowRoomChange: false,
  rooms: [                       // embedded — enables atomic single-doc updates
    {
      id: "uuid",
      name: "ROOM A",
      code: "A-101",
      capacity: 10,
      slotsLeft: 10,             // decremented atomically on claim
      assignedCount: 0,          // incremented atomically on claim
      status: "ACTIVE",          // ACTIVE | LOCKED
      floor: "1",
      building: "",
      description: ""
    }
  ],
  createdAt: "2026-08-28T04:00:00.000Z"
}
```

Indexes: `id` (unique), `code` (unique).

### `participants`
```js
{
  id: "uuid",
  warId: "uuid",
  participantCode: "0012345678", // NISN, uppercased
  name: "Jonathan Wijaya",
  roomId: null | "uuid",         // null until they claim
  assignedAt: null | "ISO",
  preImported: true | false,     // true if admin imported them (roster mode)
  createdAt: "ISO"
}
```

Indexes: `id` (unique), `warId`, `(warId, participantCode)` (unique).

### `activity_logs`
```js
{
  id: "uuid",
  warId: "uuid",
  participantId: "uuid",
  participantName: "Jonathan",
  roomId: "uuid",
  roomName: "ROOM A",
  action: "CLAIM" | "ADMIN_ASSIGN" | "ADMIN_UNASSIGN",
  createdAt: "ISO"
}
```

Indexes: `(warId, createdAt desc)`.

---

## API Reference

All routes are under `/api/…`. Admin routes require header `x-admin-token: <ADMIN_PASSWORD>`.

### Public

| Method | Path | Body / Params | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | Health probe; returns `{ ok, now }` |
| GET | `/api/wars/code/:CODE` | — | Public WAR state (rooms, counts, serverTime). Auto-transitions status on read. |
| GET | `/api/participants/:id` | — | A participant's current state |
| POST | `/api/join` | `{ code, nisn, name? }` | Join a WAR. Enforces NISN-only if WAR has imported roster. |
| POST | `/api/claim` | `{ participantId, roomId }` | **The atomic claim** (see algorithm below) |

### Admin (require `x-admin-token`)

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/api/admin/login` | `{ password }` | Returns `{ ok, token }` on success (no header needed for this call) |
| GET | `/api/wars` | — | List all WARs |
| POST | `/api/wars` | `{ name, description?, startAt, endAt, rooms: [{name, code?, capacity, ...}], allowRoomChange? }` | Create WAR |
| GET | `/api/wars/:id/full` | — | Full state (war + participants + last 50 activity + serverTime) |
| POST | `/api/wars/:id/start` | — | Force status → LIVE now |
| POST | `/api/wars/:id/end` | — | Force status → COMPLETED |
| POST | `/api/wars/:id/cancel` | — | Force status → CANCELLED |
| POST | `/api/wars/:id/reset` | — | Reset all assignments, restore slots, status → LOBBY |
| POST | `/api/wars/:id/delete` | — | Cascade-delete WAR + participants + logs |
| POST | `/api/wars/:id/participants` | `{ name, participantCode }` OR `{ participants: [...] }` | Add / import; flags `preImported: true` |
| POST | `/api/wars/:id/participants/:pid/remove` | — | Remove a participant (frees their slot if assigned) |
| POST | `/api/wars/:id/assign` | `{ participantId, roomId }` | Manually assign |
| POST | `/api/wars/:id/unassign` | `{ participantId }` | Free a participant's assignment |

### Response envelope

- Success: `{ ok: true, ...data }`
- Error: `{ ok: false, error: "MESSAGE" }` with appropriate HTTP status (400 / 401 / 403 / 404 / 409 / 500)

### Notable error codes on `/api/claim`

| `error` value | HTTP | Meaning |
|---|---|---|
| `ROOM_FULL` | 409 | You lost the race — room is now at capacity |
| `ALREADY_ASSIGNED` | 409 | This participant already owns a room |
| `WAR is not LIVE` | 400 | Blocked outside the LIVE window |
| `Participant not found` | 404 | Bad participantId |

---

## Atomic Claim Algorithm (the core)

The critical requirement: even under massive concurrency, `assignedCount ≤ capacity` must always hold.

We rely on **MongoDB single-document atomicity** and use a two-step algorithm with rollback.

**Step 1 — Reserve a slot on the room** (atomic single-doc `findOneAndUpdate`):
```js
db.wars.findOneAndUpdate(
  {
    id: warId,
    status: 'LIVE',
    rooms: {
      $elemMatch: {
        id: roomId,
        slotsLeft: { $gt: 0 },
        status: 'ACTIVE'
      }
    }
  },
  { $inc: { 'rooms.$.slotsLeft': -1, 'rooms.$.assignedCount': 1 } },
  { returnDocument: 'after' }
);
```

- The match condition `slotsLeft: { $gt: 0 }` guarantees we can never decrement below zero.
- If no document is returned, the room is full or locked → return `ROOM_FULL`.

**Step 2 — Bind the participant** (atomic single-doc `findOneAndUpdate`):
```js
db.participants.findOneAndUpdate(
  { id: participantId, roomId: null },
  { $set: { roomId, assignedAt } },
  { returnDocument: 'after' }
);
```

- The `roomId: null` guard prevents the same participant from being bound to two rooms if they double-tap or open two tabs.
- If it returns null → they were already assigned. Roll back the slot decrement:

**Rollback path:**
```js
db.wars.updateOne(
  { id: warId, 'rooms.id': roomId },
  { $inc: { 'rooms.$.slotsLeft': +1, 'rooms.$.assignedCount': -1 } }
);
return { error: 'ALREADY_ASSIGNED' };
```

**On success:**
- Insert an `activity_logs` entry.
- If total assigned ≥ total capacity, set WAR status → `COMPLETED`.

### Why this is safe

- Each MongoDB single-document operation is atomic. Multiple concurrent requests are serialized by the storage engine (WiredTiger's document-level locking).
- The conditional match (`slotsLeft > 0`) means only the ones that would keep the invariant valid will succeed. The rest fail cleanly.
- The rollback path is idempotent (`$inc` of ±1) and does not affect the invariant.

**Verified:** 10 concurrent requests to a capacity-3 room result in exactly 3 successes and 7 `ROOM_FULL`. Confirmed by automated testing suite.

---

## WAR Lifecycle

```
DRAFT ── (not currently exposed) ──┐
                                    │
                                    ▼
                                  LOBBY  ─── admin cancels ──▶ CANCELLED
                                    │
                                    │ startAt reached OR admin "Start"
                                    ▼
                                   LIVE  ─── admin cancels ──▶ CANCELLED
                                    │
                                    │ endAt reached
                                    │ OR admin "End"
                                    │ OR all slots filled
                                    ▼
                                COMPLETED
```

Status transitions are computed **server-side** on every relevant read, so no cron/scheduler is required.

---

## Project Structure

```
/app
├── app
│   ├── api
│   │   └── [[...path]]
│   │       └── route.js          # ALL API endpoints (GET + POST catch-all)
│   ├── admin
│   │   └── page.js               # Admin console (login → list → dashboard)
│   ├── page.js                   # Public app (home → join → lobby → live)
│   ├── layout.js                 # Root layout + Toaster
│   └── globals.css               # Tailwind + design tokens + animations
├── components
│   └── ui/                       # shadcn/ui primitives
├── lib
│   ├── mongo.js                  # MongoDB client + index bootstrap
│   ├── wk.js                     # Shared helpers (api, fmt, useServerClock)
│   └── utils.js                  # cn() etc.
├── .env                          # MONGO_URL, DB_NAME, ADMIN_PASSWORD, …
├── package.json
└── README.md                     # this file
```

---

## Security Notes

This is an MVP. It uses a shared-password admin token model (the token IS the password), which is intentional for simplicity in a school setting. For a production hardening pass, consider:

- Replace shared token with per-user accounts + hashed passwords + JWT/session cookies.
- Add rate limiting on `/api/admin/login` and `/api/join`.
- Serve over HTTPS only; set the admin cookie with `HttpOnly` + `Secure` + `SameSite=Strict`.
- Add MongoDB TLS + auth.
- Consider a distinct `Draft`/`Publish` gate before students can see a WAR by code.

Public endpoints are locked down:
- `/api/claim` requires a valid `participantId` for a war in `LIVE` state.
- Participants cannot claim two rooms (`roomId: null` guard).
- Participants cannot claim locked rooms or full rooms (atomic conditional match).
- Admin endpoints reject without `x-admin-token`.

---

## Testing

The backend was verified by an automated test agent covering:

| Category | Cases |
|---|---|
| Health & CRUD | Create WAR, get by code, admin GET full state |
| Lifecycle | Force start, end, cancel, reset |
| Join | NISN match, wrong NISN rejected, idempotent re-join, case-insensitivity, open-registration fallback |
| **Atomic claim** | **10 concurrent claims on capacity-3 → exactly 3 successes / 7 `ROOM_FULL`** |
| Double-claim | Same participant claiming twice → `ALREADY_ASSIGNED` |
| Auto-completion | WAR flips to `COMPLETED` when all slots filled |
| Admin manual | Assign / unassign / participant remove (slot rebalanced) |
| Delete cascade | WAR + participants + logs all removed |
| Auth gate | All admin endpoints return 401 without token; public endpoints don't |

**Result: 21/21 passed.**

To run manually:
```bash
# health
curl https://<host>/api/health

# admin login
curl -X POST https://<host>/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'
```

---

## FAQ / Troubleshooting

**Q: The countdown is off between two devices.**
The client uses server clock offset (`serverTime` from the API) — offsets are recomputed each poll. Very large clock skew is normalized within 1–2 seconds.

**Q: A student got "TOO LATE" on every room, but there are still slots.**
Refresh their page. The polling loop will fetch the latest state within ~700 ms during LIVE.

**Q: I want two WARs running simultaneously.**
Supported. Each WAR has its own code; students only see the WAR they joined. Admin dashboard is per-WAR.

**Q: How do I let students pick their own name (no roster)?**
Create a WAR and don't import any students. The join screen will then ask for both NISN and Name. First-come participants are created on the fly.

**Q: Room went above capacity — is that possible?**
No. It is mathematically prevented by the atomic conditional `$elemMatch: { slotsLeft: { $gt: 0 } }`. If you see this, please open an issue with the WAR ID.

**Q: Can I edit a WAR after creating it?**
Currently you can: reset all assignments, add/remove students, manually assign/unassign, delete the WAR. Editing rooms/capacity after creation is not yet exposed as a UI action — you can `Reset` and re-create if needed. (Backend can be extended easily.)

**Q: How do I change the admin password?**
Edit `ADMIN_PASSWORD` in `/app/.env` and run `sudo supervisorctl restart nextjs`. Existing admin sessions will be forced to re-login.

---

**License:** MIT (or as per your school/organization policy).

**Author:** WAR KELAS team — built for fast, fair, and frictionless classroom allocation.
