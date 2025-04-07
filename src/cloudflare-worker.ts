// A specialized Cloudflare Worker entry point that avoids Node.js dependencies

// Define types for Cloudflare Workers runtime
export interface Env {
  // Environment variables defined in wrangler.toml
  ENVIRONMENT: string;
}

// Define ExecutionContext interface to match Cloudflare Workers API
interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// Handler for all requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Handle root and health check endpoints
      if (url.pathname === "/" || url.pathname === "/health") {
        return new Response(JSON.stringify({
          status: "ok",
          message: "MCP Server is running in Worker mode",
          environment: env.ENVIRONMENT || "production",
          mode: "cloudflare-worker"
        }), {
          headers: {
            "Content-Type": "application/json"
          }
        });
      }

      // Handle SSE endpoint following MCP protocol specification
      if (url.pathname === "/sse") {
        try {
          console.log("SSE connection request received");

          // Verify this is an MCP client request
          const transportType = url.searchParams.get('transportType');
          if (!transportType || transportType !== 'sse') {
            console.log("Invalid transport type:", transportType);
            // Still accept the connection but log it
          }

          // Add CORS headers to support cross-origin requests
          const headers = new Headers({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*"
          });

          // Handle preflight requests
          if (request.method === "OPTIONS") {
            return new Response(null, { headers });
          }

          // Create a stream for SSE
          const stream = new TransformStream();
          const writer = stream.writable.getWriter();
          const encoder = new TextEncoder();

          // Function to send MCP-formatted messages
          const sendMcpMessage = async (type: string, data: any) => {
            const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
            await writer.write(encoder.encode(message));
          };

          // Send initial connection message following MCP protocol
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

          // Schedule connection and heartbeat messages
          ctx.waitUntil((async () => {
            try {
              // Initial server info message
              await sendMcpMessage("server_info", serverInfo);

              // Heartbeat every 30 seconds
              const interval = setInterval(async () => {
                try {
                  await sendMcpMessage("heartbeat", {
                    timestamp: new Date().toISOString(),
                    status: "ok"
                  });
                } catch (e) {
                  // Connection likely closed, clean up
                  clearInterval(interval);
                  writer.close().catch(console.error);
                }
              }, 30000);

              // Handle any tool use requests that might come in
              // This would be expanded in a real implementation
            } catch (error) {
              console.error("SSE stream error:", error);
              writer.close().catch(console.error);
            }
          })());

          // Return the readable stream as the response
          return new Response(stream.readable, { headers });
        } catch (error) {
          console.error("SSE error:", error);
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

      // Handle MCP tool requests
      if (url.pathname === "/tool" || url.pathname.startsWith("/tools/")) {
        // Add CORS headers for tool requests
        const headers = new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        });

        // Handle OPTIONS/preflight requests
        if (request.method === "OPTIONS") {
          return new Response(null, { headers });
        }

        // Only accept POST for tool calls
        if (request.method !== "POST") {
          return new Response(JSON.stringify({
            status: "error",
            message: "Tool requests must use POST method",
            code: "method_not_allowed"
          }), {
            status: 405,
            headers
          });
        }

        try {
          // Parse the request body
          const body = await request.json();
          const toolName = url.pathname.startsWith("/tools/")
            ? url.pathname.split("/").pop() || "unknown"
            : body.tool || "unknown";

          console.log(`Tool request for: ${toolName}`, body);

          // Implement the hello tool
          if (toolName === "hello") {
            const name = body.arguments?.name || "World";
            return new Response(JSON.stringify({
              status: "success",
              result: `Hello, ${name}!`
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
          console.error("Error processing tool request:", error);
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

      // Handle API endpoints with a simplified response
      if (url.pathname.startsWith("/api")) {
        return new Response(JSON.stringify({
          status: "success",
          message: "API endpoint in Worker mode",
          path: url.pathname,
          query: Object.fromEntries(url.searchParams)
        }), {
          headers: {
            "Content-Type": "application/json"
          }
        });
      }

      // Handle all other requests
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
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  }
};
