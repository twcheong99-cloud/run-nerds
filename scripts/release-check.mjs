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

function matchValue(source, pattern, label) {
  const match = source.match(pattern);
  assert(Boolean(match), `${label} is missing`);
  return match?.[1] || "";
}

run("web tests", "npm", ["test"]);
run("Capacitor sync", "npm", ["run", "mobile:sync"]);
run("Capacitor doctor", "npx", ["cap", "doctor"]);
run("iOS plist lint", "plutil", ["-lint", "ios/App/App/Info.plist"]);
run("iOS privacy manifest lint", "plutil", ["-lint", "ios/App/App/PrivacyInfo.xcprivacy"]);

[
  "README.md",
  ".github/workflows/release-check.yml",
  "ANDROID_PERMISSIONS.md",
  "BACKEND_RELEASE.md",
  "VERSIONING.md",
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
  "ios/App/App/PrivacyInfo.xcprivacy",
  "supabase-setup.sql",
  "supabase/functions/coach/index.ts",
].forEach(assertFile);

assert(!existsSync(path.join(root, "www/env.js")), "www/env.js must not be bundled");

const manifest = JSON.parse(read("manifest.webmanifest"));
const capacitorConfig = JSON.parse(read("capacitor.config.json"));
const androidBuild = read("android/app/build.gradle");
const androidManifest = read("android/app/src/main/AndroidManifest.xml");
const iosProject = read("ios/App/App.xcodeproj/project.pbxproj");
const iosPrivacyManifest = read("ios/App/App/PrivacyInfo.xcprivacy");
const versioning = read("VERSIONING.md");
const expectedAppId = matchValue(versioning, /Android application ID: `([^`]+)`/, "VERSIONING.md Android application ID");
const expectedMarketingVersion = matchValue(versioning, /Marketing version: `([^`]+)`/, "VERSIONING.md marketing version");
const expectedBuildNumber = matchValue(versioning, /Build number: `([^`]+)`/, "VERSIONING.md build number");
const androidApplicationId = matchValue(androidBuild, /applicationId "([^"]+)"/, "Android applicationId");
const androidNamespace = matchValue(androidBuild, /namespace = "([^"]+)"/, "Android namespace");
const androidVersionName = matchValue(androidBuild, /versionName "([^"]+)"/, "Android versionName");
const androidVersionCode = matchValue(androidBuild, /versionCode\s+(\d+)/, "Android versionCode");
const iosBundleIds = [...iosProject.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((match) => match[1]);
const iosMarketingVersions = [...iosProject.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((match) => match[1]);
const iosBuildNumbers = [...iosProject.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((match) => match[1]);
const androidPermissions = [...androidManifest.matchAll(/<uses-permission[^>]+android:name="([^"]+)"/g)].map((match) => match[1]).sort();
const allowedAndroidPermissions = ["android.permission.INTERNET"];
assert(manifest.display === "standalone", "manifest display must be standalone");
assert(manifest.orientation === "portrait", "manifest orientation must be portrait");
assert(manifest.icons?.some((icon) => icon.purpose === "maskable"), "manifest must include a maskable icon");
assert(capacitorConfig.appId === expectedAppId, "Capacitor appId must match VERSIONING.md");
assert(androidApplicationId === expectedAppId, "Android applicationId must match VERSIONING.md");
assert(androidNamespace === expectedAppId, "Android namespace must match VERSIONING.md");
assert(androidVersionName === expectedMarketingVersion, "Android versionName must match VERSIONING.md");
assert(androidVersionCode === expectedBuildNumber, "Android versionCode must match VERSIONING.md build number");
assert(iosBundleIds.length > 0 && iosBundleIds.every((value) => value === expectedAppId), "iOS bundle ids must match VERSIONING.md");
assert(iosMarketingVersions.length > 0 && iosMarketingVersions.every((value) => value === expectedMarketingVersion), "iOS marketing versions must match VERSIONING.md");
assert(iosBuildNumbers.length > 0 && iosBuildNumbers.every((value) => value === expectedBuildNumber), "iOS build numbers must match VERSIONING.md");
assert(androidPermissions.length === allowedAndroidPermissions.length && androidPermissions.every((value, index) => value === allowedAndroidPermissions[index]), "Android manifest must request only android.permission.INTERNET");

assertIncludes("android/app/src/main/AndroidManifest.xml", 'android:allowBackup="false"', "disabled Android backup");
assertIncludes("android/app/src/main/AndroidManifest.xml", 'android:fullBackupContent="false"', "disabled Android full backup");
assertIncludes("android/app/src/main/AndroidManifest.xml", 'android:usesCleartextTraffic="false"', "disabled cleartext traffic");
assertIncludes("android/app/src/main/AndroidManifest.xml", 'android:screenOrientation="portrait"', "portrait Android orientation");
assertIncludes("android/app/src/main/java/com/runnerds/app/MainActivity.java", "setNavigationBarColor", "Android navigation bar color handling");
assertIncludes("android/app/src/main/java/com/runnerds/app/MainActivity.java", "setStatusBarColor", "Android status bar color handling");
assertIncludes("styles.css", "env(safe-area-inset-bottom", "CSS bottom safe-area handling");
assertIncludes("index.html", "viewport-fit=cover", "viewport safe-area handling");

assertIncludes("ios/App/App/Info.plist", "<key>ITSAppUsesNonExemptEncryption</key>", "iOS encryption declaration");
assertIncludes("ios/App/App/Info.plist", "<false/>", "iOS no non-exempt encryption value");
assertIncludes("ios/App/App.xcodeproj/project.pbxproj", "PrivacyInfo.xcprivacy in Resources", "iOS privacy manifest target resource");
assertIncludes("ios/App/App/PrivacyInfo.xcprivacy", "NSPrivacyTracking", "iOS privacy tracking declaration");
assertIncludes("ios/App/App/PrivacyInfo.xcprivacy", "<false/>", "iOS no tracking declaration");
[
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypeName",
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypeFitness",
  "NSPrivacyCollectedDataTypeHealth",
  "NSPrivacyCollectedDataTypeOtherUserContent",
  "NSPrivacyCollectedDataTypeProductInteraction",
].forEach((dataType) => {
  assert(iosPrivacyManifest.includes(dataType), `iOS privacy manifest must include ${dataType}`);
});

const executableWebBundle = [
  "www/index.html",
  "www/app.js",
  "www/env.public.js",
  "www/js/app-main.js",
  "www/js/config.js",
  "www/js/coach-service.js",
].map(read).join("\n");

assert(!/OPENAI_API_KEY|service role|SERVICE_ROLE|DATABASE_URL/i.test(executableWebBundle), "executable web bundle must not include server secret names");

const readme = read("README.md");
assert(readme.includes("Capacitor Android/iOS"), "README.md must describe the Capacitor native app path");
assert(readme.includes("npm run release:check"), "README.md must document the release check");
assert(readme.includes(".github/workflows/release-check.yml"), "README.md must document the release check workflow");
assert(readme.includes("RELEASE_RUNBOOK.md"), "README.md must link the release runbook");
assert(readme.includes("STORE_SCREENSHOTS.md"), "README.md must link the screenshot checklist");
assert(readme.includes("BACKEND_RELEASE.md"), "README.md must link the backend release checklist");
assert(readme.includes("VERSIONING.md"), "README.md must link the versioning checklist");
assert(readme.includes("ANDROID_PERMISSIONS.md"), "README.md must link the Android permissions checklist");
assert(readme.includes("Production privacy/support URL"), "README.md must list production URL as a remaining blocker");

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
assert(storeSubmission.includes("BACKEND_RELEASE.md"), "STORE_SUBMISSION.md must reference backend release checks");
assert(storeSubmission.includes("VERSIONING.md"), "STORE_SUBMISSION.md must reference versioning checks");
assert(storeSubmission.includes("ANDROID_PERMISSIONS.md"), "STORE_SUBMISSION.md must reference Android permission checks");
assert(storeSubmission.includes("PrivacyInfo.xcprivacy"), "STORE_SUBMISSION.md must reference the iOS privacy manifest");

const releaseRunbook = read("RELEASE_RUNBOOK.md");
assert(releaseRunbook.includes("## Android review build"), "RELEASE_RUNBOOK.md must include Android review build steps");
assert(releaseRunbook.includes("## iOS review build"), "RELEASE_RUNBOOK.md must include iOS review build steps");
assert(releaseRunbook.includes("Stop before review if:"), "RELEASE_RUNBOOK.md must include stop-before-review gates");
assert(releaseRunbook.includes("activity log scrolling"), "RELEASE_RUNBOOK.md must include activity log scrolling device test");
assert(releaseRunbook.includes("com.runnerds.app"), "RELEASE_RUNBOOK.md must include the app identifier");
assert(releaseRunbook.includes("BACKEND_RELEASE.md"), "RELEASE_RUNBOOK.md must reference backend release checks");
assert(releaseRunbook.includes("VERSIONING.md"), "RELEASE_RUNBOOK.md must reference versioning checks");
assert(releaseRunbook.includes("PrivacyInfo.xcprivacy"), "RELEASE_RUNBOOK.md must reference the iOS privacy manifest");
assert(releaseRunbook.includes("ANDROID_PERMISSIONS.md"), "RELEASE_RUNBOOK.md must reference Android permission checks");
assert(releaseRunbook.includes("Release readiness"), "RELEASE_RUNBOOK.md must reference the CI release readiness workflow");

const releaseWorkflow = read(".github/workflows/release-check.yml");
assert(releaseWorkflow.includes("macos-15"), "release-check workflow must use macOS for plutil");
assert(releaseWorkflow.includes("npm ci"), "release-check workflow must install with npm ci");
assert(releaseWorkflow.includes("npm run release:check"), "release-check workflow must run npm run release:check");
assert(releaseWorkflow.includes("pull_request"), "release-check workflow must run on pull requests");

const backendRelease = read("BACKEND_RELEASE.md");
assert(backendRelease.includes("jnlexemtrjgwskzwybim"), "BACKEND_RELEASE.md must include the Supabase project ref");
assert(backendRelease.includes("supabase functions deploy coach"), "BACKEND_RELEASE.md must include Edge Function deploy command");
assert(backendRelease.includes("supabase secrets set OPENAI_API_KEY"), "BACKEND_RELEASE.md must document Edge Function secret setup");
assert(backendRelease.includes("## Database schema and RLS"), "BACKEND_RELEASE.md must document database/RLS release checks");
assert(backendRelease.includes("## Auth review setup"), "BACKEND_RELEASE.md must document reviewer auth setup");
assert(backendRelease.includes("## Edge Function QA"), "BACKEND_RELEASE.md must document coach Edge Function QA");
assert(backendRelease.includes("coach-contract-v3"), "BACKEND_RELEASE.md must include the coach contract version");

assertIncludes("supabase-setup.sql", "enable row level security", "Supabase RLS enablement");
assertIncludes("supabase-setup.sql", "profiles_select_own", "profile owner select policy");
assertIncludes("supabase-setup.sql", "workspace_select_own", "workspace owner select policy");
assertIncludes("supabase/functions/coach/index.ts", "coach-contract-v3", "coach contract version");

const androidPermissionsDoc = read("ANDROID_PERMISSIONS.md");
assert(androidPermissionsDoc.includes("android.permission.INTERNET"), "ANDROID_PERMISSIONS.md must document INTERNET permission");
assert(androidPermissionsDoc.includes("Permissions not used"), "ANDROID_PERMISSIONS.md must document unused permission families");
assert(androidPermissionsDoc.includes("Advertising ID"), "ANDROID_PERMISSIONS.md must document no advertising ID");
assert(androidPermissionsDoc.includes("Play Data safety alignment"), "ANDROID_PERMISSIONS.md must document Play Data safety alignment");

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
