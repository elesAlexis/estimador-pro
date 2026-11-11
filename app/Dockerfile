FROM node:24.22.2-bookworm-slim AS web-build
WORKDIR /build

COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npm_ca \
    if [ -s /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi \
    && npm ci --no-audit --no-fund

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
ENV VITE_STORAGE_BACKUPS=true
RUN npm run build

FROM node:24.22.2-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
COPY app/package.json app/package-lock.json ./
RUN --mount=type=secret,id=npm_ca \
    if [ -s /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi \
    && npm ci --omit=dev --no-audit --no-fund

COPY app/*.mjs ./
COPY --from=web-build /build/dist ./public

USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
