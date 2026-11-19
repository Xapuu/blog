# Stage 1: Build Astro static site with Node 22 LTS (Day 13 & Day 14 best practices)
# Tip (Day 16): Pin base images to immutable @sha256 digests in CI via Renovate/Dependabot
# (`docker buildx imagetools inspect node:22-alpine --format "{{.Manifest.Digest}}"`).
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild esbuild sharp

COPY . .
RUN npm run build

# Stage 2: Serve static assets with unprivileged nginx:alpine (Day 17 non-root UID 101)
FROM nginxinc/nginx-unprivileged:alpine AS runner

# Switch to root briefly only to copy read-only config and static assets
USER root
RUN rm -rf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Drop back to unprivileged nginx user (UID 101)
USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
