// A robust MCP Server implementation for Cloudflare Workers

export interface Env {
  ENVIRONMENT: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Handle CORS preflight
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

      // SSE endpoint - using a more reliable pattern
      if (url.pathname === "/sse") {
        // Check if this is a proxy request (MCP Inspector)
        // Will have a URL param like transportType=sse
        const transportType = url.searchParams.get('transportType');
        const proxyUrl = url.searchParams.get('url');

        console.log(`SSE request: transportType=${transportType}, proxyUrl=${proxyUrl}`);

        // Set up headers for SSE
        const headers = new Headers({
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no", // For Nginx
          "Access-Control-Allow-Origin": "*"
        });

        // Convert our async generator to a ReadableStream that Response can handle
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();

            try {
              // Process all the values from the async generator
              for await (const chunk of sseStream(ctx)) {
                // Encode text to Uint8Array and enqueue
                controller.enqueue(encoder.encode(chunk));
              }
            } catch (error) {
              console.error("Stream error:", error);
            } finally {
              // Always close the controller when done
              controller.close();
            }
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
          // Parse request body
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

          // Implement basic hello tool
          if (toolName === "hello") {
            const name = toolArgs.name || "World";
            return new Response(JSON.stringify({
              status: "success",
              result: `Hello, ${name}!`
            }), { headers });
          }

          // Unknown tool response
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

      // Default 404 handler
      return new Response(JSON.stringify({
        status: "not_found",
        message: `Endpoint not found: ${url.pathname}`
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      // Global error handler
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

// SSE async generator - a more robust approach for Cloudflare Workers
async function* sseStream(ctx: ExecutionContext): AsyncIterableIterator<string> {
  const encoder = new TextEncoder();

  // Helper function to create a properly formatted SSE message
  function formatSSE(event: string, data: any): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  try {
    // Initial connection message - immediately yield
    yield formatSSE("connected", { status: "connected" });

    // Server info message - define our MCP server capabilities
    yield formatSSE("server_info", {
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

    // Set up heartbeat intervals using async sleep
    let counter = 0;
    const MAX_HEARTBEATS = 500; // Safety limit

    // Keep the connection alive with heartbeats
    while (counter < MAX_HEARTBEATS) {
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Send heartbeat
      yield formatSSE("heartbeat", {
        timestamp: new Date().toISOString(),
        status: "ok",
        counter: counter + 1
      });

      counter++;
    }
  } catch (error) {
    console.error("SSE stream error:", error);
    // If we encounter an error, send a final error message
    yield formatSSE("error", {
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
