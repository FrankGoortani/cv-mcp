import { FastMCP } from "fastmcp";
import { z } from "zod";

/**
 * Register all prompts with the MCP server
 * @param server The FastMCP server instance
 */
export function registerPrompts<T extends Record<string, unknown> | undefined>(server: FastMCP<T>) {
  // Example prompt
  server.addPrompt({
    name: "greeting",
    description: "A simple greeting prompt",
    arguments: [
      {
        name: "name",
        description: "Name to greet",
        required: true,
      },
    ],
    load: async ({ name }) => {
      return `Hello, ${name}! Frank sends his greetings!`;
    }
  });
}
