# CV-MCP Server: Final Deployment Guide

This document provides a comprehensive guide for building and deploying the updated CV-MCP Docker image with all implemented fixes. It includes step-by-step instructions for building the image, pushing it to Docker Hub, and deploying it on a Synology NAS.

## Table of Contents

- [Overview of Fixes](#overview-of-fixes)
- [Building the Docker Image](#building-the-docker-image)
- [Testing Locally](#testing-locally)
- [Pushing to Docker Hub](#pushing-to-docker-hub)
- [Deploying on Synology NAS](#deploying-on-synology-nas)
- [Troubleshooting](#troubleshooting)

## Overview of Fixes

We've addressed two key areas of the CV-MCP server to ensure robust operation and reliable container management.

### 1. MCP Server Robustness Fixes

| Issue | Fix Implemented | File(s) Modified |
|-------|----------------|------------------|
| Server ping failures | Implemented fallback ping system with method availability checking | `src/server/http-server.ts` |
| Health check failures | Added graceful degradation for health checks | `src/server/http-server.ts`, `Dockerfile` |
| SSE connection issues | Enhanced SSE endpoint robustness with error handlers and recovery logic | `src/server/http-server.ts` |
| Port conflicts | Improved port management with availability checking and dynamic port assignment | `src/server/http-server.ts` |
| Request timeout handling | Added configurable timeouts with fallback mechanisms | `src/server/http-server.ts` |

### 2. Docker Container Stability Fixes

| Issue | Fix Implemented | File(s) Modified |
|-------|----------------|------------------|
| Container restart failures | Added proper restart policies | `docker-compose.yml` |
| Container health monitoring | Implemented Docker health checks | `Dockerfile`, `docker-compose.yml` |
| Ungraceful shutdowns | Added proper signal handling (SIGTERM, SIGINT) | `src/server/http-server.ts` |
| Resource constraints | Added memory limits and reservations | `docker-compose.yml` |
| Log management | Configured log rotation to prevent disk space issues | `docker-compose.yml` |

## Building the Docker Image

### Step 1: Update Version (Patch Increment)

Since we've made bug fixes without API changes, we should increment the patch version:

```bash
# Update version from 1.0.0 to 1.0.1 in package.json
sed -i '' 's/"version": "1.0.0"/"version": "1.0.1"/' package.json

# Verify the version update
grep '"version"' package.json
```

### Step 2: Build the Docker Image

```bash
# Extract version from package.json
VERSION=$(grep -o '"version": "[^"]*' package.json | cut -d'"' -f4)

# Build the image with both version tag and latest tag
docker build -t cv-mcp:$VERSION -t cv-mcp:latest .
```

## Testing Locally

Before pushing to Docker Hub, verify that all fixes are working correctly:

```bash
# Run the container with the same settings as production
docker run -d \
  --name cv-mcp-test \
  --restart always \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e REQUEST_TIMEOUT=30000 \
  -e PING_INTERVAL=30000 \
  cv-mcp:latest

# Check if the container is running
docker ps

# Test specific fixes:

# 1. Test the health endpoint (health check fix)
curl http://localhost:3001/health

# 2. Check logs for ping mechanism (ping system fix)
docker logs cv-mcp-test | grep "Ping"

# 3. Test graceful shutdown (signal handling fix)
docker stop cv-mcp-test
docker logs cv-mcp-test | grep "shutting down"

# Optional: Test port conflicts by running another instance
# This should automatically find another available port
docker run -d \
  --name cv-mcp-test2 \
  -e PORT=3001 \
  cv-mcp:latest

# Check if second instance found a different port
docker logs cv-mcp-test2 | grep "port"

# Clean up test containers
docker stop cv-mcp-test cv-mcp-test2
docker rm cv-mcp-test cv-mcp-test2
```

## Pushing to Docker Hub

### Step 1: Tag the Docker Image

```bash
# Replace 'yourusername' with your Docker Hub username
DOCKER_USERNAME=yourusername
VERSION=$(grep -o '"version": "[^"]*' package.json | cut -d'"' -f4)

# Tag the image with version and latest
docker tag cv-mcp:latest $DOCKER_USERNAME/cv-mcp:latest
docker tag cv-mcp:$VERSION $DOCKER_USERNAME/cv-mcp:$VERSION

# Optional: Tag with git commit SHA for precise version tracking
GIT_SHA=$(git rev-parse --short HEAD)
docker tag cv-mcp:latest $DOCKER_USERNAME/cv-mcp:$GIT_SHA
```

### Step 2: Login to Docker Hub

```bash
docker login
# Enter your Docker Hub username and password when prompted
```

### Step 3: Push the Images to Docker Hub

```bash
# Push the images
docker push $DOCKER_USERNAME/cv-mcp:latest
docker push $DOCKER_USERNAME/cv-mcp:$VERSION

# Optional: Push the SHA-tagged image
docker push $DOCKER_USERNAME/cv-mcp:$GIT_SHA
```

## Deploying on Synology NAS

### Option 1: Using Docker Compose (Recommended)

This method is recommended as it ensures all configuration settings are applied consistently.

1. **SSH into your Synology NAS**:
   ```bash
   ssh admin@your-nas-ip
   ```

2. **Create or update the docker-compose.yml file**:
   ```bash
   mkdir -p /volume1/docker/cv-mcp
   cd /volume1/docker/cv-mcp
   ```

3. **Create docker-compose.yml with the following content**:
   ```yaml
   version: '3.8'

   services:
     cv-mcp-server:
       image: yourusername/cv-mcp:latest
       container_name: cv-mcp-server
       restart: always
       ports:
         - "3001:3001"
       environment:
         - NODE_ENV=production
         - PORT=3001
         - REQUEST_TIMEOUT=30000
         - PING_INTERVAL=30000
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
         interval: 30s
         timeout: 10s
         retries: 3
         start_period: 30s
       volumes:
         - /volume1/media:/usr/src/app/media
       deploy:
         resources:
           limits:
             memory: 512M
           reservations:
             memory: 256M
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

4. **Deploy with Docker Compose**:
   ```bash
   # Pull the latest image and deploy
   docker-compose pull
   docker-compose up -d

   # Verify deployment
   docker-compose ps
   docker-compose logs
   ```

### Option 2: Using Synology Docker UI

If you prefer using the Synology DSM interface:

1. **Login to Synology DSM**:
   - Open a web browser and navigate to your Synology NAS web interface
   - Login with your admin credentials

2. **Update the Image**:
   - Open Docker from the main menu
   - Go to the Registry tab
   - Search for your repository: `yourusername/cv-mcp`
   - Click Download and select the `latest` tag
   - Wait for the download to complete

3. **Stop and Remove the Existing Container**:
   - Go to the Container tab
   - Select the running cv-mcp container
   - Click the Stop button
   - Right-click on the container and select "Clear"

4. **Create a New Container**:
   - Go to the Image tab
   - Select your downloaded image
   - Click "Launch" to create a new container
   - Configure with the following settings:
     - Container Name: cv-mcp-server
     - Enable auto-restart
     - Configure port mapping: 3001:3001
     - Add environment variables:
       - NODE_ENV=production
       - PORT=3001
       - REQUEST_TIMEOUT=30000
       - PING_INTERVAL=30000
     - Mount volume: /volume1/media to /usr/src/app/media
   - Click Next and then Apply

5. **Verify the Container**:
   - Check the container logs to ensure it started correctly
   - Test the health endpoint: `http://your-nas-ip:3001/health`

### Option 3: Using Docker CLI on Synology

If you prefer the command line:

```bash
# SSH into your Synology NAS
ssh admin@your-nas-ip

# Pull the latest image
docker pull yourusername/cv-mcp:latest

# Stop and remove the existing container
docker stop cv-mcp-server
docker rm cv-mcp-server

# Create a new container with the latest image
docker run -d \
  --name cv-mcp-server \
  --restart always \
  -p 3001:3001 \
  -v /volume1/media:/usr/src/app/media \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e REQUEST_TIMEOUT=30000 \
  -e PING_INTERVAL=30000 \
  yourusername/cv-mcp:latest

# Verify the container is running
docker ps
docker logs cv-mcp-server
```

## Troubleshooting

### Container Fails to Start

1. **Check for port conflicts**:
   ```bash
   # On Synology NAS
   netstat -tulpn | grep 3001

   # If port is in use, either stop the competing service or change the port mapping
   ```

2. **Check logs for specific errors**:
   ```bash
   docker logs cv-mcp-server
   ```

3. **Verify file permissions**:
   ```bash
   ls -la /volume1/media
   # Ensure permissions are appropriate (chmod 755)
   ```

4. **Test container environment**:
   ```bash
   # Execute shell inside container to verify environment
   docker exec -it cv-mcp-server /bin/sh

   # Check internal connectivity
   curl http://localhost:3001/health

   # Check environment variables
   env | grep PORT
   ```

### Health Check Fails

1. **Check if server is running but health check is failing**:
   ```bash
   # Check logs for server startup
   docker logs cv-mcp-server | grep "MCP Server running"

   # Manually test health endpoint
   curl http://your-nas-ip:3001/health
   ```

2. **Monitor container health status**:
   ```bash
   docker inspect --format="{{.State.Health.Status}}" cv-mcp-server

   # For more detailed health check results
   docker inspect --format="{{json .State.Health}}" cv-mcp-server | jq
   ```

3. **Check if firewall is blocking health check**:
   Verify that the Synology firewall isn't blocking internal port 3001.

### Container Restarts Repeatedly

1. **Increase memory allocation**:
   If the container keeps restarting due to memory constraints, increase the memory limit in docker-compose.yml or via the Docker UI.

2. **Check for application errors causing crashes**:
   ```bash
   # Get logs including previous container instances
   docker logs --tail 100 cv-mcp-server
   ```

3. **Enable more verbose logging**:
   Temporarily set NODE_ENV to development to get more verbose logs:
   ```bash
   docker update --env-add NODE_ENV=development cv-mcp-server
   docker restart cv-mcp-server
   ```

4. **Test with interactive mode**:
   ```bash
   # Run in interactive mode to observe startup issues
   docker run -it --rm \
     -p 3001:3001 \
     -e NODE_ENV=production \
     -e PORT=3001 \
     yourusername/cv-mcp:latest /bin/sh

   # Then manually start the application
   bun run build/http-server.js
   ```

### Contact and Support

For additional support or to report issues, please file a ticket in the project's issue tracker or contact the development team directly.

---

This deployment guide reflects all the fixes implemented in version 1.0.1 of the CV-MCP server, providing a robust, production-ready Docker container that handles restart scenarios gracefully and maintains stable operation.
