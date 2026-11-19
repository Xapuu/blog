---
name: tech-article-writing
description: >-
  Write and structure technical security and engineering posts, articles, and
  social threads for LinkedIn, X, and developer blogs. Use when the user asks
  to draft, refine, or format an article, blog post, LinkedIn post, X card, or
  DevSecOps write-up.
---

# Tech Article Writing

A workflow for drafting high-signal technical security and software engineering articles, LinkedIn posts, and X cards optimized for working developers and broad out-of-network reach.

## When to Use

- Drafting or refining technical blog posts, engineering articles, or DevSecOps advisories.
- Writing companion posts for LinkedIn and X (such as X-card screenshots from `/x-export` paired with a LinkedIn post).
- Turning a CVE, vulnerability report, or production engineering lesson into a practical developer write-up.

## Core Workflow

1. **Verify Technical Accuracy First**
   - Confirm exact version numbers, CVE/GHSA IDs, CVSS scores, and configuration syntax before writing.
   - Double-check whether a software release branch is LTS or short-term before labeling it.
   - Distinguish between theoretical exposure and practical deployment reality (for example: localhost-only dev servers vs. network-exposed containers, or edge CDN termination vs. origin server configs).

2. **Open with a High-Signal Hook**
   - Avoid opening with dry CVE summaries or press-release announcements. Pure advisory recaps stay trapped in immediate networks.
   - Start the first 1-2 lines with one of three proven angles:
     - **Direct second-person callout:** Challenge a common developer habit with an uncomfortable question or hard rule (e.g., asking how many forgotten personal access tokens are still active).
     - **Engineering pragmatism or dry humor:** Frame the incident through real-world trade-offs, vendor rivalries, or how boring defaults prevented an emergency deploy.
     - **Relatable production pain:** Contrast the strict security rituals teams enforce on backend/CI pipelines with the blind spots left open elsewhere.

3. **Keep the Post Self-Contained**
   - Deliver the full technical takeaway, root cause, and actionable remediation inside the post body itself.
   - Never embed outbound URLs inside the main body of a LinkedIn or X post, and do not rely on external link-preview formats (platforms throttle external links).
   - Place external reference URLs in the **first comment** (for social posts) or a dedicated **`## References`** section (for blog posts). On developer blogs, internal site cross-links (e.g. `/blog/advent-day-01-...`) are fine inline.

4. **Provide Concrete, Copy-Pasteable Remediation**
   - Include specific CLI commands, configuration snippets (Nginx headers, Dockerfile directives, CSP rules, SQL grants), or exact patched version numbers.
   - Add a quick verification step a developer or team lead can run in under five minutes.

5. **Enforce a Natural Engineering Voice**
   - Write in a direct, pragmatic JS/Frontend and DevSecOps team-lead voice.
   - Avoid corporate buzzwords, symmetrical AI-style transitions, and repetitive sentence structures.
   - Minimize em-dashes and en-dashes. Prefer normal periods, parentheses, colons, or line breaks.
   - See [Voice Calibration Examples](./examples/voice-calibration.md) when tuning hooks or editing drafts.

## Output Formats

### Dual Social Set (X + LinkedIn)

1. **X Post / X Card (`/x-export`):** 2-4 punchy sentences (~200-350 characters) with crisp line breaks so it renders cleanly on a 540px card screenshot. Zero outbound URLs.
2. **LinkedIn Companion Post:** Self-contained write-up (~150-300 words) with the hook above the 2-line "See more" fold, short 1-2 sentence paragraphs, concrete fix/command, and zero outbound URLs in the body.
3. **First Comment:** Ready-to-paste comment containing the blog post link and primary advisory/CVE references.

### Long-Form Blog Post (Markdown)

When writing for this Astro blog (`src/content/blog/*.md`), include valid YAML frontmatter matching `src/content/config.ts`:

```yaml
---
title: "..."
description: "..."
pubDate: 2026-12-01
tags: ["security", "frontend"]
series: "general" # or "advent-2026"
adventDay: 1      # optional, 1-24 when series is "advent-2026"
draft: true
socialSummary: |
  Punchy 2-4 sentence X/LinkedIn summary without embedded URLs.
---
```

Structure the Markdown body with:
- High-signal opening hook and real-world impact/receipt.
- Clear root-cause breakdown (why defaults fail).
- Copy-pasteable, hardened code/config fixes.
- A fast verification command (`< 5` minutes to test).
- A dedicated `## References` section for external links (CVEs, GHSAs, vendor advisories, specs).

## Pre-Flight Validation Checklist

Before finishing any draft, verify:
- [ ] **Accuracy:** CVE IDs, patched versions, LTS labels, and config syntax are verified against primary sources.
- [ ] **No link throttling:** Zero outbound URLs appear in LinkedIn/X post bodies or `socialSummary`.
- [ ] **Voice check:** Minimal or zero em-dashes/en-dashes; hooks sound like a working team lead, not a press release.
- [ ] **Remediation check:** Snippets avoid known pitfalls (e.g., `curl -fsSL`, pinned SHAs, no DNS-rebinding TOCTOU, no `:latest` tags).
- [ ] **Astro build check (blog posts only):** Run `npm run check` and confirm zero schema, frontmatter, or TypeScript errors.

## Gotchas

- **Link throttling:** Never embed external URLs inside the main body of a LinkedIn post when aiming for organic reach.
- **Over-polishing hooks:** Preserve the user's raw, conversational opening instincts rather than smoothing them into formal press-release language.
- **False precision on versions:** Always double-check whether a software release branch is LTS or short-term before labeling it.
