import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const trackedFiles = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8",
}).trim().split("\n").filter(Boolean);

const skippedExtensions = new Set([
  ".png",
  ".ttf",
  ".jar",
]);

const skippedPaths = [
  "package-lock.json",
  "android/gradle/wrapper/gradle-wrapper.jar",
];

const patterns = [
  {
    name: "OpenAI secret key",
    regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: "Supabase service role JWT",
    regex: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
    allow: (match) => match.includes("your-project") || match.includes("example"),
  },
  {
    name: "Private key block",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g,
  },
  {
    name: "Committed password assignment",
    regex: /\b(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/gi,
    allow: (match) => /password\s*[:=]\s*["'](?:example|placeholder|password|private|<)/i.test(match),
  },
  {
    name: "Committed secret assignment",
    regex: /\b(?:secret|service_role|serviceRole|token)\s*[:=]\s*["'][^"']{16,}["']/gi,
    allow: (match) => /(?:secret|service_role|token)\s*[:=]\s*["'](?:example|placeholder|your-|private|<|\.\.\.)/i.test(match),
  },
];

const findings = [];

for (const file of trackedFiles) {
  if (skippedPaths.includes(file)) continue;
  if (skippedExtensions.has(path.extname(file))) continue;

  const absolutePath = path.join(root, file);
  if (!existsSync(absolutePath)) continue;
  const source = readFileSync(absolutePath, "utf8");

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern.regex)) {
      const text = match[0];
      if (pattern.allow?.(text, file)) continue;
      const line = source.slice(0, match.index).split("\n").length;
      findings.push({ file, line, name: pattern.name, text });
    }
  }
}

if (findings.length) {
  console.error("Secret scan failed:");
  findings.forEach((finding) => {
    console.error(`- ${finding.name} in ${finding.file}:${finding.line}`);
  });
  process.exit(1);
}

console.log("Secret scan passed.");
