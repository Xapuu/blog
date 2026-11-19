---
title: "Audit Your Forgotten GitHub & GitLab PATs"
description: "Revoke personal access tokens created 'temporarily' two years ago. Replace classic broad-scope PATs with fine-grained, repository-scoped tokens with mandatory expiration dates."
pubDate: 2026-12-07
tags: ["security", "git", "credentials", "devsecops"]
series: "advent-2026"
adventDay: 7
draft: true
socialSummary: |
  Be honest: how many active GitHub PATs, old API keys, or "temporary" test credentials are sitting forgotten in your account or side projects right now?

  Cursor's Nov 2026 post-mortem showed how a single stolen vendor key unlocked unredacted credentials from 2025 logs.

  Day 07/24 of the 2026 DevSec Advent Calendar: auditing forgotten PATs and enforcing short-lived, repo-scoped tokens.
---

Be honest: how many active GitHub Personal Access Tokens (PATs), GitLab project tokens, or "temporary" test API keys are sitting forgotten in your account settings or old side projects right now?

For years, the path of least resistance when setting up a CLI tool or quick automation script was generating a **Classic GitHub PAT** with the `repo` scope checked and expiration set to *"No expiration"*.

> **Real-World Receipt (Nov 2026):** The Cursor / Fireworks AI post-mortem showed how a single compromised third-party vendor credential unlocked unredacted tokens sitting in historical 2025 logs, turning forgotten, still-active tokens into a lateral movement highway.

---

## Why Classic PATs Are a Lateral Movement Goldmine

A classic GitHub PAT with `repo` scope grants read and write access to **every single private and public repository your user account can access**, across your personal namespace and every organization that has not explicitly blocked classic tokens.

If that token was pasted into a debug log, a retired CI runner ([Day 11](/blog/advent-day-11-ci-oidc-over-static-keys)), or an old `.bash_history` file in 2024 and never revoked, it is still a live master key today.

---

## The 3-Step Token Hygiene Protocol

### 1. Audit and Revoke Today

Visit your active token dashboards right now and revoke every token you cannot immediately map to an active, locked-down workload:

- **GitHub:** `Settings -> Developer settings -> Personal access tokens` (check both *Tokens (classic)* and *Fine-grained tokens*, plus *Authorized OAuth Apps*).
- **GitLab:** `User Settings -> Access Tokens` and `Applications`.

### 2. Enforce Fine-Grained, Repo-Scoped Tokens Only

When creating a token for local automation, never use Classic PATs. Always use **Fine-Grained Personal Access Tokens** restricted to:

1. **Single repository access** (`Only select repositories`) instead of `All repositories`.
2. **Minimum required permissions** (for example, `Contents: Read-only` instead of `Read and write`).
3. **Short mandatory expiration** (7 to 30 days max).

### 3. Block Classic PATs at the Organization Level

If you lead an engineering team or manage a GitHub Organization, go to `Organization Settings -> Personal access tokens -> Settings` and:

- Restrict access via **Classic personal access tokens**.
- Require administrator approval for Fine-Grained PATs targeting organization repositories.
- Enforce a maximum token lifetime policy (for example, 30 days).

---

## Verify It in 60 Seconds

Check your active local CLI scopes and hunt for forgotten plaintext Git/npm credentials sitting on your workstation:

```bash
# 1. Inspect which scopes your current GitHub CLI token holds
gh auth status

# 2. Check for plaintext credentials stored on disk
ls -la ~/.git-credentials ~/.netrc ~/.npmrc 2>/dev/null
```

If you find old tokens in shell history or repos, revoke them first. Then scan your repositories with [Day 12's Git history scanner](/blog/advent-day-12-git-history-secret-scanning).

### Key Takeaway for Day 07

A leaked log from last year should not contain a working token today. Audit your GitHub/GitLab tokens right now, delete every "temporary" token, and enforce short-lived, repository-scoped fine-grained tokens.

---

## References

- [GitHub Docs: Managing Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitLab Docs: Personal Access Tokens](https://docs.gitlab.com/user/profile/personal_access_tokens/)
