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

// Implement ping mechanism with error handling and anti-crash safeguards
const startPingMechanism = (serverInstance: any) => {
  const pingInterval = parseInt(process.env.PING_INTERVAL || "60000", 10); // 60 seconds between pings

  // Create a custom ping implementation if one doesn't exist
  const safePingServer = async () => {
    // Wrap ping in a try-catch to prevent any errors from escaping
    try {
      // Check if the server has a native ping method
      if (typeof serverInstance.ping === 'function') {
        // This is the key problematic area - wrap the server.ping() call
        // in a custom try-catch to prevent error propagation
        try {
          return await serverInstance.ping();
        } catch (pingError) {
          // CRITICAL FIX: Capture and handle the ping error here
          // instead of letting it bubble up and potentially crash the container
          console.warn(`Server ping method threw an error: ${
            pingError instanceof Error ? pingError.message : String(pingError)
          }`);

          // Check for the specific MCP timeout error that's causing the crashes
          const isMcpTimeoutError =
            (pingError as any)?.code === -32001 ||
            (pingError as any)?.error?.code === -32001;

          if (isMcpTimeoutError) {
            console.warn("MCP timeout error detected in ping operation");
          }

          // Return false to indicate ping failure but don't throw
          return false;
        }
      }

      // Custom ping implementation using server's health check or status
      // This is a fallback mechanism when the server doesn't provide a ping method
      if (serverInstance.isRunning && typeof serverInstance.isRunning === 'function') {
        return await serverInstance.isRunning();
      }

      // If no built-in health check, just return success if server exists and has expected properties
      if (serverInstance && serverInstance.start) {
        return true; // Server instance exists and seems valid
      }

      // Return false as a last resort instead of throwing
      return false;
    } catch (error) {
      // Catch any errors that might occur in our own code above
      console.error(`Error in ping wrapper: ${error instanceof Error ? error.message : String(error)}`);
      return false; // Don't throw, just indicate failure
    }
  };

  // Initialize backoff mechanism state variables
  let currentPingDelay = pingInterval;
  const MAX_PING_DELAY = pingInterval * 5; // Maximum delay between pings
  const BACKOFF_FACTOR = 1.5; // Backoff factor for exponential delay
  const RECOVERY_THRESHOLD = 3; // Successful pings before resetting delay
  let successfulPingsCount = 0;
  let failedPingsCount = 0;
  let pingTimerRef: NodeJS.Timeout | null = null;

  // Define the ping function that will be used by the interval
  const performPing = async () => {
    try {
      // Send ping to check server health with an extended timeout
      // We're using our safePingServer instead of directly calling server.ping()
      const pingResult = await Promise.race([
        safePingServer(),
        new Promise<boolean>((resolve, reject) => {
          // Use resolve(false) instead of reject to avoid throwing exceptions
          setTimeout(() => resolve(false), 10000); // Extended timeout for ping
        })
      ]);

      // If ping was successful (true)
      if (pingResult === true) {
        console.log(`Ping successful: ${new Date().toISOString()}`);

        // Track successful pings for recovery
        successfulPingsCount++;
        failedPingsCount = 0;

        // Reset ping delay after sufficient successful pings
        if (successfulPingsCount >= RECOVERY_THRESHOLD && currentPingDelay !== pingInterval) {
          console.log("Ping stability restored, resetting ping interval");
          currentPingDelay = pingInterval;

          // Reconfigure the ping timer with original interval
          if (pingTimerRef) {
            clearInterval(pingTimerRef);
            pingTimerRef = setInterval(performPing, pingInterval);
          }
        }
      } else {
        // Handle ping failure without throwing an exception
        console.warn(`Ping failed: ${new Date().toISOString()}`);

        // Track consecutive failures
        failedPingsCount++;
        successfulPingsCount = 0;

        // Apply exponential backoff for repeated failures
        if (failedPingsCount > 1 && currentPingDelay < MAX_PING_DELAY) {
          const newDelay = Math.min(currentPingDelay * BACKOFF_FACTOR, MAX_PING_DELAY);
          console.log(`Increasing ping interval from ${currentPingDelay}ms to ${newDelay}ms due to repeated failures`);
          currentPingDelay = newDelay;

          // Reconfigure the ping timer with longer interval
          if (pingTimerRef) {
            clearInterval(pingTimerRef);
            pingTimerRef = setInterval(performPing, currentPingDelay);
          }
        }

        // Attempt recovery if ping fails - without emitting any events that could crash the server
        try {
          console.log("Attempting server recovery...");

          // Recovery strategy for timeouts:
          // 1. Try to refresh connections if possible
          if (typeof serverInstance.refreshConnections === 'function') {
            await serverInstance.refreshConnections();
          }

          // 2. Check if server is still responsive through alternative means
          if (typeof serverInstance.isRunning === 'function') {
            try {
              const isRunning = await serverInstance.isRunning();
              if (!isRunning) {
                console.log("Server appears to be down, will continue monitoring...");
                // We don't restart here to avoid disrupting existing connections
                // The next ping will attempt recovery again if needed
              }
            } catch (checkError) {
              console.warn("Failed to check if server is running:", checkError);
              // Don't propagate this error, just log it
            }
          }

          // 3. For general non-timeout errors, perform a more general health check
          if (typeof serverInstance.healthCheck === 'function') {
            try {
              await serverInstance.healthCheck({ repair: true });
            } catch (healthCheckError) {
              console.warn("Health check failed:", healthCheckError);
              // Don't propagate this error, just log it
            }
          }
        } catch (recoveryError) {
          // IMPORTANT: Never emit any error events from here that could crash the container
          console.error("Recovery attempt failed:", recoveryError);
          // Log detailed error but continue execution, don't crash
          console.debug("Recovery error details:", {
            name: recoveryError instanceof Error ? recoveryError.name : 'Unknown',
            message: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
            stack: recoveryError instanceof Error && process.env.NODE_ENV === 'development'
              ? recoveryError.stack
              : undefined
          });
        }
      }
    } catch (finalError) {
      // This is the last-resort catch - we should never reach this if our error handling is robust
      console.error(`CRITICAL: Uncaught error in ping mechanism: ${
        finalError instanceof Error ? finalError.message : String(finalError)
      }`);

      // Absolute last defense - log but don't let the error propagate up
      console.debug("Error details:", {
        name: finalError instanceof Error ? finalError.name : 'Unknown',
        stack: finalError instanceof Error ? finalError.stack : undefined
      });

      // Don't emit any error events here!
    }
  };

  // Start the ping interval with the initial delay
  pingTimerRef = setInterval(performPing, currentPingDelay);

  // Save reference to allow cleanup
  return pingTimerRef;
};
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
  let pingTimer: NodeJS.Timeout | null = null;

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

      // Start ping mechanism with enhanced error handling
      pingTimer = startPingMechanism(server);

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

  return { server, pingTimer };
};

// Start the server with retry logic
startWithRetry().catch((error: Error) => {
  console.error("Critical error in server startup:", error);
  process.exit(1);
});
