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

function setActivityLogOpen(isOpen) {
  document.body.classList.toggle("activity-log-open", isOpen);
}

function renderProfileSummary({ dom, state }) {
  const initial = state.onboarding?.initialPlanningProfile;
  const profile = state.profile || {};
  const availableDays = initial?.availableTrainingDays || profile.availableDays || "-";
  const raceName = initial?.race?.name || profile.goalRace || "목표 미정";
  const raceType = initial?.race?.type || profile.raceType;
  const goalTime = initial?.race?.goalTime || profile.goalTime || "기록 미정";
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

export function renderGoalSummary({ dom, state }) {
  const initial = state.onboarding?.initialPlanningProfile;
  const goalTitle = initial?.primaryGoalType === "race"
    ? `${initial?.race?.name || state.profile.goalRace || "목표 대회"}`
    : initial?.nonRace?.focus ? `비대회 목표 · ${initial.nonRace.focus}` : state.profile.goalRace || "첫 목표 설정 완료";
  const goalCopy = initial?.primaryGoalType === "race"
    ? `${initial?.race?.type?.toUpperCase?.() || state.profile.raceType?.toUpperCase?.() || ""} · ${initial?.race?.date || "날짜 미정"} · ${initial?.race?.goalTime || state.profile.goalTime || "기록 미정"}`
    : `${initial?.nonRace?.durationWeeks || "-"}주 프로그램 · 주 ${initial?.availableTrainingDays || state.profile.availableDays || "-"}회`;
  if (dom.goalStripMain) dom.goalStripMain.textContent = goalTitle;
  if (dom.goalStripMeta) dom.goalStripMeta.textContent = goalCopy;
  dom.goalSummaryCard.innerHTML = `<div class="goal-main">${goalTitle}</div><div class="goal-copy">${goalCopy}</div>`;
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
        <button type="submit" class="submit-pixel-btn" id="activityLogSubmitBtn">SUBMIT</button>
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
          <label>가장 큰 이유<select name="reason">
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
  const openStatusNoteModal = (status) => {
    const modal = dom.todayWorkoutCard.querySelector("#statusNoteModal");
    const statusField = modal?.querySelector("#statusNoteStatus");
    const title = modal?.querySelector("#statusNoteTitle");
    const progressField = modal?.querySelector("#statusProgressField");
    const question = modal?.querySelector("#statusCoachQuestion");
    if (!modal || !statusField || !title || !progressField || !question) return;
    statusField.value = status;
    title.textContent = status === "failed" ? "실패 이유 기록" : "미실행 이유 기록";
    progressField.classList.toggle("hidden", status === "skipped");
    question.textContent = status === "failed"
      ? "어디까지 했고 어떤 불편 때문에 멈췄는지 알려줘. 다음 훈련 조정에 반영할게."
      : "오늘 훈련을 못 한 이유를 알려줘. 일정, 피로, 통증 중 무엇이 컸는지 보고 다음 흐름을 맞출게.";
    setActivityLogOpen(true);
    modal.classList.remove("hidden");
  };
  dom.todayWorkoutCard.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.status === "complete") {
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
          submitButton.textContent = "SUBMIT";
        },
      });
      return;
    }
    setActivityLogOpen(false);
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
  dom.todayWorkoutCard.querySelector("#statusNoteForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const status = values.status === "skipped" ? "skipped" : "failed";
    setActivityLogOpen(false);
    dom.todayWorkoutCard.querySelector("#statusNoteModal")?.classList.add("hidden");
    saveWorkoutStatusNote(todayDateKey, {
      dayId: session.id,
      status,
      progress: values.progress,
      reason: values.reason,
      coachQuestion: buildStatusCoachQuestion(status, values),
      memo: values.memo,
    });
  });
  dom.todayWorkoutCard.querySelector("#statusNoteForm select[name='reason']")?.addEventListener("change", (event) => {
    const form = event.currentTarget.form;
    const values = Object.fromEntries(new FormData(form).entries());
    form.querySelector("#statusCoachQuestion").textContent = buildStatusCoachQuestion(values.status, values);
  });
}

export function renderWeekMiniCalendar(ctx) {
  const { dom, state, updateSession } = ctx;
  const todayId = getTodayDayId();
  const completedCount = state.plan.filter((session) => session.status === "complete").length;
  const hasTemporarySchedule = Boolean(state.checkin?.temporaryAvailableDays || state.checkin?.temporaryPreferredDays || state.checkin?.temporaryLongRunDay);
  const getCompactLabel = (session) => {
    if (session.type === "rest") return "휴식";
    if (session.type === "mobility") return "보강";
    return session.title;
  };
  const getSessionMeta = (session) => {
    const parts = [session.distance, session.duration].filter((item) => item && item !== "-");
    return parts.length ? parts.join(" · ") : session.subtitle;
  };
  dom.weekSummaryBadge.textContent = `${completedCount}/${state.plan.length} complete${hasTemporarySchedule ? " · temporary" : ""}`;
  dom.weekMiniCalendar.innerHTML = `
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
}
