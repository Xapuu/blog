---
title: ".env in .gitignore Isn't Enough: Scanning Git History for Secrets"
description: "Adding .env to .gitignore does nothing if the file was already tracked, and deleting a secret in a follow-up commit leaves it intact in git history. Enforce pre-commit hooks and CI secret scanning."
pubDate: 2026-12-12
tags: ["security", "git", "ci-cd"]
series: "advent-2026"
adventDay: 12
draft: true
---

Every developer knows the sinking feeling: you run `git push`, glance at the diff on GitHub or GitLab, and realize you accidentally committed a live API key or `.env` file.

Two seconds later, someone pushes a follow-up commit titled `"oops, remove .env and add to .gitignore"`—and assumes the problem is solved.

**It isn't.**

---

## Why `"oops, remove secret"` Commits Fail

Git is an append-only content-addressable filesystem. Deleting a file in commit `B` does not erase the blob created in commit `A`. Anyone who clones the repository (and automated bots monitoring public GitHub events in real time) can retrieve every historical secret in one command:

```bash
# Attackers run this across full git history, including orphaned commits and stashes
git log --all --full-history --stat -- "**/.env*"
```

Even worse, if `.env` was already tracked by Git before you added `.env` to `.gitignore`, Git will **continue tracking and committing changes to `.env`** until you explicitly remove it from the index (`git rm --cached .env`).

---

## Prevention: Block Secrets *Before* They Enter Git History

### 1. Run `gitleaks` in a Local `pre-commit` Hook

Install [Gitleaks](https://github.com/gitleaks/gitleaks) and run `gitleaks protect --staged` before every commit so high-entropy secrets and known token prefixes (`ghp_`, `sk_live_`, `AKIA`, `xoxb-`) are blocked locally:

```bash
# Scan staged changes before committing
gitleaks protect --verbose --redact --staged

# Audit the entire historical git log of your repository right now
gitleaks detect --source . --verbose --redact
```

### 2. Enforce Secret Scanning in CI on Every Push & PR

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scan
on:
  pull_request:
  push:

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history so multi-commit PRs are scanned completely
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 3. What If a Secret Was Already Committed?

**Rotate the credential immediately.** Rewriting git history with `git filter-repo` is good cleanup, but once a commit has been pushed to a remote server, always consider that credential compromised and revoke it at the provider.

### Key Takeaway for Day 12

`.gitignore` only ignores untracked files, and `git rm` doesn't erase history. Run `gitleaks detect` across your full git history today, add a staged pre-commit check, and always rotate any key that ever touched a commit.

---

## Social Summary (X & LinkedIn)

```text
Pushing a commit titled "fix: remove accidentally committed API key" does NOT delete the key—it actually highlights the exact commit hash for attackers scanning `git log -p`.

Day 12/24 of the 2026 DevSec Advent Calendar: Why `.gitignore` isn't enough, scanning full git history with `gitleaks`, and blocking secrets pre-commit.
```
