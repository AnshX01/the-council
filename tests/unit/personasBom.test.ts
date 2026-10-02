import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Bug B12 Regression: Personas JSON UTF-8 BOM Check", () => {
  const personasDir = path.resolve(process.cwd(), "src/config/personas");

  it("ensures no persona JSON file starts with a UTF-8 Byte Order Mark (BOM)", () => {
    const files = fs.readdirSync(personasDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(9);

    for (const file of files) {
      const filePath = path.join(personasDir, file);
      const buffer = fs.readFileSync(filePath);
      const hasBOM =
        buffer.length >= 3 &&
        buffer[0] === 0xef &&
        buffer[1] === 0xbb &&
        buffer[2] === 0xbf;

      expect(hasBOM, `File ${file} must not contain a UTF-8 BOM`).toBe(false);

      // Also ensure it parses cleanly as JSON
      expect(() => JSON.parse(buffer.toString("utf8"))).not.toThrow();
    }
  });
});
