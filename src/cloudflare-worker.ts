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

      // Handle SSE endpoint with a simplified response
      if (url.pathname === "/sse") {
        const headers = new Headers({
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        });

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        // Send initial connection message
        const encoder = new TextEncoder();
        writer.write(encoder.encode("event: connected\ndata: {\"status\":\"connected\",\"mode\":\"cloudflare-worker\"}\n\n"));

        // Schedule a heartbeat message every 20 seconds
        const interval = setInterval(() => {
          writer.write(encoder.encode("event: heartbeat\ndata: {\"time\":\"" + new Date().toISOString() + "\"}\n\n"));
        }, 20000);

        // Close the stream when the client disconnects
        ctx.waitUntil(
          (async () => {
            try {
              // The readable stream will close when the client disconnects
              await readable.pipeTo(new WritableStream());
            } finally {
              clearInterval(interval);
              writer.close();
            }
          })()
        );

        return new Response(readable, { headers });
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
      return new Response("Not Found", { status: 404 });
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
