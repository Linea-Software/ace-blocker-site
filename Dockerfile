FROM oven/bun:1.4.4 AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run paraglide:compile && bun run build

FROM oven/bun:1.4.4 AS runtime
WORKDIR /app
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=builder /app/package.json /app/bun.lock ./
RUN bun install --production --frozen-lockfile --ignore-scripts
# Solid 2's Vite start mode emits the server request handler and the entire
# client asset tree under dist/. The Node-compatible entry runs under Bun.
COPY --from=builder /app/dist/client ./dist/client
COPY --from=builder /app/dist/server ./dist/server

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

USER appuser
CMD ["bun", "./dist/server/node.js"]
