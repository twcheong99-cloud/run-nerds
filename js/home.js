import { formatStatus } from "./plan.js";

export function getTodayDayId() {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
}

export function renderHome(ctx) {
  renderHeader(ctx);
  renderGoalSummary(ctx);
  renderTodayWorkout(ctx);
  renderWeekMiniCalendar(ctx);
}

function renderHeader({ dom, state }) {
  dom.workspaceBadge.textContent = `${state.profile.email || "no-user"} workspace`;
  dom.planSource.textContent = `source: ${state.planMeta.source}`;
  dom.planFallback.textContent = `fallback: ${state.planMeta.fallbackReason}`;
}

export function renderGoalSummary({ dom, state }) {
  const initial = state.onboarding?.initialPlanningProfile;
  const goalTitle = initial?.primaryGoalType === "race"
    ? `${initial?.race?.name || state.profile.goalRace || "목표 대회"}`
    : initial?.nonRace?.focus ? `비대회 목표 · ${initial.nonRace.focus}` : state.profile.goalRace || "첫 목표 설정 완료";
  const goalCopy = initial?.primaryGoalType === "race"
    ? `${initial?.race?.type?.toUpperCase?.() || state.profile.raceType?.toUpperCase?.() || ""} · ${initial?.race?.date || "날짜 미정"} · ${initial?.race?.goalTime || state.profile.goalTime || "기록 미정"}`
    : `${initial?.nonRace?.durationWeeks || "-"}주 프로그램 · 주 ${initial?.availableTrainingDays || state.profile.availableDays || "-"}회`;
  dom.goalSummaryCard.innerHTML = `<div class="goal-main">${goalTitle}</div><div class="goal-copy">${goalCopy}</div>`;
}

export function renderTodayWorkout(ctx) {
  const { dom, state, updateSession } = ctx;
  const todayId = getTodayDayId();
  const session = state.plan.find((item) => item.id === todayId) || state.plan[0];
  if (!session) return;
  state.selectedDayId = session.id;
  dom.todayFocusBadge.textContent = `${session.day} focus`;
  dom.todayWorkoutCard.innerHTML = `
    <p class="today-title">${session.title}</p>
    <p class="today-subtitle">${session.subtitle}</p>
    <div class="today-metrics">
      <div class="today-metric"><div class="today-metric-label">DISTANCE</div><div class="today-metric-value">${session.distance}</div></div>
      <div class="today-metric"><div class="today-metric-label">DURATION</div><div class="today-metric-value">${session.duration}</div></div>
      <div class="today-metric"><div class="today-metric-label">INTENSITY</div><div class="today-metric-value">${session.intensity}</div></div>
    </div>
    <div class="session-detail">
      <strong>오늘의 목적</strong><br />${session.purpose}<br /><br />
      <strong>세션 구성</strong>
      <ul class="block-list">${session.blocks.map((block) => `<li>${block}</li>`).join("")}</ul>
      <strong>성공 기준</strong><br />${session.success}
    </div>
    <div class="today-actions">
      <button type="button" class="status-btn ${session.status === "complete" ? "active complete" : ""}" data-status="complete">완료</button>
      <button type="button" class="status-btn ${session.status === "failed" ? "active failed" : ""}" data-status="failed">실패</button>
      <button type="button" class="status-btn ${session.status === "skipped" ? "active skipped" : ""}" data-status="skipped">미실행</button>
    </div>
  `;
  dom.todayWorkoutCard.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => updateSession(session.id, { status: button.dataset.status }));
  });
}

export function renderWeekMiniCalendar(ctx) {
  const { dom, state, updateSession } = ctx;
  const todayId = getTodayDayId();
  const completedCount = state.plan.filter((session) => session.status === "complete").length;
  dom.weekSummaryBadge.textContent = `${completedCount}/${state.plan.length} complete`;
  dom.weekMiniCalendar.innerHTML = state.plan.map((session) => `
    <article class="mini-day-card ${session.id === todayId ? "today" : ""}">
      <div class="mini-day-head">
        <span class="mini-day-name">${session.day}</span>
        <span class="badge neutral">${formatStatus(session.status)}</span>
      </div>
      <p class="mini-day-title">${session.title}</p>
      <p class="mini-day-copy">${session.subtitle}</p>
      <div class="mini-status-row">
        <button type="button" class="status-btn ${session.status === "complete" ? "active complete" : ""}" data-id="${session.id}" data-status="complete">완료</button>
        <button type="button" class="status-btn ${session.status === "failed" ? "active failed" : ""}" data-id="${session.id}" data-status="failed">실패</button>
        <button type="button" class="status-btn ${session.status === "skipped" ? "active skipped" : ""}" data-id="${session.id}" data-status="skipped">미실행</button>
      </div>
    </article>
  `).join("");
  dom.weekMiniCalendar.querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => updateSession(button.dataset.id, { status: button.dataset.status }));
  });
}
