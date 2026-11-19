---
title: "Audit Transitive Dependencies, Not Just package.json"
description: "Your top-level package.json can look spotless while a nested dependency three levels deep carries a CVSS 9.1 flaw. Use npm ls and version-scoped lockfile overrides to patch deep dependency trees."
pubDate: 2026-12-15
tags: ["security", "npm", "vulnerabilities"]
series: "advent-2026"
adventDay: 15
draft: true
socialSummary: |
  Your top-level `package.json` is less than 10% of your actual dependency tree.

  You can bump a direct dependency on line 12 of `package.json` and still ship a vulnerable copy nested three levels deep inside a plugin or test runner.

  Day 15/24 of the 2026 DevSec Advent Calendar: tracing transitive dependencies with `npm ls` and surgical lockfile `overrides`.
---

When a critical vulnerability drops (like November 2026's Vite dev server RCE `GHSA-p4f5-76q4-ffq7`, covered on [Day 03](/blog/advent-day-03-vite-dev-server-host), or a ReDoS or prototype pollution bug in a core utility), many engineers check their top-level `package.json`, see that they already bumped their direct dependency, and assume they are patched.

Then they run `npm ls vite` and discover **three different versions of Vite** nested inside `@storybook/*`, `vitest`, or an older framework plugin.

> **Real-World Receipt (Nov 2026):** During remediation of Vite's CVSS 9.1 dev-server advisory (`GHSA-p4f5-76q4-ffq7`), teams that upgraded their top-level `vite` dependency still remained vulnerable when older `vite@6.x` or `vite@7.x` copies stayed pinned inside transitive framework and test-runner subtrees.

---

## Why Top-Level `package.json` Lies About Your Real Attack Surface

Your direct dependencies in `package.json` represent less than **5% to 10%** of the packages actually installed in `node_modules`.

If `framework-plugin-a@2.1.0` pins `"vite": "^6.0.0"` and your lockfile froze that sub-tree six months ago at `vite@6.1.0`, bumping your top-level `"vite"` dependency to `8.3.7` will **not** deduplicate or upgrade the older major copy nested under `node_modules/framework-plugin-a/node_modules/vite`.

---

## How to Inspect and Force-Patch Transitive Dependencies

### 1. Trace Every Installed Copy of a Package with `npm ls`

Never guess which version of a library is installed. Inspect the full dependency tree directly:

```bash
# Show every installed instance of vite (or any package) and why it is in your tree
npm ls vite
npm explain vite
```

### 2. Force a Patched Transitive Version with Version-Scoped `overrides`

If an upstream package has not released a new version bumping its vulnerable sub-dependency yet, you do not have to wait. Use `"overrides"` in `package.json` (`"pnpm.overrides"` in pnpm, `"resolutions"` in Yarn) to force transitive consumers onto the patched release.

Prefer **version-scoped overrides** (for example, `"vite@6": ">=6.4.6"`) whenever multiple major lines exist so you do not accidentally force Vite 8 onto a plugin built for Vite 6:

```json
{
  "name": "my-secure-app",
  "dependencies": {
    "astro": "^5.5.0"
  },
  "overrides": {
    "vite@6": ">=6.4.6",
    "esbuild": "^0.27.7",
    "cookie": "^0.7.2"
  }
}
```

### 3. Reinstall Before Verifying With `npm ls`

> **Common CLI Pitfall:** `npm ls` inspects the installed `node_modules` folder on disk. If you only run `npm install --package-lock-only`, `npm ls` will still show the *old* version on disk. Update both the lockfile and `node_modules`, then run your test suite:

```bash
npm install --ignore-scripts
npm ls vite esbuild
npm test
```

---

## Verify It in 60 Seconds

Check how many distinct copies of core transitive packages (`vite`, `esbuild`, `tar`, `lodash`) are hiding in your project right now, and automate ongoing lockfile tracking with [Day 18's OSV scanner](/blog/advent-day-18-automate-cve-triage):

```bash
npm ls --all | grep -E '(vite|esbuild)@' | sort -u
```

### Key Takeaway for Day 15

Attackers exploit what is inside `node_modules`, not what is written in the top 20 lines of `package.json`. Always verify security patches across every branch of your tree with `npm ls <pkg>`, use version-scoped `overrides` when upstream lags behind, and re-run `npm install` plus tests before calling a CVE patched.

---

## References

- [Vite Security Advisory: GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7)
- [npm Docs: `overrides` in `package.json`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
