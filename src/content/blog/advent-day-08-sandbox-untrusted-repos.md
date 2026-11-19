---
title: "Never Run Untrusted Repos on Your Host Machine"
description: "Coding interview take-home assignments, random GitHub PoCs, and 'troubleshooting scripts' belong inside a disposable VM or Dev Container—never on your primary laptop next to ~/.ssh and ~/.aws."
pubDate: 2026-12-08
tags: ["security", "social-engineering", "containers"]
series: "advent-2026"
adventDay: 8
draft: true
---

A recruiter reaches out on LinkedIn with a high-paying senior engineering role. Before the technical round, they ask you to clone a small React/Node take-home repository, run `npm install && npm dev`, and fix a bug.

Or maybe you are debugging an obscure issue and clone a proof-of-concept repo from GitHub.

The moment you run `npm install`, `pytest`, `cargo build`, or even open the workspace in an unhardened IDE on your host OS, **any code inside that repository executes with the full privileges of your local user account**.

> **Real-World Receipt:** Threat actors—most notably North Korean APT38 / Lazarus Group (*Contagious Interview* & *FaceStealer* campaigns, including the Oct 29 ecosystem breaches)—routinely target software engineers via fake coding interviews and trojanized GitHub repos designed to steal `~/.ssh`, `~/.aws/credentials`, `~/.kube/config`, and browser session cookies.

---

## What Untrusted Code Can Read on Your Host Laptop

Modern macOS and Linux developer laptops have zero default boundary between a terminal running `npm test` in `~/Downloads/take-home-test` and:

- `~/.ssh/id_ed25519` (SSH keys)
- `~/.aws/credentials` and `~/.config/gcloud` (Cloud credentials)
- `~/.npmrc` and `~/.gitconfig` (Registry and Git tokens)
- Local `.env` files across all your other work repositories

---

## How to Sandbox Untrusted Code in 10 Seconds

Never clone and execute untrusted repositories directly on your host OS. Run them inside an isolated container with **no host volume mounts to `$HOME`**, a **read-only or ephemeral filesystem**, and **dropped Linux capabilities**:

```bash
# Run an untrusted Node.js repo inside an ephemeral, isolated Docker container
# Notice: We mount ONLY the untrusted directory—never ~/.ssh, ~/.aws, or /var/run/docker.sock!
docker run --rm -it \
  --network bridge \
  --cap-drop=ALL \
  --security-opt=no-new-privileges:true \
  --memory="2g" \
  --cpus="2" \
  -u node \
  -w /workspace \
  -v "$(pwd)/untrusted-repo:/workspace" \
  node:22-alpine sh
```

### Before You Even Run `npm install` on an Unfamiliar Repo:

Inspect the repository statically first:

```bash
# 1. Check package.json for preinstall / install / postinstall / prepare hooks
jq '.scripts' package.json

# 2. Check .vscode/tasks.json for auto-executing folderOpen tasks!
cat .vscode/tasks.json 2>/dev/null
```

> **Watch Out for `.vscode/tasks.json`:** A malicious repository can configure `"runOptions": { "runOn": "folderOpen" }` in `.vscode/tasks.json` to execute arbitrary shell commands the instant you trust the workspace in VS Code—before you even type `npm install`!

### Key Takeaway for Day 08

Treat every take-home assignment, external PoC, and unfamiliar repository as hostile until proven otherwise. Inspect `.vscode/tasks.json` and `package.json` scripts first, and run untrusted code strictly inside disposable containers or VMs with zero access to your host `$HOME`.

---

## Social Summary (X & LinkedIn)

```text
Fake recruiter "take-home coding assignments" and trojanized GitHub PoCs remain the #1 social-engineering vector targeting software engineers in 2026.

The moment you run `npm install` or trust `.vscode/tasks.json` on your host laptop, that repo has full read access to `~/.ssh`, `~/.aws`, and every `.env` file on disk.

Day 08/24 of the 2026 DevSec Advent Calendar: Sandboxing untrusted repos before running a single command.
```
