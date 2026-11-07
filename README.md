# Cairo & Current

A two-page Cairo experience website with an administrator QR builder and a protected dashboard. Static frontend on GitHub Pages; Cloudflare Workers + D1 backend on the free plan.

## Features

- Admin creates reusable invitations from a required name and optional mobile number.
- Download PNG/SVG QR codes, print an invitation, or copy its URL.
- QR URLs contain an opaque token, never a name or mobile number.
- Opening a QR URL stores a server timestamp; the tour page still works if tracking fails.
- Khan El Khalili and Nile kayak backgrounds respond to hover, focus, and selection. Kayak is marked Soon and cannot proceed.
- Khan's Proceed opens the specified Airbnb experience.
- Admin dashboard includes counts, 14-day activity, search, scan-date filters, record editing/deletion, QR disabling, scan history, CSV export, and tour-description editing.
- Viewer API responses contain guest names only. No mobile numbers, timestamps, identifiers, or write/export access.
- No scheduled record deletion or QR expiration. Storage is subject to service quotas and account continuity.

## Local preview

Requires Node 22 or newer.

```sh
npm ci
npm run dev
```

In a second terminal:

```sh
node scripts/dev-api.mjs
```

Open http://127.0.0.1:5173. The local API uses an **in-memory, disposable database** and explicitly test-only access codes defined in `tests/helpers.js`: `local-admin-demo` and `local-viewer-demo`. They are never accepted by the deployed Worker. Restarting this test API clears its records.

Routes use URL hashes to work on GitHub Pages without rewrite rules:

- `#/tours`: public tour page.
- `#/builder`: administrator QR builder.
- `#/dashboard`: role-restricted dashboard/login.
- `#/privacy`: privacy information and image credits.

## Tests

```sh
npm test
npx playwright install chromium
npm run test:ui
npm run build
```

API tests run the actual Worker in Miniflare against a real local D1 implementation. Browser tests run against that same backend, not mocked login or record services. Only Airbnb navigation and the intentional tracking-outage case are intercepted. The mobile project emulates an iPhone-sized screen using Chromium; it is not an actual iPhone/Safari certification.

## Production setup

1. Create a public GitHub repository and push this source. No `.env`, `.dev.vars`, database exports, actual access codes, or credentials belong in the repository.
2. Sign in to Cloudflare with `npx wrangler login`; keep the account on Workers Free.
3. Run `npx wrangler d1 create cairo-and-current`. Replace the placeholder `database_id` in `wrangler.jsonc` with the returned ID.
4. Set `ALLOWED_ORIGIN` to `https://YOUR-ACCOUNT.github.io` and `PUBLIC_SITE_URL` to the complete GitHub Pages URL in `wrangler.jsonc`. The latter documents the canonical public URL. QR links are generated from the site the administrator is using, so create production QRs only on the final published URL.
5. Run `npx wrangler d1 migrations apply DB --remote`.
6. Run `npx wrangler deploy` and note the HTTPS Worker URL.
7. Configure `PASSWORD_SALT`, `ADMIN_CODE_HASH`, and `VIEWER_CODE_HASH` using `scripts/set-secrets.mjs` with access codes supplied through stdin, never command-line arguments. The script derives PBKDF2-SHA256 hashes with 100,000 iterations and a random salt, then pipes them to Wrangler. The application does not ship with production credentials.
8. Add a GitHub Actions repository variable named `API_URL` containing the Worker HTTPS URL, without a trailing slash. This URL is public configuration, not a secret.
9. Enable GitHub Pages with **GitHub Actions** as its source. Run the **Publish GitHub Pages** workflow. It runs tests before building/deploying.
10. Verify real admin and viewer logins, create a temporary production invitation, scan it, check the scan time, and test the Airbnb destination. Delete only that temporary verification record afterward.

No paid plan, purchased domain, or ongoing billing is required within provider quotas. The publishing workflow is deliberately manual so an unconfigured backend is not published automatically.

## Security and operating notes

- Sessions expire after eight hours and are checked against D1 on every protected request. Browser session storage contains an opaque token, not the access code. Logout revokes the token on the server.
- Login attempts are limited per hashed network address. The address is salted before temporary storage and is not visitor analytics. Expired temporary entries are cleaned up on successful sign-in.
- Scan requests are limited per QR token and deduplicated by event UUID. A new page opening is a new visit. Link opening is not proof of attendance, identity, or Airbnb booking.
- The names-only viewer role still reveals names as explicitly requested. Keep both access codes private.
- Inputs are validated and escaped. Database operations use prepared statements; exports neutralize spreadsheet formulas.
- An administrator may permanently delete a record and its scan history or temporarily disable its QR. Deletion is irreversible without a backup.
- Dates are stored in UTC. Admin scan times display in Africa/Cairo. Date filters and chart days are explicitly labelled UTC.
- GitHub Pages cannot set custom response headers; the page uses a no-referrer policy so QR fragments are not disclosed through outbound referrers. API responses use no-store and restricted CORS.
- Do not change the Pages URL after printing codes unless the old URL remains operational.
- No tracking of device, precise location, browser, or advertising identifiers is added. Hosting and font providers process requests under their own policies.

## Backup and restoration

Record exports are for operational review; they are **not** a full database backup and do not contain every scan or QR token. For a complete backup, use:

```sh
npx wrangler d1 export DB --remote --output backups/private-backup.sql
```

The `backups/` folder is ignored by Git. Keep a copy in private storage under the owner's control, never in the public repository. Test restoration into a separate D1 database with `wrangler d1 execute NEW_DB --remote --file backups/private-backup.sql` before relying on a backup. For recovery, bind the restored database to the Worker and invalidate restored sessions before redeploying.

Before a production update, make a backup and retain the previous Worker deployment and Git commit. Frontend rollback: rerun Pages publication from the known-good commit. Worker rollback: use Cloudflare deployment history. A code rollback does not automatically undo database changes.

## Remaining live verification

Production deployment requires owner account sign-in. Physical printed QR scans on Android/iPhone, actual Safari/Firefox/Edge checks, screen-reader testing, and a user acceptance walkthrough must be recorded separately from the automated Chromium tests.
