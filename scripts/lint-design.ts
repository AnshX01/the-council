import fs from "fs";
import path from "path";

interface Violation {
  file: string;
  line: number;
  rule: string;
  match: string;
}

const VIOLATION_RULES = [
  {
    name: "no-font-serif",
    pattern: /font-serif|Cinzel|cinzel/i,
    description: "Serif/Cinzel fonts are forbidden. Use Inter/JetBrains Mono.",
  },
  {
    name: "no-indigo-violet",
    pattern: /\b(?:indigo|violet)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/,
    description: "Indigo/Violet utility classes are forbidden. Use neutral Atlas tokens or persona variables.",
  },
  {
    name: "no-drop-shadows",
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl|inner)\b/,
    description: "Drop shadows are forbidden in Atlas flat design. Use shadow-none or tonal steps.",
  },
  {
    name: "no-raw-borders",
    pattern: /\bborder-(?:gray|slate|zinc|neutral|white\/\d+)\b/,
    description: "Raw border utilities are forbidden. Use border-[var(--border-subtle)] or border-[var(--border-default)].",
  },
];

const ALLOWLIST_FILES = [
  "src/lib/council/geometry.ts",
  "src/config/personas",
  "src/styles",
  "docs",
];

function scanDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, fileList);
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function lintDesign() {
  const targetDirs = [
    path.resolve(process.cwd(), "src/components"),
    path.resolve(process.cwd(), "src/app"),
  ];

  const files = targetDirs.flatMap((d) => scanDir(d));
  const violations: Violation[] = [];

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, "/");
    if (ALLOWLIST_FILES.some((allowed) => relativePath.startsWith(allowed))) {
      continue;
    }

    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");

    lines.forEach((lineText, idx) => {
      // Ignore comments
      const trimmed = lineText.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
        return;
      }

      for (const rule of VIOLATION_RULES) {
        const match = lineText.match(rule.pattern);
        if (match) {
          violations.push({
            file: relativePath,
            line: idx + 1,
            rule: rule.name,
            match: match[0],
          });
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error(`Design Lint Failed: ${violations.length} violation(s) found:\n`);
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line} - [${v.rule}] "${v.match}"`);
    }
    process.exit(1);
  } else {
    console.log(`Design Lint Passed: 0 violations across ${files.length} UI files.`);
  }
}

lintDesign();
