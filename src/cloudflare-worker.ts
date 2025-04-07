// MCP Server implementation for Cloudflare Workers

// Define types for Cloudflare Workers runtime
export interface Env {
  ENVIRONMENT: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// Handler for all requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Log basic request info for debugging
      console.log(`Request: ${request.method} ${url.pathname}`);
      console.log(`Query params:`, Object.fromEntries(url.searchParams.entries()));

      // Handle CORS preflight requests globally
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

      // Health check endpoint
      if (url.pathname === "/" || url.pathname === "/health") {
        return new Response(JSON.stringify({
          status: "ok",
          message: "MCP Server is running",
          environment: env.ENVIRONMENT || "production"
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // SSE endpoint - Direct or via proxy
      if (url.pathname === "/sse") {
        // CRITICAL: Handle special case for MCP Inspector proxy
        const proxyTarget = url.searchParams.get('url');
        if (proxyTarget) {
          console.log("Proxy request detected, target:", proxyTarget);

          // This is a proxy request, we need to strip out the "url" param
          // and pass the request through as-is, since browsers are making
          // the connection to the proxy, not directly to our worker
          return handleSSEConnection(request, env, ctx);
        }

        return handleSSEConnection(request, env, ctx);
      }

      // Tool endpoint
      if (url.pathname === "/tool" || url.pathname.startsWith("/tools/")) {
        return handleToolRequest(request, url);
      }

      // API endpoints
      if (url.pathname.startsWith("/api")) {
        return new Response(JSON.stringify({
          status: "success",
          message: "API endpoint",
          path: url.pathname,
          query: Object.fromEntries(url.searchParams)
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Default 404 response
      return new Response(JSON.stringify({
        status: "not_found",
        message: `Endpoint not found: ${url.pathname}`
      }), {
        status: 404,
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

// SSE connection handler
async function handleSSEConnection(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    console.log("Setting up SSE connection");

    // Standard SSE headers required for browsers and MCP clients
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    });

    // Create a stream for the SSE connection
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Function to send properly formatted SSE messages
    async function sendEvent(eventType: string, data: any) {
      try {
        // Format according to SSE standard
        let message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        await writer.write(encoder.encode(message));
        console.log(`Sent event: ${eventType}`);
      } catch (e) {
        console.error(`Error sending event ${eventType}:`, e);
      }
    }

    // Send immediate connected event
    await sendEvent("connected", { status: "connected" });

    // Define server metadata for MCP
    const serverInfo = {
      name: "CV MCP Worker",
      version: "1.0.0",
      description: "Cloudflare Worker MCP Server",
      status: "connected",
      tools: [
        {
          name: "hello",
          description: "Says hello",
          input_schema: {
            type: "object",
            properties: {
              name: { type: "string" }
            }
          }
        }
      ],
      resources: []
    };

    // Send server_info and heartbeats in the background
    ctx.waitUntil((async () => {
      try {
        // Send server_info with small delay to ensure client is ready
        setTimeout(async () => {
          await sendEvent("server_info", serverInfo);
        }, 50);

        // Send heartbeats
        const interval = setInterval(async () => {
          try {
            await sendEvent("heartbeat", {
              timestamp: new Date().toISOString(),
              status: "ok"
            });
          } catch (e) {
            clearInterval(interval);
            writer.close().catch(console.error);
          }
        }, 10000);

      } catch (error) {
        console.error("SSE error:", error);
        writer.close().catch(console.error);
      }
    })());

    return new Response(stream.readable, { headers });
  } catch (error) {
    console.error("SSE connection error:", error);
    return new Response(JSON.stringify({
      status: "error",
      message: "Error establishing SSE connection",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Tool request handler
async function handleToolRequest(request: Request, url: URL): Promise<Response> {
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
    // Parse request body
    const body = await request.json();
    console.log("Tool request body:", JSON.stringify(body));

    // Get tool name
    let toolName = "unknown";
    let toolArgs: Record<string, any> = {};

    if (url.pathname.startsWith("/tools/")) {
      toolName = url.pathname.split("/").pop() || "unknown";
      toolArgs = body.arguments || body || {};
    } else if (body.tool) {
      toolName = body.tool;
      toolArgs = body.arguments || {};
    } else if (body.name) {
      toolName = body.name;
      toolArgs = body.arguments || body.input || {};
    }

    // Implement hello tool
    if (toolName === "hello") {
      const name = toolArgs.name || "World";
      return new Response(JSON.stringify({
        status: "success",
        result: `Hello, ${name}!`,
        tool: toolName,
        timestamp: new Date().toISOString()
      }), { headers });
    }

    // Unknown tool
    return new Response(JSON.stringify({
      status: "error",
      message: `Unknown tool: ${toolName}`,
      code: "unknown_tool"
    }), {
      status: 404,
      headers
    });
  } catch (error) {
    console.error("Tool processing error:", error);
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
