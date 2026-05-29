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
  "MOBILE_BUILD.md",
  "STORE_SUBMISSION.md",
  "STORE_LISTING.md",
  "STORE_SCREENSHOTS.md",
  "RELEASE_RUNBOOK.md",
  "android/app/src/main/AndroidManifest.xml",
  "android/app/src/main/java/com/runnerds/app/MainActivity.java",
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
assertIncludes("android/app/src/main/java/com/runnerds/app/MainActivity.java", "setNavigationBarColor", "Android navigation bar color handling");
assertIncludes("android/app/src/main/java/com/runnerds/app/MainActivity.java", "setStatusBarColor", "Android status bar color handling");
assertIncludes("styles.css", "env(safe-area-inset-bottom", "CSS bottom safe-area handling");
assertIncludes("index.html", "viewport-fit=cover", "viewport safe-area handling");

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
assert(supportPage.includes("https://github.com/twcheong99-cloud/run-nerds/issues"), "support.html must include the configured support URL");
warn(supportPage.includes("GitHub Issues"), "support.html should name the support channel");

const storeListing = read("STORE_LISTING.md");
assert(storeListing.includes("## Short Description"), "STORE_LISTING.md must include short description copy");
assert(storeListing.includes("## Full Description"), "STORE_LISTING.md must include full description copy");
assert(storeListing.includes("## Screenshot Plan"), "STORE_LISTING.md must include a screenshot plan");
assert(storeListing.includes("STORE_SCREENSHOTS.md"), "STORE_LISTING.md must reference the screenshot checklist");
assert(storeListing.includes("## Review Notes Draft"), "STORE_LISTING.md must include review notes");
assert(storeListing.includes("run-nerds is not a medical app"), "STORE_LISTING.md must include medical disclaimer copy");
warn(!storeListing.includes("production URL"), "STORE_LISTING.md still has production URL placeholders");
warn(!storeListing.includes("- Email:\n- Password:"), "STORE_LISTING.md still needs demo credentials");

const storeScreenshots = read("STORE_SCREENSHOTS.md");
assert(storeScreenshots.includes("## Required shots"), "STORE_SCREENSHOTS.md must list required screenshots");
assert(storeScreenshots.includes("Workout log completion form"), "STORE_SCREENSHOTS.md must include the workout log screenshot");
assert(storeScreenshots.includes("activity log modal"), "STORE_SCREENSHOTS.md must include activity log modal state");
assert(storeScreenshots.includes("## Visual QA"), "STORE_SCREENSHOTS.md must include visual QA checks");
assert(storeScreenshots.includes("android-01-onboarding.png"), "STORE_SCREENSHOTS.md must define stable Android file names");
assert(storeScreenshots.includes("ios-01-onboarding.png"), "STORE_SCREENSHOTS.md must define stable iOS file names");

const storeSubmission = read("STORE_SUBMISSION.md");
assert(storeSubmission.includes("Data Safety Draft"), "STORE_SUBMISSION.md must include the data safety draft");
assert(storeSubmission.includes("Remaining blockers before real submission"), "STORE_SUBMISSION.md must list remaining blockers");

const releaseRunbook = read("RELEASE_RUNBOOK.md");
assert(releaseRunbook.includes("## Android review build"), "RELEASE_RUNBOOK.md must include Android review build steps");
assert(releaseRunbook.includes("## iOS review build"), "RELEASE_RUNBOOK.md must include iOS review build steps");
assert(releaseRunbook.includes("Stop before review if:"), "RELEASE_RUNBOOK.md must include stop-before-review gates");
assert(releaseRunbook.includes("activity log scrolling"), "RELEASE_RUNBOOK.md must include activity log scrolling device test");
assert(releaseRunbook.includes("com.runnerds.app"), "RELEASE_RUNBOOK.md must include the app identifier");

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
