# Go-Live & Deployment Plan + 24-Day Advent Checklist

---

## Part 1: Hosting Decision — Firebase Hosting vs. Google VM vs. Alternatives

Because this Astro portfolio, blog, and the embedded **X Card Studio (`/x-export`)** compile down to **100% static assets (`dist/`)** with client-side CORS requests, **you do not need a Google Compute Engine (GCE) VM**.

### Why Skip the Google VM?
Running a Linux VM (`e2-micro` / `e2-small`) just to serve static Astro files means managing:
- Unattended OS & kernel security patches (ironic for a DevSec blog!)
- Let's Encrypt / Certbot TLS renewal crons
- SSH key lockdown & firewall rules (`ufw` / GCP VPC rules)
- Manual Docker image rebuilds and container restarts on every post

### Top 3 Easy-to-Deploy Options Compared

| Criteria | **1. Cloudflare Pages** *(Easiest Git-Push)* | **2. Firebase Hosting** *(Best Google Ecosystem)* | **3. Google Cloud Run** *(Best if using Docker)* | **4. Google VM (GCE)** *(Not Recommended)* |
| :--- | :--- | :--- | :--- | :--- |
| **Deploy Experience** | Automatic on `git push` | `firebase deploy` or GitHub Action | `gcloud run deploy --source .` | SSH + `docker build` + `docker run` |
| **Custom Security Headers (CSP)** | Native via `public/_headers` | Native via `firebase.json` | Via your `Dockerfile` + `nginx.conf` | Via `nginx.conf` |
| **SSL / HTTPS** | Automatic (Zero config) | Automatic (Zero config) | Automatic (Zero config) | Manual (Certbot / Caddy) |
| **Global CDN** | 300+ Edge locations | Fastly-backed Global CDN | Optional Cloud CDN | Single region unless LB added |
| **Cost** | **$0 / month** (Unlimited static bandwidth) | **$0 / month** (Spark free tier: 10 GB storage, 360 MB/day) | **~$0–$1 / month** (Scales to zero) | **$6–$15 / month** + static IP cost |
| **Server Maintenance** | Zero | Zero | Zero | High (OS patching, SSH, Docker) |

### Recommendation
1. **Pick Firebase Hosting (without a VM)** if you already use GCP/Firebase and want `firebase deploy` + GitHub Actions auto-deploy.
2. **Pick Cloudflare Pages** if your domain DNS is on Cloudflare and you want zero-config `git push` deployments with preview URLs for every branch/PR.
3. **Keep the `Dockerfile` + `nginx.conf`** as a portable fallback (or deploy it to **Google Cloud Run** with a single command if you ever add server-side Node APIs).

---

## Part 2: Ready-to-Use Deployment Configs

### Option A: Firebase Hosting (`firebase deploy` — No VM Required)

1. Install Firebase CLI (once):
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Create `firebase.json` in the project root (includes your strict security headers):
   ```json
   {
     "hosting": {
       "public": "dist",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "cleanUrls": true,
       "headers": [
         {
           "source": "**",
           "headers": [
             {
               "key": "Content-Security-Policy",
               "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://pbs.twimg.com; font-src 'self'; connect-src 'self' https://api.fxtwitter.com https://r.jina.ai https://pbs.twimg.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
             },
             { "key": "X-Frame-Options", "value": "DENY" },
             { "key": "X-Content-Type-Options", "value": "nosniff" },
             { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
             {
               "key": "Permissions-Policy",
               "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
             }
           ]
         },
         {
           "source": "/_astro/**",
           "headers": [
             { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
           ]
         }
       ]
     }
   }
   ```
3. Build and deploy with one command:
   ```bash
   npm run build && firebase deploy --only hosting
   ```

### Option B: Cloudflare Pages / Netlify (`public/_headers`)
If deploying to Cloudflare Pages, connect your GitHub/GitLab repository (`Build command: npm run build`, `Output directory: dist`) and drop a `public/_headers` file with your CSP and security headers.

---

## Part 3: Go-Live Checklist

- [ ] **1. Finalize Production Domain**
  - [ ] Confirm custom domain (e.g., `https://hristov.dev` or your chosen domain).
  - [ ] Update `site` in `astro.config.mjs` and `Sitemap:` URL in `public/robots.txt` if different from `https://hristov.dev`.
- [ ] **2. Choose & Connect Hosting**
  - [ ] Initialize Firebase Hosting (`firebase init hosting`) **or** connect repo to Cloudflare Pages.
  - [ ] Connect custom domain DNS (`A` / `CNAME` records) and verify automatic SSL certificate provisioning.
- [ ] **3. Set Up Automated CI/CD & Daily Advent Unlocks**
  - [ ] Add a GitHub Actions / GitLab CI workflow that runs `npm ci && npm run build` and deploys on every push to `main`.
  - [ ] *(Optional Pro-Tip)* Add a daily cron trigger (`0 6 * * *` during December) to your CI pipeline and filter posts by `pubDate <= new Date()` so all 24 Advent posts can be merged ahead of time and unlock automatically each morning.
- [ ] **4. Verify Production Security Headers**
  - [ ] Run `curl -I https://<your-domain>` after deploy to confirm `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy` are present.
  - [ ] Test on [securityheaders.com](https://securityheaders.com) and [observatory.mozilla.org](https://observatory.mozilla.org) for an **A+** rating.
- [ ] **5. Smoke-Test All Live Routes**
  - [ ] `/` — Hero section, Latest on X (`@IvanovXapu`) live sync, Advent highlight card, latest posts.
  - [ ] `/blog` & `/tags/*` — Tag filtering and reading time estimates.
  - [ ] `/advent-2026` — 24-day grid showing unlocked vs. locked cards.
  - [ ] `/x-export` — Load tweet, edit inline, test **Copy Image** and **Download PNG**.
  - [ ] `/rss.xml` & `/sitemap-index.xml` — Validate XML output.

---

## Part 4: 24-Day DevSec Advent Calendar — Article & Social To-Do List

For each day below, verify:
1. **Markdown file** created in `src/content/blog/` with `series: "advent-2026"`, `adventDay: <1..24>`, and `pubDate: 2026-12-XX`
2. **Real-world receipt / CVE** and **copy-pasteable code/config snippet** included
3. **Pass `npm run check`** (`astro check` with zero schema/type errors)
4. **Social post drafted** for X (`@IvanovXapu`) & LinkedIn + shareable image exported via `/x-export`

### Week 1: Frontend & Browser Traps (Days 01–06)

- [x] **Day 01 (`2026-12-01`) — CSP `connect-src` Isn't Optional**
  - File: `src/content/blog/advent-day-01-csp-connect-src.md` *(Created)*
  - Tags: `["security", "csp", "frontend", "xss"]`
  - Receipt: Optimizely supply-chain attack (178 sites, Nov 2026 — only 15% had strict CSP)
  - [ ] Final review of prose & Nginx snippet
  - [ ] Post X & LinkedIn summary + export card in `/x-export`

- [ ] **Day 02 (`2026-12-02`) — Keep Third-Party Tags Off Sensitive Routes**
  - File: `src/content/blog/advent-day-02-isolate-sensitive-routes.md`
  - Tags: `["security", "frontend", "architecture"]`
  - Receipt: Optimizely / Magecart card-skimming campaigns hooking `fetch`, `XHR`, and form `submit` on `/login`, `/checkout`, `/billing`
  - [x] Write Markdown post & route-isolation / hosted-iframe code snippet *(Draft created)*
  - [ ] Review & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 03 (`2026-12-03`) — Dev Servers Belong on `localhost`**
  - File: `src/content/blog/advent-day-03-vite-dev-server-host.md`
  - Tags: `["security", "vite", "docker", "frontend"]`
  - Receipt: Vite Dev Server arbitrary file read & RCE (`GHSA-p4f5-76q4-ffq7`, CVSS 9.1, Nov 2026) — tie-in with your Nov 18 X post!
  - [x] Write Markdown post & `127.0.0.1:5173:5173` Docker / Vite config snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 04 (`2026-12-04`) — Stop Storing Auth Tokens in `localStorage`**
  - File: `src/content/blog/advent-day-04-http-only-cookies.md`
  - Tags: `["security", "auth", "frontend", "cookies"]`
  - Receipt: Client-side token harvesters via poisoned npm packages & compromised analytics tags
  - [x] Write Markdown post & `Set-Cookie: HttpOnly; Secure; SameSite=Strict` snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 05 (`2026-12-05`) — `window.postMessage` Without `event.origin` Checks**
  - File: `src/content/blog/advent-day-05-postmessage-origin-validation.md`
  - Tags: `["security", "javascript", "dom-xss"]`
  - Snippet: Strict `if (event.origin !== 'https://trusted.example.com') return;` guard + avoiding wildcard `'*'` as `targetOrigin`
  - [x] Write Markdown post & origin-allowlist snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 06 (`2026-12-06`) — Subresource Integrity (`integrity="..."`) for Static CDNs**
  - File: `src/content/blog/advent-day-06-subresource-integrity.md`
  - Tags: `["security", "frontend", "supply-chain"]`
  - Snippet: `<script src="..." integrity="sha384-..." crossorigin="anonymous">` + `openssl dgst -sha384 -binary | openssl base64 -A`
  - [x] Write Markdown post & SRI generation snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

---

### Week 2: Secrets, Tokens & AI Tooling (Days 07–12)

- [ ] **Day 07 (`2026-12-07`) — Audit Your Forgotten GitHub & GitLab PATs**
  - File: `src/content/blog/advent-day-07-audit-personal-access-tokens.md`
  - Tags: `["security", "git", "credentials", "devsecops"]`
  - Receipt: Cursor / Fireworks AI breach (Nov 2026) — tie-in with your Nov 16 X post!
  - [x] Write Markdown post & fine-grained PAT checklist *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 08 (`2026-12-08`) — Never Run Untrusted Repos on Your Host Machine**
  - File: `src/content/blog/advent-day-08-sandbox-untrusted-repos.md`
  - Tags: `["security", "social-engineering", "containers"]`
  - Receipt: North Korean FaceStealer (APT38) & Binance Oct 29 breach via fake recruitment coding assignments
  - [x] Write Markdown post & isolated Dev Container / disposable VM setup *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 09 (`2026-12-09`) — Treat IDE Extensions & MCP Servers Like Prod Dependencies**
  - File: `src/content/blog/advent-day-09-ide-extensions-mcp-security.md`
  - Tags: `["security", "ai", "supply-chain", "tooling"]`
  - Receipt: Trojanized Claude Code extension on Cursor Marketplace & permission-bypass leaks (Nov 2026)
  - [x] Write Markdown post & MCP/extension hardening rules *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 10 (`2026-12-10`) — Stop Pasting Raw Secrets Into Docs, Tickets, and AI Prompts**
  - File: `src/content/blog/advent-day-10-secrets-in-docs-and-prompts.md`
  - Tags: `["security", "secrets-management", "ai"]`
  - Receipt: Russian COLD RELIC campaign pivoting through Google Workspace docs & GitBook SSO breach (Nov 2026)
  - [x] Write Markdown post & secret-sharing alternatives (1Password/Vault one-time links) *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 11 (`2026-12-11`) — Replace Static CI Secrets With OIDC Federation**
  - File: `src/content/blog/advent-day-11-ci-oidc-over-static-keys.md`
  - Tags: `["security", "ci-cd", "cloud", "devsecops"]`
  - Snippet: GitHub Actions / GitLab CI `id-token: write` OIDC role assumption snippet
  - [x] Write Markdown post & OIDC YAML snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 12 (`2026-12-12`) — `.env` in `.gitignore` Isn't Enough**
  - File: `src/content/blog/advent-day-12-git-history-secret-scanning.md`
  - Tags: `["security", "git", "ci-cd"]`
  - Snippet: `gitleaks` / `trufflehog` pre-commit & CI configuration
  - [x] Write Markdown post & `gitleaks` config snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

---

### Week 3: Dependencies & Supply Chain (Days 13–18)

- [ ] **Day 13 (`2026-12-13`) — Commit Lockfiles & Enforce `--frozen-lockfile` (`npm ci`)**
  - File: `src/content/blog/advent-day-13-frozen-lockfiles-ci.md`
  - Tags: `["security", "npm", "ci-cd", "supply-chain"]`
  - [x] Write Markdown post & CI lockfile enforcement snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 14 (`2026-12-14`) — Lifecycle Scripts (`postinstall`) Are Silent RCE**
  - File: `src/content/blog/advent-day-14-npm-lifecycle-scripts.md`
  - Tags: `["security", "nodejs", "npm", "supply-chain"]`
  - Snippet: `.npmrc` `ignore-scripts=true` / `pnpm.onlyBuiltDependencies`
  - [x] Write Markdown post & script-allowlist config *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 15 (`2026-12-15`) — Audit Transitive Dependencies, Not Just `package.json`**
  - File: `src/content/blog/advent-day-15-transitive-dependencies.md`
  - Tags: `["security", "npm", "vulnerabilities"]`
  - Snippet: `npm ls <pkg>` & `overrides` in `package.json`
  - [x] Write Markdown post & `overrides` example *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 16 (`2026-12-16`) — Pin Docker Base Images by SHA256 Digest**
  - File: `src/content/blog/advent-day-16-pin-docker-digests.md`
  - Tags: `["security", "docker", "containers", "supply-chain"]`
  - Snippet: `FROM node:22-alpine@sha256:...` + Renovate digest pinning config
  - [x] Write Markdown post & pinned `Dockerfile` snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 17 (`2026-12-17`) — Don't Run Node & Web Containers as `root`**
  - File: `src/content/blog/advent-day-17-non-root-docker-containers.md`
  - Tags: `["security", "docker", "nodejs", "hardening"]`
  - Snippet: `USER node` + read-only root filesystem flags
  - [x] Write Markdown post & hardened `Dockerfile` snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 18 (`2026-12-18`) — Automate CVE Triage Against Your Actual Stack**
  - File: `src/content/blog/advent-day-18-automate-cve-triage.md`
  - Tags: `["security", "devsecops", "automation"]`
  - [x] Write Markdown post & SBOM / advisory matching workflow *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

---

### Week 4: Backend, Databases & Ops (Days 19–24)

- [ ] **Day 19 (`2026-12-19`) — Split Your DB Migration User From Your Runtime App User**
  - File: `src/content/blog/advent-day-19-least-privilege-db-roles.md`
  - Tags: `["security", "postgresql", "database", "backend"]`
  - Receipt: PostgreSQL 22-year-old type-confusion RCE (`CVE-2026-6460`, Nov 2026)
  - [x] Write Markdown post & PostgreSQL `GRANT SELECT, INSERT, UPDATE, DELETE` role separation SQL *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 20 (`2026-12-20`) — Firewall Internal Database Ports (`5432`, `1521`, `6379`)**
  - File: `src/content/blog/advent-day-20-firewall-database-ports.md`
  - Tags: `["security", "database", "networking", "ops"]`
  - Receipt: PostgreSQL 18 pre-auth spinlock DoS (`CVE-2026-116322`) & Oracle Nov 2026 CSPU unauthenticated CVSS 9.9 flaws — tie-in with your Nov 17 X post!
  - [x] Write Markdown post & private subnet / security group rules *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 21 (`2026-12-21`) — Validate Outbound URLs to Kill SSRF**
  - File: `src/content/blog/advent-day-21-prevent-ssrf.md`
  - Tags: `["security", "backend", "nodejs", "ssrf"]`
  - Snippet: Node.js DNS resolution + private IP range (`127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`) blocker
  - [x] Write Markdown post & SSRF-safe `fetch` guard in TypeScript *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 22 (`2026-12-22`) — Rebuild Headless Chromium Containers on Every Browser CVE**
  - File: `src/content/blog/advent-day-22-headless-chromium-containers.md`
  - Tags: `["security", "docker", "chromium", "backend"]`
  - Receipt: Actively exploited Chromium `libxslt` use-after-free (`CVE-2026-125350`, Nov 2026)
  - [x] Write Markdown post & automated Playwright/Puppeteer image rebuild workflow *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 23 (`2026-12-23`) — Never Trust Client-Side RBAC Alone (IDOR Prevention)**
  - File: `src/content/blog/advent-day-23-server-side-rbac-idor.md`
  - Tags: `["security", "api", "angular", "nestjs"]`
  - Snippet: NestJS Guard + tenant-scoped query (`WHERE id = :id AND tenant_id = :tenantId`)
  - [x] Write Markdown post & Angular vs. NestJS authorization snippet *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn summary

- [ ] **Day 24 (`2026-12-24`) — The 5-Minute Holiday Freeze Security Checklist**
  - File: `src/content/blog/advent-day-24-holiday-freeze-checklist.md`
  - Tags: `["security", "devsecops", "checklist"]`
  - [x] Write Markdown post & pre-holiday token rotation / alert / backup verification checklist *(Draft created)*
  - [ ] Review draft & set `draft: false` when ready to publish
  - [ ] Post X & LinkedIn finale summary
