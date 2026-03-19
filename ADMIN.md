# Admin panel

## URL

- **UI:** `https://your-domain/admin` (or `http://localhost:3000/admin`)
- **API:** `/api/admin/*` (requires JWT + `isAdmin: true` on the user)

## Requirements

- **MongoDB** must be connected. If the server falls back to **in-memory** storage, admin APIs return `503` and the panel is not usable for real data.

## Grant admin to your account

### Option A — environment variable (recommended on deploy)

1. Register a normal account in the game (email + password).
2. Set on the server:

   ```bash
   ADMIN_BOOTSTRAP_EMAIL=you@example.com
   ```

3. Restart the server. On startup it sets `isAdmin: true` for that email (user must already exist).

### Option B — MongoDB directly

```js
db.users.updateOne(
  { email: "you@example.com" },
  { $set: { isAdmin: true } }
)
```

## Sections

| Section | Purpose |
|--------|---------|
| **Dashboard** | User counts, game totals, games in last 7 days, breakdown by mode, recent games |
| **Users** | Search, paginate, grant/revoke admin (registered users only) |
| **Games & matches** | Paginated game records, JSON detail |
| **Leaderboard** | Top registered players by points |
| **Activity** | Placeholder for future live metrics |
| **System & health** | Process stats + public `/health` JSON |
| **Settings** | Read-only flags (e.g. Lucky Wheel default, app version) |

## Security notes

- Do **not** expose `ADMIN_BOOTSTRAP_EMAIL` in client-side code; it is server-only.
- Use strong `JWT_SECRET` and `SESSION_SECRET` in production.
- The admin UI stores the JWT in **sessionStorage** after login.
