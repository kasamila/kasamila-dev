// Public-repository checks only: no network, credentials or billable sessions.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "__pycache__"].includes(entry.name)) continue;
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(name);
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(name);
  }
}
visit(root);
for (const filename of files) {
  const body = fs.readFileSync(filename, "utf8");
  for (const match of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|#)/.test(match[1])) continue;
    const target = path.resolve(path.dirname(filename), match[1].split("#")[0]);
    assert.ok(target.startsWith(root + path.sep), "Link outside public repository");
    assert.ok(fs.existsSync(target), filename + ": broken link " + match[1]);
  }
  if (path.dirname(filename) === path.join(root, "docs") && !filename.endsWith(".en.md")) {
    assert.ok(fs.existsSync(filename.replace(/\.md$/, ".en.md")), "Missing English counterpart");
    assert.ok(body.includes("[English]"), "Missing language navigation");
  }
  if (filename.endsWith(".en.md") && path.dirname(filename) === path.join(root, "docs")) {
    const prose = body.replace(/^.*?\n\n/s, ""); // Exclude bilingual navigation.
    assert.ok(!/[\u3400-\u9fff]/.test(prose), "Untranslated Chinese in English guide: " + filename);
    assert.ok(prose.includes("1.11.6"), "Missing documented SDK version");
  }
  assert.ok(!/(?:192\.168\.\d+\.\d+|ks_(?:live|test|rt)_[A-Za-z0-9_-]{24,}|\x2d{5}BEGIN .*PRIVATE KEY)/.test(body),
    "Potential sensitive content: " + filename);
}
assert.ok(fs.existsSync(path.join(root, "README.zh.md")), "Missing Chinese home");
console.log("Bilingual documentation, local links and sensitive-content checks passed.");
