const envReady = window.RUN_NERDS_ENV_READY || Promise.resolve();

function isStandaloneDisplay() {
  return window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
}

function canRegisterServiceWorker() {
  return "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function installServiceWorker() {
  if (!canRegisterServiceWorker()) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

function updateNetworkStatus() {
  let status = document.querySelector("[data-network-status]");

  if (navigator.onLine !== false) {
    status?.remove();
    return;
  }

  if (!status) {
    status = document.createElement("div");
    status.className = "network-status";
    status.setAttribute("role", "status");
    status.setAttribute("data-network-status", "");
    document.body.appendChild(status);
  }

  status.textContent = isStandaloneDisplay()
    ? "오프라인 모드 · 연결되면 동기화를 이어갑니다"
    : "오프라인 상태 · 일부 기능은 연결 후 사용할 수 있습니다";
}

function renderBootFallback(error) {
  console.error("App boot failed", error);

  const offline = navigator.onLine === false;
  const title = offline ? "연결을 기다리고 있어요" : "앱을 불러오지 못했어요";
  const message = offline
    ? "설치된 화면은 열렸지만 로그인, 코치 응답, 기록 동기화는 네트워크가 다시 연결된 뒤 이어집니다."
    : "환경 설정이나 네트워크 응답을 확인한 뒤 다시 시도해 주세요.";
  const detail = error?.message ? String(error.message) : "알 수 없는 초기화 오류";

  document.body.innerHTML = `
    <main class="boot-fallback" role="main">
      <section class="boot-fallback-card panel" aria-labelledby="bootFallbackTitle">
        <p class="boot-fallback-kicker">RUN-NERDS SYSTEM</p>
        <h1 id="bootFallbackTitle">${title}</h1>
        <p>${message}</p>
        <div class="boot-fallback-detail" aria-label="오류 정보">${escapeHtml(detail)}</div>
        <div class="boot-fallback-actions">
          <button type="button" data-reload-app>다시 시도</button>
        </div>
      </section>
    </main>
  `;

  document.querySelector("[data-reload-app]")?.addEventListener("click", () => {
    window.location.reload();
  });
}

window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
updateNetworkStatus();
installServiceWorker();

envReady.then(async () => {
  const { initApp } = await import("./js/app-main.js");
  await initApp();
}).catch((error) => {
  renderBootFallback(error);
});
