function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const PLAN_DAY_TO_WEEKDAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const TRAINING_TYPES = new Set(["easy", "quality", "long", "recovery"]);

function getMonthCells(plan) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const trainingWeekdays = new Set(
    (plan || [])
      .filter((session) => TRAINING_TYPES.has(session.type))
      .map((session) => PLAN_DAY_TO_WEEKDAY[session.id])
      .filter((weekday) => weekday !== undefined)
  );
  const cells = [];
  for (let i = 0; i < firstDay.getDay(); i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({
      day,
      isToday: day === todayDate,
      hasTraining: trainingWeekdays.has(date.getDay()),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return {
    label: `${year}.${String(month + 1).padStart(2, "0")}`,
    cells,
  };
}

function getCoachStyleLabel(style) {
  if (style === "gentle") return "gentle";
  if (style === "direct") return "direct";
  return "balanced";
}

export function createDefaultCoachChat() {
  return {
    stage: "idle",
    pendingPlan: null,
    messages: [
      {
        role: "coach",
        text: "이번 주 계획을 바꾸고 싶으면 지금 상황을 말해줘. 바로 바꾸기보다 먼저 몸 상태와 일정부터 확인하고, 마지막에 조정안을 제안할게.",
      },
    ],
  };
}

export function buildCoachReply({ message, state }) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const style = getCoachStyleLabel(state.onboarding?.draft?.coachingStyle || state.onboarding?.initialPlanningProfile?.coachingStyle);
  const painSignal = /통증|아파|아픔|무릎|발목|종아리|햄스트링|허리|pain/.test(lower);
  const fatigueSignal = /피곤|피로|무거|잠|수면|회복|지침|힘들/.test(lower);
  const scheduleSignal = /일정|바빠|야근|출장|회식|시간|못.*뛰|못뛰|급한/.test(lower);
  const raceSignal = /대회|기록|페이스|목표/.test(lower);

  const concern = painSignal ? "pain" : fatigueSignal ? "fatigue" : scheduleSignal ? "schedule" : raceSignal ? "race" : "general";
  const currentStage = state.coachChat?.stage || "idle";

  if (currentStage === "idle") {
    const question = {
      pain: "통증 얘기가 있으면 바로 강도를 낮춰야 해. 날카로운 통증인지, 뛰면 심해지는지, 그리고 오늘 훈련을 완전히 쉬어도 되는 일정인지 알려줘.",
      fatigue: "피로가 핵심이면 무리해서 버티는 것보다 회복을 계획에 넣는 게 더 빠를 수 있어. 어제 수면, 다리 무거움, 오늘 뛸 수 있는 시간을 같이 말해줘.",
      schedule: "일정이 흔들리면 계획도 현실적으로 줄이는 게 맞아. 이번 주에 확실히 뛸 수 있는 날이 며칠인지, 롱런은 지킬 수 있는지 알려줘.",
      race: "목표 리듬을 건드리는 변경이면 조심스럽게 볼게. 지금 바꾸고 싶은 건 훈련 강도인지, 거리인지, 대회 목표 자체인지 알려줘.",
      general: "좋아, 바로 바꾸기 전에 한 번만 더 확인할게. 오늘 몸 상태, 이번 주 가능한 훈련일, 꼭 지키고 싶은 세션이 있는지 알려줘.",
    }[concern];
    return {
      stage: "clarifying",
      pendingPlan: { concern, originalMessage: text },
      reply: `${style === "direct" ? "좋아, 핵심부터 보자. " : style === "gentle" ? "좋아, 천천히 맞춰보자. " : "좋아, 계획을 현실에 맞춰보자. "}${question}`,
    };
  }

  const previousConcern = state.coachChat?.pendingPlan?.concern || concern;
  const shouldRest = previousConcern === "pain" || painSignal;
  const shouldSoften = shouldRest || previousConcern === "fatigue" || fatigueSignal;
  const shouldCompress = previousConcern === "schedule" || scheduleSignal;
  const pendingPlan = {
    concern: previousConcern,
    checkin: {
      fatigue: shouldSoften ? "high" : "medium",
      pain: shouldRest ? "worrying" : "none",
      sleep: fatigueSignal ? "poor" : state.checkin.sleep,
      schedule: shouldCompress ? "chaotic" : state.checkin.schedule,
      confidence: shouldSoften ? "steady" : state.checkin.confidence,
      comment: [state.checkin.comment, text].filter(Boolean).join(" / "),
    },
    profile: {
      fatigue: shouldSoften ? "tired" : state.profile.fatigue,
      pain: shouldRest ? "light" : state.profile.pain,
    },
  };

  const headline = shouldRest
    ? "오늘은 강도를 빼고 회복 중심으로 다시 짜는 게 맞아."
    : shouldCompress
      ? "이번 주는 핵심 세션만 남기고 계획을 압축하는 쪽이 좋아."
      : shouldSoften
        ? "이번 주는 훈련 효과보다 회복 흡수가 더 중요해 보여."
        : "큰 틀은 유지하되 오늘 컨디션에 맞춰 부담을 조금 낮추자.";

  return {
    stage: "proposal",
    pendingPlan,
    reply: `${headline} 내가 제안하는 변경안은 대화가 끝난 뒤에만 캘린더에 반영할게. 아래 조정안을 보고 괜찮으면 '계획 반영'을 눌러줘.`,
  };
}

export function renderCoachTab(ctx) {
  const { dom, state, sendCoachMessage, applyCoachPlan } = ctx;
  const month = getMonthCells(state.plan);
  dom.coachMonthLabel.textContent = month.label;
  dom.coachCalendar.innerHTML = [
    ...WEEKDAY_LABELS.map((label) => `<div class="month-weekday">${label}</div>`),
    ...month.cells.map((cell) => {
      if (!cell) return `<div class="month-day empty-day"></div>`;
      return `
        <div class="month-day ${cell.isToday ? "today" : ""} ${cell.hasTraining ? "has-training" : ""}">
          <span>${cell.day}</span>
          ${cell.hasTraining ? `<i aria-label="훈련 있음"></i>` : ""}
        </div>
      `;
    }),
  ].join("");

  dom.coachMessages.innerHTML = (state.coachChat?.messages || []).map((message) => `
    <div class="coach-message ${message.role}">
      <span>${message.role === "coach" ? "COACH" : "YOU"}</span>
      <p>${escapeHtml(message.text)}</p>
    </div>
  `).join("");
  dom.coachMessages.scrollTop = dom.coachMessages.scrollHeight;

  const pendingPlan = state.coachChat?.pendingPlan;
  const canApply = state.coachChat?.stage === "proposal" && pendingPlan;
  dom.coachProposal.classList.toggle("hidden", !canApply);
  if (canApply) {
    const concernLabel = {
      pain: "통증 신호 반영",
      fatigue: "피로 누적 반영",
      schedule: "급한 일정 반영",
      race: "목표 리듬 점검",
      general: "컨디션 기반 조정",
    }[pendingPlan.concern] || "컨디션 기반 조정";
    dom.coachProposal.innerHTML = `
      <div>
        <p class="section-kicker">PROPOSED REPLAN</p>
        <strong>${concernLabel}</strong>
        <p>캘린더는 아직 바뀌지 않았습니다. 반영하면 코치 엔진이 이번 주 훈련표를 다시 계산합니다.</p>
      </div>
      <button type="button" id="applyCoachPlanBtn">계획 반영</button>
    `;
    dom.coachProposal.querySelector("#applyCoachPlanBtn").addEventListener("click", applyCoachPlan);
  }

  dom.coachForm.onsubmit = (event) => {
    event.preventDefault();
    const field = dom.coachForm.elements.namedItem("message");
    const message = String(field.value || "").trim();
    if (!message) return;
    field.value = "";
    sendCoachMessage(message);
  };
}
