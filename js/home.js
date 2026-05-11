import { formatStatus } from "./plan.js";
import { renderCoachTab } from "./coach.js";

export function getTodayDayId() {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function renderHome(ctx) {
  renderTabs(ctx);
  renderProfileSummary(ctx);
  renderGoalSummary(ctx);
  renderTodayWorkout(ctx);
  renderWeekMiniCalendar(ctx);
  renderCoachTab(ctx);
}

function renderTabs({ dom, state }) {
  const activeTab = state.activeTab || "home";
  dom.coachView.classList.toggle("hidden", activeTab !== "coach");
  dom.homeView.classList.toggle("hidden", activeTab !== "home");
  dom.profileView.classList.toggle("hidden", activeTab !== "profile");
  dom.tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === activeTab));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRaceType(type) {
  if (type === "10k") return "10K";
  if (type === "half") return "하프";
  if (type === "full") return "풀";
  return type || "-";
}

function buildPostRunCoachQuestion(values) {
  if (values.pain === "sharp") {
    return "날카로운 통증이 있었네. 어느 부위가 언제부터 아팠고, 뛰는 동안 더 심해졌는지 말해줘. 다음 훈련은 안전 쪽으로 조정할게.";
  }
  if (values.pain === "light") {
    return "가벼운 통증 신호가 있어. 불편한 부위와 정도, 내일도 뛸 수 있을 것 같은지 알려줘.";
  }
  if (values.rpe === "hard") {
    return "오늘 체감이 꽤 높았네. 힘들었던 이유가 페이스, 다리 피로, 호흡, 수면 중 어디에 가까웠는지 말해줘.";
  }
  if (values.rpe === "easy") {
    return "좋아, 여유 있게 끝낸 날이야. 몸이 가벼웠던 이유나 다음 훈련에서 조금 올려도 될지 느낌을 알려줘.";
  }
  return "오늘 기록을 보면 계획 범위 안에서 끝낸 것 같아. 몸에 남은 피로와 다음 훈련 자신감을 한 줄로 말해줘.";
}

function renderProfileSummary({ dom, state }) {
  const initial = state.onboarding?.initialPlanningProfile;
  const profile = state.profile || {};
  const availableDays = initial?.availableTrainingDays || profile.availableDays || "-";
  const raceName = initial?.race?.name || profile.goalRace || "목표 미정";
  const raceType = initial?.race?.type || profile.raceType;
  const goalTime = initial?.race?.goalTime || profile.goalTime || "기록 미정";
  const pain = initial?.painArea || profile.pain || "없음";

  dom.profileSummary.innerHTML = `
    <article class="profile-card">
      <span class="mini-day-name">runner</span>
      <strong>${escapeHtml(profile.name || "Runner")}</strong>
      <p>${escapeHtml(profile.email || "이메일 없음")}</p>
    </article>
    <article class="profile-card">
      <span class="mini-day-name">goal</span>
      <strong>${escapeHtml(raceName)}</strong>
      <p>${escapeHtml(formatRaceType(raceType))} · ${escapeHtml(goalTime)}</p>
    </article>
    <article class="profile-card">
      <span class="mini-day-name">routine</span>
      <strong>주 ${escapeHtml(availableDays)}회</strong>
      <p>롱런 ${escapeHtml(profile.longRunDay === "sun" ? "일요일" : "토요일")} · 통증 ${escapeHtml(pain)}</p>
    </article>
  `;
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
  const { dom, state, updateSession, saveActivityLog, runSystemPulse } = ctx;
  const todayId = getTodayDayId();
  const todayDateKey = getTodayDateKey();
  const session = state.plan.find((item) => item.id === todayId) || state.plan[0];
  if (!session) return;
  const activityLog = state.activityLogs?.[todayDateKey];
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
    ${activityLog ? `<div class="activity-log-summary"><strong>저장된 기록</strong><span>${escapeHtml(activityLog.distance || "-")}km · ${escapeHtml(activityLog.duration || "-")} · ${escapeHtml(activityLog.rpe || "RPE -")}</span></div>` : ""}
    <div id="activityLogModal" class="activity-log-modal hidden" role="dialog" aria-modal="true">
      <form class="activity-log-dialog" id="activityLogForm">
        <div class="activity-log-head">
          <div>
            <span class="mini-day-name">manual log</span>
            <strong>훈련 기록</strong>
          </div>
          <button type="button" class="ghost-btn compact-btn" id="closeActivityLogBtn">닫기</button>
        </div>
        <div class="activity-log-grid">
          <label>거리(km)<input name="distance" type="number" min="0" step="0.1" value="${escapeHtml(activityLog?.distance || "")}" placeholder="예: 8.2" /></label>
          <label>시간<input name="duration" value="${escapeHtml(activityLog?.duration || "")}" placeholder="예: 48:30" /></label>
          <label>RPE<select name="rpe">
            <option value="" ${!activityLog?.rpe ? "selected" : ""}>선택</option>
            ${["easy", "target", "hard"].map((value) => `<option value="${value}" ${activityLog?.rpe === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
          <label>통증<select name="pain">
            ${["none", "light", "sharp"].map((value) => `<option value="${value}" ${activityLog?.pain === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
        </div>
        <div class="coach-note-field hidden" id="postRunCoachStep">
          <div class="coach-message coach">
            <span>COACH</span>
            <p id="postRunCoachQuestion">오늘 훈련이 몸에 어떻게 들어왔는지 말해줘. 다음 조정에 반영할게.</p>
          </div>
          <label>
            <span>YOU</span>
            <textarea name="memo" rows="3" placeholder="예: 후반에 종아리가 묵직했고 호흡은 괜찮았어.">${escapeHtml(activityLog?.memo || "")}</textarea>
          </label>
        </div>
        <button type="submit" id="activityLogSubmitBtn">${activityLog ? "기록 저장" : "코치 질문 받기"}</button>
      </form>
    </div>
  `;
  dom.todayWorkoutCard.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.status === "complete") {
        runSystemPulse(["opening workout log...", "preparing coach prompt..."], "훈련 기록을 열었어요", {
          onBeforeDone: () => dom.todayWorkoutCard.querySelector("#activityLogModal")?.classList.remove("hidden"),
        });
        return;
      }
      updateSession(session.id, { status: button.dataset.status });
    });
  });
  dom.todayWorkoutCard.querySelector("#closeActivityLogBtn")?.addEventListener("click", () => {
    dom.todayWorkoutCard.querySelector("#activityLogModal")?.classList.add("hidden");
  });
  dom.todayWorkoutCard.querySelector("#activityLogForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const coachStep = event.currentTarget.querySelector("#postRunCoachStep");
    const submitButton = event.currentTarget.querySelector("#activityLogSubmitBtn");
    if (coachStep?.classList.contains("hidden")) {
      runSystemPulse(["parsing workout data...", "evaluating recovery load...", "generating coach question..."], "코치 질문을 만들었어요", {
        onBeforeDone: () => {
          event.currentTarget.querySelector("#postRunCoachQuestion").textContent = buildPostRunCoachQuestion(values);
          coachStep.classList.remove("hidden");
          submitButton.textContent = "기록 저장";
        },
      });
      return;
    }
    saveActivityLog(todayDateKey, {
      dayId: session.id,
      distance: values.distance,
      duration: values.duration,
      rpe: values.rpe,
      pain: values.pain,
      coachQuestion: event.currentTarget.querySelector("#postRunCoachQuestion")?.textContent || "",
      memo: values.memo,
    });
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
