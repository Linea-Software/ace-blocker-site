FROM oven/bun:1.4.1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN bun run build

# Production image
FROM oven/bun:1.4.1 AS runtime

WORKDIR /app

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy package files and install only production dependencies
COPY --from=builder /app/package.json /app/bun.lock ./
RUN bun install --production --frozen-lockfile

# Copy the build output from the builder stage
COPY --from=builder /app/build ./build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Switch to non-root user
USER appuser

# Run the application
CMD ["bun", "./build/index.js"]
