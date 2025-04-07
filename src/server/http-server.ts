// Patch the global scope to handle node:sqlite issue
// This needs to be at the top of the file to ensure it applies before any imports
if (typeof globalThis.require === 'undefined') {
  // In Cloudflare Workers environment, add a mock require function
  // that returns empty objects for node: modules
  // Use 'as any' to bypass TypeScript type checking for the global require function
  (globalThis as any).require = function mockRequire(moduleName: string) {
    if (moduleName === 'node:sqlite') {
      return { DatabaseSync: class {} };
    }
    // For other node: modules, return empty objects
    if (moduleName.startsWith('node:')) {
      return {};
    }
    throw new Error(`Cannot find module '${moduleName}'`);
  };
}

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

// Handle SSE connections with improved Cloudflare Workers compatibility
async function handleSSE(request: Request, ctx?: any) {
  console.log("SSE connection request received");

  // Check if this is an MCP Inspector proxy request
  const url = new URL(request.url);
  const transportType = url.searchParams.get('transportType');
  const proxyUrl = url.searchParams.get('url');

  if (proxyUrl || transportType) {
    console.log("MCP client detected:", transportType, proxyUrl);
  }

  // Setup SSE response headers with CORS support
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  });

  // Create a ReadableStream for more reliable SSE in Workers
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE events
      function sendEvent(eventName: string, data: any) {
        const event = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(event));
        console.log(`Sent event: ${eventName}`);
      }

      // Send immediate connected event
      sendEvent("connected", { status: "connected" });

      // Initialize server in background if possible
      let serverInfo: any = {
        name: "CV MCP Worker",
        version: "1.0.0",
        description: "Cloudflare Worker MCP Server",
        status: "connected"
      };

      // Try to initialize MCP server and get real tools/resources
      (async () => {
        try {
          const server = await ensureServerInitialized();
          if (server) {
            // Get actual server info if available
            const tools = server.getTools ? server.getTools() : [];
            const resources = server.getResources ? server.getResources() : [];

            serverInfo = {
              ...serverInfo,
              tools,
              resources
            };
          } else {
            // Fallback to minimal implementation
            serverInfo.tools = [
              {
                name: "hello",
                description: "Says hello",
                input_schema: {
                  type: "object",
                  properties: { name: { type: "string" } }
                }
              }
            ];
            serverInfo.resources = [];
          }

          // Send server info after a small delay
          setTimeout(() => {
            sendEvent("server_info", serverInfo);
          }, 100);

          // Set up heartbeat interval
          const interval = setInterval(() => {
            sendEvent("heartbeat", {
              timestamp: new Date().toISOString(),
              status: "ok"
            });
          }, 5000);

          // Clean up on stream close
          if (ctx) {
            ctx.waitUntil(new Promise(() => {
              // This promise intentionally never resolves to keep the connection
            }));
          }
        } catch (err) {
          console.error("Server initialization error:", err);
          // Still send server info even on error
          sendEvent("server_info", serverInfo);
        }
      })();
    }
  });

  // Return the readable stream with headers
  return new Response(stream, { headers });
}

// Export the worker functionality
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      const url = new URL(request.url);

      console.log(`Request: ${request.method} ${url.pathname}`);

      // Handle preflight CORS requests for all endpoints
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400"
          }
        });
      }

      // Handle SSE endpoint
      if (url.pathname === "/sse") {
        return handleSSE(request, ctx);
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
        } catch (error: any) {
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

      // Handle tool endpoints
      if (url.pathname === "/tool" || url.pathname.startsWith("/tools/")) {
        const headers = new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        });

        if (request.method !== "POST") {
          return new Response(JSON.stringify({
            status: "error",
            message: "Tool requests must use POST method"
          }), {
            status: 405,
            headers
          });
        }

        try {
          // Parse the request body
          const body = await request.json();

          // Extract tool name
          let toolName = "unknown";
          let toolArgs: Record<string, any> = {};

          if (url.pathname.startsWith("/tools/")) {
            toolName = url.pathname.split("/").pop() || "unknown";
            toolArgs = body.arguments || body || {};
          } else if (body.tool) {
            toolName = body.tool;
            toolArgs = body.arguments || {};
          }

          console.log(`Processing tool request: ${toolName}`);

          // Try to invoke the actual MCP server if available
          const mcpServer = await ensureServerInitialized();
          if (mcpServer && mcpServer.executeTool) {
            const result = await mcpServer.executeTool(toolName, toolArgs);
            return new Response(JSON.stringify({
              status: "success",
              result
            }), { headers });
          }

          // Fallback implementation for the hello tool
          if (toolName === "hello") {
            const name = toolArgs.name || "World";
            return new Response(JSON.stringify({
              status: "success",
              result: `Hello, ${name}!`
            }), { headers });
          }

          // Unknown tool
          return new Response(JSON.stringify({
            status: "error",
            message: `Unknown tool: ${toolName}`
          }), {
            status: 404,
            headers
          });
        } catch (error: any) {
          return new Response(JSON.stringify({
            status: "error",
            message: "Error processing tool request",
            details: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers
          });
        }
      }

      // Default response for unsupported paths
      return new Response(JSON.stringify({
        status: "not_found",
        message: `Endpoint not found: ${url.pathname}`
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error: any) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : String(error)
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
