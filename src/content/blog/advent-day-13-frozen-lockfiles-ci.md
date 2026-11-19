---
title: "Commit Lockfiles & Enforce --frozen-lockfile (npm ci)"
description: "Running npm install or pnpm install without --frozen-lockfile in CI can silently pull unreviewed minor/patch versions into production builds. Always use npm ci or pnpm install --frozen-lockfile."
pubDate: 2026-12-13
tags: ["security", "npm", "ci-cd", "supply-chain"]
series: "advent-2026"
adventDay: 13
draft: true
---

In almost every `package.json`, dependencies are declared with caret (`^1.4.0`) or tilde (`~1.4.0`) ranges. That range syntax tells the package manager: *"Any compatible minor or patch version published in the future is acceptable."*

What actually pins your build to the exact tarball and SHA-512 integrity hash you tested locally is your lockfile (`package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`).

Yet countless `Dockerfile` and CI/CD configurations still run `npm install` instead of `npm ci`.

---

## Why `npm install` in CI or Docker Is Dangerous

When you run `npm install` (as opposed to `npm ci`):

1. If `package.json` and `package-lock.json` are slightly out of sync—or if a transitive sub-dependency range resolves to a newly published patch version—`npm install` **mutates the dependency tree on the fly**.
2. If an attacker hijacks a maintainer's npm account at 02:00 UTC and publishes `some-transitive-pkg@1.4.9` with a credential stealer, the very next CI build running `npm install` without a strict lockfile check can pull the malicious version straight into production—with zero changes to your git repository!

---

## Enforce Deterministic Builds Everywhere

### 1. Replace `npm install` with `npm ci` in `Dockerfile` and CI

| Package Manager | Unsafe CI Command | Hardened Deterministic Command |
| :--- | :--- | :--- |
| **npm** | `npm install` | `npm ci` |
| **pnpm** | `pnpm install` | `pnpm install --frozen-lockfile` |
| **Yarn (Berry)** | `yarn install` | `yarn install --immutable` |
| **Bun** | `bun install` | `bun install --frozen-lockfile` |

```dockerfile
# Hardened multi-stage Dockerfile dependency layer
FROM node:22-alpine AS builder
WORKDIR /app

# Copy BOTH package.json AND package-lock.json
COPY package.json package-lock.json ./

# Fails immediately if package-lock.json is missing, tampered with, or out of sync
RUN npm ci --ignore-scripts
```

### 2. Verify Lockfile Integrity Hashes in PR Reviews

Every entry in `package-lock.json` v3 includes a `resolved` URL and a cryptographic `integrity: "sha512-..."` digest. Treat `package-lock.json` diffs in pull requests as security-critical: verify that all `resolved` URLs point to `https://registry.npmjs.org/` (never an arbitrary third-party tarball URL).

### Key Takeaway for Day 13

Always commit your lockfile (`package-lock.json` / `pnpm-lock.yaml`) to version control, and replace every single `npm install` in your `Dockerfile` and CI/CD pipelines with `npm ci` (or `--frozen-lockfile`).

---

## Social Summary (X & LinkedIn)

```text
If your Dockerfile or CI pipeline runs `npm install` instead of `npm ci`, your production build isn't deterministic.

A compromised transitive dependency publishing a patch release (`1.2.4` -> `1.2.5`) can slip straight into your build without a single line of code changing in your repo.

Day 13/24 of the 2026 DevSec Advent Calendar: Enforcing `npm ci` and `--frozen-lockfile`.
```
