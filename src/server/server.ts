import { FastMCP } from "fastmcp";
import { registerResources } from "../core/resources.js";
import { registerTools } from "../core/tools.js";
import { registerPrompts } from "../core/prompts.js";
import type { IncomingMessage } from "http";

// Create and start the MCP server
async function startServer() {
  try {
    // Environment overrides for ping interval and health path
    const pingInterval = parseInt(process.env.PING_INTERVAL || "60000", 10);

    // Create a new FastMCP server instance
    const server = new FastMCP<{ id: string }>({
      name: "Frank Goortani CV MCP Server",
      version: "1.0.0",
      instructions: "Describes how to use the CV tools and resources.",
      ping: { enabled: true, intervalMs: pingInterval },
      roots: { enabled: false },
      authenticate: async (request: IncomingMessage) => {
        const apiKeyHeader = request.headers["x-api-key"];
        const expectedKey = process.env.API_KEY;

        if (typeof apiKeyHeader !== "string" || apiKeyHeader !== expectedKey) {
          throw new Response(null, {
            status: 401,
            statusText: "Unauthorized",
          });
        }

        return { id: apiKeyHeader };
      },
    });

    // Register all resources, tools, and prompts
    registerResources(server);
    registerTools(server);
    registerPrompts(server);

    // Log when clients connect or disconnect
    server.on("connect", ({ session }) => {
      const userId = (session as any).auth?.id ?? (session as any).id;
      console.log("Client connected:", userId);
    });
    server.on("disconnect", ({ session }) => {
      const userId = (session as any).auth?.id ?? (session as any).id;
      console.log("Client disconnected:", userId);
    });

    // Log server information
    console.error(`MCP Server initialized`);
    console.error("Server is ready to handle requests");

    return server;
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

// Export the server creation function
export default startServer;
