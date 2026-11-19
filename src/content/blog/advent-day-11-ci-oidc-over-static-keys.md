---
title: "Replace Static CI Secrets With OIDC Federation"
description: "Stop storing long-lived AWS/GCP/Azure JSON keys in GitLab CI or GitHub Actions variables. Use OpenID Connect (OIDC) federation so pipelines mint short-lived, job-scoped credentials that expire automatically."
pubDate: 2026-12-11
tags: ["security", "ci-cd", "cloud", "devsecops"]
series: "advent-2026"
adventDay: 11
draft: true
---

If your GitHub Actions or GitLab CI deployment pipeline authenticates to AWS, Google Cloud, or Azure using a static `AWS_SECRET_ACCESS_KEY` or `GCP_SA_KEY` JSON blob stored in repository secrets, you are carrying unnecessary supply-chain risk.

Static CI secrets don't expire unless someone remembers to rotate them—and if a malicious dependency or compromised GitHub Action exfiltrates `process.env` during a build, that static key works from anywhere on the internet.

---

## How OpenID Connect (OIDC) Eliminates Static Cloud Keys

With **OIDC federation**, you store **zero cloud secrets** in GitHub or GitLab:

1. Your CI runner requests a cryptographically signed OIDC JWT from GitHub/GitLab containing claims about the exact repository, branch, environment, and workflow (`repo:Xapuu/personal-page:ref:refs/heads/main`).
2. Your cloud provider (AWS IAM, GCP Workload Identity Federation, Azure AD) verifies that JWT against the CI provider's public keys and checks the trust policy condition.
3. The cloud provider issues a **short-lived credential (e.g., 15–60 minutes)** scoped strictly to that single deployment job.

---

## Production GitHub Actions + AWS OIDC Configuration

### 1. Lock Down the IAM Trust Policy Condition (`sub` Claim)

Never allow `repo:your-org/*` across all branches if only `main` deploys to production! Scope the `sub` condition strictly to your repository and protected branch/environment:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Xapuu/personal-page:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

### 2. Request the Short-Lived Token in Your Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Static Site
on:
  push:
    branches: [main]

permissions:
  id-token: write # Required to request the OIDC JWT
  contents: read  # Least-privilege repo read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4 pinned by SHA

      - name: Configure AWS Credentials via OIDC (No Static Secrets!)
        uses: aws-actions/configure-aws-credentials@ececac1a45f3b08a01d2dd070d28d111c5fe6722
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: eu-central-1
```

### Key Takeaway for Day 11

The safest CI secret is the one that doesn't exist. Delete long-lived `AWS_SECRET_ACCESS_KEY` and `GCP_SA_KEY` variables from your CI/CD settings and replace them with branch-scoped OIDC federation.

---

## Social Summary (X & LinkedIn)

```text
Still storing static `AWS_SECRET_ACCESS_KEY` or `GCP_SA_KEY` JSON blobs inside GitHub Actions or GitLab CI variables?

If a poisoned dependency or compromised CI action dumps `env`, static keys work forever from anywhere.

Day 11/24 of the 2026 DevSec Advent Calendar: Replacing static CI cloud keys with branch-scoped OIDC federation.
```
