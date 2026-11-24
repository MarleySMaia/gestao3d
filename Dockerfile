# syntax=docker/dockerfile:1

# ============================================================
# Gestão 3D — imagem única: API Express + interface React compilada
# Dados (SQLite + imagens) ficam em /data → monte um volume aí.
# ============================================================

# ---------- base com ferramentas de compilação (better-sqlite3 é nativo) ----------
FROM node:22-bookworm-slim AS base-build
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/

# ---------- compila o frontend ----------
FROM base-build AS client-build
RUN npm ci --no-audit --no-fund
COPY client/ client/
RUN npm run build -w client

# ---------- dependências de produção do backend ----------
FROM base-build AS server-deps
RUN npm ci --omit=dev --workspace=server --no-audit --no-fund

# ---------- imagem final ----------
FROM node:22-bookworm-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/data \
    TZ=America/Sao_Paulo

WORKDIR /app
COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server/package.json server/db.js server/index.js server/
COPY --from=client-build /app/client/dist client/dist

RUN mkdir -p /data/uploads && chown -R node:node /data
USER node

VOLUME ["/data"]
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
