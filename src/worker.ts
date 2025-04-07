// Import dependencies wrapped in try/catch to handle potential issues in Workers environment
let FastMCP: any;
let startServer: any;
let importError: Error | null = null;

try {
  // Try to dynamically import the necessary modules
  const fastMcpModule = await import("fastmcp");
  const serverModule = await import("./server/server.js");

  FastMCP = fastMcpModule.FastMCP;
  startServer = serverModule.default;
} catch (err) {
  console.error("Failed to import required modules:", err);
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
  // Ensure server is ready
  await ensureServerInitialized();

  // Setup SSE response headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Create a TransformStream for handling the SSE data
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Process the request through the MCP server
  // This is a simplified example - the actual implementation would
  // need to connect the request to the MCP server's logic

  // Send initial connection message
  const encoder = new TextEncoder();
  writer.write(encoder.encode("event: connected\ndata: {\"status\":\"connected\"}\n\n"));

  // Use the Worker's context to keep the connection alive
  return new Response(readable, { headers });
}

// Main Worker entry point
export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    try {
      // Handle SSE endpoint
      if (url.pathname === "/sse") {
        return handleSSE(request);
      }

      // Check if we have a critical import or initialization error
      if (importError) {
        console.log("Running in compatibility mode due to:", importError.message);

        if (request.headers.get("accept") === "text/event-stream") {
          return handleSSE(request);
        }

        return new Response(JSON.stringify({
          status: "limited",
          message: "Running in compatibility mode due to environment constraints",
          error: importError.message,
          url: request.url
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Try to initialize the server if possible
      try {
        await ensureServerInitialized();
      } catch (error) {
        console.error("Server initialization failed:", error);
        // Continue in compatibility mode
      }

      // Handle regular API requests - with or without full server functionality
      if (url.pathname.startsWith("/api")) {
        // Process the API request through MCP if needed
        return new Response(JSON.stringify({
          status: "success",
          message: "API endpoint",
          path: url.pathname
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Default response for other paths
      return new Response(JSON.stringify({
        status: "ok",
        message: "MCP Server Worker running",
        url: request.url
      }), {
        headers: { "Content-Type": "application/json" }
      });
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
