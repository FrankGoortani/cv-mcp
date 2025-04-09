import startServer from "./server.js";

// Define the port for the server
const PORT = parseInt(process.env.PORT || "3001", 10);
console.log(`Starting server on port ${PORT}...`);

// Start the MCP server using the imported function
startServer().then((server: any) => {
  // Configure the server with SSE transport settings for Node.js environment
  server.start({
    transportType: "sse",
    sse: {
      port: PORT,
      endpoint: "/sse", // Standard endpoint for SSE connections
    },
    // Optional: Add other configurations like API endpoints if needed
    // api: {
    //   port: PORT + 1, // Example: Run API on a different port
    //   endpointPrefix: "/api"
    // }
  });

  console.log(`MCP Server running at http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Health check: http://localhost:${PORT}/health`); // Assuming FastMCP provides a health endpoint
  console.log(`Use Inspector: npx @modelcontextprotocol/inspector http://localhost:${PORT}/sse`);

}).catch((error: Error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
