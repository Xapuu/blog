---
title: "Replace Static CI Secrets With OIDC Federation"
description: "Stop storing long-lived AWS/GCP/Azure JSON keys in GitLab CI or GitHub Actions variables. Use OpenID Connect (OIDC) federation so pipelines mint short-lived, job-scoped credentials that expire automatically."
pubDate: 2026-12-11
tags: ["security", "ci-cd", "cloud", "devsecops"]
series: "advent-2026"
adventDay: 11
draft: true
socialSummary: |
  Still storing static `AWS_SECRET_ACCESS_KEY` or `GCP_SA_KEY` JSON blobs inside GitHub Actions or GitLab CI variables?

  If a poisoned dependency or compromised CI action dumps `env`, static keys work forever from anywhere.

  Day 11/24 of the 2026 DevSec Advent Calendar: replacing static CI cloud keys with branch-scoped OIDC federation.
---

If your GitHub Actions or GitLab CI deployment pipeline authenticates to AWS, Google Cloud, or Azure using a static `AWS_SECRET_ACCESS_KEY` or `GCP_SA_KEY` JSON blob stored in repository secrets, you are carrying unnecessary supply-chain risk.

Static CI secrets never expire unless someone remembers to rotate them. If a malicious dependency or compromised GitHub Action exfiltrates `process.env` during a build, that static key works from anywhere on the internet.

> **Real-World Receipt:** In supply-chain compromises like the `tj-actions/changed-files` incident (`CVE-2025-30066`) and the Codecov CI breach, attackers modified a widely used CI step to dump runner memory and environment variables into build logs. Teams using static cloud keys suffered immediate credential theft. Teams using branch-scoped OIDC had no static keys in memory to steal.

---

## How OpenID Connect (OIDC) Eliminates Static Cloud Keys

With **OIDC federation**, you store **zero cloud secrets** in GitHub or GitLab:

1. Your CI runner requests a cryptographically signed OIDC JWT from GitHub/GitLab containing claims about the exact repository, branch, environment, and workflow (`repo:your-org/your-app:environment:production`).
2. Your cloud provider (AWS IAM, GCP Workload Identity Federation, Azure Entra ID) verifies that JWT against the CI provider's public keys and checks the trust policy condition.
3. The cloud provider issues a **short-lived credential (15 to 60 minutes)** scoped strictly to that single deployment job.

---

## Production GitHub Actions & GitLab CI OIDC Configuration

### 1. Lock Down the IAM Trust Policy Condition (`sub` Claim)

Never use `StringLike` with `repo:your-org/*` across all branches, or any pull request or dev branch can assume your production role. Scope `StringEquals` strictly to a protected **GitHub Environment** (with required reviewers) or your protected `main` branch:

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
          "token.actions.githubusercontent.com:sub": "repo:your-org/your-app:environment:production"
        }
      }
    }
  ]
}
```

### 2. Request the Short-Lived Token in GitHub Actions (with SHA-Pinned Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy Production
on:
  push:
    branches: [main]

permissions:
  id-token: write # Required to request the OIDC JWT
  contents: read  # Least-privilege repo read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Configure AWS Credentials via OIDC (No Static Secrets!)
        uses: aws-actions/configure-aws-credentials@ececac1a45f3b08a01d2dd070d28d111c5fe6722
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: eu-central-1
```

### 3. Using GitLab CI? Declare `id_tokens` Native to the Job

```yaml
# .gitlab-ci.yml
deploy_prod:
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  id_tokens:
    AWS_OIDC_TOKEN:
      aud: https://sts.amazonaws.com
  script:
    - >
      aws sts assume-role-with-web-identity
      --role-arn "$AWS_DEPLOY_ROLE_ARN"
      --role-session-name "gitlab-${CI_JOB_ID}"
      --web-identity-token "$AWS_OIDC_TOKEN"
```

---

## Verify It in 60 Seconds

Audit your repositories for leftover static cloud keys stored in GitHub Actions secrets right now:

```bash
# List repository secret names via GitHub CLI (look for AWS_SECRET_ACCESS_KEY, GCP_SA_KEY, AZURE_CREDENTIALS)
gh secret list
```

### Key Takeaway for Day 11

The safest CI secret is the one that does not exist. Delete long-lived `AWS_SECRET_ACCESS_KEY` and `GCP_SA_KEY` variables from your CI/CD settings, replace them with environment-scoped OIDC federation, and pin third-party GitHub Actions to full 40-character commit SHAs.

---

## References

- [CVE-2025-30066: `tj-actions/changed-files` Supply-Chain Compromise](https://www.cve.org/CVERecord?id=CVE-2025-30066)
- [GitHub Docs: Security Hardening with OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect)
- [GitLab Docs: Configure OpenID Connect in AWS](https://docs.gitlab.com/ci/cloud_services/aws/)
