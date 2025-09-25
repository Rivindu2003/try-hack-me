# Intentionally Vulnerable Lab (TryHackMe-style)

> [!] **Training use only. Do not expose this application to the public Internet.** Every vulnerability remains on purpose for practice.

## Front-end refresh highlights
- Modern glassmorphism-inspired shell with accessible typography and focus states.
- Responsive layout scaling cleanly from 320px handsets to ultrawide displays.
- Light/dark theme switcher with `prefers-color-scheme` support and keyboard toggle.
- Consistent navigation, skip links, and aria labeling across all challenge views.
- SVG logo + theme icons stored under `public/assets/`.

## Stack at a glance
- Node.js + Express + EJS templates
- SQLite (file-based) seeded via `init_db.js`
- Vanilla CSS/JS served from `/public`
- Multer for intentionally insecure uploads (no filtering)

## Deploy locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Prepare environment variables:
   ```bash
   cp .env.example .env
   ```
3. Seed the lab database (overwrites any existing `data.db`):
   ```bash
   npm run init-db
   ```
4. Boot the server:
   ```bash
   npm start
   ```
5. Browse to <http://localhost:3000>. Use the theme toggle in the top navigation to confirm both light and dark modes render correctly.

## Deploy with Docker Compose
1. Ensure Docker Desktop (or compatible daemon) is running locally.
2. Build and start the stack:
   ```bash
   docker compose up --build
   ```
3. Visit <http://127.0.0.1:3000>. Stop the containers with `Ctrl+C`.
4. To rebuild from scratch, add `--force-recreate --build` to the command above.
5. The stack persists its SQLite file at `./data/data.db` so lab state survives container rebuilds.

## Rollback / reset scenarios
- **UI rollback:**
  ```bash
  git checkout HEAD~1 -- views public/app.js public/styles.css public/assets README.md
  ```
  Adjust the revision target as needed to restore the previous front-end.
- **Database reset:**
  ```bash
  rm -f data.db
  npm run init-db
  ```
  For Docker Compose, remove `data/data.db` on the host and rerun `docker compose up` -- the entrypoint will seed automatically.
- **Uploads cleanup:**
  ```bash
  rm -f public/uploads/*
  ```
  Removes attacker-provided payloads while keeping the sample exploit path intact.

## Default credentials
- `alice / alicepass` (user)
- `bob / bobpass` (user)
- `admin / adminpass` (admin)

## Flag checklist
- `public/flag_easy.txt` -> `THM{flag_easy_2025}`
- `users.secret_note` (Alice) -> `THM{flag_sql_2025}`
- `orders.description` (#2) -> `THM{flag_idor_2025}`
- `/admin/messages` DOM -> `THM{flag_xss_2025}`
- `/admin/secret.txt` -> `THM{flag_admin_2025}`

## Supporting docs
- `walkthrough.md` - exploit steps and Burp notes for each flag.
- `SECURITY.md` - remediation guidance plus sharing/reset best practices.

---
This repository exists solely for defensive education. Leave every vulnerability intact when deploying for labs.
