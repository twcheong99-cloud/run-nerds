import { formatStatus } from "./plan.js";
import { renderCoachTab } from "./coach.js";
import { getGoalDate, getNonRaceGoalLabel, hasFinishedRaceGoal, normalizeGoalLifecycle } from "./goal-lifecycle.js";

export function getTodayDayId() {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
}

function formatLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getTodayDateKey() {
  return formatLocalDateKey(new Date());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function getWeekStart(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  return start;
}

function getWeeklyReviewKey(date = new Date()) {
  return `weekly-review-${formatLocalDateKey(getWeekStart(date))}`;
}

function getPreviousWeekRange(date = new Date()) {
  const thisWeekStart = getWeekStart(date);
  const start = addDays(thisWeekStart, -7);
  const end = addDays(thisWeekStart, -1);
  return { start: formatLocalDateKey(start), end: formatLocalDateKey(end) };
}

function getLogsInRange(activityLogs = {}, start, end) {
  return Object.values(activityLogs || {})
    .filter((log) => {
      const date = String(log?.date || "");
      return date >= start && date <= end && !String(log?.source || "").startsWith("weekly-review");
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function summarizeWeeklyActivity(activityLogs = {}, date = new Date()) {
  const range = getPreviousWeekRange(date);
  const logs = getLogsInRange(activityLogs, range.start, range.end);
  const runLogs = logs.filter((log) => log.source === "manual");
  const checkins = logs.filter((log) => log.source === "condition-check-in" || log.source === "coach-check-in");
  const completed = logs.filter((log) => log.status === "complete" || log.source === "manual").length;
  const missed = logs.filter((log) => log.status === "skipped" || log.status === "failed").length;
  const distance = runLogs.reduce((sum, log) => sum + (Number(log.distance) || 0), 0);
  const painSignals = logs.filter((log) => log.pain === "sharp" || log.reason === "pain" || /통증|아픔|아파/.test(String(log.memo || ""))).length;
  const fatigueSignals = logs.filter((log) => log.reason === "fatigue" || /피로|무거|지침|잠|수면/.test(String(log.memo || ""))).length;
  const summaryParts = [
    `${range.start}~${range.end}`,
    `기록 ${logs.length}개`,
    `완료 ${completed}회`,
    missed ? `미실행/실패 ${missed}회` : "",
    runLogs.length ? `러닝 ${distance.toFixed(1).replace(/\.0$/, "")}km` : "",
    checkins.length ? `컨디션 체크 ${checkins.length}회` : "",
    painSignals ? `통증 신호 ${painSignals}회` : "",
    fatigueSignals ? `피로 신호 ${fatigueSignals}회` : "",
  ].filter(Boolean);
  return {
    range,
    logs,
    runLogs,
    checkins,
    completed,
    missed,
    distance,
    painSignals,
    fatigueSignals,
    text: summaryParts.join(" · "),
  };
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

function formatGoalFocus(focus) {
  if (focus === "fitness") return "체력 향상";
  if (focus === "comeback") return "복귀";
  return "꾸준함";
}

function formatBodyCondition(condition) {
  if (condition === "good" || condition === "fresh") return "가벼움";
  if (condition === "cautious" || condition === "tired" || condition === "heavy") return "주의 필요";
  if (condition === "normal") return "보통";
  return condition || "기록 없음";
}

function formatPainStatus(pain) {
  if (!pain || pain === "none") return "통증 없음";
  if (pain === "light") return "가벼운 불편";
  if (pain === "sharp" || pain === "worrying") return "주의 신호";
  return pain;
}

function getPhysicalStatusLevel({ bodyCondition, painStatus, checkin }) {
  if (painStatus === "sharp" || /날카|심한|악화|sharp|severe/.test(String(painStatus || ""))) {
    return {
      level: "red",
      label: "RED",
      summary: "중단 권장",
    };
  }
  if (
    painStatus === "light" ||
    painStatus === "worrying" ||
    bodyCondition === "cautious" ||
    bodyCondition === "tired" ||
    bodyCondition === "heavy" ||
    checkin?.fatigue === "high" ||
    checkin?.sleep === "poor" ||
    checkin?.pain === "worrying"
  ) {
    return {
      level: "yellow",
      label: "YELLOW",
      summary: "주의 필요",
    };
  }
  return {
    level: "green",
    label: "GREEN",
    summary: "훈련 가능",
  };
}

function formatActivityLogSummary(log) {
  if (!log) return "";
  if (log.source === "coach-check-in") {
    const statusLabel = log.status === "skipped" ? "미실행" : "실패";
    const reasonLabel = {
      fatigue: "피로",
      pain: "통증",
      schedule: "일정",
      pace: "강도/페이스",
      weather: "날씨",
      other: "기타",
    }[log.reason] || "이유 기록";
    return `${statusLabel} · ${reasonLabel}`;
  }
  return `${escapeHtml(log.distance || "-")}km · ${escapeHtml(log.duration || "-")} · ${escapeHtml(log.rpe || "RPE -")}`;
}

function displayProfileNote(value, kind) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/(이번 주|오늘|내일|어제|이틀만|살짝|해보려고|고민|어떻게 할까|할 수 있을|어렵겠|가능하고|가능해|못.*하|못하|바빠|아직)/.test(text)) return "";
  if (kind === "physical" && !/(통증|불편|피로|수면|회복|부상|무릎|발목|종아리|햄스트링|허리|컨디션|몸)/.test(text)) return "";
  if (kind === "goal" && !/(목표|대회|기록|완주|마라톤|하프|10K|10k|풀|페이스|서브|시간)/.test(text)) return "";
  if (kind === "coach" && !/(회복|강도|볼륨|조정|유지|주의|압축|추천|우선|전략|리듬|훈련)/.test(text)) return "";
  return summarizeProfileNote(text, kind);
}

function summarizeProfileNote(text, kind) {
  const firstSentence = text.split(/[.!?。]| \/ /).map((item) => item.trim()).find(Boolean) || text;
  const maxLength = kind === "physical" ? 34 : 44;
  return firstSentence.length > maxLength ? `${firstSentence.slice(0, maxLength - 1)}…` : firstSentence;
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

function buildStatusCoachQuestion(status, values) {
  if (status === "failed") {
    if (values.reason === "pain") return "통증 때문에 멈췄다면 어디가, 어느 시점부터, 뛰면서 더 심해졌는지 알려줘. 다음 훈련 강도를 안전하게 낮출게.";
    if (values.reason === "fatigue") return "피로 때문에 끝내기 어려웠다면 다리 무거움, 호흡, 수면 중 무엇이 제일 컸는지 알려줘. 회복 쪽으로 조정할게.";
    if (values.reason === "pace") return "페이스나 강도가 맞지 않았다면 어느 구간부터 무너졌는지 알려줘. 다음 세션의 강도 기준을 다시 잡을게.";
    return "어디까지 했고 무엇 때문에 멈췄는지 조금만 더 말해줘. 실패 기록도 다음 조정에 중요한 입력이야.";
  }
  if (values.reason === "schedule") return "일정 때문에 못 했다면 이번 주 남은 날 중 현실적으로 뛸 수 있는 날을 알려줘. 계획을 압축해서 다시 맞출게.";
  if (values.reason === "fatigue") return "피로 때문에 쉬었다면 수면, 다리 무거움, 전신 피로 중 무엇이 컸는지 알려줘. 회복을 훈련으로 계산할게.";
  if (values.reason === "pain") return "통증 때문에 쉬었다면 부위와 통증 강도, 내일도 뛸 수 있을지 알려줘. 다음 훈련은 안전 쪽으로 볼게.";
  return "오늘 미실행한 이유를 조금만 더 말해줘. 코칭에서는 못 뛴 이유까지 같이 보고 다음 훈련을 조정할게.";
}

function buildConditionCoachQuestion(values = {}) {
  if (values.reason === "good") return "좋아. 쉬거나 보강한 뒤 몸이 가벼웠다면 어떤 부분이 좋아졌는지 적어줘. 다음 증량 판단에 쓰겠습니다.";
  if (values.reason === "fatigue") return "휴식/보강 후에도 피로가 남았다면 다리 무거움, 전신 피로, 수면 중 무엇이 컸는지 알려줘.";
  if (values.reason === "pain") return "통증 신호가 있었다면 부위, 강도, 움직일 때 심해지는지 적어줘. 다음 계획은 안전 쪽으로 조정할게.";
  if (values.reason === "sleep") return "수면이 부족했다면 몇 시간 정도였고, 몸이 무거운지 정신 피로가 큰지 알려줘.";
  if (values.reason === "stress") return "생활 스트레스가 컸다면 이번 주 훈련을 줄여야 할 정도인지 한 줄로 적어줘.";
  return "오늘 쉬거나 몸을 돌본 뒤 현재 컨디션을 한 줄로 적어줘. 이 기록이 다음 계획 조정의 재료가 됩니다.";
}

function buildWeeklyReviewQuestion(summary) {
  if (summary.painSignals) return "지난주 기록에 통증 신호가 보여요. 지금 남아 있는 불편 부위와 이번 주 훈련을 줄여야 할 정도인지 알려줘.";
  if (summary.fatigueSignals || summary.missed) return "지난주는 피로/미실행 신호가 있었어요. 지금 다리 피로, 수면, 이번 주 가능 시간을 같이 알려줘.";
  if (summary.runLogs.length) return "지난주 훈련은 기록상 이어졌어요. 지금 몸이 받아들인 느낌과 이번 주 올려도 될지 알려줘.";
  return "지난주 기록이 많지 않아요. 지금 몸상태와 이번 주 현실적으로 가능한 훈련 리듬을 알려줘.";
}

function normalizeDayList(value) {
  const dayMap = {
    월: "mon", 화: "tue", 수: "wed", 목: "thu", 금: "fri", 토: "sat", 일: "sun",
    mon: "mon", tue: "tue", wed: "wed", thu: "thu", fri: "fri", sat: "sat", sun: "sun",
  };
  return String(value || "")
    .split(/[,\s/]+/)
    .map((token) => dayMap[token.trim().toLowerCase()] || dayMap[token.trim()])
    .filter(Boolean)
    .join(",");
}

function hasActiveTemporarySchedule(checkin, profile) {
  const temporaryAvailableDays = checkin?.temporaryAvailableDays;
  const hasTemporaryAvailableDays = temporaryAvailableDays !== null
    && temporaryAvailableDays !== undefined
    && String(temporaryAvailableDays).trim() !== ""
    && Number(temporaryAvailableDays) !== Number(profile?.availableDays || 0);
  const temporaryPreferredDays = normalizeDayList(checkin?.temporaryPreferredDays);
  const profilePreferredDays = normalizeDayList(profile?.preferredDays);
  const hasTemporaryPreferredDays = Boolean(temporaryPreferredDays && temporaryPreferredDays !== profilePreferredDays);
  const temporaryLongRunDay = String(checkin?.temporaryLongRunDay || "").trim();
  const profileLongRunDay = String(profile?.longRunDay || "").trim();
  const hasTemporaryLongRunDay = Boolean(temporaryLongRunDay && temporaryLongRunDay !== profileLongRunDay);
  return hasTemporaryAvailableDays || hasTemporaryPreferredDays || hasTemporaryLongRunDay;
}

function setActivityLogOpen(isOpen) {
  document.body.classList.toggle("activity-log-open", isOpen);
}

function renderProfileSummary({ dom, state }) {
  const initial = state.onboarding?.initialPlanningProfile;
  const profile = state.profile || {};
  const availableDays = profile.availableDays || initial?.availableTrainingDays || "-";
  const raceName = profile.goalRace || initial?.race?.name || "목표 미정";
  const raceType = profile.raceType || initial?.race?.type;
  const goalTime = profile.goalTime || initial?.race?.goalTime || "기록 미정";
  const pain = initial?.painArea || profile.pain || "없음";
  const bodyCondition = initial?.bodyCondition || profile.fatigue || state.checkin?.fatigue;
  const bodyNote = displayProfileNote(profile.physicalNotes, "physical") || displayProfileNote(initial?.bodyConditionNote, "physical");
  const painStatus = initial?.painArea || profile.pain || state.checkin?.pain;
  const goalNote = displayProfileNote(profile.goalNotes, "goal");
  const physicalStatus = getPhysicalStatusLevel({ bodyCondition, painStatus, checkin: state.checkin });

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
      ${goalNote ? `<p>${escapeHtml(goalNote)}</p>` : ""}
    </article>
    <article class="profile-card">
      <span class="mini-day-name">routine</span>
      <strong>주 ${escapeHtml(availableDays)}회</strong>
      <p>롱런 ${escapeHtml(profile.longRunDay === "sun" ? "일요일" : "토요일")}</p>
    </article>
    <article class="profile-card physical-status-card status-${physicalStatus.level}">
      <span class="mini-day-name">physical status</span>
      <strong><span class="physical-status-badge">${physicalStatus.label}</span>${escapeHtml(physicalStatus.summary)}</strong>
      <p>컨디션 · ${escapeHtml(formatBodyCondition(bodyCondition))}</p>
      <p>통증 · ${escapeHtml(formatPainStatus(painStatus))}</p>
      ${bodyNote ? `<p>${escapeHtml(bodyNote)}</p>` : ""}
    </article>
  `;
}

export function renderGoalSummary(ctx) {
  const { dom, state } = ctx;
  const initial = state.onboarding?.initialPlanningProfile;
  const profile = state.profile || {};
  const goalLifecycle = normalizeGoalLifecycle(state.goalLifecycle);
  const goalDate = getGoalDate(state);
  const isRaceGoal = initial?.primaryGoalType === "race" || Boolean(goalDate);
  const goalTitle = profile.goalRace
    || (initial?.primaryGoalType === "race" ? initial?.race?.name : initial?.nonRace?.focus ? `비대회 목표 · ${initial.nonRace.focus}` : "")
    || "첫 목표 설정 완료";
  const raceType = profile.raceType || initial?.race?.type || "";
  const goalTime = profile.goalTime || initial?.race?.goalTime || "기록 미정";
  const goalCopy = isRaceGoal
    ? `${raceType.toUpperCase?.() || ""} · ${goalDate || "날짜 미정"} · ${goalTime}`
    : `${initial?.nonRace?.durationWeeks || "-"}주 프로그램 · 주 ${profile.availableDays || initial?.availableTrainingDays || "-"}회`;
  if (dom.goalStripMain) dom.goalStripMain.textContent = goalTitle;
  if (dom.goalStripMeta) dom.goalStripMeta.textContent = goalCopy;
  const showLifecycleCard = hasFinishedRaceGoal(state) || goalLifecycle.activeRecovery || initial?.primaryGoalType === "non-race";
  dom.goalSummaryCard.closest(".goal-panel")?.classList.toggle("active", Boolean(showLifecycleCard));
  dom.goalSummaryCard.innerHTML = [
    `<div class="goal-main">${escapeHtml(goalTitle)}</div><div class="goal-copy">${escapeHtml(goalCopy)}</div>`,
    renderGoalLifecyclePanel(state),
  ].join("");
  bindGoalLifecycleActions(ctx);
}

function renderGoalLifecyclePanel(state) {
  const initial = state.onboarding?.initialPlanningProfile || {};
  const profile = state.profile || {};
  const goalLifecycle = normalizeGoalLifecycle(state.goalLifecycle);
  const draft = goalLifecycle.nextGoalDraft;
  if (hasFinishedRaceGoal(state) && !goalLifecycle.activeRecovery) return `
    <form class="goal-lifecycle-card" id="goalReviewForm">
      <div>
        <span class="mini-day-name">finish line</span>
        <strong>목표 이벤트가 끝났어요</strong>
        <p>바로 다음 계획을 밀어붙이기보다, 기록과 몸 상태를 먼저 남기고 회복 주간으로 전환할게요.</p>
      </div>
      <div class="activity-log-grid">
        <label>실제 기록<input name="actualTime" placeholder="예: 1:48:30" /></label>
        <label>체감<select name="effort"><option value="smooth">여유</option><option value="steady">적당함</option><option value="hard">많이 힘듦</option></select></label>
        <label>통증<select name="pain"><option value="none">통증 없음</option><option value="light">가벼운 불편</option><option value="sharp">주의 신호</option></select></label>
        <label>메모<input name="memo" placeholder="잘 된 점이나 아쉬운 점" /></label>
      </div>
      <button type="submit" class="submit-pixel-btn">회고 저장하고 회복 시작</button>
    </form>
  `;
  if (goalLifecycle.activeRecovery) return `
    <div class="goal-lifecycle-card">
      <div>
        <span class="mini-day-name">recovery block</span>
        <strong>회복 주간 진행 중</strong>
        <p>이번 주는 훈련량보다 회복, 통증 체크, 다음 목표 선택을 우선합니다.</p>
      </div>
      ${renderNextGoalChooser(draft)}
    </div>
  `;
  if (initial.primaryGoalType === "non-race") return `
    <div class="goal-lifecycle-card compact">
      <div>
        <span class="mini-day-name">race target</span>
        <strong>대회는 나중에 추가할 수 있어요</strong>
        <p>지금은 ${escapeHtml(getNonRaceGoalLabel(initial.nonRace?.focus || "consistency"))}으로 가고, 대회가 정해지면 바로 시즌 목표로 바꿀 수 있습니다.</p>
      </div>
      ${renderRaceGoalForm("addRaceGoalForm", profile)}
    </div>
  `;
  return "";
}

function renderNextGoalChooser(draft) {
  const mode = draft.mode || "";
  return `
    <div class="next-goal-mode">
      <button type="button" class="choice-card ${mode === "race" ? "selected" : ""}" data-next-goal-mode="race">
        <div class="choice-title">RACE MODE</div>
        <div class="choice-copy">대회 날짜와 목표 기록을 중심으로 다음 시즌을 준비합니다.</div>
      </button>
      <button type="button" class="choice-card ${mode === "non-race" ? "selected" : ""}" data-next-goal-mode="non-race">
        <div class="choice-title">NO RACE</div>
        <div class="choice-copy">대회 없이 루틴, 체력, 복귀 흐름을 먼저 만듭니다.</div>
      </button>
    </div>
    ${mode === "race" ? renderRaceGoalForm("nextGoalForm", draft) : ""}
    ${mode === "non-race" ? renderNonRaceGoalForm(draft) : ""}
  `;
}

function renderRaceGoalForm(id, values = {}) {
  return `
    <form class="next-goal-form" id="${id}">
      <input type="hidden" name="mode" value="race" />
      <div class="activity-log-grid">
        <label>대회 이름<input name="raceName" value="${escapeHtml(values.raceName || values.goalRace || "")}" placeholder="예: 서울하프마라톤" required /></label>
        <label>종목<select name="raceType"><option value="10k" ${(values.raceType || "") === "10k" ? "selected" : ""}>10K</option><option value="half" ${(values.raceType || "half") === "half" ? "selected" : ""}>하프</option><option value="full" ${(values.raceType || "") === "full" ? "selected" : ""}>풀</option></select></label>
        <label>대회 날짜<input name="raceDate" type="date" value="${escapeHtml(values.raceDate || values.goalDate || "")}" required /></label>
        <label>목표 기록<input name="raceGoalTime" value="${escapeHtml(values.raceGoalTime || values.goalTime || "")}" placeholder="예: 하프 1:45" /></label>
      </div>
      <button type="submit" class="submit-pixel-btn">${id === "addRaceGoalForm" ? "대회 목표 추가" : "다음 대회 시작"}</button>
    </form>
  `;
}

function renderNonRaceGoalForm(draft) {
  return `
    <form class="next-goal-form" id="nextGoalForm">
      <input type="hidden" name="mode" value="non-race" />
      <div class="activity-log-grid">
        <label>목표 방향<select name="nonRaceFocus"><option value="consistency" ${draft.nonRaceFocus === "consistency" ? "selected" : ""}>꾸준함</option><option value="fitness" ${draft.nonRaceFocus === "fitness" ? "selected" : ""}>체력 향상</option><option value="comeback" ${draft.nonRaceFocus === "comeback" ? "selected" : ""}>복귀</option></select></label>
        <label>기간<select name="programDurationWeeks"><option value="6" ${draft.programDurationWeeks === "6" ? "selected" : ""}>6주</option><option value="8" ${draft.programDurationWeeks === "8" ? "selected" : ""}>8주</option><option value="12" ${draft.programDurationWeeks === "12" ? "selected" : ""}>12주</option><option value="16" ${draft.programDurationWeeks === "16" ? "selected" : ""}>16주</option></select></label>
      </div>
      <p class="goal-lifecycle-note">대회가 정해지면 이 카드에서 바로 대회 목표를 추가할 수 있습니다.</p>
      <button type="submit" class="submit-pixel-btn">${escapeHtml(formatGoalFocus(draft.nonRaceFocus))} 목표 시작</button>
    </form>
  `;
}

function bindGoalLifecycleActions({ dom, saveGoalReview, chooseNextGoalMode, saveNextGoal, addRaceGoal }) {
  dom.goalSummaryCard.querySelector("#goalReviewForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveGoalReview(Object.fromEntries(new FormData(event.currentTarget).entries()));
  });
  dom.goalSummaryCard.querySelectorAll("[data-next-goal-mode]").forEach((button) => {
    button.addEventListener("click", () => chooseNextGoalMode(button.dataset.nextGoalMode));
  });
  dom.goalSummaryCard.querySelector("#nextGoalForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveNextGoal(Object.fromEntries(new FormData(event.currentTarget).entries()));
  });
  dom.goalSummaryCard.querySelector("#addRaceGoalForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addRaceGoal(Object.fromEntries(new FormData(event.currentTarget).entries()));
  });
}

export function renderTodayWorkout(ctx) {
  const { dom, state, updateSession, saveActivityLog, saveWorkoutStatusNote, runSystemPulse } = ctx;
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
      <p class="detail-kicker">SESSION DETAIL</p>
      <strong>오늘의 목적</strong><br />${session.purpose}
      <p class="detail-kicker">BLOCKS</p>
      <ul class="block-list">${session.blocks.map((block) => `<li>${block}</li>`).join("")}</ul>
      <strong>성공 기준</strong><br />${session.success}
    </div>
    <div class="today-actions">
      <button type="button" class="status-btn ${session.status === "complete" ? "active complete" : ""}" data-status="complete">완료</button>
      <button type="button" class="status-btn ${session.status === "failed" ? "active failed" : ""}" data-status="failed">실패</button>
      <button type="button" class="status-btn ${session.status === "skipped" ? "active skipped" : ""}" data-status="skipped">미실행</button>
    </div>
    ${activityLog ? `<div class="activity-log-summary"><strong>저장된 기록</strong><span>${formatActivityLogSummary(activityLog)}</span></div>` : ""}
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
        <div class="activity-log-actions">
          <button type="button" class="ghost-btn submit-pixel-btn" id="generateCoachQuestionBtn">코치 질문 받기</button>
          <button type="submit" class="submit-pixel-btn" id="activityLogSubmitBtn">기록 저장</button>
        </div>
      </form>
    </div>
    <div id="statusNoteModal" class="activity-log-modal hidden" role="dialog" aria-modal="true">
      <form class="activity-log-dialog" id="statusNoteForm">
        <div class="activity-log-head">
          <div>
            <span class="mini-day-name" id="statusNoteKicker">coach check-in</span>
            <strong id="statusNoteTitle">훈련 체크인</strong>
          </div>
          <button type="button" class="ghost-btn compact-btn" id="closeStatusNoteBtn">닫기</button>
        </div>
        <input type="hidden" name="status" id="statusNoteStatus" />
        <div class="activity-log-grid">
          <label id="statusProgressField">어디까지 했나요?<input name="progress" placeholder="예: 워밍업 후 2km에서 중단" /></label>
          <label id="statusReasonField"><span>가장 큰 이유</span><select name="reason">
            <option value="fatigue">피로</option>
            <option value="pain">통증</option>
            <option value="schedule">일정</option>
            <option value="pace">강도/페이스</option>
            <option value="weather">날씨</option>
            <option value="other">기타</option>
          </select></label>
        </div>
        <div class="coach-note-field">
          <div class="coach-message coach">
            <span>COACH</span>
            <p id="statusCoachQuestion">오늘 훈련이 막힌 이유를 알려줘. 다음 조정에 반영할게.</p>
          </div>
          <label>
            <span>YOU</span>
            <textarea name="memo" rows="3" placeholder="예: 야근 후 다리가 무거워서 조깅 2km만 하고 멈췄어."></textarea>
          </label>
        </div>
        <button type="submit" class="submit-pixel-btn">SUBMIT</button>
      </form>
    </div>
  `;
  const openStatusNoteModal = (status, mode = "training") => {
    const modal = dom.todayWorkoutCard.querySelector("#statusNoteModal");
    const statusField = modal?.querySelector("#statusNoteStatus");
    const title = modal?.querySelector("#statusNoteTitle");
    const progressField = modal?.querySelector("#statusProgressField");
    const reasonField = modal?.querySelector("#statusReasonField");
    const reasonSelect = modal?.querySelector("select[name='reason']");
    const question = modal?.querySelector("#statusCoachQuestion");
    if (!modal || !statusField || !title || !progressField || !question || !reasonSelect) return;
    statusField.value = status;
    const isCondition = mode === "condition";
    title.textContent = isCondition ? "컨디션 체크인" : status === "failed" ? "실패 이유 기록" : "미실행 이유 기록";
    progressField.classList.toggle("hidden", isCondition || status === "skipped");
    const reasonLabel = reasonField?.querySelector("span");
    if (reasonLabel) reasonLabel.textContent = isCondition ? "오늘 몸상태" : "가장 큰 이유";
    reasonSelect.innerHTML = isCondition
      ? [
          ["good", "가벼움"],
          ["fatigue", "피로"],
          ["pain", "통증"],
          ["sleep", "수면 부족"],
          ["stress", "생활 스트레스"],
          ["other", "기타"],
        ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("")
      : [
          ["fatigue", "피로"],
          ["pain", "통증"],
          ["schedule", "일정"],
          ["pace", "강도/페이스"],
          ["weather", "날씨"],
          ["other", "기타"],
        ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    question.textContent = isCondition
      ? buildConditionCoachQuestion({ reason: reasonSelect.value })
      : status === "failed"
        ? "어디까지 했고 어떤 불편 때문에 멈췄는지 알려줘. 다음 훈련 조정에 반영할게."
        : "오늘 훈련을 못 한 이유를 알려줘. 일정, 피로, 통증 중 무엇이 컸는지 보고 다음 흐름을 맞출게.";
    setActivityLogOpen(true);
    modal.classList.remove("hidden");
  };
  dom.todayWorkoutCard.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.status === "complete") {
        if (session.type === "rest" || session.type === "mobility") {
          runSystemPulse(["opening condition check-in...", "preparing coach question..."], "컨디션 체크인을 열었어요", {
            onBeforeDone: () => openStatusNoteModal("complete", "condition"),
          });
          return;
        }
        runSystemPulse(["opening workout log...", "preparing coach prompt..."], "훈련 기록을 열었어요", {
          onBeforeDone: () => {
            setActivityLogOpen(true);
            dom.todayWorkoutCard.querySelector("#activityLogModal")?.classList.remove("hidden");
          },
        });
        return;
      }
      runSystemPulse(["opening coach check-in...", "preparing adjustment prompt..."], "체크인을 열었어요", {
        onBeforeDone: () => openStatusNoteModal(button.dataset.status),
      });
    });
  });
  dom.todayWorkoutCard.querySelector("#closeActivityLogBtn")?.addEventListener("click", () => {
    setActivityLogOpen(false);
    dom.todayWorkoutCard.querySelector("#activityLogModal")?.classList.add("hidden");
  });
  dom.todayWorkoutCard.querySelector("#closeStatusNoteBtn")?.addEventListener("click", () => {
    setActivityLogOpen(false);
    dom.todayWorkoutCard.querySelector("#statusNoteModal")?.classList.add("hidden");
  });
  dom.todayWorkoutCard.querySelector("#generateCoachQuestionBtn")?.addEventListener("click", (event) => {
    const form = event.currentTarget.form;
    if (!form) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const coachStep = form.querySelector("#postRunCoachStep");
    const question = form.querySelector("#postRunCoachQuestion");
    if (!coachStep || !question) return;
    event.currentTarget.disabled = true;
    runSystemPulse(["parsing workout data...", "evaluating recovery load...", "generating coach question..."], "코치 질문을 만들었어요", {
      onBeforeDone: () => {
        question.textContent = buildPostRunCoachQuestion(values);
        coachStep.classList.remove("hidden");
        event.currentTarget.classList.add("hidden");
      },
    }).finally(() => {
      event.currentTarget.disabled = false;
    });
  });
  dom.todayWorkoutCard.querySelector("#activityLogForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const coachQuestion = event.currentTarget.querySelector("#postRunCoachQuestion")?.textContent || buildPostRunCoachQuestion(values);
    setActivityLogOpen(false);
    event.currentTarget.closest("#activityLogModal")?.classList.add("hidden");
    saveActivityLog(todayDateKey, {
      dayId: session.id,
      distance: values.distance,
      duration: values.duration,
      rpe: values.rpe,
      pain: values.pain,
      coachQuestion,
      memo: values.memo,
    });
  });
  dom.todayWorkoutCard.querySelector("#statusNoteForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const status = values.status === "complete" ? "complete" : values.status === "skipped" ? "skipped" : "failed";
    setActivityLogOpen(false);
    dom.todayWorkoutCard.querySelector("#statusNoteModal")?.classList.add("hidden");
    saveWorkoutStatusNote(todayDateKey, {
      dayId: session.id,
      sessionType: session.type,
      status,
      progress: values.progress,
      reason: values.reason,
      coachQuestion: status === "complete" ? buildConditionCoachQuestion(values) : buildStatusCoachQuestion(status, values),
      memo: values.memo,
    });
  });
  dom.todayWorkoutCard.querySelector("#statusNoteForm select[name='reason']")?.addEventListener("change", (event) => {
    const form = event.currentTarget.form;
    const values = Object.fromEntries(new FormData(form).entries());
    form.querySelector("#statusCoachQuestion").textContent = values.status === "complete"
      ? buildConditionCoachQuestion(values)
      : buildStatusCoachQuestion(values.status, values);
  });
}

export function renderWeekMiniCalendar(ctx) {
  const { dom, state, updateSession, saveWeeklyReview } = ctx;
  const todayId = getTodayDayId();
  const completedCount = state.plan.filter((session) => session.status === "complete").length;
  const hasTemporarySchedule = hasActiveTemporarySchedule(state.checkin, state.profile);
  const season = state.planMeta?.season;
  const today = new Date();
  const weeklySummary = summarizeWeeklyActivity(state.activityLogs, today);
  const weeklyReviewKey = getWeeklyReviewKey(today);
  const shouldAskWeeklyReview = today.getDay() === 1 && !state.activityLogs?.[weeklyReviewKey] && typeof saveWeeklyReview === "function";
  const getCompactLabel = (session) => {
    if (session.type === "rest") return "휴식";
    if (session.type === "mobility") return "보강";
    return session.title;
  };
  const getSessionMeta = (session) => {
    const parts = [session.distance, session.duration].filter((item) => item && item !== "-");
    return parts.length ? parts.join(" · ") : session.subtitle;
  };
  dom.weekSummaryBadge.textContent = `${completedCount}/${state.plan.length} complete${hasTemporarySchedule ? " · temporary" : season?.label ? ` · ${season.label}` : ""}`;
  dom.weekMiniCalendar.innerHTML = `
    ${shouldAskWeeklyReview ? `
      <form class="weekly-review-card" id="weeklyReviewForm">
        <span class="mini-day-name">weekly review</span>
        <strong>지난주 훈련을 먼저 정리할게요.</strong>
        <p>${escapeHtml(weeklySummary.text)}</p>
        <div class="coach-message coach">
          <span>COACH</span>
          <p>${escapeHtml(buildWeeklyReviewQuestion(weeklySummary))}</p>
        </div>
        <div class="activity-log-grid">
          <label>현재 피로<select name="fatigue">
            <option value="low">가벼움</option>
            <option value="medium" selected>보통</option>
            <option value="high">높음</option>
          </select></label>
          <label>통증<select name="pain">
            <option value="none" selected>없음</option>
            <option value="worrying">주의 신호</option>
          </select></label>
        </div>
        <label class="weekly-review-note">지금 몸상태<textarea name="memo" rows="3" placeholder="예: 롱런 다음날 종아리가 뻐근했고 수면은 괜찮았어."></textarea></label>
        <button type="submit" class="submit-pixel-btn">주간 체크 저장</button>
      </form>
    ` : ""}
    ${season?.reason ? `
      <div class="week-override-note">
        ${escapeHtml(season.label || "장기 계획")}
        <span>${escapeHtml(season.reason)}</span>
      </div>
    ` : ""}
    ${hasTemporarySchedule ? `
      <div class="week-override-note">
        이번 주 임시 조정 적용 중
        ${state.checkin?.temporaryAvailableDays ? `<span>주 ${escapeHtml(state.checkin.temporaryAvailableDays)}회</span>` : ""}
      </div>
    ` : ""}
    ${state.plan.map((session) => `
    <article class="mini-day-card ${session.id === todayId ? "today" : ""}">
      <div class="mini-day-head">
        <span class="mini-day-name">${session.day}</span>
        <span class="badge neutral">${formatStatus(session.status)}</span>
      </div>
      <p class="mini-day-title">${getCompactLabel(session)}</p>
      <p class="mini-day-copy">${getSessionMeta(session)}</p>
      <div class="mini-status-row">
        <button type="button" class="status-btn ${session.status === "complete" ? "active complete" : ""}" data-id="${session.id}" data-status="complete">완료</button>
        <button type="button" class="status-btn ${session.status === "failed" ? "active failed" : ""}" data-id="${session.id}" data-status="failed">실패</button>
        <button type="button" class="status-btn ${session.status === "skipped" ? "active skipped" : ""}" data-id="${session.id}" data-status="skipped">미실행</button>
      </div>
    </article>
  `).join("")}
  `;
  dom.weekMiniCalendar.querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => updateSession(button.dataset.id, { status: button.dataset.status }));
  });
  dom.weekMiniCalendar.querySelector("#weeklyReviewForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    saveWeeklyReview(weeklyReviewKey, {
      ...values,
      range: weeklySummary.range,
      summary: weeklySummary.text,
      coachQuestion: buildWeeklyReviewQuestion(weeklySummary),
    });
  });
}

export const __homeTest = {
  hasActiveTemporarySchedule,
  summarizeWeeklyActivity,
  getWeeklyReviewKey,
};
