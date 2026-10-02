import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Atlas Design Token Parity", () => {
  const snapshotPath = path.resolve(process.cwd(), "docs/atlas-tokens.snapshot.json");
  const globalsCssPath = path.resolve(process.cwd(), "src/app/globals.css");

  it("verifies that Council's CSS variables exactly match Atlas design tokens", () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);
    expect(fs.existsSync(globalsCssPath)).toBe(true);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
    const councilCss = fs.readFileSync(globalsCssPath, "utf-8");

    // Parse Council's :root and .dark blocks
    const rootMatch = councilCss.match(/:root\s*\{([^}]+)\}/s);
    const darkMatch = councilCss.match(/\.dark\s*\{([^}]+)\}/s);

    expect(rootMatch).toBeTruthy();
    expect(darkMatch).toBeTruthy();

    function parseVars(block: string): Record<string, string> {
      const vars: Record<string, string> = {};
      const lines = block.split("\n");
      for (const line of lines) {
        const match = line.match(/^\s*(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/);
        if (match) {
          vars[match[1].trim()] = match[2].trim();
        }
      }
      return vars;
    }

    const councilLight = parseVars(rootMatch![1]);
    const councilDark = parseVars(darkMatch![1]);

    // Check light tokens
    for (const [token, expectedValue] of Object.entries(snapshot.light as Record<string, string>)) {
      expect(
        councilLight[token],
        `Light token ${token} must match Atlas value`
      ).toBe(expectedValue);
    }

    // Check dark tokens
    for (const [token, expectedValue] of Object.entries(snapshot.dark as Record<string, string>)) {
      expect(
        councilDark[token],
        `Dark token ${token} must match Atlas value`
      ).toBe(expectedValue);
    }
  });
});
