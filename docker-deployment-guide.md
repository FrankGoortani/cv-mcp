# Docker Deployment Guide for CV-MCP Server

This guide provides step-by-step instructions for building, tagging, and pushing the CV-MCP Docker image to Docker Hub, as well as updating the container on a Synology NAS.

## Table of Contents

- [Version Management Strategy](#version-management-strategy)
- [Architecture Considerations](#architecture-considerations)
- [Building and Pushing to Docker Hub](#building-and-pushing-to-docker-hub)
- [Updating on Synology NAS](#updating-on-synology-nas)
- [Troubleshooting](#troubleshooting)

## Version Management Strategy

### Package Version

The package version is tracked in `package.json` and should be updated according to [Semantic Versioning](https://semver.org/) principles:

- **Major version** (x.0.0): Increment for backwards-incompatible API changes
- **Minor version** (0.x.0): Increment for new functionality in a backwards-compatible manner
- **Patch version** (0.0.x): Increment for backwards-compatible bug fixes

For the fixes we've implemented, the appropriate strategy is to increment the **patch version** since they are bug fixes without API changes.

### Docker Image Tagging Strategy

Docker images should follow this tagging convention:

1. **Latest tag**: Always points to the most recent stable release
2. **Version tag**: Explicit version number matching the package.json version
3. **SHA tag**: Optional tag based on Git commit SHA for precise tracking
4. **Architecture tag**: Adding the target architecture to the tag (e.g., `cv-mcp:1.0.2-amd64`)

## Architecture Considerations

### Synology NAS Architecture Compatibility

Synology NAS devices primarily use **x86_64/amd64** architecture. When building Docker images for deployment on a Synology NAS, you must ensure the image is compatible with this architecture at multiple levels:

1. **Base image architecture**: Every image in a multi-stage build must be explicitly set to amd64
2. **Build tools and binaries**: Any tools or binaries installed during the build must be compatible
3. **Runtime dependencies**: All runtime dependencies must be architecture-compatible

If you build Docker images on a different architecture (like ARM64/Apple Silicon Macs), you'll encounter this error when running the container on Synology:

```
standard_init_linux.go:230: exec user process caused: exec format error
```

This error indicates an architecture mismatch between the built image and the target system.

### Cross-Platform Building Solutions

Simply using the `--platform` flag at build time is sometimes insufficient, especially with images that install architecture-specific binaries. For complete compatibility, you need multiple layers of architecture specification:

1. **Specify platform in the Dockerfile itself**:
   ```dockerfile
   FROM --platform=linux/amd64 node:18-alpine
   ```

2. **Use explicit architecture tags** for base images:
   ```dockerfile
   FROM node:18-alpine@sha256:xxxxxx # where xxxxxx is a digest known to be amd64
   ```

3. **Build with platform flag**:
   ```bash
   docker build --platform linux/amd64 -t your-image-name .
   ```

4. **Verify the architecture** before deployment:
   ```bash
   docker inspect your-image-name | grep Architecture
   # Should show "amd64"
   ```

## Building and Pushing to Docker Hub

### Prerequisites

- Docker installed and running on your machine
- Docker Hub account
- Access rights to the Docker Hub repository

### Step 1: Update Version (If Necessary)

1. Open `package.json` and update the version number according to semantic versioning:

```bash
# Example: Change from 1.0.0 to 1.0.1 for a bug fix
sed -i '' 's/"version": "1.0.0"/"version": "1.0.1"/' package.json
```

### Step 2: Build the Docker Image

Build the image with the current version from package.json:

```bash
# Extract version from package.json
VERSION=$(grep -o '"version": "[^"]*' package.json | cut -d'"' -f4)

# Build the image with explicit architecture settings
# This uses the --platform flag AND the Dockerfile's platform directives
docker build --platform linux/amd64 -t cv-mcp:$VERSION -t cv-mcp:latest -t cv-mcp:$VERSION-amd64 .
```

### Step 3: Verify Image Architecture

Before testing, verify that the image has the correct architecture:

```bash
# Check the architecture of the built image
docker inspect cv-mcp:latest | grep Architecture
# Should explicitly show "amd64"

# For more detailed information
docker inspect cv-mcp:latest | grep -A 10 "Architecture\|Os"
```

### Step 4: Test the Docker Image Locally

Before pushing, verify that the image works correctly:

```bash
# Run the container
docker run -d -p 3001:3001 --name cv-mcp-test cv-mcp:latest

# Check if the container is running
docker ps

# Test the health endpoint
curl http://localhost:3001/health

# Check logs for any errors
docker logs cv-mcp-test

# Stop and remove the test container
docker stop cv-mcp-test
docker rm cv-mcp-test
```

### Step 4: Tag the Docker Image for Docker Hub

Tag the image with your Docker Hub username:

```bash
# Replace 'yourusername' with your Docker Hub username
DOCKER_USERNAME=yourusername
VERSION=$(grep -o '"version": "[^"]*' package.json | cut -d'"' -f4)

# Tag the image
docker tag cv-mcp:latest $DOCKER_USERNAME/cv-mcp:latest
docker tag cv-mcp:$VERSION $DOCKER_USERNAME/cv-mcp:$VERSION
docker tag cv-mcp:$VERSION-amd64 $DOCKER_USERNAME/cv-mcp:$VERSION-amd64

# Optional: Tag with git commit SHA for precise version tracking
GIT_SHA=$(git rev-parse --short HEAD)
docker tag cv-mcp:latest $DOCKER_USERNAME/cv-mcp:$GIT_SHA
```

### Step 5: Login to Docker Hub

```bash
docker login
# Enter your Docker Hub username and password when prompted
```

### Step 6: Push the Images to Docker Hub

```bash
DOCKER_USERNAME=yourusername
VERSION=$(grep -o '"version": "[^"]*' package.json | cut -d'"' -f4)

# Push the images
docker push $DOCKER_USERNAME/cv-mcp:latest
docker push $DOCKER_USERNAME/cv-mcp:$VERSION
docker push $DOCKER_USERNAME/cv-mcp:$VERSION-amd64

# Optional: Push the SHA-tagged image
GIT_SHA=$(git rev-parse --short HEAD)
docker push $DOCKER_USERNAME/cv-mcp:$GIT_SHA
```

## Updating on Synology NAS

> **IMPORTANT:** Synology NAS devices use x86_64/amd64 architecture. You **must** build Docker images with `--platform linux/amd64` flag when deploying to Synology systems, especially if building on ARM-based machines (like Apple Silicon Macs).

### Using Synology Docker UI

1. **Login to Synology DSM**:
   - Open a web browser and navigate to your Synology NAS web interface
   - Login with your admin credentials

2. **Open Docker Package**:
   - Go to the Package Center if Docker isn't already installed
   - Install Docker if not already installed
   - Open Docker from the main menu

3. **Stop the Existing Container**:
   - In the Container tab, select the running cv-mcp container
   - Click the Stop button

4. **Pull the New Image**:
   - Go to the Registry tab
   - Search for your repository: `yourusername/cv-mcp`
   - Click Download and select the `latest` tag (or specific version tag)
   - Wait for the download to complete

5. **Update the Container**:
   - Go back to the Container tab
   - Right-click on the stopped cv-mcp container
   - Select "Reset" (this keeps your configuration but uses the new image)
   - Alternatively, you can select "Clear" and recreate the container with the same settings

6. **Start the Container**:
   - Select the container and click the Start button

7. **Verify the Update**:
   - Check the container logs to ensure it started correctly
   - Test the health endpoint: `http://your-nas-ip:mapped-port/health`

### Using Synology SSH Terminal

If you prefer using the command line:

1. **SSH into your Synology NAS**:
   ```bash
   ssh admin@your-nas-ip
   ```

2. **Pull the latest image**:
   ```bash
   # Replace 'yourusername' with your Docker Hub username
   sudo docker pull yourusername/cv-mcp:latest
   ```

3. **Stop the existing container**:
   ```bash
   sudo docker stop cv-mcp-server
   ```

4. **Remove the existing container (keeping volume data)**:
   ```bash
   sudo docker rm cv-mcp-server
   ```

5. **Create a new container with the same settings**:
   ```bash
   sudo docker run -d \
     --name cv-mcp-server \
     --restart always \
     -p 3001:3001 \
     -v /path/on/nas/media:/usr/src/app/media \
     -e NODE_ENV=production \
     -e PORT=3001 \
     -e REQUEST_TIMEOUT=30000 \
     -e PING_INTERVAL=30000 \
     yourusername/cv-mcp:latest
   ```

6. **Verify the container is running**:
   ```bash
   sudo docker ps
   sudo docker logs cv-mcp-server
   ```

### Using Docker Compose on Synology

If your Synology setup uses Docker Compose:

1. **SSH into your Synology NAS**
2. **Navigate to your docker-compose.yml location**
3. **Update the image name in docker-compose.yml**:
   ```yaml
   image: yourusername/cv-mcp:latest
   ```
4. **Pull the latest image and recreate the container**:
   ```bash
   sudo docker-compose pull
   sudo docker-compose up -d
   ```

## Troubleshooting

### Architecture Compatibility Issues

The error `standard_init_linux.go:230: exec user process caused: exec format error` indicates an architecture mismatch that can occur for several reasons:

1. **Image built for wrong architecture**: The most common cause is building on ARM64 (Apple Silicon) without proper cross-platform settings.

2. **Multi-stage builds with mixed architectures**: If any stage in a multi-stage build uses the wrong architecture, the final image may fail.

3. **Architecture-specific binaries or packages**: Some packages or binaries installed during build may be architecture-dependent.

4. **Base image incompatibility**: The base image might not support proper cross-compilation for the target architecture.

#### Solutions:

1. **Update Dockerfile to explicitly specify architecture at each stage**:
   ```dockerfile
   FROM --platform=linux/amd64 base-image:tag
   # For multi-stage builds, specify for each FROM statement
   ```

2. **Verify architecture before pushing**:
   ```bash
   # Check architecture of the image
   docker inspect yourusername/cv-mcp:latest | grep Architecture

   # For more detailed information about platform
   docker inspect --format '{{.Os}}/{{.Architecture}}' yourusername/cv-mcp:latest

   # Check for any executable files architecture
   docker run --rm yourusername/cv-mcp:latest file /usr/bin/node
   docker run --rm yourusername/cv-mcp:latest file /root/.bun/bin/bun
   ```

3. **Rebuild with comprehensive architecture settings**:
   ```bash
   # On your development machine
   # Use buildx for better cross-platform support
   docker buildx create --use
   docker buildx build --platform linux/amd64 -t yourusername/cv-mcp:latest -t yourusername/cv-mcp:$VERSION -t yourusername/cv-mcp:$VERSION-amd64 --push .

   # Alternatively, use standard build
   docker build --platform linux/amd64 -t yourusername/cv-mcp:latest -t yourusername/cv-mcp:$VERSION -t yourusername/cv-mcp:$VERSION-amd64 .
   docker push yourusername/cv-mcp:latest
   docker push yourusername/cv-mcp:$VERSION
   docker push yourusername/cv-mcp:$VERSION-amd64
   ```

4. **Pull and run using architecture-specific tag on Synology**:
   ```bash
   # On Synology
   sudo docker pull yourusername/cv-mcp:$VERSION-amd64
   sudo docker tag yourusername/cv-mcp:$VERSION-amd64 yourusername/cv-mcp:latest
   ```
   Then run the container using this verified architecture-specific image.

### Image Pull Failures

If the Synology NAS fails to pull the new image:

1. **Check network connectivity**:
   ```bash
   ping hub.docker.com
   ```

2. **Verify Docker Hub credentials**:
   ```bash
   sudo docker login
   ```

3. **Try pulling with the full image path**:
   ```bash
   sudo docker pull registry.hub.docker.com/yourusername/cv-mcp:latest
   ```

### Container Start Failures

If the container fails to start after update:

1. **Check logs for errors**:
   ```bash
   sudo docker logs cv-mcp-server
   ```

2. **Verify port availability**:
   ```bash
   sudo netstat -tulpn | grep 3001
   ```

3. **Check file permissions** on mounted volumes:
   ```bash
   ls -la /path/on/nas/media
   ```

4. **Try running with interactive console** for debugging:
   ```bash
   sudo docker run -it --rm yourusername/cv-mcp:latest /bin/sh
   ```

### Health Check Failures

If the container starts but health checks fail:

1. **Check if the application is responding**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Verify environment variables** are correctly set:
   ```bash
   sudo docker inspect cv-mcp-server | grep -A 10 "Env"
   ```

3. **Check for resource constraints**:
    ```bash
    sudo docker stats cv-mcp-server
    ```

### Checking Node.js and Bun Architecture

If you suspect the architecture mismatch might be in specific binaries:

```bash
# Check Node.js architecture inside the container
docker run --rm yourusername/cv-mcp:latest node --print "process.arch"
# Should output "x64" for amd64 architecture

# Check system architecture inside the container
docker run --rm yourusername/cv-mcp:latest uname -m
# Should output "x86_64" for amd64 architecture

# Check if Bun is running with the correct architecture
docker run --rm yourusername/cv-mcp:latest /bin/sh -c "bun --version && echo 'Architecture:' && uname -m"
```
