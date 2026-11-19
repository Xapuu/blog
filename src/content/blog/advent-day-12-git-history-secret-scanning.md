---
title: ".env in .gitignore Isn't Enough: Scanning Git History for Secrets"
description: "Adding .env to .gitignore does nothing if the file was already tracked, and deleting a secret in a follow-up commit leaves it intact in git history. Enforce pre-commit hooks and CI secret scanning."
pubDate: 2026-12-12
tags: ["security", "git", "ci-cd"]
series: "advent-2026"
adventDay: 12
draft: true
socialSummary: |
  Pushing a commit titled "fix: remove accidentally committed API key" does NOT delete the key. It actually highlights the exact commit hash for attackers scanning `git log -p`.

  Day 12/24 of the 2026 DevSec Advent Calendar: why `.gitignore` isn't enough, scanning full git history with `gitleaks`, and blocking secrets pre-commit.
---

Every developer knows the sinking feeling: you run `git push`, glance at the diff on GitHub or GitLab, and realize you accidentally committed a live API key or `.env` file.

Two seconds later, someone pushes a follow-up commit titled `"oops, remove .env and add to .gitignore"` and assumes the problem is solved.

**It isn't.**

> **Real-World Receipt:** Automated credential-harvesting bots continuously monitor public GitHub event streams and compromise exposed AWS, Stripe, and OpenAI keys in **under 60 seconds** after a push. They also scrape deleted commits and force-pushed commit hashes via GitHub's Events API long after a "remove secret" commit lands.

---

## Why `"oops, remove secret"` Commits Fail

Git is an append-only content-addressable filesystem. Deleting a file in commit `B` does not erase the blob created in commit `A`. Anyone who clones the repository can retrieve every historical secret in one command:

```bash
# Attackers run this across full git history, including orphaned commits and stashes
git log --all --full-history --stat -- "**/.env*"
```

Even worse, if `.env` was already tracked by Git before you added `.env` to `.gitignore`, Git will **continue tracking and committing changes to `.env`** until you explicitly remove it from the index (`git rm --cached .env`).

---

## Prevention: Block Secrets *Before* They Enter Git History

### 1. Run `gitleaks` in a Local `pre-commit` Hook

Install Gitleaks and scan staged changes before every commit so high-entropy secrets and known token prefixes (`ghp_`, `sk_live_`, `AKIA`, `xoxb-`) never reach a commit object:

```bash
# Scan staged changes before committing (Gitleaks v8.19+ syntax)
gitleaks git --pre-commit --staged --redact --verbose

# Audit the entire historical git log of your repository right now
gitleaks git --redact --verbose
```

### 2. Enforce Secret Scanning in CI on Every Push & PR (SHA-Pinned!)

Follow [Day 11's action-pinning rule](/blog/advent-day-11-ci-oidc-over-static-keys) and pin CI actions to exact commit SHAs:

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scan
on:
  pull_request:
  push:

permissions:
  contents: read

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          fetch-depth: 0 # Full history so multi-commit PRs are scanned completely
      - uses: gitleaks/gitleaks-action@ff98106e84b2c5df1deeec5b383e8a42a6e8d8a6 # v2.3.9
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> **Licensing & Native Alternative:** `gitleaks/gitleaks-action` is free for personal repositories, while GitHub Organizations require a `GITLEAKS_LICENSE` key. Alternatively, run the open-source `gitleaks` CLI binary directly in CI for free, and enable **GitHub Secret Scanning & Push Protection** in repository settings to reject secret pushes at the Git server boundary.

### 3. What If a Secret Was Already Committed?

**Rotate the credential immediately.** Rewriting git history with `git filter-repo` is good hygiene for private repos, but once a commit has been pushed to a remote server, always assume that credential is compromised and revoke it at the provider ([Day 07](/blog/advent-day-07-audit-personal-access-tokens)).

---

## Verify It in 60 Seconds

Check if any `.env` file is currently tracked in Git or ever existed in your repository's commit history:

```bash
# 1. Check if any .env files are currently tracked despite .gitignore
git ls-files "**/.env*"

# 2. Check if any .env file EVER appeared in git history
git log --all --full-history --oneline -- "**/.env*"
```

### Key Takeaway for Day 12

`.gitignore` only ignores untracked files, and `git rm` does not erase history. Run `gitleaks git` across your full history today, enable GitHub Push Protection plus pre-commit scanning, and always rotate any key that ever touched a commit.

---

## References

- [Gitleaks Repository & CLI Documentation](https://github.com/gitleaks/gitleaks)
- [GitHub Docs: Push Protection for Repositories](https://docs.github.com/en/code-security/secret-scanning/working-with-secret-scanning-and-push-protection/working-with-push-protection-from-the-command-line)
