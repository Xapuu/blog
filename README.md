# Hristiyan Hristov — Developer Portfolio & Technical Blog

Minimalist, high-contrast personal developer portfolio and technical blog built with **Astro v5**, **strict TypeScript**, and **Tailwind CSS** (zero client-side JS by default).

## Tech Stack & Architecture

- **Framework:** Astro v5 (Static Site Generation)
- **Styling:** Tailwind CSS (`#0B0F17` canvas, `#111827` surface cards, crisp monospace accents)
- **Syntax Highlighting:** Shiki (`github-dark` theme) + lightweight `<20` lines inline Copy Code button
- **Feeds & Discovery:** `@astrojs/rss` (`/rss.xml`) and `@astrojs/sitemap` (`/sitemap-index.xml`)
- **Type Safety:** Strict TypeScript (`astro/tsconfigs/strict`) and Zod-validated Content Collections (`src/content/config.ts`)
- **Self-Hosting:** Multi-stage `Dockerfile` (Node 22 LTS build stage + `nginx:alpine` runtime with strict CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`)

## Development Commands

```bash
# Start local development server
npm run dev

# Run Astro type & content schema diagnostics
npx astro check

# Build static site for production into ./dist
npm run build

# Preview production build locally
npm run preview
```

## Container Build & Run

```bash
docker build -t hristov-dev-blog .
docker run --rm -p 8080:80 hristov-dev-blog
```
