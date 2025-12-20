ARG NODE_VERSION=22.12.0

# --- Build Stage ---
FROM node:${NODE_VERSION}-slim AS build

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.12.3

# Copy package files for better caching
COPY pnpm-lock.yaml package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# --- Run Stage ---
FROM node:${NODE_VERSION}-slim

WORKDIR /app

# Copy built artifacts from build stage
COPY --from=build /app/.output ./

# Environment variables defaults
ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

# Start the server (link secrets before start)
CMD ["sh", "-c", "ln -sf /secrets/env/.env .env && node server/index.mjs"]
