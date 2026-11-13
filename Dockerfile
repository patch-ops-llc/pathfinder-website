# syntax=docker/dockerfile:1

# ---- Build: install dependencies and compile the site ----------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# SITE_URL is baked into canonical links, the sitemap and structured data.
ARG SITE_URL=https://www.pathfinderlld.com
ENV SITE_URL=${SITE_URL}
RUN npm run build

# ---- Run: the build output and one server file, no node_modules ------------
FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server.mjs /app/package.json ./

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
