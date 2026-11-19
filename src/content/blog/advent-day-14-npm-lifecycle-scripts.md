---
title: "Lifecycle Scripts (postinstall) Are Silent RCE"
description: "Any package in your dependency tree can execute arbitrary shell commands during npm install via preinstall/postinstall hooks. Audit packages with lifecycle scripts and use --ignore-scripts or allowlists."
pubDate: 2026-12-14
tags: ["security", "nodejs", "npm", "supply-chain"]
series: "advent-2026"
adventDay: 14
draft: true
---

Most developers assume a malicious npm package only becomes dangerous when you `import` or `require()` it in your application code.

In reality, the vast majority of npm supply-chain malware executes **before your code ever runs**—during `npm install` itself—by defining a `"preinstall"` or `"postinstall"` script in its `package.json`:

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

---

## Why Do Legitimate Packages Use `postinstall`?

Out of 400+ packages in a typical frontend or Node.js project, usually only **2 or 3** genuinely need install scripts—typically native binary wrappers like `esbuild`, `sharp`, or `@swc/core`. The other 99% have zero legitimate reason to run shell commands during installation.

---

## Defense Pattern 1: Audit Which Packages Have Install Scripts

Check which packages in your current dependency tree define lifecycle hooks:

```bash
# Find every package in node_modules that defines preinstall, install, or postinstall
node -e '
const fs = require("fs");
const path = require("path");
for (const pkg of fs.readdirSync("node_modules")) {
  const p = path.join("node_modules", pkg, "package.json");
  if (fs.existsSync(p)) {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    if (j.scripts && (j.scripts.preinstall || j.scripts.install || j.scripts.postinstall)) {
      console.log(j.name, j.scripts);
    }
  }
}
'
```

---

## Defense Pattern 2: Disable Lifecycle Scripts by Default & Allowlist Explicitly

### Option A: `.npmrc` + Explicit `npm rebuild`

Disable lifecycle scripts across your repository via `.npmrc`, then rebuild only the specific binary packages your build needs:

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

If you use `pnpm` (v10+), lifecycle scripts for dependencies are blocked by default unless explicitly listed in `package.json`:

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

### Key Takeaway for Day 14

Don't let 500 transitive npm packages run arbitrary shell commands on your laptop and CI runners just because `esbuild` needs a binary check. Set `ignore-scripts=true` (or use `onlyBuiltDependencies`) and explicitly allowlist the 2–3 packages that require build hooks.

---

## Social Summary (X & LinkedIn)

```text
Out of 450 packages in a typical `node_modules` folder, maybe 2 (`esbuild`, `sharp`) actually need a `postinstall` script.

Yet default `npm install` lets all 450 packages execute arbitrary shell commands on your machine before you even `import` a single file.

Day 14/24 of the 2026 DevSec Advent Calendar: Disabling npm lifecycle scripts and allowlisting native binaries.
```
