// A simplified MCP Server implementation for Cloudflare Workers

export interface Env {
  ENVIRONMENT: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// Main handler for all requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      // CORS preflight request handler
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

      // SSE endpoint
      if (url.pathname === "/sse") {
        // A simple SSE response with static data - more reliable approach
        const headers = new Headers({
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });

        // Instead of using TransformStream, create a ReadableStream directly
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();

            // Helper function to send an event
            function send(event: string, data: Record<string, any>) {
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            }

            // Send initial connected event
            send("connected", { status: "connected" });

            // Send server_info event
            send("server_info", {
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
            });

            // Set up heartbeat interval
            const heartbeatInterval = setInterval(() => {
              send("heartbeat", {
                timestamp: new Date().toISOString(),
                status: "ok"
              });
            }, 5000);

            // Handle stream closing
            ctx.waitUntil(
              new Promise((resolve) => {
                // Return a dummy promise that never resolves
                // This keeps the stream open until the client disconnects
              })
            );
          }
        });

        return new Response(stream, { headers });
      }

      // Tool endpoint
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

          // Simple tool implementation
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
        } catch (error) {
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

      // Default 404 for unmatched routes
      return new Response(JSON.stringify({
        status: "not_found",
        message: `Endpoint not found: ${url.pathname}`
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      // Catch-all error handler
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
