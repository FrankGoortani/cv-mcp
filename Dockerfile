# Use a more architecture-compatible base image with explicit architecture tag
FROM --platform=linux/amd64 node:18-alpine AS builder

# Install Bun with architecture awareness
RUN apk add --no-cache curl unzip bash
RUN curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH
ENV PATH=/root/.bun/bin:$PATH

# Verify Bun is properly installed with correct architecture
RUN bun --version

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and bun.lockb (if it exists)
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the TypeScript project
RUN bun build src/server/http-server.ts --outdir build --target node

# Start a new build stage to create a clean production image
FROM --platform=linux/amd64 node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Install only the runtime dependencies and curl for health check
RUN apk --no-cache add curl bash

# Install Bun runtime
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH=/root/.bun/bin:$PATH

# Copy built application from builder stage
COPY --from=builder /usr/src/app/build ./build
COPY --from=builder /usr/src/app/package.json ./

# Copy the media folder for file serving
COPY ./media ./media

# Install only production dependencies
RUN bun install --production --frozen-lockfile

# Print architecture information for debugging
RUN uname -a

# Expose the port the app runs on
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Define environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV REQUEST_TIMEOUT=120000
ENV PING_INTERVAL=60000

# Define the command to run the application
CMD ["bun", "run", "build/http-server.js"]
