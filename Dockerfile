# node:sqlite needs Node 22.5+; 24 is what CI and development use.
FROM node:24-alpine AS build

WORKDIR /app

# Copy manifests first so `npm ci` is cached until a dependency actually changes.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci

COPY . .
RUN npm run build --workspace=web


FROM node:24-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
# The client is already built, so the runtime image carries no build tooling.
RUN npm ci --omit=dev --workspace=server && npm cache clean --force

COPY server/ server/
COPY --from=build /app/web/dist web/dist

# The database lives on a volume — an image rebuild must never take the ledger
# with it.
ENV DATABASE_FILE=/data/rs.db
VOLUME /data

# Drop root before running anything that touches the network.
RUN mkdir -p /data && chown -R node:node /data
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/index.js"]
