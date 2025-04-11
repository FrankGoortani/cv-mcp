# Use an official Bun runtime as a parent image
FROM oven/bun:1-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Install curl for health check (can be removed if alternative is used)
RUN apk --no-cache add curl

# Copy package.json and bun.lockb
# Copying bun.lockb ensures reproducible installs
COPY package.json bun.lockb* ./
# The '*' handles cases where bun.lockb might not exist initially

# Install dependencies using bun install --frozen-lockfile
# This ensures dependencies are installed exactly as specified in the lockfile
RUN bun install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the TypeScript project using the specific http build script
RUN bun build src/server/http-server.ts --outdir build --target node

# Expose the port the app runs on
EXPOSE 3001

# Add health check
# Check if the service responds to HTTP requests every 30 seconds
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Define environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV REQUEST_TIMEOUT=30000
ENV PING_INTERVAL=30000

# Define the command to run the application using bun
# Executes the built server file directly
CMD ["bun", "run", "build/http-server.js"]
