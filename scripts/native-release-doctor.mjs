import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const checks = [];

function run(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    output: `${result.stdout || ""}${result.stderr || ""}`.trim(),
  };
}

function addCheck(name, ok, detail, required = true) {
  checks.push({ name, ok, detail, required });
}

const javaVersion = run("java", ["-version"]);
addCheck("Java Runtime / JDK", javaVersion.ok, javaVersion.output.split("\n")[0] || "java -version failed");

const gradleWrapper = run("./android/gradlew", ["--version"]);
addCheck("Android Gradle wrapper", gradleWrapper.ok, gradleWrapper.output.split("\n").find((line) => line.includes("Gradle")) || "./android/gradlew --version failed");

const xcodeSelect = run("xcode-select", ["-p"]);
const xcodePath = xcodeSelect.output.split("\n")[0] || "";
addCheck("Xcode selected", xcodeSelect.ok && !xcodePath.includes("CommandLineTools"), xcodePath || "xcode-select -p failed");

const xcodebuild = run("xcodebuild", ["-version"]);
addCheck("xcodebuild", xcodebuild.ok, xcodebuild.output.split("\n").slice(0, 2).join(" / ") || "xcodebuild -version failed");

const supabase = run("supabase", ["--version"]);
addCheck("Supabase CLI", supabase.ok, supabase.output || "supabase --version failed");

const androidStudioPaths = [
  "/Applications/Android Studio.app",
  `${process.env.HOME || ""}/Applications/Android Studio.app`,
];
addCheck(
  "Android Studio app",
  androidStudioPaths.some((candidate) => candidate && existsSync(candidate)),
  androidStudioPaths.join(" or "),
);

const localEnv = existsSync("env.js");
addCheck("No local env.js in release root", !localEnv, localEnv ? "env.js exists; keep it out of release bundles" : "env.js not present", false);

console.log("Native release doctor\n");

for (const check of checks) {
  const mark = check.ok ? "PASS" : check.required ? "FAIL" : "WARN";
  console.log(`${mark} ${check.name}`);
  if (check.detail) console.log(`  ${check.detail}`);
}

const failedRequired = checks.filter((check) => check.required && !check.ok);

if (failedRequired.length) {
  console.error("\nNative release doctor failed:");
  failedRequired.forEach((check) => console.error(`- ${check.name}`));
  process.exit(1);
}

console.log("\nNative release doctor passed.");
