import { FastMCP } from "fastmcp";
import { registerResources } from "../core/resources.js";
import { registerTools } from "../core/tools.js";
import { registerPrompts } from "../core/prompts.js";

// Create and start the MCP server
async function startServer() {
  try {
    // Environment overrides for ping interval and health path
    const pingInterval = parseInt(process.env.PING_INTERVAL || "60000", 10);
    const healthPath = process.env.HEALTH_PATH || "/health";

    // Create a new FastMCP server instance
    const server = new FastMCP({
      name: "Frank Goortani CV MCP Server",
      version: "1.0.0",
      instructions: "Describes how to use the CV tools and resources.",
      ping: { enabled: true, intervalMs: pingInterval },
      health: { enabled: true, path: healthPath, message: "ok" },
      roots: { enabled: false }
    } as any);

    // Register all resources, tools, and prompts
    registerResources(server);
    registerTools(server);
    registerPrompts(server);

    // Log when clients connect or disconnect
    server.on("connect", ({ session }) => {
      console.log("Client connected:", session.id);
    });
    server.on("disconnect", ({ session }) => {
      console.log("Client disconnected:", session.id);
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
