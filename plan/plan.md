2026 DevSec Advent Calendar — Content Plan (Days 01–24)

A 24-day series of bite-sized, high-signal security posts for frontend, Node.js, and DevOps engineers. Each entry maps directly to a Markdown post in src/content/blog/ (series: 'advent-2026') and a punchy social summary for X and LinkedIn.

Week 1: Frontend & Browser Traps (Days 01–06)

Day 01 — CSP connect-src Isn't Optional

File: src/content/blog/advent-day-01-csp-connect-src.md

Tags: ["security", "csp", "frontend", "xss"]

Core Takeaway: Allowlisting a vendor <script> in script-src isn't enough. Locking down connect-src prevents a compromised third-party script from exfiltrating scraped data to attacker-controlled domains.

Real-World Receipt: Optimizely supply-chain attack hitting 178 major sites (Nov 2026), where only 15% of affected sites had a strict enough CSP to stop payload/data exfiltration.

Day 02 — Keep Third-Party Tags Off Sensitive Routes

File: src/content/blog/advent-day-02-isolate-sensitive-routes.md

Tags: ["security", "frontend", "architecture"]

Core Takeaway: Analytics, chat widgets, and A/B testing scripts have zero business executing on /login, /checkout, /billing, or /settings. Isolate sensitive routes from tag managers and use hosted payment iframes.

Real-World Receipt: Optimizely / Magecart card-skimming campaigns that hook fetch, XHR, and form submit events on checkout pages.

Day 03 — Dev Servers Belong on localhost

File: src/content/blog/advent-day-03-vite-dev-server-host.md

Tags: ["security", "vite", "docker", "frontend"]

Core Takeaway: Hardcoding vite --host or server.host: true (0.0.0.0) in package.json or mapping -p 5173:5173 in Docker exposes your dev server to shared Wi-Fi and local networks. Bind Docker dev ports strictly to 127.0.0.1:5173:5173.

Real-World Receipt: Vite Dev Server arbitrary file read & RCE (GHSA-p4f5-76q4-ffq7, CVSS 9.1, Nov 2026).

Day 04 — Stop Storing Auth Tokens in localStorage

File: src/content/blog/advent-day-04-http-only-cookies.md

Tags: ["security", "auth", "frontend", "cookies"]

Core Takeaway: Any XSS bug or poisoned npm dependency can read localStorage and sessionStorage. Store session tokens in HttpOnly, Secure, SameSite=Strict cookies instead.

Real-World Receipt: Client-side cookie and token harvesters delivered via poisoned npm packages and compromised analytics tags.

Day 05 — window.postMessage Without event.origin Checks

File: src/content/blog/advent-day-05-postmessage-origin-validation.md

Tags: ["security", "javascript", "dom-xss"]

Core Takeaway: Listening to window.addEventListener('message', ...) without strictly validating event.origin against an exact allowlist lets any malicious popup or iframe inject untrusted payloads into your app.

Code Snippet: Strict if (event.origin !== 'https://trusted.example.com') return; guard + avoiding wildcard '*' as targetOrigin.

Day 06 — Subresource Integrity (integrity="...") for Static CDNs

File: src/content/blog/advent-day-06-subresource-integrity.md

Tags: ["security", "frontend", "supply-chain"]

Core Takeaway: If you load a versioned script or stylesheet from a public CDN without an integrity="sha384-..." hash and crossorigin="anonymous", a CDN compromise or DNS hijack turns into arbitrary code execution in your users' browsers.

Week 2: Secrets, Tokens & AI Tooling (Days 07–12)

Day 07 — Audit Your Forgotten GitHub & GitLab PATs

File: src/content/blog/advent-day-07-audit-personal-access-tokens.md

Tags: ["security", "git", "credentials", "devsecops"]

Core Takeaway: Revoke personal access tokens created "temporarily" two years ago. Replace classic broad-scope PATs with fine-grained, repository-scoped tokens with mandatory expiration dates.

Real-World Receipt: Cursor / Fireworks AI breach (Nov 2026), where forgotten unredacted tokens in 2025 storage logs enabled lateral movement.

Day 08 — Never Run Untrusted Repos on Your Host Machine

File: src/content/blog/advent-day-08-sandbox-untrusted-repos.md

Tags: ["security", "social-engineering", "containers"]

Core Takeaway: Coding interview take-home assignments, random GitHub PoCs, and "troubleshooting scripts" sent during calls belong inside a disposable VM or Dev Container—never on your primary laptop next to ~/.ssh, ~/.aws, and browser session cookies.

Real-World Receipt: North Korean FaceStealer (APT38) & Binance Oct 29 breach via fake recruitment coding assignments.

Day 09 — Treat IDE Extensions & MCP Servers Like Prod Dependencies

File: src/content/blog/advent-day-09-ide-extensions-mcp-security.md

Tags: ["security", "ai", "supply-chain", "tooling"]

Core Takeaway: AI coding agents, MCP servers, and IDE extensions execute with your full local OS user permissions. Verify publisher identities, pin versions, and never blindly click "Don't ask again" on shell/file-read approval prompts.

Real-World Receipt: Trojanized Claude Code extension on Cursor Marketplace & Claude Code permission-bypass leaks (Nov 2026).

Day 10 — Stop Pasting Raw Secrets Into Docs, Tickets, and AI Prompts

File: src/content/blog/advent-day-10-secrets-in-docs-and-prompts.md

Tags: ["security", "secrets-management", "ai"]

Core Takeaway: Pasting .env files, database URIs, or API tokens into Slack threads, Google Docs, Jira tickets, or non-private AI agent sessions creates a searchable treasure map if a single SaaS account is compromised.

Real-World Receipt: Russian COLD RELIC campaign pivoting through compromised Google Workspace documents & GitBook SSO breach (Nov 2026).

Day 11 — Replace Static CI Secrets With OIDC Federation

File: src/content/blog/advent-day-11-ci-oidc-over-static-keys.md

Tags: ["security", "ci-cd", "cloud", "devsecops"]

Core Takeaway: Stop storing long-lived AWS/GCP/Azure JSON keys in GitLab CI or GitHub Actions variables. Use OpenID Connect (OIDC) federation so pipelines mint short-lived, job-scoped credentials that expire automatically.

Day 12 — .env in .gitignore Isn't Enough

File: src/content/blog/advent-day-12-git-history-secret-scanning.md

Tags: ["security", "git", "ci-cd"]

Core Takeaway: Adding .env to .gitignore does nothing if the file was already tracked, and deleting a secret in a follow-up commit leaves it intact in git history. Enforce pre-commit hooks and CI secret scanning (gitleaks / trufflehog)—and rotate immediately if leaked.

Week 3: Dependencies & Supply Chain (Days 13–18)

Day 13 — Commit Lockfiles & Enforce --frozen-lockfile (npm ci)

File: src/content/blog/advent-day-13-frozen-lockfiles-ci.md

Tags: ["security", "npm", "ci-cd", "supply-chain"]

Core Takeaway: Running npm install or pnpm install without --frozen-lockfile in CI can silently pull unreviewed minor/patch versions into production builds. Always use npm ci / pnpm install --frozen-lockfile.

Day 14 — Lifecycle Scripts (postinstall) Are Silent RCE

File: src/content/blog/advent-day-14-npm-lifecycle-scripts.md

Tags: ["security", "nodejs", "npm", "supply-chain"]

Core Takeaway: Any package in your dependency tree can execute arbitrary shell commands during npm install via preinstall/postinstall hooks. Audit packages with lifecycle scripts and use --ignore-scripts (or pnpm's onlyBuiltDependencies) where possible.

Day 15 — Audit Transitive Dependencies, Not Just package.json

File: src/content/blog/advent-day-15-transitive-dependencies.md

Tags: ["security", "npm", "vulnerabilities"]

Core Takeaway: Your top-level package.json can look spotless while a nested dependency three levels deep (like Vite bundled inside Vitest or Storybook) carries a CVSS 9.1 flaw. Use npm ls <pkg> and lockfile overrides/resolutions to patch deep trees.

Day 16 — Pin Docker Base Images by SHA256 Digest

File: src/content/blog/advent-day-16-pin-docker-digests.md

Tags: ["security", "docker", "containers", "supply-chain"]

Core Takeaway: Mutable tags like node:22-alpine or :latest can change silently between builds. Pin base images by immutable @sha256:... digest and let Renovate/Dependabot open PRs for digest updates.

Day 17 — Don't Run Node & Web Containers as root

File: src/content/blog/advent-day-17-non-root-docker-containers.md

Tags: ["security", "docker", "nodejs", "hardening"]

Core Takeaway: Docker containers run as root by default. Adding USER node in your Dockerfile restricts filesystem writes and significantly reduces blast radius if an attacker achieves RCE inside your application.

Day 18 — Automate CVE Triage Against Your Actual Stack

File: src/content/blog/advent-day-18-automate-cve-triage.md

Tags: ["security", "devsecops", "automation"]

Core Takeaway: Reading every security newsletter manually leads to patch fatigue. Pipe official vendor advisories (Node, Postgres, OpenJDK, GitHub Advisories) against your actual repo SBOMs/manifests so you only alert on CVEs that match your deployed versions.

Week 4: Backend, Databases & Ops (Days 19–24)

Day 19 — Split Your DB Migration User From Your Runtime App User

File: src/content/blog/advent-day-19-least-privilege-db-roles.md

Tags: ["security", "postgresql", "database", "backend"]

Core Takeaway: Your runtime application role only needs SELECT, INSERT, UPDATE, DELETE—never CREATE or ALTER TABLE rights. Separating DDL migration users from runtime users blocks privilege escalation and host RCE chains.

Real-World Receipt: PostgreSQL 22-year-old type-confusion RCE (CVE-2026-6460, Nov 2026), triggered by authenticated users holding object creation/alteration privileges.

Day 20 — Firewall Internal Database Ports (5432, 1521, 6379)

File: src/content/blog/advent-day-20-firewall-database-ports.md

Tags: ["security", "database", "networking", "ops"]

Core Takeaway: Database wire protocols aren't designed to face untrusted networks. Pre-authentication bugs can crash or compromise database servers before a login handshake even finishes. Keep DB ports strictly inside private VPCs/subnets.

Real-World Receipt: PostgreSQL 18 pre-auth cancel-request spinlock DoS (CVE-2026-116322) and Oracle November 2026 CSPU unauthenticated CVSS 9.9 flaws.

Day 21 — Validate Outbound URLs to Kill SSRF

File: src/content/blog/advent-day-21-prevent-ssrf.md

Tags: ["security", "backend", "nodejs", "ssrf"]

Core Takeaway: Any backend endpoint that fetches a user-supplied URL (webhooks, avatar importers, link previews, PDF generators) can be abused to query internal services or cloud metadata (169.254.169.254). Resolve DNS first and block private/loopback/link-local IP ranges.

Day 22 — Rebuild Headless Chromium Containers on Every Browser CVE

File: src/content/blog/advent-day-22-headless-chromium-containers.md

Tags: ["security", "docker", "chromium", "backend"]

Core Takeaway: Patching Chrome on your laptop doesn't protect your Node/Puppeteer/Playwright microservice rendering PDFs or screenshots in Docker. Whenever an actively exploited Chromium zero-day drops, rebuild and redeploy your headless browser images immediately.

Real-World Receipt: Actively exploited Chromium libxslt use-after-free (CVE-2026-125350, Nov 2026).

Day 23 — Never Trust Client-Side RBAC Alone (IDOR Prevention)

File: src/content/blog/advent-day-23-server-side-rbac-idor.md

Tags: ["security", "api", "angular", "nestjs"]

Core Takeaway: Hiding a button in Angular or guarding a frontend route only improves UX—it isn't security. Every API endpoint must verify both role permissions and resource ownership (WHERE id = :id AND tenant_id = :tenantId) on the server.

Day 24 — The 5-Minute Holiday Freeze Security Checklist

File: src/content/blog/advent-day-24-holiday-freeze-checklist.md

Tags: ["security", "devsecops", "checklist"]

Core Takeaway: Before logging off for the holidays: rotate shared deployment/API tokens, verify automated dependency & CVE alerts route to an active on-call channel, confirm production backups restore cleanly, and double-check that no temporary debug flags or open firewall rules were left behind.
