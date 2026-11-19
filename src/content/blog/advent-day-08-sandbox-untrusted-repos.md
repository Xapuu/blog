---
title: "Never Run Untrusted Repos on Your Host Machine"
description: "Coding interview take-home assignments, random GitHub PoCs, and 'troubleshooting scripts' belong inside a disposable VM or Dev Container, never on your primary laptop next to ~/.ssh and ~/.aws."
pubDate: 2026-12-08
tags: ["security", "social-engineering", "containers"]
series: "advent-2026"
adventDay: 8
draft: true
socialSummary: |
  Fake recruiter "take-home coding assignments" and trojanized GitHub PoCs remain the #1 social-engineering vector targeting software engineers in 2026.

  The moment you run `npm install` or trust `.vscode/tasks.json` on your host laptop, that repo has full read access to `~/.ssh`, `~/.aws`, and every `.env` file on disk.

  Day 08/24 of the 2026 DevSec Advent Calendar: sandboxing untrusted repos before running a single command.
---

A recruiter reaches out on LinkedIn with a high-paying senior engineering role. Before the technical round, they ask you to clone a small React/Node take-home repository, run `npm install && npm run dev`, and fix a bug.

Or maybe you are debugging an obscure issue and clone a proof-of-concept repo from GitHub.

The moment you run `npm install`, `pytest`, `cargo build`, or even open the workspace in an unhardened IDE on your host OS, **any code inside that repository executes with the full privileges of your local user account**.

> **Real-World Receipt:** Threat actors, most notably North Korean APT38 / Lazarus Group (*Contagious Interview* and *FaceStealer* campaigns, including the Oct 29 ecosystem breaches), routinely target software engineers via fake coding interviews and trojanized GitHub repos designed to steal `~/.ssh`, `~/.aws/credentials`, `~/.kube/config`, and browser session cookies.

---

## What Untrusted Code Can Read on Your Host Laptop

Modern macOS and Linux developer laptops have zero default boundary between a terminal running `npm test` in `~/Downloads/take-home-test` and:

- `~/.ssh/id_ed25519` (SSH keys)
- `~/.aws/credentials` and `~/.config/gcloud` (Cloud credentials)
- `~/.npmrc` and `~/.gitconfig` (Registry and Git tokens)
- Local `.env` files across all your other work repositories

---

## How to Sandbox Untrusted Code in 10 Seconds

Never clone and execute untrusted repositories directly on your host OS. Run them inside an isolated, non-root container ([Day 17](/blog/advent-day-17-non-root-docker-containers)) with **no host volume mounts to `$HOME`**, **dropped Linux capabilities**, **PID/resource limits**, and **`--network none`** whenever external network access is not required:

```bash
# Run an untrusted Node.js repo inside an ephemeral, isolated Docker container.
# Mount ONLY the untrusted directory: NEVER ~/.ssh, ~/.aws, or /var/run/docker.sock!
# Use --network none when running tests/inspection (switch to --network bridge only if installing deps).
docker run --rm -it \
  --network none \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=128m \
  --cap-drop=ALL \
  --security-opt=no-new-privileges:true \
  --pids-limit=256 \
  --memory="2g" \
  --cpus="2" \
  -u node \
  -w /workspace \
  -v "$(pwd)/untrusted-repo:/workspace:ro" \
  node:22-alpine sh
```

> **Note:** When you actually need to run `npm ci` inside the container, drop `:ro` and temporarily allow `--network bridge` with `--ignore-scripts` ([Day 14](/blog/advent-day-14-npm-lifecycle-scripts)), or use a disposable cloud environment like GitHub Codespaces or a fresh Lima/OrbStack VM.

---

## Verify It in 60 Seconds (Static Inspection Before Opening or Installing)

Before you trust a workspace in VS Code/Cursor or run `npm install`, inspect the most common hidden auto-execution traps statically:

```bash
# 1. Check package.json lifecycle scripts (preinstall / install / postinstall / prepare)
jq '.scripts' package.json

# 2. Check .vscode/tasks.json (folderOpen auto-exec!) and .vscode/settings.json (malicious tsserver/eslint paths)
cat .vscode/tasks.json .vscode/settings.json 2>/dev/null

# 3. Check for hidden .npmrc overrides, direnv (.envrc), or custom git hooks
ls -la .npmrc .envrc .husky 2>/dev/null
```

> **Watch Out for `.vscode/tasks.json`:** A malicious repository can configure `"runOptions": { "runOn": "folderOpen" }` in `.vscode/tasks.json` to execute arbitrary shell commands the instant you click *"Yes, I trust the authors"* in VS Code, before you even type `npm install`.

### Key Takeaway for Day 08

Treat every take-home assignment, external PoC, and unfamiliar repository as hostile until proven otherwise. Inspect `.vscode/*`, `.npmrc`, and `package.json` scripts first, and run untrusted code strictly inside disposable containers or VMs with zero access to your host `$HOME`.

---

## References

- [VS Code Docs: Workspace Trust](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust)
- [Docker Docs: Runtime Privilege and Linux Capabilities](https://docs.docker.com/engine/containers/run/#runtime-privilege-and-linux-capabilities)
