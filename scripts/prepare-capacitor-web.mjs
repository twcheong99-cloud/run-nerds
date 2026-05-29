import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "www");

const entries = [
  "index.html",
  "privacy.html",
  "styles.css",
  "app.js",
  "env.public.js",
  "manifest.webmanifest",
  "service-worker.js",
  "assets",
  "fonts",
  "js"
];

async function copyEntry(entry) {
  const source = path.join(root, entry);
  const target = path.join(outputDir, entry);
  const sourceStat = await stat(source);

  if (sourceStat.isDirectory()) {
    await cp(source, target, { recursive: true });
    return;
  }

  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const entry of entries) {
  await copyEntry(entry);
}

console.log(`Prepared Capacitor web assets in ${path.relative(root, outputDir)}`);
