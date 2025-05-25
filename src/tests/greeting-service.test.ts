import { test, expect } from "bun:test";
import { GreetingService } from "../core/services/greeting-service.js";

test("generateGreeting returns expected message", () => {
  const result = GreetingService.generateGreeting("Alice");
  expect(result).toBe("Hello, Alice! Welcome to the MCP Server.");
});

test("generateFarewell returns expected message", () => {
  const result = GreetingService.generateFarewell("Bob");
  expect(result).toBe("Goodbye, Bob! Thank you for using the MCP Server.");
});
