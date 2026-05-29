import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];
const warnings = [];

function run(label, command, args, options = {}) {
  console.log(`\n== ${label} ==`);
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
}

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function assertFile(relativePath) {
  assert(existsSync(path.join(root, relativePath)), `${relativePath} is missing`);
}

function assertIncludes(relativePath, needle, label = needle) {
  assert(read(relativePath).includes(needle), `${relativePath} must include ${label}`);
}

run("web tests", "npm", ["test"]);
run("Capacitor sync", "npm", ["run", "mobile:sync"]);
run("Capacitor doctor", "npx", ["cap", "doctor"]);
run("iOS plist lint", "plutil", ["-lint", "ios/App/App/Info.plist"]);

[
  "www/index.html",
  "www/privacy.html",
  "www/safety.html",
  "www/support.html",
  "www/manifest.webmanifest",
  "android/app/src/main/AndroidManifest.xml",
  "ios/App/App/Info.plist",
].forEach(assertFile);

assert(!existsSync(path.join(root, "www/env.js")), "www/env.js must not be bundled");

const manifest = JSON.parse(read("manifest.webmanifest"));
assert(manifest.display === "standalone", "manifest display must be standalone");
assert(manifest.orientation === "portrait", "manifest orientation must be portrait");
assert(manifest.icons?.some((icon) => icon.purpose === "maskable"), "manifest must include a maskable icon");

assertIncludes("android/app/src/main/AndroidManifest.xml", 'android:allowBackup="false"', "disabled Android backup");
assertIncludes("android/app/src/main/AndroidManifest.xml", 'android:fullBackupContent="false"', "disabled Android full backup");
assertIncludes("android/app/src/main/AndroidManifest.xml", 'android:usesCleartextTraffic="false"', "disabled cleartext traffic");
assertIncludes("android/app/src/main/AndroidManifest.xml", 'android:screenOrientation="portrait"', "portrait Android orientation");
assertIncludes("android/app/build.gradle", 'applicationId "com.runnerds.app"', "Android application id");
assertIncludes("android/app/build.gradle", 'versionName "1.0"', "Android version name");

assertIncludes("ios/App/App/Info.plist", "<key>ITSAppUsesNonExemptEncryption</key>", "iOS encryption declaration");
assertIncludes("ios/App/App/Info.plist", "<false/>", "iOS no non-exempt encryption value");
assertIncludes("ios/App/App.xcodeproj/project.pbxproj", "PRODUCT_BUNDLE_IDENTIFIER = com.runnerds.app;", "iOS bundle id");
assertIncludes("ios/App/App.xcodeproj/project.pbxproj", "MARKETING_VERSION = 1.0;", "iOS marketing version");

const executableWebBundle = [
  "www/index.html",
  "www/app.js",
  "www/env.public.js",
  "www/js/app-main.js",
  "www/js/config.js",
  "www/js/coach-service.js",
].map(read).join("\n");

assert(!/OPENAI_API_KEY|service role|SERVICE_ROLE|DATABASE_URL/i.test(executableWebBundle), "executable web bundle must not include server secret names");

const supportPage = read("support.html");
warn(!supportPage.includes("스토어 제출 전"), "support.html still has a placeholder support-contact note");

if (warnings.length) {
  console.log("\nWarnings:");
  warnings.forEach((message) => console.log(`- ${message}`));
}

if (failures.length) {
  console.error("\nRelease check failed:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("\nRelease check passed.");
