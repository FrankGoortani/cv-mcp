import { test, expect } from "bun:test";
import type { FastMCP } from "fastmcp";
import { registerPrompts } from "../core/prompts.js";
import { registerTools } from "../core/tools.js";

function createPromptStub() {
  const prompts: any[] = [];
  return {
    prompts,
    addPrompt(prompt: any) {
      prompts.push(prompt);
    }
  } as unknown as FastMCP<undefined> & { prompts: any[] };
}

function createToolStub() {
  const tools: any[] = [];
  return {
    tools,
    addTool(tool: any) {
      tools.push(tool);
    }
  } as unknown as FastMCP<undefined> & { tools: any[] };
}

test("greeting prompt returns expected message", async () => {
  const stub = createPromptStub();
  registerPrompts(stub);
  const prompt = stub.prompts.find(p => p.name === "greeting");
  expect(prompt).toBeDefined();
  const result = await prompt.load({ name: "Charlie" });
  expect(result).toBe("Hello, Charlie! Frank sends his greetings!");
});

test("get_resume_link tool returns resume URL", async () => {
  const stub = createToolStub();
  registerTools(stub);
  const tool = stub.tools.find(t => t.name === "get_resume_link");
  expect(tool).toBeDefined();
  const result = await tool.execute({});
  const parsed = JSON.parse(result);
  expect(parsed.resumeLink).toBe("media/Frank Goortani Resume--solution-architect-2024.pdf");
});

test("get_profile_picture tool returns picture URL", async () => {
  const stub = createToolStub();
  registerTools(stub);
  const tool = stub.tools.find(t => t.name === "get_profile_picture");
  expect(tool).toBeDefined();
  const result = await tool.execute({});
  const parsed = JSON.parse(result);
  expect(parsed.pictureLink).toBe("media/frankgoortani.png");
});

test("get_tech_stack tool filters by language", async () => {
  const stub = createToolStub();
  registerTools(stub);
  const tool = stub.tools.find(t => t.name === "get_tech_stack");
  expect(tool).toBeDefined();
  const result = await tool.execute({ category: "languages" });
  const parsed = JSON.parse(result);
  expect(parsed.category).toBe("languages");
  expect(Array.isArray(parsed.technologies)).toBe(true);
  expect(parsed.technologies.length).toBeGreaterThan(0);
  expect(parsed.technologies).toContain("Python");
});
