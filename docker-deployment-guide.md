# Docker Deployment Guide for CV-MCP Server

This guide provides step-by-step instructions for building, tagging, and pushing the CV-MCP Docker image to Docker Hub, as well as updating the container on a Synology NAS.

## Table of Contents

- [Version Management Strategy](#version-management-strategy)
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

# Build the image
docker build -t cv-mcp:$VERSION -t cv-mcp:latest .
```

### Step 3: Test the Docker Image Locally

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

# Optional: Push the SHA-tagged image
GIT_SHA=$(git rev-parse --short HEAD)
docker push $DOCKER_USERNAME/cv-mcp:$GIT_SHA
```

## Updating on Synology NAS

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
