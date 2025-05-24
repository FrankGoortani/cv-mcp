import startServer from "./server.js";

import { createServer } from "http";
import { Socket } from "net";

// Define the port for the server
let PORT = parseInt(process.env.PORT || "3001", 10);
const MAX_PORT_ATTEMPTS = 10; // Maximum number of ports to try if default is taken
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || "120000", 10); // 120 seconds default timeout

// Check if a port is available
const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise(resolve => {
    const socket = new Socket();

    // If we can connect, the port is in use
    socket.once('connect', () => {
      socket.destroy();
      resolve(false);
    });

    // If we can't connect, the port is available
    socket.once('error', (err: any) => {
      socket.destroy();
      // ECONNREFUSED means port is available (nothing listening)
      if (err.code === 'ECONNREFUSED') {
        resolve(true);
      } else {
        // Other errors might indicate port is restricted or unavailable
        resolve(false);
      }
    });

    socket.connect(port, '127.0.0.1');

    // Set a timeout in case the connection attempt hangs
    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 1000);
  });
};

// Find an available port starting from the default
const findAvailablePort = async (startPort: number, maxAttempts: number): Promise<number> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} is in use, trying next port...`);
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
};

// Initialize with port check
const initializePort = async () => {
  try {
    PORT = await findAvailablePort(PORT, MAX_PORT_ATTEMPTS);
    console.log(`Starting server on port ${PORT} with ${REQUEST_TIMEOUT}ms request timeout...`);
    return PORT;
  } catch (error) {
    console.error("Failed to find available port:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
let server: any = null;
let isShuttingDown = false;

const handleShutdown = async () => {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log("Gracefully shutting down...");

  if (server) {
    try {
      // Attempt to close the server gracefully
      await server.stop();
      console.log("Server stopped successfully");
    } catch (error) {
      console.error("Error while stopping server:", error);
    }
  }

  // Allow pending operations to complete (max 5 seconds)
  setTimeout(() => {
    console.log("Shutdown complete");
    process.exit(0);
  }, 5000);
};

// Register signal handlers for graceful shutdown
process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

// Function to set up timeout handling for requests
const configureTimeouts = (serverInstance: any) => {
  try {
    // Check if setTimeout method exists before using it
    if (typeof serverInstance.setTimeout === 'function') {
      serverInstance.setTimeout(REQUEST_TIMEOUT);
    } else if (serverInstance.config && typeof serverInstance.config.setTimeout === 'function') {
      serverInstance.config.setTimeout(REQUEST_TIMEOUT);
    } else {
      // Store timeout value as a property if method doesn't exist
      serverInstance.requestTimeout = REQUEST_TIMEOUT;
      console.log("Native timeout configuration not available, using fallback mechanism");
    }

    console.log(`Configured request timeout: ${REQUEST_TIMEOUT}ms`);
  } catch (error) {
    console.warn(`Failed to configure timeout, using default: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Initialize port before starting
await initializePort();

// Start the MCP server with enhanced error handling
const startWithRetry = async (maxRetries = 5, retryDelay = 5000) => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      server = await startServer();

      // Configure server with enhanced settings and error handling
      try {
        // Create the server URL with explicit HTTP protocol
        const serverUrl = `http://localhost:${PORT}`;
        const sseEndpoint = `${serverUrl}/sse`;

        // Make the URL accessible to the server instance for clients
        server.publicUrl = serverUrl;
        server.sseEndpoint = sseEndpoint;

        // Start the server with explicit HTTP protocol configuration
        server.start({
          transportType: "sse",
          sse: {
            port: PORT,
            endpoint: "/sse", // Standard endpoint for SSE connections
            // Explicitly set protocol to HTTP to avoid HTTPS mismatch
            protocol: "http",
            // Force the full URL to be HTTP to prevent clients from defaulting to HTTPS
            url: sseEndpoint,
            // Add timeout handling
            requestTimeout: REQUEST_TIMEOUT,
            // Add connection retry logic
            reconnectInterval: 3000, // milliseconds
            maxReconnectAttempts: 10,
            // Add error handling for SSE endpoint
            onError: (err: Error) => {
              console.error("SSE connection error:", err.message);
              // Log detailed error info but don't expose sensitive info
              console.debug("Error details:", {
                name: err.name,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
              });
            },
            // Recovery handler for SSE connections
            onConnectionLost: () => {
              console.warn("SSE connection lost, attempting to recover...");
              // Could implement additional recovery logic here
            }
          },
        });
      } catch (startError) {
        console.error("Failed to start server with SSE transport:", startError);
        throw startError; // Rethrow to trigger retry logic
      }

      // Configure timeouts
      configureTimeouts(server);

      // Add enhanced error event handler to catch and handle timeout errors
      server.on('error', (err: any) => {
        // Improved detection of timeout errors - check all possible paths
        const isMcpTimeoutError =
          (err.code === -32001) ||
          (err.error?.code === -32001) ||
          (err.data?.code === -32001);

        if (isMcpTimeoutError) {
          // Extract timeout data for logging
          const timeoutData =
            err.data?.timeout ||
            err.error?.data?.timeout ||
            REQUEST_TIMEOUT;

          console.warn(`Request timeout occurred (${timeoutData}ms): ${JSON.stringify(err.error?.data || err.data || {})}`);

          // Log the request that timed out if available
          if (err.error?.data?.request || err.data?.request) {
            console.debug("Timed out request:", err.error?.data?.request || err.data?.request);
          }

          // Implement recovery for timeout:
          // 1. Clear any stuck handlers or callbacks if possible
          if (server.clearPendingRequests && typeof server.clearPendingRequests === 'function') {
            try {
              server.clearPendingRequests(err.error?.data?.requestId || err.data?.requestId);
            } catch (clearError) {
              console.debug("Failed to clear pending requests:", clearError);
            }
          }

          // 2. Notify any error observers without crashing
          if (server.notifyTimeoutError && typeof server.notifyTimeoutError === 'function') {
            try {
              server.notifyTimeoutError(err);
            } catch (notifyError) {
              console.debug("Failed to notify timeout:", notifyError);
            }
          }

          return; // Prevent error propagation
        }

        // Special handling for connection errors
        if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
          console.warn(`Connection error (${err.code}): Client likely disconnected unexpectedly`);
          return; // Prevent error propagation
        }

        // For other errors, log them but don't crash
        console.error('Server error:', err);

        // Log additional debug info in development
        if (process.env.NODE_ENV === 'development') {
          console.debug('Error details:', {
            code: err.code,
            name: err.name,
            stack: err.stack,
            message: err.message,
            error: err.error
          });
        }
      });

      // Add global unhandled error handler to prevent crashes
      process.on('uncaughtException', (error: Error) => {
        // Check if it's a timeout error we should handle gracefully
        const errorStr = error.toString();
        if (
          error.name === 'McpError' &&
          errorStr.includes('-32001') &&
          errorStr.includes('timeout')
        ) {
          console.warn('Caught unhandled MCP timeout error:', error.message);
          // Log but don't crash the process
          return;
        }

        // For other errors, log them
        console.error('Unhandled exception:', error);

        // Only exit for truly fatal errors
        if (
          error.name === 'SystemError' ||
          error.name === 'FatalError' ||
          errorStr.includes('FATAL')
        ) {
          console.error('Fatal error detected, exiting process');
          process.exit(1);
        }
      });


      // Force the URL to use HTTP protocol to prevent client from defaulting to HTTPS
      const serverUrl = `http://localhost:${PORT}`;
      const sseEndpoint = `${serverUrl}/sse`;

      // Store the URL in the server instance for clients to access
      server.baseUrl = serverUrl;
      server.sseUrl = sseEndpoint;

      console.log(`MCP Server running at ${serverUrl}`);
      console.log(`SSE endpoint: ${sseEndpoint}`);
      console.log(`Health check: ${serverUrl}/health`);
      console.log(`Use Inspector: npx @modelcontextprotocol/inspector ${sseEndpoint}`);
      console.log(`IMPORTANT: Use HTTP protocol (not HTTPS) when connecting to this server`);
      console.log(`\x1b[33mWARNING: If you see SSL protocol errors, ensure you're connecting with HTTP, not HTTPS\x1b[0m`);

      // Server started successfully
      break;
    } catch (error: any) {
      retries++;
      console.error(`Failed to start MCP server (attempt ${retries}/${maxRetries}):`,
        error instanceof Error ? error.message : String(error));

      // Handle specific network errors
      if (error.code === 'EADDRINUSE') {
        console.log("Address in use error - finding another port...");
        try {
          PORT = await findAvailablePort(PORT + 1, MAX_PORT_ATTEMPTS);
          console.log(`Retrying immediately with new port: ${PORT}`);
          continue; // Retry immediately with new port
        } catch (portError) {
          console.error("Failed to find available port:", portError);
        }
      }

      if (retries >= maxRetries) {
        console.error("Maximum retry attempts reached. Exiting...");
        process.exit(1);
      }

      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  return { server };
};

// Start the server with retry logic
startWithRetry().catch((error: Error) => {
  console.error("Critical error in server startup:", error);
  process.exit(1);
});
