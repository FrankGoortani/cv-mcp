# Testing Guide for MCP Server and Docker Container Fixes

This guide outlines steps to test the implemented fixes for the MCP server errors and Docker container restart issues.

## 1. Testing MCP Server Error Handling

### Test Ping Mechanism
1. Start the server locally:
   ```bash
   bun run src/server/http-server.ts
   ```
2. Look for log messages indicating successful pings (they should appear every 30 seconds)
3. Simulate a network disruption to test recovery:
   ```bash
   # For example, temporarily block the port using iptables (Linux) or pfctl (macOS)
   # Then restore connectivity and observe recovery logs
   ```

### Test Timeout Handling
1. Connect to the server using the MCP Inspector:
   ```bash
   npx @modelcontextprotocol/inspector http://localhost:3001/sse
   ```
2. Send a request that would take longer than the configured timeout and observe the behavior

### Test Retry Logic
1. Start the server with a service it depends on (like a database) stopped
2. Observe retry attempts in the logs
3. Start the dependent service and verify the server connects successfully

## 2. Testing Docker Container Configuration

### Test Health Check
1. Build and run the Docker container:
   ```bash
   docker compose up -d
   ```
2. Check the health status:
   ```bash
   docker ps  # Should show "healthy" after the initial start period
   ```
3. Simulate a health check failure:
   ```bash
   # Temporarily block the health check endpoint
   docker exec cv-mcp-server sh -c "echo '127.0.0.1 localhost' > /etc/hosts"
   # Observe container restarts
   docker logs cv-mcp-server
   ```

### Test Restart Policy
1. Force the container to exit:
   ```bash
   docker exec cv-mcp-server kill 1
   ```
2. Verify that Docker automatically restarts the container:
   ```bash
   docker ps  # Should show the container running with increased restart count
   ```

### Test Graceful Shutdown
1. Send a SIGTERM signal to the container:
   ```bash
   docker stop cv-mcp-server
   ```
2. Check logs to verify graceful shutdown:
   ```bash
   docker logs cv-mcp-server  # Should show "Gracefully shutting down..." and "Shutdown complete"
   ```

## 3. Building and Pushing Docker Image

### Build the Docker Image
```bash
docker build -t cv-mcp:latest .
```

### Test the Built Image
```bash
docker run -p 3001:3001 cv-mcp:latest
```

### Tag the Image for Registry
```bash
docker tag cv-mcp:latest your-registry.example.com/cv-mcp:latest
```

### Push to Registry
```bash
docker push your-registry.example.com/cv-mcp:latest
```

## 4. Deploying with Docker Compose

### Start the Service
```bash
docker compose up -d
```

### Monitor the Service
```bash
docker compose logs -f
```

### Shut Down the Service
```bash
docker compose down
