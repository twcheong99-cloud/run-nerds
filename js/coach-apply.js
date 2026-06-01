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
  const currentWeekStart = result.meta?.season?.currentWeekStart || "";
  const plan = mergePlanWithTrainingHistory(result.plan, state.plan, state.activityLogs, {
    currentWeekStart,
    preservePreviousStatus: state.planMeta?.season?.currentWeekStart === currentWeekStart,
  });
  return {
    ...state,
    plan,
    planMeta: result.meta,
  };
}

function hasOwn(object, key) {
  return Boolean(object && Object.hasOwn(object, key));
}

function hasTemporaryPatch(pendingPlan) {
  return hasOwn(pendingPlan.checkin, "temporaryAvailableDays")
    || hasOwn(pendingPlan.checkin, "temporaryPreferredDays")
    || hasOwn(pendingPlan.checkin, "temporaryLongRunDay");
}

function isWholePlanScope(pendingPlan) {
  const text = [
    pendingPlan.originalMessage,
    pendingPlan.meta?.summary,
    pendingPlan.planMeta?.season?.label,
    pendingPlan.planMeta?.season?.reason,
  ].filter(Boolean).join(" ");
  return Boolean(
    pendingPlan.planMeta?.season
    || pendingPlan.profile?.goalDate
    || pendingPlan.profile?.goalRace
    || pendingPlan.profile?.raceType
    || /전체|장기|시즌|한\s*달|1\s*달|4주|8주|12주|계획\s*다시|다시\s*짜/i.test(text)
  );
}

function clearTemporarySchedule(checkin) {
  return {
    ...checkin,
    temporaryAvailableDays: null,
    temporaryPreferredDays: "",
    temporaryLongRunDay: "",
  };
}

function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function patchHasCurrentCondition(checkinPatch = {}) {
  return ["fatigue", "pain", "sleep", "schedule", "confidence"].some((key) => hasOwn(checkinPatch, key));
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

  if (patchHasCurrentCondition(pendingPlan.checkin)) {
    nextState.checkin.updatedAt = getLocalDateKey();
  }

  if (!hasTemporaryPatch(pendingPlan) && isWholePlanScope(pendingPlan)) {
    nextState.checkin = clearTemporarySchedule(nextState.checkin);
  }

  if (Array.isArray(pendingPlan.weeklyPlan) && pendingPlan.weeklyPlan.length) {
    if (!pendingPlan.checkin || !hasOwn(pendingPlan.checkin, "temporaryAvailableDays")) {
      nextState.checkin.temporaryAvailableDays = null;
    }
    if (!pendingPlan.checkin || !hasOwn(pendingPlan.checkin, "temporaryPreferredDays")) {
      nextState.checkin.temporaryPreferredDays = "";
    }
    if (!pendingPlan.checkin || !hasOwn(pendingPlan.checkin, "temporaryLongRunDay")) {
      nextState.checkin.temporaryLongRunDay = "";
    }
    const currentWeekStart = currentState.planMeta?.season?.currentWeekStart || buildPlan(nextState.profile, nextState.checkin).meta?.season?.currentWeekStart || "";
    nextState.plan = mergePlanWithTrainingHistory(pendingPlan.weeklyPlan, currentState.plan, currentState.activityLogs, {
      currentWeekStart,
      preservePreviousStatus: true,
    });
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
    ...(pendingPlan.planMeta || {}),
    source: pendingPlan.source || nextState.planMeta?.source || "local-coach-engine",
    fallbackReason: pendingPlan.source === "llm-fallback" ? "used-local-coach-engine" : "none",
    coach: pendingPlan.meta || nextState.planMeta?.coach || null,
  };

  return {
    state: nextState,
    applied: getAppliedStateSnapshot(nextState) !== beforeSnapshot || Boolean(pendingPlan.planMeta),
  };
}
