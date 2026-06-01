import { buildPlan, mergePlanWithTrainingHistory } from "./plan.js";

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function getAppliedStateSnapshot(state) {
  return stableStringify({
    profile: state.profile,
    checkin: state.checkin,
    plan: state.plan,
  });
}

export function buildPlanStats(plan) {
  const trainingTypes = new Set(["easy", "quality", "long", "recovery"]);
  const plannedMileage = (plan || []).reduce((sum, session) => {
    const km = Number.parseInt(session.distance, 10);
    return sum + (Number.isFinite(km) ? km : 0);
  }, 0);
  return {
    plannedMileage,
    runDays: (plan || []).filter((session) => trainingTypes.has(session.type)).length,
    keySession: (plan || []).find((session) => session.type === "quality")?.title || "없음",
    longRun: (plan || []).find((session) => session.type === "long")?.title || "없음",
  };
}

function rebuildPlanKeepingProgress(state) {
  const result = buildPlan(state.profile, state.checkin);
  const plan = mergePlanWithTrainingHistory(result.plan, state.plan, state.activityLogs);
  return {
    ...state,
    plan,
    planMeta: result.meta,
  };
}

export function applyCoachPlanToState(currentState, pendingPlan) {
  const beforeSnapshot = getAppliedStateSnapshot(currentState);
  let nextState = {
    ...currentState,
    profile: { ...(currentState.profile || {}), ...(pendingPlan.profile || {}) },
    checkin: { ...(currentState.checkin || {}), ...(pendingPlan.checkin || {}) },
  };

  if (pendingPlan.checkin && Object.hasOwn(pendingPlan.checkin, "temporaryAvailableDays") && pendingPlan.checkin.temporaryAvailableDays === null) {
    nextState.checkin.temporaryAvailableDays = null;
  }

  if (Array.isArray(pendingPlan.weeklyPlan) && pendingPlan.weeklyPlan.length) {
    if (!pendingPlan.checkin || !Object.hasOwn(pendingPlan.checkin, "temporaryAvailableDays")) {
      nextState.checkin.temporaryAvailableDays = null;
    }
    if (!pendingPlan.checkin || !Object.hasOwn(pendingPlan.checkin, "temporaryPreferredDays")) {
      nextState.checkin.temporaryPreferredDays = "";
    }
    if (!pendingPlan.checkin || !Object.hasOwn(pendingPlan.checkin, "temporaryLongRunDay")) {
      nextState.checkin.temporaryLongRunDay = "";
    }
    nextState.plan = mergePlanWithTrainingHistory(pendingPlan.weeklyPlan, currentState.plan, currentState.activityLogs);
    const rebuiltMeta = buildPlan(nextState.profile, nextState.checkin).meta;
    nextState.planMeta = {
      ...rebuiltMeta,
      stats: buildPlanStats(nextState.plan),
    };
  } else {
    nextState = rebuildPlanKeepingProgress(nextState);
  }

  nextState.selectedDayId = nextState.plan.find((session) => session.id === currentState.selectedDayId)?.id
    || nextState.plan.find((session) => session.type === "quality")?.id
    || nextState.plan[0]?.id
    || null;
  nextState.planMeta = {
    ...(nextState.planMeta || {}),
    source: pendingPlan.source || nextState.planMeta?.source || "local-coach-engine",
    fallbackReason: pendingPlan.source === "llm-fallback" ? "used-local-coach-engine" : "none",
    coach: pendingPlan.meta || nextState.planMeta?.coach || null,
  };

  return {
    state: nextState,
    applied: getAppliedStateSnapshot(nextState) !== beforeSnapshot,
  };
}
