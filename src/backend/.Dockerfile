# Build stage
FROM denoland/deno:latest AS builder
WORKDIR /app
COPY . .
RUN deno cache main.ts

# Production stage
FROM denoland/deno:latest
WORKDIR /app
COPY --from=builder /app .

# Create deno user
RUN addgroup --system deno && \
    adduser --system --ingroup deno deno

# Switch to deno user
USER deno

# Run the app
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--unstable-kv", "--allow-env", "src/main.ts"]