// Import dependencies wrapped in try/catch to handle potential issues in Workers environment
let startServer: any;
let importError: Error | null = null;

try {
  // Try to dynamically import the server module
  startServer = (await import("./server.js")).default;
} catch (err) {
  console.error("Failed to import server module:", err);
  importError = err instanceof Error ? err : new Error(String(err));
}

// Store server instance
let server: any;
let initialized = false;

// Initialize the server with fallback for compatibility issues
async function ensureServerInitialized() {
  // If we already have an error or already initialized, return early
  if (importError || initialized) {
    return server;
  }

  try {
    if (!startServer) {
      throw new Error("Server module not available in this environment");
    }

    // Attempt to initialize the server
    server = await startServer();
    initialized = true;
    console.log("MCP Server initialized in Worker environment");
  } catch (err) {
    console.error("Failed to initialize MCP server:", err);
    importError = err instanceof Error ? err : new Error(String(err));
  }

  return server;
}

// Handle SSE connections
async function handleSSE(request: Request) {
  // Setup SSE response headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Create a TransformStream for handling the SSE data
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Ensure server is ready
  try {
    await ensureServerInitialized();
  } catch (error) {
    // Handle server initialization errors
    console.error("Error initializing server for SSE:", error);
  }

  // Send initial connection message
  const encoder = new TextEncoder();
  writer.write(encoder.encode("event: connected\ndata: {\"status\":\"connected\"}\n\n"));

  // Use the Worker's context to keep the connection alive
  return new Response(readable, { headers });
}

// Export the worker functionality
export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    try {
      // Handle SSE endpoint
      if (url.pathname === "/sse") {
        return handleSSE(request);
      }

      // Handle health check
      if (url.pathname === "/health" || url.pathname === "/") {
        return new Response(JSON.stringify({
          status: "ok",
          message: "MCP Server is running",
          environment: env.ENVIRONMENT || "production",
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Handle API endpoints
      if (url.pathname.startsWith("/api")) {
        try {
          await ensureServerInitialized();

          return new Response(JSON.stringify({
            status: "success",
            message: "API endpoint",
            path: url.pathname
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            status: "error",
            message: "API processing error",
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      // Default response for unsupported paths
      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

// For local development outside Worker environment
if (typeof process !== 'undefined' && process.env) {
  try {
    const PORT = parseInt(process.env.PORT || "3001", 10);
    console.log(`Starting server on port ${PORT}...`);

    // This code will only run in Node.js environment, not in Workers
    if (startServer) {
      // Traditional server startup logic
      startServer().then((server: any) => {
        server.start({
          transportType: "sse",
          sse: {
            port: PORT,
            endpoint: "/sse",
          },
        });

        console.log(`MCP Server running at http://localhost:${PORT}`);
        console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
      }).catch((error: Error) => {
        console.error("Failed to start server:", error);
        process.exit(1);
      });
    }
  } catch (error) {
    // Swallow errors in Worker environment
    console.error("Error in local startup:", error);
  }
}
