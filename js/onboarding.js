import { ONBOARDING_TEMP_DISABLED } from "./config.js";

export function hasPrimaryGoal(state) {
  return Boolean(state.onboarding?.completedAt && state.onboarding?.initialPlanningProfile);
}

export function shouldShowOnboarding(state, authSession) {
  if (ONBOARDING_TEMP_DISABLED) return false;
  return Boolean(authSession?.user) && !hasPrimaryGoal(state);
}

export function saveOnboardingDraftPatch(state, patch) {
  state.onboarding = {
    ...state.onboarding,
    draft: {
      ...state.onboarding.draft,
      ...patch,
    },
  };
}

export function getOnboardingSteps(state) {
  const goalType = state.onboarding?.draft?.goalType;
  const branchLabel = goalType === "race" ? "대회 목표" : "비대회 목표";
  return [
    { id: "goal", title: "이번 시즌의 첫 목표를 먼저 정해볼게요.", prompt: "대회를 중심으로 준비할지, 생활 속 러닝 루틴과 체력 향상 중심으로 갈지부터 확인하겠습니다." },
    { id: "goal-detail", title: `${branchLabel}에 맞는 기본 그림을 잡겠습니다.`, prompt: goalType === "race" ? "대회 날짜와 목표 시간이 있어야 무리 없는 리듬을 잡을 수 있습니다." : "비대회 목표도 기간과 방향이 있어야 플랜이 흐트러지지 않습니다." },
    { id: "training-load", title: "현실적으로 가능한 훈련 리듬부터 맞춰볼게요.", prompt: "실행 가능한 주간 횟수는 모든 계획의 바닥선입니다." },
    { id: "latest-run", title: "가장 최근 러닝부터 짧게 확인할게요.", prompt: "가장 최근 세션은 지금 몸 상태를 읽는 데 가장 좋은 단서입니다." },
    { id: "latest-run-feel", title: "그 러닝은 몸에 어떻게 들어왔나요?", prompt: "기록보다 체감 난이도가 더 중요할 때가 많습니다." },
    { id: "history", title: "최근 4주 훈련량 흐름을 보겠습니다.", prompt: "오래된 PB보다 최근 4주 볼륨과 빈도가 더 믿을 만한 기준입니다." },
    { id: "pbs", title: "현재 기준이 될 기록도 함께 남겨둘게요.", prompt: "PB는 참고용으로만 보고, 실제 계획은 최근 상태와 함께 해석합니다." },
    { id: "condition", title: "지금 몸 상태를 마지막으로 맞춰보겠습니다.", prompt: "통증이나 불편 부위가 있으면 계획보다 안전이 우선입니다." },
    { id: "coaching-style", title: "어떤 코치 톤이 편한지도 맞춰볼게요.", prompt: "같은 조언도 설명 방식에 따라 받아들이는 느낌이 달라집니다." },
    { id: "summary", title: "첫 상담 내용을 이렇게 이해하고 있습니다.", prompt: "틀린 부분이 있으면 완료 전에 고치면 됩니다." },
  ];
}

function renderChoiceCards(name, value, options) {
  return `<div class="choice-grid">${options.map((option) => `<button type="button" class="choice-card ${value === option.value ? "selected" : ""}" data-choice-name="${name}" data-choice-value="${option.value}"><div class="choice-title">${option.title}</div><div class="choice-copy">${option.copy}</div></button>`).join("")}</div>`;
}

function renderStepBody(stepId, draft) {
  if (stepId === "goal") return renderChoiceCards("goalType", draft.goalType, [
    { value: "race", title: "RACE MODE", copy: "대회 날짜와 기록 목표를 중심으로 시즌을 준비하고 싶어요." },
    { value: "non-race", title: "NO RACE", copy: "대회보다 꾸준함, 체력, 생활 루틴 회복에 더 집중하고 싶어요." },
  ]);
  if (stepId === "goal-detail" && draft.goalType === "race") return `
    <div class="onboarding-grid">
      <label>목표 대회 이름<input name="raceName" value="${draft.raceName}" placeholder="예: 서울하프마라톤" /></label>
      <label>대회 종목<select name="raceType"><option value="10k" ${draft.raceType === "10k" ? "selected" : ""}>10K</option><option value="half" ${draft.raceType === "half" ? "selected" : ""}>하프</option><option value="full" ${draft.raceType === "full" ? "selected" : ""}>풀</option></select></label>
      <label>대회 날짜<input name="raceDate" type="date" value="${draft.raceDate}" /></label>
      <label>목표 기록<input name="raceGoalTime" value="${draft.raceGoalTime}" placeholder="예: 하프 1:45" /></label>
    </div>`;
  if (stepId === "goal-detail") return `<div class="onboarding-stack">${renderChoiceCards("nonRaceFocus", draft.nonRaceFocus, [
    { value: "consistency", title: "CONSISTENCY", copy: "규칙적으로 달리는 루틴부터 만들고 싶어요." },
    { value: "fitness", title: "FITNESS", copy: "체력과 유산소 기반을 더 끌어올리고 싶어요." },
    { value: "comeback", title: "COMEBACK", copy: "쉬었던 흐름을 무리 없이 다시 만들고 싶어요." },
  ])}<label>프로그램 기간<select name="programDurationWeeks"><option value="6" ${draft.programDurationWeeks === "6" ? "selected" : ""}>6주</option><option value="8" ${draft.programDurationWeeks === "8" ? "selected" : ""}>8주</option><option value="12" ${draft.programDurationWeeks === "12" ? "selected" : ""}>12주</option><option value="16" ${draft.programDurationWeeks === "16" ? "selected" : ""}>16주</option></select></label></div>`;
  if (stepId === "training-load") return `<div class="onboarding-grid"><label>주간 러닝 가능 횟수<select name="availableTrainingDays"><option value="2" ${draft.availableTrainingDays === "2" ? "selected" : ""}>주 2회</option><option value="3" ${draft.availableTrainingDays === "3" ? "selected" : ""}>주 3회</option><option value="4" ${draft.availableTrainingDays === "4" ? "selected" : ""}>주 4회</option><option value="5" ${draft.availableTrainingDays === "5" ? "selected" : ""}>주 5회</option><option value="6" ${draft.availableTrainingDays === "6" ? "selected" : ""}>주 6회</option></select></label></div>`;
  if (stepId === "latest-run") return `<div class="onboarding-grid"><label>가장 최근 러닝 날짜<input name="latestRunDate" type="date" value="${draft.latestRunDate}" /></label><label>가장 최근 러닝 거리(km)<input name="latestRunDistance" type="number" min="0" step="0.1" value="${draft.latestRunDistance}" /></label><label>평균 페이스<input name="latestRunAvgPace" value="${draft.latestRunAvgPace}" placeholder="예: 5:48/km" /></label><label>평균 심박(optional)<input name="latestRunAvgHeartRate" type="number" min="0" step="1" value="${draft.latestRunAvgHeartRate}" /></label><label>RPE(optional)<select name="latestRunRpe"><option value="" ${draft.latestRunRpe === "" ? "selected" : ""}>선택 안 함</option>${["3","4","5","6","7","8","9"].map((v) => `<option value="${v}" ${draft.latestRunRpe === v ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>`;
  if (stepId === "latest-run-feel") return `<div class="onboarding-stack">${renderChoiceCards("latestRunDifficulty", draft.latestRunDifficulty, [
    { value: "smooth", title: "SMOOTH", copy: "생각보다 여유 있었고 회복 부담도 크지 않았어요." },
    { value: "manageable", title: "MANAGEABLE", copy: "약간 무거웠지만 대체로 계획 범위 안이었어요." },
    { value: "hard", title: "HARD", copy: "평소보다 분명히 힘들었고 회복이 더 필요했어요." },
  ])}<label>러닝 후 느낌 메모<textarea name="latestRunFeeling" rows="3">${draft.latestRunFeeling}</textarea></label></div>`;
  if (stepId === "history") return `<div class="onboarding-stack"><div class="onboarding-grid"><label>4주 전 거리(km)<input name="mileageWeek1" type="number" min="0" step="1" value="${draft.recentMileage4Weeks[0] || ""}" /></label><label>3주 전 거리(km)<input name="mileageWeek2" type="number" min="0" step="1" value="${draft.recentMileage4Weeks[1] || ""}" /></label><label>2주 전 거리(km)<input name="mileageWeek3" type="number" min="0" step="1" value="${draft.recentMileage4Weeks[2] || ""}" /></label><label>지난주 거리(km)<input name="mileageWeek4" type="number" min="0" step="1" value="${draft.recentMileage4Weeks[3] || ""}" /></label></div><label>주간 평균 러닝 횟수(optional)<input name="recentWeeklyFrequency" type="number" min="0" step="1" value="${draft.recentWeeklyFrequency}" /></label></div>`;
  if (stepId === "pbs") return `<div class="onboarding-grid"><label>5K PB<input name="pbFiveK" value="${draft.pbs.fiveK}" /></label><label>10K PB<input name="pbTenK" value="${draft.pbs.tenK}" /></label><label>하프 PB<input name="pbHalf" value="${draft.pbs.half}" /></label><label>풀 PB<input name="pbFull" value="${draft.pbs.full}" /></label></div>`;
  if (stepId === "condition") return `<div class="onboarding-stack">${renderChoiceCards("bodyCondition", draft.bodyCondition, [
    { value: "good", title: "GOOD", copy: "컨디션이 비교적 안정적이고 훈련을 받아들일 여지가 있어요." },
    { value: "normal", title: "NORMAL", copy: "보통 수준입니다. 무리하지 않는 조정이 필요해요." },
    { value: "cautious", title: "CAUTIOUS", copy: "피로나 통증 신호가 있어 보수적으로 가야 해요." },
  ])}<label>통증 / 불편 부위<textarea name="painArea" rows="2">${draft.painArea}</textarea></label><label>몸 상태 메모<textarea name="bodyConditionNote" rows="3">${draft.bodyConditionNote}</textarea></label></div>`;
  if (stepId === "coaching-style") return `<div class="onboarding-stack">${renderChoiceCards("coachingStyle", draft.coachingStyle, [
    { value: "gentle", title: "GENTLE", copy: "부담을 줄이고 차분하게 설명해주는 스타일이 좋아요." },
    { value: "balanced", title: "BALANCED", copy: "따뜻하지만 분명하게, 이유를 같이 설명해주는 코치가 좋아요." },
    { value: "direct", title: "DIRECT", copy: "조금 더 단호하고 명확하게 방향을 잡아주는 편이 좋아요." },
  ])}</div>`;
  return "";
}

function renderSummary(draft) {
  const lines = [
    ["목표 유형", draft.goalType === "race" ? "대회 준비" : "비대회 목표"],
    ["목표 상세", draft.goalType === "race" ? `${draft.raceType?.toUpperCase() || ""} / ${draft.raceDate || "날짜 미정"} / ${draft.raceGoalTime || "기록 미정"}` : `${draft.nonRaceFocus} / ${draft.programDurationWeeks}주`],
    ["훈련 가능 횟수", `주 ${draft.availableTrainingDays}회`],
    ["최근 러닝", `${draft.latestRunDate || "날짜 미정"} · ${draft.latestRunDistance || "-"}km · ${draft.latestRunAvgPace || "페이스 미입력"} · HR ${draft.latestRunAvgHeartRate || "-"} · RPE ${draft.latestRunRpe || "-"}`],
    ["러닝 체감", `${draft.latestRunDifficulty} · ${draft.latestRunFeeling || "메모 없음"}`],
    ["최근 4주 거리", draft.recentMileage4Weeks.map((item) => item || "-").join(" / ")],
    ["주간 빈도", draft.recentWeeklyFrequency ? `주 ${draft.recentWeeklyFrequency}회` : "미입력"],
    ["PB", `5K ${draft.pbs.fiveK || "-"} · 10K ${draft.pbs.tenK || "-"} · 하프 ${draft.pbs.half || "-"} · 풀 ${draft.pbs.full || "-"}`],
    ["몸 상태", `${draft.bodyCondition} · ${draft.painArea || "통증 없음"} · ${draft.bodyConditionNote || "추가 메모 없음"}`],
    ["코치 스타일", draft.coachingStyle],
  ];
  return lines.map(([label, value]) => `<div class="summary-line"><strong>${label}</strong><span>${value}</span></div>`).join("");
}

export function renderOnboarding(ctx) {
  const { state, dom, persistWorkspaceSoon } = ctx;
  const steps = getOnboardingSteps(state);
  const currentStep = steps[state.onboarding.step] || steps[0];
  const draft = state.onboarding.draft;
  const isSummary = currentStep.id === "summary";

  dom.onboardingStepBadge.textContent = `step ${state.onboarding.step + 1} / ${steps.length}`;
  dom.onboardingProgressFill.style.width = `${((state.onboarding.step + 1) / steps.length) * 100}%`;
  dom.onboardingProgressText.textContent = currentStep.prompt;
  dom.onboardingCoachPrompt.textContent = currentStep.prompt;
  dom.onboardingStepTitle.textContent = currentStep.title;
  dom.onboardingStepBody.innerHTML = renderStepBody(currentStep.id, draft);
  dom.onboardingSummary.classList.toggle("hidden", !isSummary);
  dom.onboardingBackBtn.classList.toggle("hidden", state.onboarding.step === 0);
  dom.onboardingNextBtn.classList.toggle("hidden", isSummary);
  dom.onboardingCompleteBtn.classList.toggle("hidden", !isSummary);
  if (isSummary) dom.onboardingSummary.innerHTML = renderSummary(draft);

  dom.onboardingStepBody.querySelectorAll("[data-choice-name]").forEach((button) => {
    button.addEventListener("click", () => {
      saveOnboardingDraftPatch(state, { [button.dataset.choiceName]: button.dataset.choiceValue });
      renderOnboarding(ctx);
      persistWorkspaceSoon();
    });
  });

  dom.onboardingStepBody.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", (event) => handleOnboardingFieldChange(ctx, event));
    field.addEventListener("change", (event) => handleOnboardingFieldChange(ctx, event));
  });
}

export function handleOnboardingFieldChange(ctx, event) {
  const { state, persistWorkspaceSoon } = ctx;
  const { name, value } = event.target;
  if (name.startsWith("mileageWeek")) {
    const index = Number(name.replace("mileageWeek", "")) - 1;
    const nextMileage = [...state.onboarding.draft.recentMileage4Weeks];
    nextMileage[index] = value;
    saveOnboardingDraftPatch(state, { recentMileage4Weeks: nextMileage });
  } else if (name.startsWith("pb")) {
    const keyMap = { pbFiveK: "fiveK", pbTenK: "tenK", pbHalf: "half", pbFull: "full" };
    state.onboarding.draft.pbs[keyMap[name]] = value;
  } else {
    saveOnboardingDraftPatch(state, { [name]: value });
  }
  persistWorkspaceSoon();
}

export function validateOnboardingStep(state, setAuthFeedback) {
  const draft = state.onboarding.draft;
  const stepId = getOnboardingSteps(state)[state.onboarding.step]?.id;
  if (stepId === "goal" && !draft.goalType) {
    setAuthFeedback("먼저 대회 목표인지 비대회 목표인지 선택해 주세요.", "warning");
    return false;
  }
  if (stepId === "goal-detail" && draft.goalType === "race" && (!draft.raceDate || !draft.raceType)) {
    setAuthFeedback("대회 준비라면 종목과 날짜를 먼저 정해 주세요.", "warning");
    return false;
  }
  if (stepId === "goal-detail" && draft.goalType !== "race" && !draft.programDurationWeeks) {
    setAuthFeedback("비대회 목표는 최소한의 기간을 먼저 잡아 주세요.", "warning");
    return false;
  }
  if (stepId === "training-load" && !draft.availableTrainingDays) {
    setAuthFeedback("주간 러닝 가능 횟수만 알려주셔도 다음 단계로 갈 수 있어요.", "warning");
    return false;
  }
  return true;
}

export function buildInitialPlanningProfileFromOnboarding(state) {
  const draft = state.onboarding.draft;
  const averageMileage = draft.recentMileage4Weeks.map((value) => Number(value || 0)).reduce((sum, value) => sum + value, 0) / 4;
  return {
    primaryGoalType: draft.goalType,
    race: draft.goalType === "race" ? { name: draft.raceName, type: draft.raceType, date: draft.raceDate, goalTime: draft.raceGoalTime } : null,
    nonRace: draft.goalType !== "race" ? { focus: draft.nonRaceFocus, durationWeeks: Number(draft.programDurationWeeks || 0) } : null,
    availableTrainingDays: Number(draft.availableTrainingDays || 0),
    latestRun: {
      date: draft.latestRunDate,
      distance: Number(draft.latestRunDistance || 0),
      avgPace: draft.latestRunAvgPace,
      avgHeartRate: Number(draft.latestRunAvgHeartRate || 0),
      rpe: Number(draft.latestRunRpe || 0),
      difficulty: draft.latestRunDifficulty,
      feeling: draft.latestRunFeeling,
    },
    recentMileage4Weeks: draft.recentMileage4Weeks.map((value) => Number(value || 0)),
    recentWeeklyFrequency: Number(draft.recentWeeklyFrequency || 0),
    pbs: { ...draft.pbs },
    bodyCondition: draft.bodyCondition,
    painArea: draft.painArea,
    bodyConditionNote: draft.bodyConditionNote,
    coachingStyle: draft.coachingStyle,
    averageMileage4Weeks: Math.round(averageMileage),
  };
}
