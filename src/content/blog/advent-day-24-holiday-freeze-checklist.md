---
title: "The 5-Minute Holiday Freeze Security Checklist"
description: "Before logging off for the holidays: rotate shared deployment/API tokens, verify automated dependency & CVE alerts route to an active on-call channel, confirm production backups restore cleanly, and check for leftover debug rules."
pubDate: 2026-12-24
tags: ["security", "devsecops", "checklist"]
series: "advent-2026"
adventDay: 24
draft: true
socialSummary: |
  Attackers love late December: code freezes are up, half the team is offline, and nobody wants to look at alerts.

  Before you close your laptop for the holidays, run through this 5-minute DevSec pre-freeze checklist (firewall exceptions, token expirations, break-glass CSP tag kill-switches, and backup immutability).

  Day 24/24: wrapping up the 2026 DevSec Advent Calendar. Happy Holidays!
---

We have reached **Day 24** of the **2026 DevSec Advent Calendar**!

Attackers love late December for a simple operational reason: engineering teams enact code freezes, half the staff is offline, and alert fatigue is at an all-time high.

> **Real-World Receipt:** Some of the most disruptive supply-chain and infrastructure incidents in recent history (from **Log4Shell**, `CVE-2021-44228`, landing in mid-December to recurring holiday ransomware waves) were deliberately timed to strike when engineering teams are thinly staffed and break-glass runbooks have not been tested.

Before you close your laptop for the holidays, run through this **5-minute pre-freeze security checklist** with your team.

---

## The 5-Minute Holiday Freeze Checklist

### 1. Revoke "Temporary" Debug Flags & Firewall Exceptions
- [ ] Verify no production security groups or VPC firewall rules have temporary `0.0.0.0/0` rules opened during a recent debugging session (especially ports `22`, `5432`, `6379`, `1521`; see [Day 20](/blog/advent-day-20-firewall-database-ports)).
- [ ] Confirm verbose debug logging (which might log raw request headers, cookies, or tokens) is disabled in production.

### 2. Audit Token Expirations & Revoke Unused Credentials
- [ ] Check that no critical TLS certificates, Apple/Google push notification keys, or OAuth client secrets are scheduled to expire between Dec 24 and Jan 5 while the team is away.
- [ ] Revoke any temporary Personal Access Tokens (PATs) or staging API keys minted during Q4 sprints ([Day 07](/blog/advent-day-07-audit-personal-access-tokens)).

### 3. Verify Alert Routing & Break-Glass Runbooks
- [ ] Ensure high-severity alerts (WAF spikes, CSP violation surges, cloud billing anomalies, and critical CVE alerts matching your lockfiles; see [Day 18](/blog/advent-day-18-automate-cve-triage)) route to an active, monitored on-call channel rather than an individual engineer's muted inbox.
- [ ] Confirm the on-call engineer has documented break-glass instructions to:
  1. Roll back a deployment or pin a Docker image digest ([Day 16](/blog/advent-day-16-pin-docker-digests)).
  2. Strip or disable a compromised third-party `<script>` tag via CDN/CSP headers in under 5 minutes ([Day 01](/blog/advent-day-01-csp-connect-src) and [Day 02](/blog/advent-day-02-isolate-sensitive-routes)).
  3. Rotate compromised API keys or database credentials.

### 4. Verify Backups Are Isolated and Restorable
- [ ] Confirm automated database snapshots (`pg_dump` / RDS / Cloud SQL) are succeeding daily, are stored with immutable retention (protected against deletion by the runtime AWS/GCP account), and have been restore-tested recently.

---

## Verify It in 60 Seconds

Run a quick production header and TLS certificate expiration sanity check before signing off:

```bash
# 1. Verify production security headers
curl -sI https://hristov.dev | grep -iE 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy'

# 2. Check TLS certificate expiration date (make sure it doesn't expire over the break!)
echo | openssl s_client -servername hristov.dev -connect hristov.dev:443 2>/dev/null \
  | openssl x509 -noout -dates
```

---

## The Complete 2026 DevSec Advent Index (Bookmarkable Hub)

### Week 1: Frontend & Browser Traps
- [Day 01: CSP `connect-src` Isn't Optional](/blog/advent-day-01-csp-connect-src)
- [Day 02: Keep Third-Party Tags Off Sensitive Routes](/blog/advent-day-02-isolate-sensitive-routes)
- [Day 03: Dev Servers Belong on `localhost`](/blog/advent-day-03-vite-dev-server-host)
- [Day 04: Stop Storing Auth Tokens in `localStorage`](/blog/advent-day-04-http-only-cookies)
- [Day 05: `window.postMessage` Origin Validation](/blog/advent-day-05-postmessage-origin-validation)
- [Day 06: Subresource Integrity (SRI) for Static CDNs](/blog/advent-day-06-subresource-integrity)

### Week 2: Secrets, Tokens & AI Tooling
- [Day 07: Audit Your Forgotten GitHub & GitLab PATs](/blog/advent-day-07-audit-personal-access-tokens)
- [Day 08: Never Run Untrusted Repos on Your Host Machine](/blog/advent-day-08-sandbox-untrusted-repos)
- [Day 09: Treat IDE Extensions & MCP Servers Like Prod Dependencies](/blog/advent-day-09-ide-extensions-mcp-security)
- [Day 10: Stop Pasting Raw Secrets Into Docs, Tickets, and AI Prompts](/blog/advent-day-10-secrets-in-docs-and-prompts)
- [Day 11: Replace Static CI Secrets With OIDC Federation](/blog/advent-day-11-ci-oidc-over-static-keys)
- [Day 12: `.env` in `.gitignore` Isn't Enough: Scanning Git History](/blog/advent-day-12-git-history-secret-scanning)

### Week 3: Dependencies & Supply Chain
- [Day 13: Commit Lockfiles & Enforce `--frozen-lockfile` (`npm ci`)](/blog/advent-day-13-frozen-lockfiles-ci)
- [Day 14: Lifecycle Scripts (`postinstall`) Are Silent RCE](/blog/advent-day-14-npm-lifecycle-scripts)
- [Day 15: Audit Transitive Dependencies, Not Just `package.json`](/blog/advent-day-15-transitive-dependencies)
- [Day 16: Pin Docker Base Images by SHA256 Digest](/blog/advent-day-16-pin-docker-digests)
- [Day 17: Don't Run Node & Web Containers as `root`](/blog/advent-day-17-non-root-docker-containers)
- [Day 18: Automate CVE Triage Against Your Actual Stack](/blog/advent-day-18-automate-cve-triage)

### Week 4: Backend, Databases & Ops
- [Day 19: Split Your DB Migration User From Your Runtime App User](/blog/advent-day-19-least-privilege-db-roles)
- [Day 20: Firewall Internal Database Ports (`5432`, `1521`, `6379`)](/blog/advent-day-20-firewall-database-ports)
- [Day 21: Validate Outbound URLs to Kill SSRF](/blog/advent-day-21-prevent-ssrf)
- [Day 22: Rebuild Headless Chromium Containers on Every Browser CVE](/blog/advent-day-22-headless-chromium-containers)
- [Day 23: Never Trust Client-Side RBAC Alone (IDOR Prevention)](/blog/advent-day-23-server-side-rbac-idor)
- **Day 24: The 5-Minute Holiday Freeze Security Checklist** *(you are here)*

Happy Holidays, and here is to shipping fast, resilient, and secure software in 2027!

---

## References

- [CVE-2021-44228: Apache Log4j2 Remote Code Execution (Log4Shell)](https://www.cve.org/CVERecord?id=CVE-2021-44228)
- [CISA Known Exploited Vulnerabilities (KEV) Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
