# Build stage
FROM denoland/deno:latest AS builder
COPY . .
RUN deno cache main.ts

# Production stage
FROM denoland/deno:latest
COPY --from=builder . /src/backend

EXPOSE 8000
# Run the app
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--unstable-kv", "--allow-env", "src/backend/src/main.ts"]