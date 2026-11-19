---
title: "Lifecycle Scripts (postinstall) Are Silent RCE"
description: "Any package in your dependency tree can execute arbitrary shell commands during npm install via preinstall/postinstall hooks. Audit packages with lifecycle scripts and use --ignore-scripts or allowlists."
pubDate: 2026-12-14
tags: ["security", "nodejs", "npm", "supply-chain"]
series: "advent-2026"
adventDay: 14
draft: true
socialSummary: |
  Out of 450 packages in a typical `node_modules` folder, maybe 2 (`esbuild`, `sharp`) actually need a `postinstall` script.

  Yet default `npm install` lets all 450 packages execute arbitrary shell commands on your machine before you even `import` a single file.

  Day 14/24 of the 2026 DevSec Advent Calendar: disabling npm lifecycle scripts and allowlisting native binaries.
---

Most developers assume a malicious npm package only becomes dangerous when you `import` or `require()` it in your application code.

In reality, the vast majority of npm supply-chain malware executes **before your code ever runs**, during `npm install` itself, by defining a `"preinstall"` or `"postinstall"` script in its `package.json`:

```json
{
  "name": "innocent-looking-utility",
  "version": "1.0.4",
  "scripts": {
    "postinstall": "node ./scripts/telemetry.js"
  }
}
```

When you run `npm install` with default settings, npm executes `preinstall`, `install`, and `postinstall` hooks for **every direct and transitive package in `node_modules`** with full access to your filesystem, network, and environment variables (`process.env`).

> **Real-World Receipt:** Over 80% of malicious npm packages caught by ecosystem scanners (including credential-stealers harvesting `process.env`, `~/.npmrc`, and `~/.ssh` on CI runners and developer laptops) trigger their payload inside a `preinstall` or `postinstall` hook. The malware executes even if the package is never imported by your app.

---

## Why Do Legitimate Packages Use `postinstall`?

Out of 400+ packages in a typical frontend or Node.js project, usually only **2 or 3** genuinely need install scripts (typically native binary wrappers like `esbuild`, `sharp`, or `@swc/core`). The other 99% have zero legitimate reason to run shell commands during installation.

---

## Defense Pattern 1: Audit Which Packages Have Install Scripts (Before Installing!)

You do not even have to run `npm install` to find out which packages (including scoped `@scope/*` and deeply nested transitive packages) contain install scripts. Lockfile v2/v3 already records `"hasInstallScript": true`:

```bash
# Audit package-lock.json BEFORE running npm install (catches scoped & nested deps!)
jq -r '.packages | to_entries[] | select(.value.hasInstallScript == true) | .key' package-lock.json
```

If you want to inspect the exact script contents already inside `node_modules` (including `@scope/*` packages and `prepare` hooks):

```bash
node -e '
const fs = require("node:fs");
const path = require("node:path");
const HOOKS = ["preinstall", "install", "postinstall", "prepare"];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("@")) { walk(full); continue; }
    const pkgPath = path.join(full, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const found = Object.fromEntries(
        HOOKS.filter((h) => pkg.scripts?.[h]).map((h) => [h, pkg.scripts[h]])
      );
      if (Object.keys(found).length) console.log(full, found);
    }
    walk(path.join(full, "node_modules"));
  }
}
walk("node_modules");
'
```

---

## Defense Pattern 2: Disable Lifecycle Scripts by Default & Allowlist Explicitly

### Option A: `.npmrc` + Explicit `npm rebuild`

Disable lifecycle scripts across your repository via `.npmrc`, then combine `npm ci` ([Day 13](/blog/advent-day-13-frozen-lockfiles-ci)) with an explicit `npm rebuild` for only the native binaries your project needs:

```ini
# .npmrc
ignore-scripts=true
```

```bash
# In CI / Dockerfile: install with scripts disabled, then explicitly rebuild trusted native binaries
npm ci --ignore-scripts
npm rebuild esbuild sharp
```

### Option B: `pnpm.onlyBuiltDependencies` (Built-In Allowlist)

In `pnpm` (v10+), dependency lifecycle scripts are blocked by default unless explicitly listed in `package.json`:

```json
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "esbuild",
      "sharp"
    ]
  }
}
```

---

## Verify It in 60 Seconds

Check your current npm configuration and list every dependency in your lockfile that wants to run install scripts:

```bash
npm config get ignore-scripts
jq -r '.packages | to_entries[] | select(.value.hasInstallScript == true) | .key' package-lock.json
```

### Key Takeaway for Day 14

Do not let 500 transitive npm packages run arbitrary shell commands on your laptop ([Day 08](/blog/advent-day-08-sandbox-untrusted-repos)) and CI runners just because `esbuild` needs a binary check. Set `ignore-scripts=true` (or use `pnpm.onlyBuiltDependencies`) and explicitly allowlist the 2 to 3 packages that require build hooks.

---

## References

- [npm Docs: `ignore-scripts` Config Option](https://docs.npmjs.com/cli/v10/using-npm/config#ignore-scripts)
- [pnpm Docs: `onlyBuiltDependencies`](https://pnpm.io/package_json#pnpmonlybuiltdependencies)
