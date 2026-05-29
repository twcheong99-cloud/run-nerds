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

function pngSize(relativePath) {
  const buffer = readFileSync(path.join(root, relativePath));
  assert(buffer.length >= 24, `${relativePath} must be a valid PNG`);
  assert(buffer.toString("ascii", 1, 4) === "PNG", `${relativePath} must be a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assertPngSize(relativePath, width, height = width) {
  const size = pngSize(relativePath);
  assert(size.width === width && size.height === height, `${relativePath} must be ${width}x${height}`);
}

run("web tests", "npm", ["test"]);
run("secret scan", "npm", ["run", "security:scan"]);
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
  "www/account-deletion.html",
  "www/safety.html",
  "www/support.html",
  "www/manifest.webmanifest",
  "MOBILE_BUILD.md",
  "STORE_CONSOLE.md",
  "STORE_SUBMISSION.md",
  "STORE_LISTING.md",
  "STORE_SCREENSHOTS.md",
  "STORE_ASSETS.md",
  "STORE_RATING.md",
  "PRODUCTION_URLS.md",
  "CI_RELEASE.md",
  "RELEASE_RUNBOOK.md",
  "RELEASE_BLOCKERS.md",
  "RELEASE_EVIDENCE.md",
  "android/app/src/main/AndroidManifest.xml",
  "android/app/src/main/java/com/runnerds/app/MainActivity.java",
  "android/app/src/main/res/values/colors.xml",
  "android/app/src/main/res/values/ic_launcher_background.xml",
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml",
  "ios/App/App/Info.plist",
  "ios/App/App/Base.lproj/LaunchScreen.storyboard",
  "ios/App/App/PrivacyInfo.xcprivacy",
  "supabase-setup.sql",
  "scripts/check-production-urls.mjs",
  "scripts/native-release-doctor.mjs",
  "scripts/secret-scan.mjs",
  "supabase/functions/coach/index.ts",
  "supabase/functions/delete-account/index.ts",
].forEach(assertFile);

assert(!existsSync(path.join(root, "www/env.js")), "www/env.js must not be bundled");

const manifest = JSON.parse(read("manifest.webmanifest"));
const capacitorConfig = JSON.parse(read("capacitor.config.json"));
const androidBuild = read("android/app/build.gradle");
const androidManifest = read("android/app/src/main/AndroidManifest.xml");
const iosProject = read("ios/App/App.xcodeproj/project.pbxproj");
const iosPrivacyManifest = read("ios/App/App/PrivacyInfo.xcprivacy");
const iosLaunchScreen = read("ios/App/App/Base.lproj/LaunchScreen.storyboard");
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
assert(manifest.icons?.some((icon) => icon.src === "./assets/icon-512.png" && icon.sizes === "512x512"), "manifest must include 512 standard icon");
assert(manifest.icons?.some((icon) => icon.src === "./assets/icon-maskable-512.png" && icon.sizes === "512x512" && icon.purpose === "maskable"), "manifest must include 512 maskable icon");
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
assertIncludes("android/app/src/main/res/values/colors.xml", "runnerds_navigation_bar", "Android navigation bar color resource");
assertIncludes("android/app/src/main/res/values/styles.xml", "android:windowLightNavigationBar", "Android dark navigation icon theme");
assertIncludes("android/app/src/main/res/values/styles.xml", "AppTheme.NoActionBarLaunch", "Android launch theme");
assertIncludes("android/app/src/main/res/values/styles.xml", "android:navigationBarColor", "Android launch navigation bar color");
assertIncludes("styles.css", "env(safe-area-inset-bottom", "CSS bottom safe-area handling");
assertIncludes("styles.css", "--bottom-tabs-safe-padding", "bottom tabs safe-area padding");
assertIncludes("styles.css", "@media (max-width: 520px)", "native phone viewport shell handling");
assertIncludes("index.html", "viewport-fit=cover", "viewport safe-area handling");
assertIncludes("index.html", '<meta name="theme-color" content="#06100a" />', "web theme color");
assert(manifest.background_color === "#050806", "manifest background color must match splash background");
assert(manifest.theme_color === "#06100a", "manifest theme color must match status bar color");

assertIncludes("ios/App/App/Info.plist", "<key>ITSAppUsesNonExemptEncryption</key>", "iOS encryption declaration");
assertIncludes("ios/App/App/Info.plist", "<false/>", "iOS no non-exempt encryption value");
assertIncludes("ios/App/App/Info.plist", "<key>UIUserInterfaceStyle</key>", "iOS fixed dark appearance");
assertIncludes("ios/App/App/Info.plist", "<string>Dark</string>", "iOS dark appearance value");
assert(iosLaunchScreen.includes('red="0.019607843137254902"') && iosLaunchScreen.includes('blue="0.023529411764705882"'), "iOS launch screen background must match splash dark color");
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

[
  ["assets/icon-192.png", 192],
  ["assets/icon-512.png", 512],
  ["assets/icon-maskable-192.png", 192],
  ["assets/icon-maskable-512.png", 512],
  ["assets/apple-touch-icon.png", 180],
  ["ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", 1024],
  ["ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png", 2732],
  ["ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png", 2732],
  ["ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png", 2732],
  ["android/app/src/main/res/mipmap-mdpi/ic_launcher.png", 48],
  ["android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png", 48],
  ["android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png", 108],
  ["android/app/src/main/res/mipmap-hdpi/ic_launcher.png", 72],
  ["android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png", 72],
  ["android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png", 162],
  ["android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", 96],
  ["android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png", 96],
  ["android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png", 216],
  ["android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", 144],
  ["android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png", 144],
  ["android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png", 324],
  ["android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", 192],
  ["android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png", 192],
  ["android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png", 432],
].forEach(([relativePath, width]) => assertPngSize(relativePath, width));

assertIncludes("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml", "@color/ic_launcher_background", "Android adaptive icon background");
assertIncludes("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml", "@mipmap/ic_launcher_foreground", "Android adaptive icon foreground");
assertIncludes("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml", "@color/ic_launcher_background", "Android round adaptive icon background");
assertIncludes("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml", "@mipmap/ic_launcher_foreground", "Android round adaptive icon foreground");
assertIncludes("android/app/src/main/res/values/ic_launcher_background.xml", "#050806", "Android adaptive icon background color");
assertIncludes("ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json", "1024x1024", "iOS App Store icon size metadata");
assertIncludes("ios/App/App/Assets.xcassets/Splash.imageset/Contents.json", "splash-2732x2732.png", "iOS splash asset metadata");

const executableWebBundle = [
  "www/index.html",
  "www/account-deletion.html",
  "www/app.js",
  "www/env.public.js",
  "www/js/app-main.js",
  "www/js/config.js",
  "www/js/coach-service.js",
].map(read).join("\n");

assert(!/OPENAI_API_KEY|service role|SERVICE_ROLE|DATABASE_URL/i.test(executableWebBundle), "executable web bundle must not include server secret names");
assert(read("www/account-deletion.html").includes("계정 삭제 안내"), "account deletion page must be bundled");
assert(read("index.html").includes("deleteAccountBtn"), "app must include an in-app account deletion entry point");
assert(read("js/app-main.js").includes('supabase.functions.invoke("delete-account"'), "app must invoke delete-account Edge Function");
assert(read("service-worker.js").includes("./account-deletion.html"), "service worker must cache account deletion page");
assert(read("scripts/prepare-capacitor-web.mjs").includes('"account-deletion.html"'), "Capacitor prepare must copy account deletion page");

const readme = read("README.md");
assert(readme.includes("Capacitor Android/iOS"), "README.md must describe the Capacitor native app path");
assert(readme.includes("STORE_CONSOLE.md"), "README.md must link the store console input package");
assert(readme.includes("npm run release:check"), "README.md must document the release check");
assert(readme.includes("npm run security:scan"), "README.md must document the secret scan");
assert(readme.includes("npm run native:doctor"), "README.md must document the native release doctor");
assert(readme.includes(".github/workflows/release-check.yml"), "README.md must document the release check workflow");
assert(readme.includes("RELEASE_RUNBOOK.md"), "README.md must link the release runbook");
assert(readme.includes("RELEASE_BLOCKERS.md"), "README.md must link the release blockers");
assert(readme.includes("RELEASE_EVIDENCE.md"), "README.md must link the release evidence template");
assert(readme.includes("STORE_SCREENSHOTS.md"), "README.md must link the screenshot checklist");
assert(readme.includes("STORE_ASSETS.md"), "README.md must link the store asset checklist");
assert(readme.includes("STORE_RATING.md"), "README.md must link the store rating checklist");
assert(readme.includes("PRODUCTION_URLS.md"), "README.md must link the production URL checklist");
assert(readme.includes("CI_RELEASE.md"), "README.md must link the CI confirmation checklist");
assert(readme.includes("BACKEND_RELEASE.md"), "README.md must link the backend release checklist");
assert(readme.includes("VERSIONING.md"), "README.md must link the versioning checklist");
assert(readme.includes("ANDROID_PERMISSIONS.md"), "README.md must link the Android permissions checklist");
assert(readme.includes("Production privacy/support URL"), "README.md must list production URL as a remaining blocker");

const supportPage = read("support.html");
assert(supportPage.includes("https://github.com/twcheong99-cloud/run-nerds/issues"), "support.html must include the configured support URL");
warn(supportPage.includes("GitHub Issues"), "support.html should name the support channel");

const storeListing = read("STORE_LISTING.md");
const storeReviewNotesDraft = storeListing.split("## Review Notes Draft")[1]?.split("## Remaining Store Listing Inputs")[0] || "";
assert(storeListing.includes("## Short Description"), "STORE_LISTING.md must include short description copy");
assert(storeListing.includes("STORE_CONSOLE.md"), "STORE_LISTING.md must reference final console input package");
assert(storeListing.includes("## Full Description"), "STORE_LISTING.md must include full description copy");
assert(storeListing.includes("## Screenshot Plan"), "STORE_LISTING.md must include a screenshot plan");
assert(storeListing.includes("STORE_SCREENSHOTS.md"), "STORE_LISTING.md must reference the screenshot checklist");
assert(storeListing.includes("account-deletion.html"), "STORE_LISTING.md must include account deletion URL placeholder");
assert(storeListing.includes("## Review Notes Draft"), "STORE_LISTING.md must include review notes");
assert(storeListing.includes("run-nerds is not a medical app"), "STORE_LISTING.md must include medical disclaimer copy");
assert(storeListing.includes("STORE_RATING.md"), "STORE_LISTING.md must reference rating/declaration checklist");
assert(storeListing.includes("PRODUCTION_URLS.md"), "STORE_LISTING.md must reference production URL checklist");
assert(storeListing.includes("private store console review fields"), "STORE_LISTING.md must keep demo credentials in private store console fields");
assert(!storeListing.includes("- Email:\n- Password:"), "STORE_LISTING.md must not include blank demo credential fields");
assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(storeReviewNotesDraft), "STORE_LISTING.md review notes must not commit demo email credentials");
assert(!/password\s*[:=]\s*\S+/i.test(storeReviewNotesDraft), "STORE_LISTING.md review notes must not commit demo password credentials");
warn(!storeListing.includes("production URL"), "STORE_LISTING.md still has production URL placeholders");

const storeScreenshots = read("STORE_SCREENSHOTS.md");
assert(storeScreenshots.includes("## Required shots"), "STORE_SCREENSHOTS.md must list required screenshots");
assert(storeScreenshots.includes("Workout log completion form"), "STORE_SCREENSHOTS.md must include the workout log screenshot");
assert(storeScreenshots.includes("activity log modal"), "STORE_SCREENSHOTS.md must include activity log modal state");
assert(storeScreenshots.includes("## Visual QA"), "STORE_SCREENSHOTS.md must include visual QA checks");
assert(storeScreenshots.includes("android-01-onboarding.png"), "STORE_SCREENSHOTS.md must define stable Android file names");
assert(storeScreenshots.includes("ios-01-onboarding.png"), "STORE_SCREENSHOTS.md must define stable iOS file names");

const storeAssets = read("STORE_ASSETS.md");
assert(storeAssets.includes("Web / PWA assets"), "STORE_ASSETS.md must document PWA assets");
assert(storeAssets.includes("Android assets"), "STORE_ASSETS.md must document Android assets");
assert(storeAssets.includes("iOS assets"), "STORE_ASSETS.md must document iOS assets");
assert(storeAssets.includes("1024x1024"), "STORE_ASSETS.md must document iOS App Store icon size");
assert(storeAssets.includes("maskable"), "STORE_ASSETS.md must document maskable icons");

const storeSubmission = read("STORE_SUBMISSION.md");
assert(storeSubmission.includes("STORE_CONSOLE.md"), "STORE_SUBMISSION.md must reference final console input package");
assert(storeSubmission.includes("Data Safety Draft"), "STORE_SUBMISSION.md must include the data safety draft");
assert(storeSubmission.includes("Remaining blockers before real submission"), "STORE_SUBMISSION.md must list remaining blockers");
assert(storeSubmission.includes("BACKEND_RELEASE.md"), "STORE_SUBMISSION.md must reference backend release checks");
assert(storeSubmission.includes("VERSIONING.md"), "STORE_SUBMISSION.md must reference versioning checks");
assert(storeSubmission.includes("ANDROID_PERMISSIONS.md"), "STORE_SUBMISSION.md must reference Android permission checks");
assert(storeSubmission.includes("STORE_RATING.md"), "STORE_SUBMISSION.md must reference rating/declaration checks");
assert(storeSubmission.includes("PRODUCTION_URLS.md"), "STORE_SUBMISSION.md must reference production URL checks");
assert(storeSubmission.includes("STORE_ASSETS.md"), "STORE_SUBMISSION.md must reference store asset checks");
assert(storeSubmission.includes("RELEASE_BLOCKERS.md"), "STORE_SUBMISSION.md must reference release blockers");
assert(storeSubmission.includes("RELEASE_EVIDENCE.md"), "STORE_SUBMISSION.md must reference release evidence");
assert(storeSubmission.includes("PrivacyInfo.xcprivacy"), "STORE_SUBMISSION.md must reference the iOS privacy manifest");
assert(storeSubmission.includes("delete-account"), "STORE_SUBMISSION.md must reference account deletion function");
assert(storeSubmission.includes("private Play Console / App Store Connect reviewer fields"), "STORE_SUBMISSION.md must keep demo credentials private");

const releaseRunbook = read("RELEASE_RUNBOOK.md");
assert(releaseRunbook.includes("STORE_CONSOLE.md"), "RELEASE_RUNBOOK.md must reference final console input package");
assert(releaseRunbook.includes("## Android review build"), "RELEASE_RUNBOOK.md must include Android review build steps");
assert(releaseRunbook.includes("npm run native:doctor"), "RELEASE_RUNBOOK.md must include native release doctor");
assert(releaseRunbook.includes("CI_RELEASE.md"), "RELEASE_RUNBOOK.md must reference CI confirmation checklist");
assert(releaseRunbook.includes("## iOS review build"), "RELEASE_RUNBOOK.md must include iOS review build steps");
assert(releaseRunbook.includes("Stop before review if:"), "RELEASE_RUNBOOK.md must include stop-before-review gates");
assert(releaseRunbook.includes("activity log scrolling"), "RELEASE_RUNBOOK.md must include activity log scrolling device test");
assert(releaseRunbook.includes("com.runnerds.app"), "RELEASE_RUNBOOK.md must include the app identifier");
assert(releaseRunbook.includes("BACKEND_RELEASE.md"), "RELEASE_RUNBOOK.md must reference backend release checks");
assert(releaseRunbook.includes("VERSIONING.md"), "RELEASE_RUNBOOK.md must reference versioning checks");
assert(releaseRunbook.includes("PrivacyInfo.xcprivacy"), "RELEASE_RUNBOOK.md must reference the iOS privacy manifest");
assert(releaseRunbook.includes("ANDROID_PERMISSIONS.md"), "RELEASE_RUNBOOK.md must reference Android permission checks");
assert(releaseRunbook.includes("STORE_RATING.md"), "RELEASE_RUNBOOK.md must reference rating/declaration checks");
assert(releaseRunbook.includes("PRODUCTION_URLS.md"), "RELEASE_RUNBOOK.md must reference production URL checks");
assert(releaseRunbook.includes("STORE_ASSETS.md"), "RELEASE_RUNBOOK.md must reference store asset checks");
assert(releaseRunbook.includes("RELEASE_BLOCKERS.md"), "RELEASE_RUNBOOK.md must reference release blockers");
assert(releaseRunbook.includes("RELEASE_EVIDENCE.md"), "RELEASE_RUNBOOK.md must reference release evidence");
assert(releaseRunbook.includes("Account deletion"), "RELEASE_RUNBOOK.md must include account deletion device test");
assert(releaseRunbook.includes("Release readiness"), "RELEASE_RUNBOOK.md must reference the CI release readiness workflow");
assert(releaseRunbook.includes("private reviewer fields"), "RELEASE_RUNBOOK.md must keep demo credentials private");

const releaseWorkflow = read(".github/workflows/release-check.yml");
assert(releaseWorkflow.includes("macos-15"), "release-check workflow must use macOS for plutil");
assert(releaseWorkflow.includes("npm ci"), "release-check workflow must install with npm ci");
assert(releaseWorkflow.includes("npm run release:check"), "release-check workflow must run npm run release:check");
assert(releaseWorkflow.includes("pull_request"), "release-check workflow must run on pull requests");

const backendRelease = read("BACKEND_RELEASE.md");
assert(backendRelease.includes("jnlexemtrjgwskzwybim"), "BACKEND_RELEASE.md must include the Supabase project ref");
assert(backendRelease.includes("supabase functions deploy coach"), "BACKEND_RELEASE.md must include Edge Function deploy command");
assert(backendRelease.includes("supabase functions deploy delete-account"), "BACKEND_RELEASE.md must include account deletion deploy command");
assert(backendRelease.includes("supabase secrets set OPENAI_API_KEY"), "BACKEND_RELEASE.md must document Edge Function secret setup");
assert(backendRelease.includes("SUPABASE_SERVICE_ROLE_KEY"), "BACKEND_RELEASE.md must document service role secret setup");
assert(backendRelease.includes("## Database schema and RLS"), "BACKEND_RELEASE.md must document database/RLS release checks");
assert(backendRelease.includes("## Auth review setup"), "BACKEND_RELEASE.md must document reviewer auth setup");
assert(backendRelease.includes("## Edge Function QA"), "BACKEND_RELEASE.md must document coach Edge Function QA");
assert(backendRelease.includes("coach-contract-v3"), "BACKEND_RELEASE.md must include the coach contract version");

assertIncludes("supabase-setup.sql", "enable row level security", "Supabase RLS enablement");
assertIncludes("supabase-setup.sql", "profiles_select_own", "profile owner select policy");
assertIncludes("supabase-setup.sql", "workspace_select_own", "workspace owner select policy");
assertIncludes("supabase/functions/coach/index.ts", "coach-contract-v3", "coach contract version");
assertIncludes("supabase/functions/delete-account/index.ts", "SUPABASE_SERVICE_ROLE_KEY", "delete-account service role secret");
assertIncludes("supabase/functions/delete-account/index.ts", 'payload.confirm !== "DELETE"', "delete-account confirmation guard");
assertIncludes("supabase/functions/delete-account/index.ts", "/auth/v1/admin/users", "delete-account auth deletion endpoint");
assertIncludes("supabase/functions/delete-account/index.ts", "runner_workspaces", "delete-account workspace cleanup");

const androidPermissionsDoc = read("ANDROID_PERMISSIONS.md");
assert(androidPermissionsDoc.includes("android.permission.INTERNET"), "ANDROID_PERMISSIONS.md must document INTERNET permission");
assert(androidPermissionsDoc.includes("Permissions not used"), "ANDROID_PERMISSIONS.md must document unused permission families");
assert(androidPermissionsDoc.includes("Advertising ID"), "ANDROID_PERMISSIONS.md must document no advertising ID");
assert(androidPermissionsDoc.includes("Play Data safety alignment"), "ANDROID_PERMISSIONS.md must document Play Data safety alignment");

const storeRating = read("STORE_RATING.md");
assert(storeRating.includes("Content rating answer baseline"), "STORE_RATING.md must include content rating baseline");
assert(storeRating.includes("Health and fitness declarations"), "STORE_RATING.md must include health declaration baseline");
assert(storeRating.includes("not a medical device"), "STORE_RATING.md must document non-medical-device positioning");
assert(storeRating.includes("does not diagnose, treat, monitor, cure, or prevent"), "STORE_RATING.md must document no diagnosis/treatment claims");
assert(storeRating.includes("no advertising SDK"), "STORE_RATING.md must document no ads/tracking");
assert(storeRating.includes("does not request location, camera, microphone, contacts, photo library, Bluetooth, or notification permissions"), "STORE_RATING.md must align with Android permissions");
assert(storeRating.includes("Official references"), "STORE_RATING.md must include official reference context");

const productionUrls = read("PRODUCTION_URLS.md");
assert(productionUrls.includes("/privacy.html"), "PRODUCTION_URLS.md must include privacy URL path");
assert(productionUrls.includes("/account-deletion.html"), "PRODUCTION_URLS.md must include account deletion URL path");
assert(productionUrls.includes("/safety.html"), "PRODUCTION_URLS.md must include safety URL path");
assert(productionUrls.includes("/support.html"), "PRODUCTION_URLS.md must include support URL path");
assert(productionUrls.includes("www"), "PRODUCTION_URLS.md must require publishing the prepared www bundle");
assert(productionUrls.includes("Do not publish the repository root"), "PRODUCTION_URLS.md must warn against root publishing");
assert(productionUrls.includes("env.js"), "PRODUCTION_URLS.md must verify local env is not public");
assert(productionUrls.includes("npm run production:urls"), "PRODUCTION_URLS.md must document production URL script");
assert(read("netlify.toml").includes('publish = "www"'), "Netlify must publish prepared www bundle");
assert(read("netlify.toml").includes('command = "npm run mobile:prepare"'), "Netlify must prepare web bundle before publish");
assert(read("netlify.toml").includes("Permissions-Policy"), "Netlify must include basic browser permission headers");

const releaseEvidence = read("RELEASE_EVIDENCE.md");
[
  "Final source state",
  "Production URLs",
  "Reviewer access",
  "Android signed build",
  "iOS signed build",
  "Production backend",
  "Store screenshots",
  "Store declarations",
  "Final stop-before-review audit",
].forEach((section) => {
  assert(releaseEvidence.includes(`## ${section}`), `RELEASE_EVIDENCE.md must include ${section}`);
});
assert(releaseEvidence.includes("Do not add reviewer passwords"), "RELEASE_EVIDENCE.md must forbid committed passwords");
assert(releaseEvidence.includes("signing keys"), "RELEASE_EVIDENCE.md must forbid signing key evidence");
assert(releaseEvidence.includes("RELEASE_BLOCKERS.md"), "RELEASE_EVIDENCE.md must reference release blockers");
assert(releaseEvidence.includes("CI_RELEASE.md"), "RELEASE_EVIDENCE.md must reference CI release checklist");
assert(releaseEvidence.includes("npm run production:urls"), "RELEASE_EVIDENCE.md must record production URL script result");
assert(releaseEvidence.includes("STORE_CONSOLE.md"), "RELEASE_EVIDENCE.md must reference store console input package");

const storeConsole = read("STORE_CONSOLE.md");
[
  "Shared app identity",
  "Public URLs",
  "Listing copy",
  "Privacy and data declarations",
  "Content rating and health declarations",
  "Assets and screenshots",
  "Pre-submit evidence",
  "Stop before submit",
].forEach((section) => {
  assert(storeConsole.includes(`## ${section}`), `STORE_CONSOLE.md must include ${section}`);
});
assert(storeConsole.includes("com.runnerds.app"), "STORE_CONSOLE.md must include app identifier");
assert(storeConsole.includes("STORE_LISTING.md"), "STORE_CONSOLE.md must reference listing copy");
assert(storeConsole.includes("STORE_SUBMISSION.md"), "STORE_CONSOLE.md must reference privacy/data declarations");
assert(storeConsole.includes("STORE_RATING.md"), "STORE_CONSOLE.md must reference rating declarations");
assert(storeConsole.includes("STORE_SCREENSHOTS.md"), "STORE_CONSOLE.md must reference screenshot checklist");
assert(storeConsole.includes("RELEASE_EVIDENCE.md"), "STORE_CONSOLE.md must reference evidence template");
assert(storeConsole.includes("Demo credentials"), "STORE_CONSOLE.md must warn about demo credentials");
assert(storeConsole.includes("npm run production:urls"), "STORE_CONSOLE.md must reference production URL script");

const ciRelease = read("CI_RELEASE.md");
assert(ciRelease.includes("Release readiness"), "CI_RELEASE.md must document the workflow name");
assert(ciRelease.includes(".github/workflows/release-check.yml"), "CI_RELEASE.md must document the workflow file");
assert(ciRelease.includes("npm run release:check"), "CI_RELEASE.md must document the required job");
assert(ciRelease.includes("twcheong99-cloud/run-nerds/actions/workflows/release-check.yml"), "CI_RELEASE.md must include the workflow URL");
assert(ciRelease.includes("gh run list"), "CI_RELEASE.md must include GitHub CLI confirmation commands");

const releaseBlockers = read("RELEASE_BLOCKERS.md");
assert(releaseBlockers.includes("Production privacy and support URLs"), "RELEASE_BLOCKERS.md must track production URL blocker");
assert(releaseBlockers.includes("RELEASE_EVIDENCE.md"), "RELEASE_BLOCKERS.md must reference release evidence");
assert(releaseBlockers.includes("PRODUCTION_URLS.md"), "RELEASE_BLOCKERS.md must reference production URL checklist");
assert(releaseBlockers.includes("Reviewer demo credentials"), "RELEASE_BLOCKERS.md must track reviewer credentials blocker");
assert(releaseBlockers.includes("Android signed build verification"), "RELEASE_BLOCKERS.md must track Android signed build blocker");
assert(releaseBlockers.includes("iOS signed build verification"), "RELEASE_BLOCKERS.md must track iOS signed build blocker");
assert(releaseBlockers.includes("npm run native:doctor"), "RELEASE_BLOCKERS.md must reference native release doctor");
assert(releaseBlockers.includes("Production Supabase/Auth/Edge Function verification"), "RELEASE_BLOCKERS.md must track backend production verification blocker");
assert(releaseBlockers.includes("Store screenshots from device builds"), "RELEASE_BLOCKERS.md must track device screenshot blocker");
assert(releaseBlockers.includes("Store icon and launch asset verification"), "RELEASE_BLOCKERS.md must track icon/launch asset blocker");
assert(releaseBlockers.includes("Store age rating and health declarations"), "RELEASE_BLOCKERS.md must track rating/declaration blocker");
assert(releaseBlockers.includes("CI confirmation on main"), "RELEASE_BLOCKERS.md must track CI confirmation blocker");
assert(releaseBlockers.includes("CI_RELEASE.md"), "RELEASE_BLOCKERS.md must reference CI confirmation checklist");
assert(releaseBlockers.includes("Do not mark the store-readiness goal complete"), "RELEASE_BLOCKERS.md must include completion rule");
assert(releaseBlockers.includes("never contain the credentials themselves"), "RELEASE_BLOCKERS.md must keep reviewer credentials out of repo docs");

const nativeDoctor = read("scripts/native-release-doctor.mjs");
assert(nativeDoctor.includes("Java Runtime / JDK"), "native release doctor must check Java/JDK");
assert(nativeDoctor.includes("Android Gradle wrapper"), "native release doctor must check Gradle wrapper");
assert(nativeDoctor.includes("Xcode selected"), "native release doctor must check Xcode selection");
assert(nativeDoctor.includes("Supabase CLI"), "native release doctor must check Supabase CLI");

const secretScan = read("scripts/secret-scan.mjs");
assert(secretScan.includes("OpenAI secret key"), "secret scan must check OpenAI key pattern");
assert(secretScan.includes("Supabase service role JWT"), "secret scan must check Supabase service role JWT pattern");
assert(secretScan.includes("Private key block"), "secret scan must check private key blocks");

const productionUrlScript = read("scripts/check-production-urls.mjs");
assert(productionUrlScript.includes("PRODUCTION_ORIGIN"), "production URL script must require PRODUCTION_ORIGIN");
assert(productionUrlScript.includes("/privacy.html"), "production URL script must check privacy page");
assert(productionUrlScript.includes("/account-deletion.html"), "production URL script must check account deletion page");
assert(productionUrlScript.includes("/env.js"), "production URL script must check env.js is not served");

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
