const origin = (process.env.PRODUCTION_ORIGIN || "").replace(/\/+$/, "");

if (!origin) {
  console.error("Set PRODUCTION_ORIGIN, for example: PRODUCTION_ORIGIN=https://example.vercel.app npm run production:urls");
  process.exit(1);
}

if (!origin.startsWith("https://")) {
  console.error("PRODUCTION_ORIGIN must use https://");
  process.exit(1);
}

const checks = [];

function add(ok, label, detail = "") {
  checks.push({ ok, label, detail });
}

async function fetchText(pathname) {
  const response = await fetch(`${origin}${pathname}`, {
    redirect: "manual",
  });
  const text = await response.text().catch(() => "");
  return { response, text };
}

const requiredPages = [
  ["/privacy.html", "개인정보"],
  ["/account-deletion.html", "계정 삭제"],
  ["/safety.html", "의료"],
  ["/support.html", "지원"],
];

for (const [pathname, requiredText] of requiredPages) {
  const { response, text } = await fetchText(pathname);
  add(response.ok, `${pathname} loads`, `${response.status} ${response.statusText}`);
  add(response.url.startsWith(origin), `${pathname} stays on production origin`, response.url);
  add(text.includes(requiredText), `${pathname} contains expected copy`, requiredText);
}

const manifest = await fetchText("/manifest.webmanifest");
add(manifest.response.ok, "/manifest.webmanifest loads", `${manifest.response.status} ${manifest.response.statusText}`);
add(
  (manifest.response.headers.get("content-type") || "").includes("application/manifest+json") ||
    (manifest.response.headers.get("content-type") || "").includes("application/json"),
  "/manifest.webmanifest has manifest/json content type",
  manifest.response.headers.get("content-type") || "missing content-type",
);
add(manifest.text.includes('"display"') && manifest.text.includes('"standalone"'), "/manifest.webmanifest is the app manifest");

const serviceWorker = await fetchText("/service-worker.js");
add(serviceWorker.response.ok, "/service-worker.js loads", `${serviceWorker.response.status} ${serviceWorker.response.statusText}`);
add(
  (serviceWorker.response.headers.get("cache-control") || "").toLowerCase().includes("no-cache"),
  "/service-worker.js is not aggressively cached",
  serviceWorker.response.headers.get("cache-control") || "missing cache-control",
);

const forbiddenPaths = [
  "/env.js",
  "/README.md",
  "/scripts/release-check.mjs",
  "/tests/coach-service.test.mjs",
  "/STORE_CONSOLE.md",
  "/RELEASE_EVIDENCE.md",
];

for (const pathname of forbiddenPaths) {
  const { response } = await fetchText(pathname);
  add(!response.ok, `${pathname} is not publicly served`, `${response.status} ${response.statusText}`);
}

for (const check of checks) {
  const mark = check.ok ? "PASS" : "FAIL";
  console.log(`${mark} ${check.label}`);
  if (check.detail) console.log(`  ${check.detail}`);
}

const failures = checks.filter((check) => !check.ok);

if (failures.length) {
  console.error("\nProduction URL check failed:");
  failures.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log("\nProduction URL check passed.");
