import { FastMCP } from "fastmcp";
import * as services from "./services/index.js";

// Import file system module to read the markdown file
import fs from 'fs/promises';
import path from 'path';

/**
 * Register all resources with the MCP server
 * @param server The FastMCP server instance
 */
export function registerResources<T extends Record<string, unknown> | undefined>(server: FastMCP<T>) {
  // Frank Goortani CV markdown resource
  server.addResource({
    uri: "cv://frankgoortani",
    name: "Frank Goortani CV",
    mimeType: "text/markdown",
    async load() {
      try {
        // Read from the markdown file
        const mdPath = './media/frankgoortani.md';
        const mdContent = await fs.readFile(mdPath, 'utf-8');
        return {
          text: mdContent
        };
      } catch (error) {
        console.error("Error loading markdown file:", error);
        throw new Error("Failed to load CV markdown file");
      }
    }
  });

  // Frank Goortani CV PDF resource - using text property with base64 encoding
  server.addResource({
    uri: "cv://frankgoortani/pdf",
    name: "Frank Goortani CV PDF",
    mimeType: "application/pdf",
    async load() {
      // In a local environment, we can use a file system method to read the PDF file
      try {
        const fs = await import('fs/promises');
        const pdfPath = path.resolve('./media/Frank Goortani Resume--solution-architect-2024.pdf');
        const pdfData = await fs.readFile(pdfPath);

        // Convert binary to base64 and return as text
        const base64Data = pdfData.toString('base64');
        return {
          text: base64Data,
          encoding: "base64"
        };
      } catch (error) {
        console.error("Error loading PDF file:", error);
        throw new Error("Failed to load CV PDF file");
      }
    }
  });

  // Frank Goortani profile picture resource
  server.addResource({
    uri: "cv://frankgoortani/png",
    name: "Frank Goortani Profile Picture",
    mimeType: "image/png",
    async load() {
      // In a local environment, we can use a file system method to read the image file
      try {
        const fs = await import('fs/promises');
        const imagePath = './media/frankgoortani.png';
        const imageData = await fs.readFile(imagePath);

        // Convert binary to base64 and return as text
        const base64Data = imageData.toString('base64');
        return {
          text: base64Data,
          encoding: "base64"
        };
      } catch (error) {
        console.error("Error loading image file:", error);
        throw new Error("Failed to load profile picture");
      }
    }
  });
}
