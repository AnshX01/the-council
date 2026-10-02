import fs from "fs";
import path from "path";

/**
 * Extract design tokens from Atlas frontend source to generate snapshot.
 * Reads ATLAS_PATH or defaults to ../Atlas/frontend or C:/Users/anshw/Documents/Atlas/frontend.
 */
function extractTokens() {
  const possiblePaths = [
    process.env.ATLAS_PATH,
    path.resolve(process.cwd(), "../Atlas/frontend"),
    "C:/Users/anshw/Documents/Atlas/frontend",
  ].filter(Boolean) as string[];

  let atlasPath = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      atlasPath = p;
      break;
    }
  }

  if (!atlasPath) {
    console.error("Atlas frontend directory not found. Checked:", possiblePaths);
    process.exit(1);
  }

  const globalsCssPath = path.join(atlasPath, "src/styles/globals.css");
  if (!fs.existsSync(globalsCssPath)) {
    console.error("Atlas globals.css not found at:", globalsCssPath);
    process.exit(1);
  }

  const css = fs.readFileSync(globalsCssPath, "utf-8");

  // Parse CSS variables from :root and .dark
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/s);
  const darkMatch = css.match(/\.dark\s*\{([^}]+)\}/s);

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

  const lightVars = rootMatch ? parseVars(rootMatch[1]) : {};
  const darkVars = darkMatch ? parseVars(darkMatch[1]) : {};

  const snapshot = {
    source: atlasPath,
    extractedAt: new Date().toISOString(),
    light: lightVars,
    dark: darkVars,
  };

  const outPath = path.resolve(process.cwd(), "docs/atlas-tokens.snapshot.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(`Extracted ${Object.keys(lightVars).length} light tokens and ${Object.keys(darkVars).length} dark tokens to ${outPath}`);
}

extractTokens();
