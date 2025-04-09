# Use an official Bun runtime as a parent image
FROM oven/bun:1-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

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
RUN bun run build:http

# Expose the port the app runs on
EXPOSE 3001

# Define the command to run the application using bun
# Executes the built server file directly
CMD ["bun", "run", "build/http-server.js"]
