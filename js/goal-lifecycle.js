export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getGoalDate(state) {
  return state?.profile?.goalDate || state?.onboarding?.initialPlanningProfile?.race?.date || "";
}

export function getGoalKey(state) {
  const profile = state?.profile || {};
  const initial = state?.onboarding?.initialPlanningProfile || {};
  const race = initial.race || {};
  const name = profile.goalRace || race.name || "";
  const date = getGoalDate(state);
  const type = profile.raceType || race.type || "";
  return [name, date, type].map((item) => String(item || "").trim()).join("|");
}

export function hasFinishedRaceGoal(state, todayKey = getLocalDateKey()) {
  const initial = state?.onboarding?.initialPlanningProfile || {};
  const hasRaceGoal = initial.primaryGoalType === "race" || Boolean(state?.profile?.goalRace);
  const goalDate = getGoalDate(state);
  if (!hasRaceGoal || !goalDate || goalDate >= todayKey) return false;
  const currentKey = getGoalKey(state);
  return !(state?.goalLifecycle?.completedGoals || []).some((goal) => goal.goalKey === currentKey);
}

export function normalizeGoalLifecycle(goalLifecycle = {}) {
  return {
    completedGoals: Array.isArray(goalLifecycle.completedGoals) ? goalLifecycle.completedGoals : [],
    activeRecovery: goalLifecycle.activeRecovery || null,
    nextGoalDraft: goalLifecycle.nextGoalDraft || {
      mode: "",
      raceName: "",
      raceType: "half",
      raceDate: "",
      raceGoalTime: "",
      nonRaceFocus: "consistency",
      programDurationWeeks: "8",
    },
  };
}

export function buildCompletedGoal(state, review = {}, completedAt = new Date().toISOString()) {
  const profile = state?.profile || {};
  const initial = state?.onboarding?.initialPlanningProfile || {};
  const race = initial.race || {};
  return {
    goalKey: getGoalKey(state),
    completedAt,
    name: profile.goalRace || race.name || "완료한 목표",
    date: getGoalDate(state),
    raceType: profile.raceType || race.type || "",
    goalTime: profile.goalTime || race.goalTime || "",
    review: {
      actualTime: String(review.actualTime || "").trim(),
      effort: String(review.effort || "").trim(),
      pain: String(review.pain || "none").trim(),
      memo: String(review.memo || "").trim(),
    },
  };
}

export function buildNextGoalDraftPatch(values = {}) {
  return {
    mode: String(values.mode || ""),
    raceName: String(values.raceName || "").trim(),
    raceType: String(values.raceType || "half"),
    raceDate: String(values.raceDate || ""),
    raceGoalTime: String(values.raceGoalTime || "").trim(),
    nonRaceFocus: String(values.nonRaceFocus || "consistency"),
    programDurationWeeks: String(values.programDurationWeeks || "8"),
  };
}

export function getNonRaceGoalLabel(focus) {
  if (focus === "fitness") return "체력 향상 루틴";
  if (focus === "comeback") return "복귀 루틴";
  return "꾸준함 루틴";
}
