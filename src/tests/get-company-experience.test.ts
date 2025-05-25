import { test, expect } from "bun:test";
import type { FastMCP } from "fastmcp";
import { registerTools } from "../core/tools.js";

// Simple stub server that collects added tools
function createStubServer() {
  const tools: any[] = [];
  return {
    tools,
    addTool(tool: any) {
      tools.push(tool);
    },
  } as unknown as FastMCP<undefined> & { tools: any[] };
}

test("get_company_experience returns experiences for known company", async () => {
  const stub = createStubServer();
  registerTools(stub);
  const tool = stub.tools.find(t => t.name === "get_company_experience");
  expect(tool).toBeDefined();
  const result = await tool.execute({ company: "Uber" });
  const parsed = JSON.parse(result);
  expect(parsed.experiences.length).toBeGreaterThan(0);
});

test("get_company_experience throws UserError for unknown company", async () => {
  const stub = createStubServer();
  registerTools(stub);
  const tool = stub.tools.find(t => t.name === "get_company_experience");
  await expect(tool.execute({ company: "NonExistent" })).rejects.toThrow("No experience found for company: NonExistent");
});
