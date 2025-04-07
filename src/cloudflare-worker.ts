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

      // Special handling for MCP handshake/preflight request
      if (request.method === "OPTIONS") {
        const headers = new Headers({
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400"
        });

        return new Response(null, {
          status: 204,
          headers
        });
      }

      // Handle SSE endpoint following MCP protocol specification
      if (url.pathname === "/sse") {
        try {
          console.log("SSE connection request received");
          console.log("URL params:", Array.from(url.searchParams.entries()));
          console.log("Headers:", Object.fromEntries([...request.headers.entries()]));

          // Configure proper SSE headers - these are critical for client compatibility
          const headers = new Headers({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", // Prevents proxy buffering
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*"
          });

          // Create a robust stream for SSE communication
          const stream = new TransformStream();
          const writer = stream.writable.getWriter();
          const encoder = new TextEncoder();

          // Standardized function to send SSE messages with proper formatting
          // This follows the exact format expected by EventSource clients
          const sendSseMessage = async (type: string, data: any) => {
            try {
              // Format according to SSE standard: event: type\ndata: JSON\n\n
              let message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
              await writer.write(encoder.encode(message));
              console.log(`Sent SSE message: ${type}`);
            } catch (error) {
              console.error(`Error sending SSE message: ${error}`);
            }
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
          // Send an immediate response to confirm connection
          await sendSseMessage("connected", { status: "connected" });

          ctx.waitUntil((async () => {
            try {
              // Initial server info message - with very short delay to ensure client is ready
              setTimeout(async () => {
                await sendSseMessage("server_info", serverInfo);
              }, 100);

              // Heartbeat every 10 seconds (more frequent than typical 30s)
              const interval = setInterval(async () => {
                try {
                  await sendSseMessage("heartbeat", {
                    timestamp: new Date().toISOString(),
                    status: "ok"
                  });
                } catch (e) {
                  // Connection likely closed, clean up
                  clearInterval(interval);
                  writer.close().catch(console.error);
                }
              }, 10000);

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

      // MCP Tool request endpoint
      if (url.pathname === "/tool" || url.pathname.startsWith("/tools/")) {
        console.log("Tool request received:", url.pathname);

        // Add proper MCP CORS headers for tool requests
        const headers = new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        });

        // Already handled OPTIONS globally

        // Only accept POST for MCP tool calls
        if (request.method !== "POST") {
          console.log(`Rejected non-POST tool request: ${request.method}`);
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
          // Parse the request body according to MCP protocol
          const body = await request.json();

          // Log the full request for debugging
          console.log("Tool request body:", JSON.stringify(body));

          // Get the tool name - MCP protocol allows for multiple patterns
          let toolName = "unknown";
          let toolArgs: Record<string, any> = {};

          if (url.pathname.startsWith("/tools/")) {
            // Path-based tool naming: /tools/hello
            toolName = url.pathname.split("/").pop() || "unknown";
            toolArgs = body.arguments || body || {};
          } else if (body.tool) {
            // Body-based tool specification: {"tool": "hello", "arguments": {...}}
            toolName = body.tool;
            toolArgs = body.arguments || {};
          } else if (body.name) {
            // Alternative format: {"name": "hello", "arguments": {...}}
            toolName = body.name;
            toolArgs = body.arguments || body.input || {};
          }

          console.log(`Processing tool: ${toolName} with args:`, toolArgs);

          // Implement the hello tool
          if (toolName === "hello") {
            const name = toolArgs.name || "World";
            return new Response(JSON.stringify({
              status: "success",
              result: `Hello, ${name}!`,
              // Include additional metadata for MCP clients
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
