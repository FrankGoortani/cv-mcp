#!/bin/bash
# Build and Deploy Script for CV-MCP Docker Image
# This script builds the Docker image for amd64 architecture,
# verifies it, and pushes it to Docker Hub for Synology NAS deployment

set -e  # Exit on any error

# Configuration - modify these variables
DOCKER_USERNAME="frankgoortani"  # Docker Hub username
VERIFY_BEFORE_PUSH=true         # Set to false to skip verification

# Extract version from package.json
VERSION=$(grep -o '"version": "[^"]*' package.json | cut -d'"' -f4)
echo "📦 Building CV-MCP version $VERSION for amd64 architecture"

# Step 1: Ensure Docker buildx is set up for multi-architecture builds
echo "🔧 Setting up Docker buildx..."
docker buildx inspect --bootstrap 2>/dev/null || docker buildx create --use

# Step 2: Build the Docker image with explicit amd64 platform
echo "🏗️ Building Docker image for amd64 architecture..."
docker build --platform linux/amd64 \
  -t cv-mcp:$VERSION \
  -t cv-mcp:latest \
  -t cv-mcp:$VERSION-amd64 \
  -t cv-mcp:latest-amd64 \
  -t $DOCKER_USERNAME/cv-mcp:$VERSION \
  -t $DOCKER_USERNAME/cv-mcp:latest \
  -t $DOCKER_USERNAME/cv-mcp:$VERSION-amd64 \
  -t $DOCKER_USERNAME/cv-mcp:latest-amd64 \
  .

# Step 3: Verify the image architecture
echo "🔍 Verifying image architecture..."
ARCH=$(docker inspect cv-mcp:latest | grep Architecture | head -1)
echo "Image architecture: $ARCH"

if [[ "$ARCH" != *"amd64"* ]]; then
  echo "⚠️ WARNING: Image architecture doesn't appear to be amd64!"
  echo "This may cause 'exec format error' when running on Synology NAS."

  if [ "$VERIFY_BEFORE_PUSH" = true ]; then
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "🛑 Aborting deployment."
      exit 1
    fi
  fi
fi

# Step 4: Additional architecture verification
echo "🧪 Running additional architecture tests..."

echo "Testing Node.js architecture:"
docker run --rm cv-mcp:latest node --print "process.arch" || echo "Unable to verify Node.js architecture"

echo "Testing system architecture:"
docker run --rm cv-mcp:latest uname -m || echo "Unable to verify system architecture"

echo "Testing Bun installation:"
docker run --rm cv-mcp:latest /bin/sh -c "which bun && bun --version" || echo "Unable to verify Bun installation"

# Step 5: Test the image locally
echo "🧪 Testing the image locally..."
docker run -d --name cv-mcp-test -p 3001:3001 cv-mcp:latest
echo "Waiting for container to initialize..."
sleep 5

# Check container is running
CONTAINER_STATUS=$(docker ps -f name=cv-mcp-test --format "{{.Status}}")
if [[ -z "$CONTAINER_STATUS" ]]; then
  echo "❌ Container failed to start! Checking logs:"
  docker logs cv-mcp-test
  docker rm -f cv-mcp-test 2>/dev/null || true

  if [ "$VERIFY_BEFORE_PUSH" = true ]; then
    read -p "Continue with push anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "🛑 Aborting deployment."
      exit 1
    fi
  fi
else
  echo "✅ Container is running: $CONTAINER_STATUS"

  # Test health endpoint
  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "failed")
  if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Health check successful!"
  else
    echo "⚠️ Health check returned status: $HEALTH_STATUS"
    echo "Container logs:"
    docker logs cv-mcp-test

    if [ "$VERIFY_BEFORE_PUSH" = true ]; then
      read -p "Continue with push anyway? (y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 Aborting deployment."
        docker rm -f cv-mcp-test 2>/dev/null || true
        exit 1
      fi
    fi
  fi

  # Clean up test container
  echo "🧹 Cleaning up test container..."
  docker rm -f cv-mcp-test
fi

# Step 6: Log in to Docker Hub
echo "🔑 Logging in to Docker Hub..."
if ! docker login; then
  echo "❌ Failed to log in to Docker Hub."
  exit 1
fi

# Step 7: Push images to Docker Hub
echo "🚀 Pushing images to Docker Hub..."
docker push $DOCKER_USERNAME/cv-mcp:$VERSION
docker push $DOCKER_USERNAME/cv-mcp:latest
docker push $DOCKER_USERNAME/cv-mcp:$VERSION-amd64
docker push $DOCKER_USERNAME/cv-mcp:latest-amd64

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "To deploy to your Synology NAS, use these commands:"
echo "----------------------------------------------------"
echo "# Via SSH on your Synology NAS:"
echo "ssh admin@your-nas-ip"
echo "sudo docker pull $DOCKER_USERNAME/cv-mcp:$VERSION-amd64"
echo "sudo docker stop cv-mcp-server || true"
echo "sudo docker rm cv-mcp-server || true"
echo "sudo docker run -d \\"
echo "  --name cv-mcp-server \\"
echo "  --restart always \\"
echo "  -p 3001:3001 \\"
echo "  -v /path/on/nas/media:/usr/src/app/media \\"
echo "  -e NODE_ENV=production \\"
echo "  -e PORT=3001 \\"
echo "  -e REQUEST_TIMEOUT=30000 \\"
echo "  -e PING_INTERVAL=30000 \\"
echo "  $DOCKER_USERNAME/cv-mcp:$VERSION-amd64"
echo ""
echo "# Or via Docker Compose on your Synology NAS:"
echo "Update your docker-compose.yml on the NAS with:"
echo "image: $DOCKER_USERNAME/cv-mcp:$VERSION-amd64"
echo "Then run: sudo docker-compose up -d"
echo "----------------------------------------------------"
