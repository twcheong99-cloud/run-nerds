import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

globalThis.window = {
  RUN_NERDS_ENV: {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "test-key",
  },
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
};

const { __coachServiceTest, requestCoachReply } = await import("../js/coach-service.js");
const { __coachTest } = await import("../js/coach.js");
const { applyCoachPlanToState } = await import("../js/coach-apply.js");
const { buildPlan } = await import("../js/plan.js");
const { mergePlanWithTrainingHistory } = await import("../js/plan.js");
const { defaultCheckin, defaultProfile } = await import("../js/config.js");
const { __homeTest } = await import("../js/home.js");
const { buildCompletedGoal, buildNextGoalDraftPatch, hasFinishedRaceGoal } = await import("../js/goal-lifecycle.js");

const currentPlan = buildPlan(defaultProfile, defaultCheckin).plan;

function makeSession(id, patch = {}) {
  const previous = currentPlan.find((session) => session.id === id);
  return {
    id,
    type: previous.type,
    title: previous.title,
    subtitle: previous.subtitle,
    purpose: previous.purpose,
    success: previous.success,
    failure: previous.failure,
    next: previous.next,
    intensity: previous.intensity,
    duration: previous.duration,
    distance: previous.distance,
    blocks: previous.blocks,
    ...patch,
  };
}

{
  const edgeSource = readFileSync(new URL("../supabase/functions/coach/index.ts", import.meta.url), "utf8");
  assert.match(edgeSource, /hasPendingPatch/);
  assert.match(edgeSource, /hasTopLevelPatch \|\| hasPendingPatch \? "proposal"/);
  assert.match(edgeSource, /text === "pain" \|\| text === "fatigue" \|\| text === "schedule"/);
  assert.match(edgeSource, /multi-week season/);
  assert.match(edgeSource, /past race must not be repeated/);
}

{
  const postRace = buildPlan({
    ...defaultProfile,
    goalRace: "서울하프마라톤",
    goalDate: "2026-05-24",
    raceType: "half",
    goalTime: "1:45",
  }, defaultCheckin, { today: "2026-06-01" });

  assert.equal(postRace.meta.season.phase, "post-race");
  assert.equal(postRace.plan.some((session) => session.title.includes("하프마라톤 레이스")), false);
  assert.equal(postRace.plan.some((session) => session.distance === "21.1km"), false);
  assert.equal(postRace.plan.some((session) => session.type === "quality"), false);
  assert.ok(postRace.plan.every((session) => session.purpose && session.purpose.length > 12));
  assert.match(postRace.meta.season.reason, /이미 끝난/);
  assert.match(postRace.meta.summary, /레이스 반복이 아니라 회복/);
  assert.ok(postRace.meta.season.weeks.some((week) => week.label.includes("다음 목표 전환")));
}

{
  const raceWeek = buildPlan({
    ...defaultProfile,
    goalRace: "서울하프마라톤",
    goalDate: "2026-06-07",
    raceType: "half",
    goalTime: "1:45",
  }, defaultCheckin, { today: "2026-06-01" });
  const sunday = raceWeek.plan.find((session) => session.id === "sun");

  assert.equal(raceWeek.meta.season.phase, "race-week");
  assert.equal(sunday.title, "하프마라톤 레이스");
  assert.equal(sunday.distance, "21.1km");
  assert.match(sunday.purpose, /훈련량을 채우는 날이 아니라/);
}

{
  const taper = buildPlan({
    ...defaultProfile,
    goalRace: "서울하프마라톤",
    goalDate: "2026-06-14",
    raceType: "half",
    goalTime: "1:45",
  }, defaultCheckin, { today: "2026-06-01" });
  const longRun = taper.plan.find((session) => session.type === "long");

  assert.equal(taper.meta.season.phase, "taper");
  assert.notEqual(longRun.distance, "21.1km");
  assert.ok(Number.parseInt(longRun.distance, 10) <= 14);
  assert.ok(taper.meta.season.weeks.some((week) => week.label.includes("레이스 주간")));
}

{
  const build = buildPlan({
    ...defaultProfile,
    goalRace: "서울하프마라톤",
    goalDate: "2026-06-28",
    raceType: "half",
    goalTime: "1:45",
  }, defaultCheckin, { today: "2026-06-01" });
  const weekLabels = build.meta.season.weeks.map((week) => week.label).join(" / ");

  assert.equal(build.meta.season.phase, "specific-build");
  assert.match(weekLabels, /대회 특이성 빌드/);
  assert.match(weekLabels, /테이퍼/);
  assert.match(weekLabels, /레이스 주간/);
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "proposal",
    reply: "화요일과 목요일 훈련을 서로 바꿨어.",
    pendingPlan: {
      concern: "schedule",
      weeklyPlan: [
        makeSession("mon"),
        makeSession("tue", { title: currentPlan.find((session) => session.id === "thu").title }),
        makeSession("wed"),
        makeSession("thu", { title: currentPlan.find((session) => session.id === "tue").title }),
        makeSession("fri"),
        makeSession("sat"),
        makeSession("sun"),
      ],
    },
    safety: { level: "green", message: "" },
    meta: { summary: "swap requested sessions" },
  }, {
    stage: "clarifying",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
  }, "화요일이랑 목요일 훈련 바꿔줘");

  assert.equal(response.stage, "proposal");
  assert.equal(response.pendingPlan.weeklyPlan.length, 7);
  assert.equal(response.pendingPlan.weeklyPlan.find((session) => session.id === "tue").title, currentPlan.find((session) => session.id === "thu").title);
  assert.equal(response.pendingPlan.weeklyPlan.find((session) => session.id === "thu").title, currentPlan.find((session) => session.id === "tue").title);
  assert.equal(response.pendingPlan.profile.availableDays, undefined);
  assert.equal(response.pendingPlan.checkin.temporaryAvailableDays, undefined);
  assert.equal(response.pendingPlan.checkin.temporaryPreferredDays, undefined);
  assert.equal(response.meta.fallbackReason, "coach-contract-unverified");
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "proposal",
    reply: "목요일만 회복 조깅으로 낮췄어.",
    pendingPlan: {
      concern: "fatigue",
      weeklyPlan: [
        makeSession("thu", {
          type: "recovery",
          title: "회복 조깅 4km",
          distance: "4km",
          intensity: "easy",
        }),
      ],
    },
    meta: { contractVersion: "coach-contract-v3" },
  }, {
    stage: "clarifying",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
  }, "목요일 훈련을 회복 조깅으로 바꿔줘");

  assert.equal(response.stage, "proposal");
  assert.equal(response.meta.fallbackReason, "none");
  assert.equal(response.pendingPlan.weeklyPlan.length, 7);
  assert.equal(response.pendingPlan.weeklyPlan.find((session) => session.id === "thu").title, "회복 조깅 4km");
  assert.equal(response.pendingPlan.weeklyPlan.find((session) => session.id === "tue").title, currentPlan.find((session) => session.id === "tue").title);
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "proposal",
    reply: "훈련표에 반영했어.",
    pendingPlan: null,
  }, {
    stage: "clarifying",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
    profile: defaultProfile,
    checkin: defaultCheckin,
  }, "목요일 훈련을 회복 조깅으로 바꿔줘");

  assert.equal(response.stage, "clarifying");
  assert.equal(response.pendingPlan, null);
  assert.equal(response.meta.fallbackReason, "missing-structured-change");
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "clarifying",
    reply: "목요일을 회복 조깅으로 바꾸기 전에 통증이 있는지 먼저 알려줘.",
    pendingPlan: null,
    meta: { contractVersion: "coach-contract-v3" },
  }, {
    stage: "clarifying",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
    profile: defaultProfile,
    checkin: defaultCheckin,
  }, "목요일 훈련을 회복 조깅으로 바꿔줘");

  assert.equal(response.stage, "clarifying");
  assert.equal(response.pendingPlan, null);
  assert.equal(response.meta.fallbackReason, "none");
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "proposal",
    reply: "그대로 반영했어.",
    pendingPlan: {
      concern: "general",
      profile: { weeklyMileage: defaultProfile.weeklyMileage },
      weeklyPlan: currentPlan,
    },
  }, {
    stage: "clarifying",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
    profile: defaultProfile,
    checkin: defaultCheckin,
  }, "주간 거리를 지금 상태로 반영해줘");

  assert.equal(response.stage, "clarifying");
  assert.equal(response.pendingPlan, null);
  assert.equal(response.meta.fallbackReason, "no-effective-change");
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "idle",
    reply: "목표와 주간 거리를 앱 프로필에 반영했어.",
    profile: {
      goalRace: "춘천마라톤",
      goalTime: "3:50",
      goalDate: "2026-10-25",
      raceType: "full",
      weeklyMileage: "48",
      qualityFocus: "interval",
    },
  }, {
    stage: "clarifying",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
  }, "목표를 춘천마라톤 풀코스 3:50으로 바꾸고 주간 48km, 인터벌 중심으로 수정해줘");

  assert.equal(response.stage, "proposal");
  assert.equal(response.pendingPlan.profile.goalRace, "춘천마라톤");
  assert.equal(response.pendingPlan.profile.goalTime, "3:50");
  assert.equal(response.pendingPlan.profile.goalDate, "2026-10-25");
  assert.equal(response.pendingPlan.profile.raceType, "full");
  assert.equal(response.pendingPlan.profile.weeklyMileage, 48);
  assert.equal(response.pendingPlan.profile.qualityFocus, "interval");
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "proposal",
    reply: "이번 주는 두 번만 뛰는 계획으로 줄였어.",
    pendingPlan: {
      concern: "schedule",
      checkin: {},
      weeklyPlan: currentPlan,
    },
  }, {
    stage: "clarifying",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
  }, "이번 주는 화 목 2번만 뛸 수 있어. 조정해줘");

  assert.equal(response.pendingPlan.checkin.temporaryAvailableDays, 2);
  assert.equal(response.pendingPlan.checkin.temporaryPreferredDays, "tue, thu");
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "idle",
    reply: "이번 주 일요일을 하프마라톤으로 고쳤어.",
    pendingPlan: null,
  }, {
    stage: "clarifying",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
  }, "이번 주 일요일에 하프마라톤이 있어. 계획표에 반영해줘");

  const sunday = response.pendingPlan.weeklyPlan.find((session) => session.id === "sun");
  assert.equal(response.stage, "proposal");
  assert.equal(response.pendingPlan.concern, "race");
  assert.equal(response.pendingPlan.checkin.temporaryLongRunDay, "sun");
  assert.equal(sunday.title, "하프마라톤 레이스");
  assert.equal(sunday.distance, "21.1km");
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "idle",
    reply: "지난주 하프마라톤 이후에는 회복을 우선하자.",
    pendingPlan: null,
  }, {
    stage: "idle",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
  }, "전주에 하프마라톤이 있었어. 이번 주 계획에 또 넣지 말고 회복으로 봐줘");

  assert.equal(response.pendingPlan, null);
  assert.equal(response.stage, "idle");
}

{
  const response = __coachServiceTest.normalizeCoachResponse({
    stage: "proposal",
    reply: "기본 루틴으로 돌릴게.",
    pendingPlan: {
      concern: "general",
      checkin: { schedule: "stable" },
      weeklyPlan: currentPlan,
    },
  }, {
    stage: "clarifying",
    reply: "fallback",
    pendingPlan: null,
    currentPlan,
  }, "이번 주 임시 조정 해제하고 원래대로 복귀");

  assert.equal(response.pendingPlan.checkin.temporaryAvailableDays, null);
  assert.equal(response.pendingPlan.checkin.temporaryPreferredDays, "");
  assert.equal(response.pendingPlan.checkin.temporaryLongRunDay, "");
}

{
  const previousPlan = currentPlan.map((session) => ({ ...session, status: "planned", note: "old note" }));
  const nextPlan = currentPlan.map((session) => ({ ...session, title: `새 계획 ${session.id}` }));
  const merged = mergePlanWithTrainingHistory(nextPlan, previousPlan, {});

  assert.equal(merged.find((session) => session.id === "tue").title, "새 계획 tue");
  assert.equal(merged.find((session) => session.id === "tue").status, "planned");
  assert.equal(merged.find((session) => session.id === "tue").note, "");
}

{
  const previousPlan = currentPlan.map((session) => (
    session.id === "tue" ? { ...session, title: "기록된 템포", status: "complete", note: "done" } : session
  ));
  const nextPlan = currentPlan.map((session) => ({ ...session, title: `새 계획 ${session.id}` }));
  const merged = mergePlanWithTrainingHistory(nextPlan, previousPlan, {});

  assert.equal(merged.find((session) => session.id === "tue").title, "기록된 템포");
  assert.equal(merged.find((session) => session.id === "tue").status, "complete");
  assert.equal(merged.find((session) => session.id === "wed").title, "새 계획 wed");
}

{
  const previousPlan = currentPlan.map((session) => (
    session.id === "thu" ? { ...session, title: "로그가 있는 이지런", status: "planned" } : session
  ));
  const nextPlan = currentPlan.map((session) => ({ ...session, title: `새 계획 ${session.id}` }));
  const merged = mergePlanWithTrainingHistory(nextPlan, previousPlan, {
    "2026-05-21": { dayId: "thu", source: "manual", distance: "6" },
  });

  assert.equal(merged.find((session) => session.id === "thu").title, "로그가 있는 이지런");
}

{
  const nextPlan = currentPlan.map((session) => (
    session.id === "thu" ? { ...session, title: "회복 조깅 4km", distance: "4km" } : session
  ));
  const changedSessions = __coachTest.getChangedPlanSessions(nextPlan, currentPlan);

  assert.equal(changedSessions.length, 1);
  assert.equal(changedSessions[0].id, "thu");
}

{
  const nextPlan = currentPlan.map((session) => (
    session.id === "thu" ? { ...session, title: "회복 조깅 4km", distance: "4km" } : session
  ));
  const result = applyCoachPlanToState({
    profile: defaultProfile,
    checkin: defaultCheckin,
    plan: currentPlan,
    activityLogs: {},
    planMeta: {},
    selectedDayId: "thu",
  }, {
    source: "llm-coach",
    weeklyPlan: nextPlan,
    profile: { weeklyMileage: 36 },
  });

  assert.equal(result.applied, true);
  assert.equal(result.state.profile.weeklyMileage, 36);
  assert.equal(result.state.plan.find((session) => session.id === "thu").title, "회복 조깅 4km");
  assert.equal(result.state.selectedDayId, "thu");
  assert.equal(result.state.planMeta.source, "llm-coach");
  assert.ok(result.state.planMeta.season?.label);
}

{
  const result = applyCoachPlanToState({
    profile: defaultProfile,
    checkin: defaultCheckin,
    plan: currentPlan,
    activityLogs: {},
    planMeta: {},
    selectedDayId: "thu",
  }, {
    source: "llm-coach",
    weeklyPlan: currentPlan,
    profile: { weeklyMileage: defaultProfile.weeklyMileage },
  });

  assert.equal(result.applied, false);
  assert.equal(result.state.plan.find((session) => session.id === "thu").title, currentPlan.find((session) => session.id === "thu").title);
}

{
  assert.equal(__homeTest.hasActiveTemporarySchedule({
    temporaryAvailableDays: null,
    temporaryPreferredDays: "화, 목, 토",
    temporaryLongRunDay: "",
  }, defaultProfile), false);
  assert.equal(__homeTest.hasActiveTemporarySchedule({
    temporaryAvailableDays: "2",
    temporaryPreferredDays: "화, 목",
    temporaryLongRunDay: "",
  }, defaultProfile), true);
}

{
  const raceState = {
    profile: {
      ...defaultProfile,
      goalRace: "서울하프마라톤",
      goalDate: "2026-05-24",
      raceType: "half",
      goalTime: "1:45",
    },
    onboarding: {
      initialPlanningProfile: {
        primaryGoalType: "race",
        race: { name: "서울하프마라톤", type: "half", date: "2026-05-24", goalTime: "1:45" },
      },
    },
    goalLifecycle: { completedGoals: [] },
  };
  assert.equal(hasFinishedRaceGoal(raceState, "2026-05-28"), true);
  const archived = buildCompletedGoal(raceState, { actualTime: "1:47:20", effort: "hard", pain: "light", memo: "후반 버팀" }, "2026-05-28T00:00:00.000Z");
  assert.equal(archived.name, "서울하프마라톤");
  assert.equal(archived.review.actualTime, "1:47:20");
  assert.equal(hasFinishedRaceGoal({ ...raceState, goalLifecycle: { completedGoals: [archived] } }, "2026-05-28"), false);
}

{
  const draft = buildNextGoalDraftPatch({
    mode: "non-race",
    nonRaceFocus: "fitness",
    programDurationWeeks: "12",
  });
  assert.equal(draft.mode, "non-race");
  assert.equal(draft.nonRaceFocus, "fitness");
  assert.equal(draft.programDurationWeeks, "12");
}

{
  const calls = [];
  const supabase = {
    functions: {
      invoke: async (_name, options) => {
        calls.push(options.body);
        if (calls.length === 1) {
          return {
            data: {
              stage: "proposal",
              reply: "목요일 훈련을 회복 조깅으로 바꿨어.",
              pendingPlan: null,
            },
            error: null,
          };
        }
        return {
          data: {
            stage: "proposal",
            reply: "이번에는 앱에 적용 가능한 변경안으로 다시 보냈어.",
            pendingPlan: {
              concern: "fatigue",
              weeklyPlan: [
                makeSession("thu", {
                  type: "recovery",
                  title: "회복 조깅 4km",
                  distance: "4km",
                  intensity: "easy",
                }),
              ],
            },
          },
          error: null,
        };
      },
    },
  };
  const response = await requestCoachReply({
    supabase,
    authSession: null,
    message: "목요일 훈련을 회복 조깅으로 바꿔줘",
    state: {
      profile: defaultProfile,
      checkin: defaultCheckin,
      plan: currentPlan,
      activityLogs: {},
      coachChat: { stage: "idle", pendingPlan: null, messages: [] },
      onboarding: {},
    },
  });

  assert.equal(calls.length, 2);
  assert.match(calls[1].message, /STRUCTURED APP UPDATE REQUIRED/);
  assert.equal(response.pendingPlan.weeklyPlan.find((session) => session.id === "thu").title, "회복 조깅 4km");
}

{
  const supabase = {
    functions: {
      invoke: async () => {
        throw new Error("edge unavailable");
      },
    },
  };
  const response = await requestCoachReply({
    supabase,
    authSession: null,
    message: "이번 주는 화 목 2번만 뛸 수 있어. 계획표에 반영해줘",
    state: {
      profile: defaultProfile,
      checkin: defaultCheckin,
      plan: currentPlan,
      activityLogs: {},
      coachChat: { stage: "idle", pendingPlan: null, messages: [] },
      onboarding: {},
    },
  });

  assert.equal(response.stage, "proposal");
  assert.equal(response.meta.source, "llm-fallback");
  assert.equal(response.pendingPlan.source, "llm-fallback");
  assert.equal(response.pendingPlan.checkin.temporaryAvailableDays, 2);
  assert.equal(response.pendingPlan.checkin.temporaryPreferredDays, "tue, thu");

  const applied = applyCoachPlanToState({
    profile: defaultProfile,
    checkin: defaultCheckin,
    plan: currentPlan,
    activityLogs: {},
    planMeta: {},
    selectedDayId: "tue",
  }, response.pendingPlan);

  assert.equal(applied.applied, true);
  assert.equal(applied.state.checkin.temporaryAvailableDays, 2);
  assert.equal(applied.state.plan.filter((session) => ["easy", "quality", "long", "recovery"].includes(session.type)).length, 2);
}

console.log("coach-service tests passed");
