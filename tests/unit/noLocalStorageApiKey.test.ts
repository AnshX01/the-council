/**
 * Regression Test: Bug B2 Fix (No LocalStorage API Key Leak)
 * Asserts that no client-side files in src/ read or write API keys to browser localStorage.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function findFilesRecursively(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findFilesRecursively(filePath, fileList);
    } else if (/\.(tsx?|jsx?|css)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

describe('Security & Secrets Hygiene: Bug B2 Fix', () => {
  it('guarantees zero references to localStorage API keys in src/', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const allFiles = findFilesRecursively(srcDir);

    const forbiddenPatterns = [
      /localStorage\.(getItem|setItem|removeItem)\s*\(\s*['"`][^'"`]*api[-_]?key/i,
      /the_council_gemini_api_key/,
      /sessionStorage\.(getItem|setItem|removeItem)\s*\(\s*['"`][^'"`]*api[-_]?key/i,
    ];

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(srcDir, file),
              line: index + 1,
              text: line.trim(),
            });
          }
        }
      });
    }

    expect(
      violations,
      `Detected localStorage/sessionStorage API key leaks:\n${violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.text}`)
        .join('\n')}`
    ).toEqual([]);
  });
});
