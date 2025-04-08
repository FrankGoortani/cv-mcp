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

// Initialize the server with FastMCP configuration
async function ensureServerInitialized(transportType = 'sse', url?: string) {
  // If we've already encountered an import error, return early
  if (importError) {
    return null;
  }

  // If server is already initialized, return the instance
  if (initialized && server) {
    return server;
  }

  try {
    if (!startServer) {
      throw new Error("Server module not available in this environment");
    }

    // Attempt to initialize the server
    server = await startServer();

    // Configure the server with proper transport
    if (server && !initialized) {
      console.log(`Configuring MCP server with transportType=${transportType}`);
      // We'll complete the actual start in the handleSSE function
      initialized = true;
    }

    console.log("MCP Server initialized in Worker environment");
  } catch (err) {
    console.error("Failed to initialize MCP server:", err);
    importError = err instanceof Error ? err : new Error(String(err));
    return null;
  }

  return server;
}

// Handle SSE connections using FastMCP's native SSE transport
async function handleSSE(request: Request, ctx?: any) {
  // Parse client connection parameters
  const url = new URL(request.url);
  // Convert null to undefined or use default 'sse'
  const transportType = url.searchParams.get('transportType') === null
    ? 'sse'
    : url.searchParams.get('transportType');
  // Convert null to undefined
  const proxyUrl = url.searchParams.get('url') || undefined;

  console.log(`SSE request: transportType=${transportType}, proxyUrl=${proxyUrl}`);

  // Initialize the MCP server with the correct transport parameters
  const mcpServer = await ensureServerInitialized(
    transportType as string,  // TypeScript cast since we ensure it's not null above
    proxyUrl
  );

  if (!mcpServer) {
    // If server initialization failed, return error response
    return new Response(JSON.stringify({
      error: "Failed to initialize MCP server",
      details: importError ? importError.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    // Use FastMCP's native SSE handler
    // First check if the server has a handleSSERequest method (from FastMCP)
    if (typeof mcpServer.handleSSERequest === 'function') {
      // Use FastMCP's native SSE handler
      console.log("Using FastMCP native SSE handler");
      const response = await mcpServer.handleSSERequest(request);
      return response;
    } else {
      // Fallback to manual SSE implementation for compatibility
      console.log("Falling back to manual SSE implementation");

      // Setup SSE response headers with CORS support
      const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      });

      // Create a simple response with pre-generated SSE data using proper MCP format
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Get server info directly from the MCP server
      // Construct a standard MCP-compliant server_info object
      const serverInfo = {
        name: mcpServer.name || "Frank Goortani CV MCP Server",
        version: mcpServer.version || "1.0.0",
        description: "Cloudflare Worker MCP Server for Frank Goortani's CV",
        tools: Array.isArray(mcpServer.tools) ? mcpServer.tools : [],
        resources: Array.isArray(mcpServer.resources) ? mcpServer.resources : [],
        protocol: {
          version: "0.1.0"
        }
      };

      // Log the server info being sent (helpful for debugging)
      console.log("Sending server_info event with:",
        `tools: ${serverInfo.tools.length}, `,
        `resources: ${serverInfo.resources.length}`);

      // Write MCP-compliant events
      writer.write(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected" })}\n\n`));
      writer.write(encoder.encode(`event: server_info\ndata: ${JSON.stringify(serverInfo)}\n\n`));

      // Set up heartbeat in the background
      if (ctx) {
        ctx.waitUntil((async () => {
          try {
            let connected = true;
            const heartbeatInterval = setInterval(() => {
              if (!connected) {
                clearInterval(heartbeatInterval);
                return;
              }

              try {
                const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({
                  timestamp: new Date().toISOString()
                })}\n\n`;

                writer.write(encoder.encode(heartbeat))
                  .catch(err => {
                    console.log("Heartbeat failed, connection likely closed:", err);
                    connected = false;
                    clearInterval(heartbeatInterval);
                  });
              } catch (err) {
                console.log("Error sending heartbeat:", err);
                connected = false;
                clearInterval(heartbeatInterval);
              }
            }, 10000);
          } catch (err) {
            console.error("Error in SSE background tasks:", err);
          }
        })());
      }

      // Return the readable part of the transform stream with headers
      return new Response(readable, { headers });
    }
  } catch (error) {
    console.error("Error handling SSE request:", error);
    return new Response(JSON.stringify({
      error: "Failed to handle SSE request",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
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

      // Initialize server early at worker start
      if (!initialized) {
        await ensureServerInitialized();
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
          // Server should already be initialized, but ensure it is
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

          // Server should already be initialized, but ensure it is
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
        // Configure with explicit SSE transport settings for local development
        server.start({
          transportType: "sse",
          sse: {
            port: PORT,
            endpoint: "/sse",
          },
        });

        console.log(`MCP Server running at http://localhost:${PORT}`);
        console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
        console.log(`Try it with: npx @modelcontextprotocol/inspector http://localhost:${PORT}/sse`);
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
