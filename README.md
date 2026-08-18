# Stake Conference Headcount Tracker

Counts attendees at the front and back gates using three methods that all feed the same
running total: a staff-operated form/sheet, a self-serve QR code attendees scan with their
own phone (works over their own cellular data, not just venue Wi-Fi), and (once confirmed
safe — see `fingerprint/README.md`) a fingerprint scanner. Families are logged as one adult
record with a linked boy/girl child headcount. First-time guests and investigators get their
own check-in option so you know how many came and can follow up with them — whether a member
invited them or they came on their own.

No installation beyond Node.js itself on the two "primary" gate laptops — everything else is
plain files, nothing to `npm install`. Requires [Node.js](https://nodejs.org) (v18+).

## How data flows

- **Staff station** (`/station`) always writes to this laptop's local file first (works with
  zero internet), then best-effort copies it to a shared cloud database (Supabase) if there's
  internet — so it never depends on connectivity, but contributes to the combined total when
  it can.
- **Self-serve check-in** (the QR code) is a public page hosted on GitHub Pages, reachable
  over any internet connection (attendees' own cellular data — they don't need to join any
  Wi-Fi). It writes straight to the same cloud database. If it's opened from the local venue
  network instead, it tries this laptop's local server first and only falls back to the cloud
  if that's unreachable.
- **The combined "all gates" total** on the dashboard is pulled live from the cloud database.
  It only reflects what's synced so far — it can undercount if a gate has no internet at that
  moment, but it never double-counts.
- **Guest/investigator names, phone numbers, and addresses** are protected by a PIN, checked
  on the server (not just hidden in the page) — see "Dashboard PIN" below. The public
  self-serve page and the anon key it uses can only *submit* data, never read anyone else's.

## One-time setup (before Saturday)

1. This repo already has a Supabase project wired up (`public/supabase-config.js`,
   `docs/supabase-config.js`) — nothing to configure there.
2. Push this repo to GitHub and turn on Pages so the public self-serve QR works:
   ```bash
   git init
   git add .
   git commit -m "Conference tracker"
   git remote add origin https://github.com/asha-nephi/conference-tracker.git
   git push -u origin main
   ```
   Then on github.com: **Settings → Pages → Source: Deploy from a branch → Branch: `main`,
   folder: `/docs` → Save**. After a minute or two it'll be live at
   `https://asha-nephi.github.io/conference-tracker/`. (`public/site-config.js` already points
   the QR code at that URL — if the repo name/owner ever changes, update that file.)
3. **Dashboard PIN**: a random PIN was generated for the guest/investigator list — get it from
   whoever set this up (not written in this repo, since the repo may be public). Give it only
   to the stake clerk / leadership who need to see guest contact details. It can be changed any
   time by running this in the Supabase SQL editor for this project:
   ```sql
   update private_config set value = crypt('NEW_PIN_HERE', gen_salt('bf')) where key = 'dashboard_pin';
   ```

## Day-of setup (per gate)

Each gate needs **one laptop running the server** ("primary") and, optionally, a second
laptop that just opens a browser to the primary's address — no install needed on it.

1. Copy this whole `conference-tracker` folder onto the primary laptop for that gate
   (USB stick is fine — the local check-in flow needs no internet at all).
2. Connect the laptop to that gate's router/MiFi Wi-Fi (for the 2nd laptop and any local
   self-serve check-ins to reach it — the public QR code works regardless).
3. Double-click `start-server.bat`. When prompted, type `front` or `back` for the zone, and
   press Enter to accept the default port (3000).
4. The window will print something like:
   ```
   Local:   http://localhost:3000/station
   Network: http://192.168.1.42:3000/station   (use this on the 2nd laptop)
   ```
   Keep that window open all session — closing it stops the server.
5. On the **second laptop at the same gate**: connect to the same Wi-Fi, open a browser, and
   go to the "Network" address shown above.
6. Open `/display-qr` and either display it on screen at the entrance or print it — this is
   the public GitHub Pages link, so it works on anyone's phone regardless of what network
   they're on.

## Pages

- `/station` — usher-operated check-in: Individual, Family (adult name + phone/address +
  boys/girls count), or Guest/Investigator (name + phone/address + optional "invited by").
- `/checkin` — mobile self-serve page (local-network version; the public GitHub Pages version
  is the same page, deployed from `docs/`).
- `/display-qr` — full-screen QR code (public URL) + instructions, printable.
- `/dashboard` — live running total for this gate, the combined cross-gate cloud total, and
  the PIN-gated guest/investigator list.
- `/export?format=csv` or `?format=json` — download this gate's session data.
- `/merge.html` — standalone, works by double-click with no server running. Load the JSON
  exports from both gates to see the combined grand total (de-duplicated by ID) — a manual
  backup for the live cloud total, useful if neither gate had internet all session.

For **Individual** and self-serve "just me" check-ins, no name/phone/address is asked for —
that's intentionally the fast, anonymous lane. Family and Guest/Investigator entries require a
name and at least one of phone or address, since those are the ones worth following up on.

## Saturday test → Sunday live

Each session is dated automatically (`YYYY-MM-DD`). Run the full flow for real on Saturday
(Aug 22) before relying on it Sunday (Aug 23) — they show up as separate sessions on the
dashboard, so Saturday's test data never mixes with Sunday's real count. After Saturday's
test, export the data first, then use "Start fresh session" on the dashboard if you want a
clean slate for Sunday (this archives the old file, it never deletes anything).

## Fingerprint scanner

Not wired in yet — see `fingerprint/README.md` for why, and what's needed before it can be.
