---
title: "Audit Transitive Dependencies, Not Just package.json"
description: "Your top-level package.json can look spotless while a nested dependency three levels deep carries a CVSS 9.1 flaw. Use npm ls and lockfile overrides to patch deep dependency trees."
pubDate: 2026-12-15
tags: ["security", "npm", "vulnerabilities"]
series: "advent-2026"
adventDay: 15
draft: true
---

When a critical vulnerability drops—like November 2026's Vite dev server RCE (`GHSA-p4f5-76q4-ffq7`) or a regular expression DoS / prototype pollution bug in a core utility—many engineers check their top-level `package.json`, see that they already bumped their direct dependency, and assume they are patched.

Then they run `npm ls vite` and discover **three different versions of Vite** nested inside `@storybook/*`, `vitest`, or an older framework plugin!

---

## Why Top-Level `package.json` Lies About Your Real Attack Surface

Your direct dependencies in `package.json` represent less than **5% to 10%** of the packages actually installed in `node_modules`.

If `framework-plugin-a@2.1.0` pins `"vite": "^6.0.0"` and your lockfile froze that sub-tree six months ago at `vite@6.1.0`, bumping your top-level `"vite"` dependency to `8.3.7` will not necessarily deduplicate or upgrade the older major/minor copy nested under `node_modules/framework-plugin-a/node_modules/vite`.

---

## How to Inspect and Force-Patch Transitive Dependencies

### 1. Trace Every Installed Copy of a Package with `npm ls`

Never guess which version of a library is installed—ask the lockfile tree directly:

```bash
# Show every installed instance of vite (or any package) and why it is in your tree
npm ls vite
npm explain vite
```

### 2. Force a Patched Transitive Version with `overrides`

If an upstream package hasn't released a new version bumping its vulnerable sub-dependency yet, you don't have to wait. Use `"overrides"` in `package.json` (or `"pnpm.overrides"` / `"resolutions"`) to force every transitive consumer onto the patched version:

```json
{
  "name": "my-secure-app",
  "dependencies": {
    "astro": "^5.5.0"
  },
  "overrides": {
    "esbuild": "^0.27.7",
    "cookie": "^0.7.2"
  }
}
```

After adding an override, regenerate the lockfile and verify with `npm ls`:

```bash
npm install --package-lock-only
npm ls esbuild
```

### Key Takeaway for Day 15

Attackers exploit what is inside `node_modules`, not what is written in the top 20 lines of `package.json`. Always verify security patches with `npm ls <pkg>` and use `overrides` to eliminate vulnerable transitive versions across your entire lockfile tree.

---

## Social Summary (X & LinkedIn)

```text
Your top-level `package.json` is less than 10% of your actual dependency tree.

You can bump a direct dependency on line 12 of `package.json` and still ship a vulnerable copy nested three levels deep inside a plugin or test runner.

Day 15/24 of the 2026 DevSec Advent Calendar: Tracing transitive dependencies with `npm ls` and surgical lockfile `overrides`.
```
