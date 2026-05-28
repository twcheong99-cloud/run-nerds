import { buildCoachReply } from "./coach.js";
import { DAY_LABELS, DAY_ORDER } from "./config.js";

const COACH_FUNCTION_NAME = "coach";
const COACH_TIMEOUT_MS = 60000;
const COACH_CONTRACT_VERSION = "coach-contract-v3";
const RECENT_MESSAGE_LIMIT = 10;
const ALLOWED_PROFILE_FIELDS = new Set([
  "fatigue",
  "pain",
  "availableDays",
  "preferredDays",
  "longRunDay",
  "physicalNotes",
  "goalNotes",
  "goalRace",
  "goalTime",
  "weeklyMileage",
  "raceType",
  "qualityFocus",
  "notes",
  "coachNotes",
]);
const ALLOWED_CHECKIN_FIELDS = new Set(["fatigue", "pain", "sleep", "schedule", "confidence", "comment", "temporaryAvailableDays", "temporaryPreferredDays", "temporaryLongRunDay"]);
const ALLOWED_STAGES = new Set(["idle", "clarifying", "proposal"]);
const ALLOWED_SAFETY_LEVELS = new Set(["green", "yellow", "red"]);
const ALLOWED_SESSION_TYPES = new Set(["rest", "mobility", "easy", "quality", "long", "recovery"]);
const ALLOWED_INTENSITIES = new Set(["rest", "easy", "moderate", "steady", "hard"]);
const RACE_EVENT_TYPES = {
  half: { title: "하프마라톤 레이스", distance: "21.1km", duration: "목표 기록 기준", raceLabel: "하프마라톤" },
  full: { title: "마라톤 레이스", distance: "42.2km", duration: "목표 기록 기준", raceLabel: "마라톤" },
  "10k": { title: "10K 레이스", distance: "10km", duration: "목표 기록 기준", raceLabel: "10K" },
};

function hasApplyIntent(message) {
  return /반영|적용|바꿔|변경|수정|업데이트|조정해|줄여|늘려|다시 짜|다시짜|replan|apply|update|change/i.test(String(message || ""));
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("Coach service timed out")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function pickAllowed(source, allowedFields) {
  return Object.fromEntries(
    Object.entries(source || {}).filter(([key, value]) => (
      allowedFields.has(key) && value !== undefined && (value === null || String(value).trim() !== "")
    ))
  );
}

function canonicalValue(key, value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (key === "fatigue") {
    if (/high|heavy|tired|fatigue|피곤|피로|무거|높|강/.test(text)) return "high";
    if (/low|fresh|good|낮|가벼|좋/.test(text)) return "low";
    return "medium";
  }
  if (key === "pain") {
    if (/worry|sharp|pain|ache|통증|아파|아픔|불편|걱정/.test(text)) return "worrying";
    return "none";
  }
  if (key === "sleep") {
    if (/poor|bad|low|부족|나쁨|못|적/.test(text)) return "poor";
    return "okay";
  }
  if (key === "schedule") {
    if (/chaotic|busy|tight|바빠|불안|흔들|야근|출장|회식|부족/.test(text)) return "chaotic";
    return "stable";
  }
  if (key === "confidence") {
    if (/low|낮|불안|걱정/.test(text)) return "low";
    if (/high|높|좋|자신/.test(text)) return "high";
    return "steady";
  }
  if (key === "profileFatigue") {
    if (/high|heavy|tired|fatigue|피곤|피로|무거/.test(text)) return "tired";
    if (/fresh|good|좋|가벼/.test(text)) return "fresh";
    return "normal";
  }
  if (key === "profilePain") {
    if (/sharp|날카|심|severe/.test(text)) return "sharp";
    if (/pain|ache|통증|아파|아픔|불편|light/.test(text)) return "light";
    return "none";
  }
  return String(value || "");
}

function normalizeCheckinPatch(patch) {
  const picked = pickAllowed(patch, ALLOWED_CHECKIN_FIELDS);
  const next = {};
  Object.entries(picked).forEach(([key, value]) => {
    if (key === "comment") next[key] = String(value);
    else if (key === "temporaryAvailableDays") next[key] = value === null ? null : Math.min(5, Math.max(2, Number(value) || 0));
    else if (key === "temporaryPreferredDays") next[key] = normalizePreferredDays(value);
    else if (key === "temporaryLongRunDay") next[key] = normalizeDayId(value);
    else next[key] = canonicalValue(key, value);
  });
  return next;
}

function normalizeProfilePatch(patch) {
  const picked = pickAllowed(patch, ALLOWED_PROFILE_FIELDS);
  const next = {};
  Object.entries(picked).forEach(([key, value]) => {
    if (key === "fatigue") next[key] = canonicalValue("profileFatigue", value);
    else if (key === "pain") next[key] = canonicalValue("profilePain", value);
    else if (key === "availableDays") next[key] = Math.min(5, Math.max(2, Number(value) || 4));
    else if (key === "preferredDays") next[key] = normalizePreferredDays(value);
    else if (key === "longRunDay") next[key] = normalizeDayId(value) || "sat";
    else if (key === "physicalNotes") next[key] = profileDisplayNote(value, "physical");
    else if (key === "goalNotes") next[key] = profileDisplayNote(value, "goal");
    else if (key === "weeklyMileage") next[key] = Math.min(180, Math.max(0, Number(value) || 0));
    else if (key === "raceType") {
      const raceType = normalizeRaceType(value);
      if (raceType) next[key] = raceType;
    } else if (key === "qualityFocus") {
      const qualityFocus = normalizeQualityFocus(value);
      if (qualityFocus) next[key] = qualityFocus;
    }
    else if (key === "goalRace" || key === "goalTime" || key === "notes" || key === "coachNotes") next[key] = trimText(value, 120);
  });
  return next;
}

function normalizeRaceType(value) {
  const text = String(value || "").trim().toLowerCase();
  if (/10\s*k|10k|ten/.test(text)) return "10k";
  if (/half|하프/.test(text)) return "half";
  if (/full|풀|마라톤|marathon/.test(text)) return "full";
  return "";
}

function normalizeQualityFocus(value) {
  const text = String(value || "").trim().toLowerCase();
  if (/interval|인터벌|speed|스피드/.test(text)) return "interval";
  if (/steady|스테디|지속/.test(text)) return "steady";
  if (/tempo|threshold|템포|역치/.test(text)) return "tempo";
  return "";
}

function normalizeDayId(value) {
  const text = String(value || "").trim().toLowerCase();
  const map = {
    월: "mon", monday: "mon", mon: "mon",
    화: "tue", tuesday: "tue", tue: "tue",
    수: "wed", wednesday: "wed", wed: "wed",
    목: "thu", thursday: "thu", thu: "thu",
    금: "fri", friday: "fri", fri: "fri",
    토: "sat", saturday: "sat", sat: "sat",
    일: "sun", sunday: "sun", sun: "sun",
  };
  return map[text] || "";
}

function normalizePreferredDays(value) {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  const days = raw
    .split(/[,\s/]+/)
    .map((item) => normalizeDayId(item))
    .filter(Boolean);
  return Array.from(new Set(days)).join(", ");
}

function trimText(value, maxLength = 180) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizedValue(value) {
  return stableStringify(value ?? null);
}

function patchHasChanges(patch, current = {}) {
  return Object.entries(patch || {}).some(([key, value]) => normalizedValue(value) !== normalizedValue(current?.[key]));
}

function sessionChanged(nextSession, currentSession = {}) {
  const keys = ["type", "title", "subtitle", "purpose", "success", "failure", "next", "intensity", "duration", "distance", "blocks"];
  return keys.some((key) => normalizedValue(nextSession?.[key]) !== normalizedValue(currentSession?.[key]));
}

function planHasChanges(nextPlan, currentPlan = []) {
  if (!Array.isArray(nextPlan) || !nextPlan.length) return false;
  const currentByDay = new Map((currentPlan || []).map((session) => [session.id, session]));
  return nextPlan.some((session) => sessionChanged(session, currentByDay.get(session.id)));
}

function pendingPlanHasChanges(pendingPlan, fallback = {}) {
  if (!pendingPlan) return false;
  return patchHasChanges(pendingPlan.profile, fallback.profile)
    || patchHasChanges(pendingPlan.checkin, fallback.checkin)
    || planHasChanges(pendingPlan.weeklyPlan, fallback.currentPlan);
}

function messageRequestsAppChange(message) {
  return hasApplyIntent(message) || /(계획표|앱|프로필|목표|요일|훈련|러닝|롱런|이지|템포|인터벌|회복|휴식).*(고쳐|바꿔|수정|변경|반영|조정|업데이트)|고쳐줘|바꿔줘|수정해줘|반영해줘|조정해줘/i.test(String(message || ""));
}

function replyClaimsChange(reply) {
  return /(고쳤|바꿨|수정했|변경했|반영했|조정했|업데이트했|다시 짰|줄였|늘렸|moved|changed|updated|applied)/i.test(String(reply || ""));
}

function buildUnappliedChangeResponse(reply, fallback, reason = "missing-structured-change") {
  return {
    stage: "clarifying",
    pendingPlan: null,
    reply: "수정했다고 말하기 전에 앱에 적용할 변경안을 확인해야 하는데, 방금 응답에는 실제로 저장할 구조화된 변경이 없었어. 어떤 항목을 어떻게 바꿀지 다시 잡아서 계획표/프로필에 반영 가능한 형태로 만들게.",
    meta: {
      source: "llm-coach",
      fallbackReason: reason,
      summary: `Rejected coach reply without applicable app changes: ${String(reply || fallback?.reply || "").slice(0, 220)}`,
      safety: null,
    },
  };
}

function normalizeBlocks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => trimText(item, 120))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeSessionType(value, fallback = "") {
  const text = String(value || "").trim().toLowerCase();
  if (ALLOWED_SESSION_TYPES.has(text)) return text;
  if (/tempo|interval|speed|threshold|quality|workout|핵심|템포|인터벌|스피드/.test(text)) return "quality";
  if (/long|longrun|long-run|롱런|장거리/.test(text)) return "long";
  if (/recovery|회복/.test(text)) return "recovery";
  if (/easy|jog|run|이지|조깅/.test(text)) return "easy";
  if (/mobility|strength|walk|stretch|보강|걷기|스트레칭/.test(text)) return "mobility";
  if (/rest|off|휴식|쉼/.test(text)) return "rest";
  return ALLOWED_SESSION_TYPES.has(fallback) ? fallback : "";
}

function normalizeIntensity(value, type, fallback = "") {
  const text = String(value || "").trim().toLowerCase();
  if (ALLOWED_INTENSITIES.has(text)) return text;
  if (/hard|high|fast|interval|강|빠르/.test(text)) return "hard";
  if (/moderate|tempo|threshold|중|템포/.test(text)) return "moderate";
  if (/steady|long|지속|스테디/.test(text)) return "steady";
  if (/easy|low|recovery|jog|가볍|이지|회복/.test(text)) return "easy";
  if (/rest|off|mobility|walk|stretch|휴식|보강|걷기|스트레칭/.test(text)) return "rest";
  if (ALLOWED_INTENSITIES.has(fallback)) return fallback;
  return type === "rest" || type === "mobility" ? "rest" : type === "long" ? "steady" : type === "quality" ? "moderate" : "easy";
}

function normalizeSession(rawSession, previousSession) {
  if (!rawSession || typeof rawSession !== "object") return null;
  const id = normalizeDayId(rawSession.id || rawSession.day);
  if (!id || !DAY_ORDER.includes(id)) return null;

  const type = normalizeSessionType(rawSession.type || rawSession.kind || rawSession.category, previousSession?.type);
  if (!type) return null;
  const intensity = normalizeIntensity(rawSession.intensity || rawSession.effort, type, previousSession?.intensity);

  const title = trimText(rawSession.title || previousSession?.title || (type === "rest" ? "휴식" : "조정 세션"), 80);
  const subtitle = trimText(rawSession.subtitle || previousSession?.subtitle || "코치 상담으로 조정", 120);
  const purpose = trimText(rawSession.purpose || previousSession?.purpose || "현재 상황에 맞춰 주간 흐름을 유지합니다.", 260);
  const success = trimText(rawSession.success || previousSession?.success || "몸 상태를 해치지 않고 계획 의도를 지키면 성공입니다.", 220);
  const failure = trimText(rawSession.failure || previousSession?.failure || "어려우면 강도나 시간을 낮춰도 괜찮습니다.", 220);
  const next = trimText(rawSession.next || previousSession?.next || "다음 세션의 회복과 연결합니다.", 220);

  return {
    id,
    day: DAY_LABELS[id],
    type,
    title,
    subtitle,
    purpose,
    success,
    failure,
    next,
    intensity,
    duration: trimText(rawSession.duration || previousSession?.duration || "-", 40) || "-",
    distance: trimText(rawSession.distance || previousSession?.distance || "-", 40) || "-",
    blocks: normalizeBlocks(rawSession.blocks),
    status: "planned",
    note: "",
    debrief: null,
  };
}

function normalizeWeeklyPlan(rawPlan, previousPlan = []) {
  if (!Array.isArray(rawPlan)) return null;
  const previousByDay = new Map((previousPlan || []).map((session) => [session.id, session]));
  const nextByDay = new Map();

  rawPlan.forEach((rawSession) => {
    const normalized = normalizeSession(rawSession, previousByDay.get(normalizeDayId(rawSession?.id || rawSession?.day)));
    if (normalized) nextByDay.set(normalized.id, normalized);
  });

  if (!nextByDay.size) return null;
  if (nextByDay.size !== DAY_ORDER.length) {
    DAY_ORDER.forEach((dayId) => {
      if (!nextByDay.has(dayId) && previousByDay.has(dayId)) nextByDay.set(dayId, previousByDay.get(dayId));
    });
  }
  if (nextByDay.size !== DAY_ORDER.length) return null;
  return DAY_ORDER.map((dayId) => nextByDay.get(dayId));
}

function extractTrainingPreference(message) {
  const text = String(message || "");
  const resetTemporary = /기본\s*루틴|원래\s*루틴|임시.*해제|임시.*취소|이번\s*주.*해제|원래대로|복귀/.test(text);
  const countMatch = text.match(/주\s*([2-6])\s*회|([2-6])\s*번/);
  const requestedCount = countMatch ? Number(countMatch[1] || countMatch[2]) : null;
  const hasAvailabilityLanguage = Boolean(
    requestedCount ||
    /이번\s*주.*(가능|뛸 수|뛸수|만|밖에)|가능한\s*날|가능.*요일|훈련.*횟수|러닝.*횟수|주간.*횟수|매주|앞으로|기본|루틴|계속|항상|only/i.test(text)
  );
  const dayMatches = text.match(/[월화수목금토일]/g) || [];
  const dayTokens = hasAvailabilityLanguage && requestedCount && dayMatches.length > requestedCount ? dayMatches.slice(0, requestedCount) : hasAvailabilityLanguage ? dayMatches : [];
  const preferredDays = dayTokens.length ? normalizePreferredDays(dayTokens.join(",")) : "";
  const availableDays = requestedCount || (preferredDays ? preferredDays.split(",").filter(Boolean).length : null);
  const longRunDay = /롱런.*일|일.*롱런/.test(text) ? "sun" : /롱런.*토|토.*롱런/.test(text) ? "sat" : "";
  const scope = /이번\s*주|이번주는|이번주만|이번 주만|오늘부터 이번|금주/.test(text)
    ? "temporary"
    : /매주|앞으로|기본|루틴|계속|항상|다음\s*주도|다음주도/.test(text)
      ? "permanent"
      : /가능|된다|돼|할 수 있|할수 있/.test(text)
        ? "temporary"
      : "unspecified";
  return { availableDays, preferredDays, longRunDay, scope, resetTemporary };
}

function extractRaceEvent(message) {
  const text = String(message || "").toLowerCase();
  const raceType = /하프|half/.test(text)
    ? "half"
    : /풀|마라톤|marathon|42\.?2/.test(text)
      ? "full"
      : /10\s*k|10k/.test(text)
        ? "10k"
        : "";
  if (!raceType) return null;

  const explicitDay = normalizeDayId((String(message || "").match(/[월화수목금토일](?=요일|에|날|$)/) || [])[0]);
  const dayId = /이번\s*주\s*일요일|이번주\s*일요일|일요일|sunday|sun/.test(text) ? "sun" : explicitDay;
  if (!dayId) return null;

  return { dayId, raceType, ...RACE_EVENT_TYPES[raceType] };
}

function createRaceSession(event, previousSession = {}) {
  return {
    id: event.dayId,
    day: DAY_LABELS[event.dayId],
    type: "long",
    title: event.title,
    subtitle: "훈련이 아니라 레이스 실행",
    purpose: `${event.raceLabel} 당일입니다. 훈련량을 채우는 대신 안전한 완주와 페이스 운영을 우선합니다.`,
    success: "초반을 여유 있게 열고, 후반까지 자세와 보급 리듬을 유지하면 성공입니다.",
    failure: "컨디션이나 통증 신호가 크면 기록보다 중단 판단과 회복을 우선합니다.",
    next: "레이스 다음 날은 회복과 몸 상태 기록으로 연결합니다.",
    intensity: event.raceType === "10k" ? "hard" : "steady",
    duration: event.duration,
    distance: event.distance,
    blocks: ["워밍업 10~15분", `${event.raceLabel} ${event.distance}`, "종료 후 수분, 탄수화물, 통증 체크"],
    status: previousSession.status === "complete" ? previousSession.status : "planned",
    note: previousSession.status === "complete" ? previousSession.note || "" : "",
    debrief: previousSession.status === "complete" ? previousSession.debrief || null : null,
  };
}

function mergeExplicitRaceEvent(pendingPlan, message, fallback) {
  const event = extractRaceEvent(message);
  if (!event) return pendingPlan;

  const basePlan = pendingPlan?.weeklyPlan || fallback?.currentPlan || [];
  if (!Array.isArray(basePlan) || basePlan.length !== DAY_ORDER.length) return pendingPlan;

  const weeklyPlan = basePlan.map((session) => (
    session.id === event.dayId ? createRaceSession(event, session) : session
  ));
  const profile = { ...(pendingPlan?.profile || {}) };
  profile.goalNotes = profile.goalNotes || `이번 주 ${DAY_LABELS[event.dayId]} ${event.raceLabel}`;
  const checkin = {
    ...(pendingPlan?.checkin || {}),
    temporaryLongRunDay: event.dayId,
  };

  return {
    ...(pendingPlan || {}),
    concern: "race",
    checkin,
    profile,
    weeklyPlan,
  };
}

function profileDisplayNote(value, kind) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (isEphemeralConversation(text)) return "";
  if (kind === "physical" && !/(통증|불편|피로|수면|회복|부상|무릎|발목|종아리|햄스트링|허리|컨디션|몸|pain|sleep|recovery|fatigue)/i.test(text)) return "";
  if (kind === "goal" && !/(목표|대회|기록|완주|마라톤|하프|10k|풀|페이스|서브|시간|race|goal|marathon)/i.test(text)) return "";
  if (kind === "coach" && !/(회복|강도|볼륨|조정|유지|주의|압축|추천|우선|전략|리듬|훈련)/i.test(text)) return "";
  return summarizeProfileNote(text, kind);
}

function summarizeProfileNote(text, kind) {
  const firstSentence = text.split(/[.!?。]| \/ /).map((item) => item.trim()).find(Boolean) || text;
  const maxLength = kind === "physical" ? 34 : 44;
  return firstSentence.length > maxLength ? `${firstSentence.slice(0, maxLength - 1)}…` : firstSentence;
}

function isEphemeralConversation(text) {
  return /(이번 주|오늘|내일|어제|이틀만|살짝|해보려고|고민|어떻게 할까|할 수 있을|어렵겠|가능하고|가능해|못.*하|못하|바빠|아직)/.test(text);
}

function strengthenPatchForConcern(pendingPlan, fallback) {
  if (!pendingPlan) return pendingPlan;
  const concern = pendingPlan.concern || fallback?.concern || "general";
  const checkin = { ...(fallback?.checkin || {}), ...(pendingPlan.checkin || {}) };
  const profile = { ...(fallback?.profile || {}), ...(pendingPlan.profile || {}) };

  if (concern === "pain") {
    checkin.pain = checkin.pain || "worrying";
    checkin.fatigue = checkin.fatigue || "high";
    profile.pain = profile.pain || "light";
  }
  if (concern === "fatigue") {
    checkin.fatigue = checkin.fatigue || "high";
    checkin.sleep = checkin.sleep || "poor";
    profile.fatigue = profile.fatigue || "tired";
  }
  if (concern === "schedule") {
    checkin.schedule = checkin.schedule || "chaotic";
  }

  return { ...pendingPlan, checkin, profile };
}

function mergeExplicitTrainingPreference(pendingPlan, message) {
  if (!pendingPlan) return pendingPlan;
  const preference = extractTrainingPreference(message);
  const profile = { ...(pendingPlan.profile || {}) };
  const checkin = { ...(pendingPlan.checkin || {}) };
  if (preference.resetTemporary) {
    checkin.temporaryAvailableDays = null;
    checkin.temporaryPreferredDays = "";
    checkin.temporaryLongRunDay = "";
    checkin.schedule = "stable";
  }
  if (preference.availableDays) {
    if (preference.scope === "temporary") checkin.temporaryAvailableDays = preference.availableDays;
    else {
      profile.availableDays = preference.availableDays;
      checkin.temporaryAvailableDays = null;
      checkin.temporaryPreferredDays = "";
      checkin.temporaryLongRunDay = "";
    }
    checkin.schedule = "stable";
  }
  if (preference.preferredDays) {
    if (preference.scope === "temporary") checkin.temporaryPreferredDays = preference.preferredDays;
    else {
      profile.preferredDays = preference.preferredDays;
      checkin.temporaryPreferredDays = "";
    }
  }
  if (preference.longRunDay) {
    if (preference.scope === "temporary") checkin.temporaryLongRunDay = preference.longRunDay;
    else {
      profile.longRunDay = preference.longRunDay;
      checkin.temporaryLongRunDay = "";
    }
  }
  return { ...pendingPlan, profile, checkin };
}

function buildCoachRequest({ message, state }) {
  return {
    contractVersion: COACH_CONTRACT_VERSION,
    message,
    applyIntent: hasApplyIntent(message),
    profile: state.profile,
    checkin: state.checkin,
    plan: state.plan,
    activityLogs: state.activityLogs || {},
    coachChat: {
      stage: state.coachChat?.stage || "idle",
      pendingPlan: state.coachChat?.pendingPlan || null,
      messages: (state.coachChat?.messages || []).slice(-RECENT_MESSAGE_LIMIT),
    },
  };
}

function buildRepairCoachRequest({ message, state, previousReply }) {
  return buildCoachRequest({
    message: [
      "STRUCTURED APP UPDATE REQUIRED.",
      "The previous coach reply claimed a change, but the app could not apply it because it had no effective pendingPlan/profile/checkin/weeklyPlan changes.",
      "Return JSON only. If the user's request changes the app, include pendingPlan with concrete profile/checkin fields and/or changed weeklyPlan sessions. Do not say you changed the app unless pendingPlan contains effective changes.",
      `Original user message: ${message}`,
      `Previous unusable reply: ${previousReply || ""}`,
    ].join("\n"),
    state,
  });
}

function normalizeCoachResponse(response, fallback, message) {
  const raw = response && typeof response === "object" ? response : {};
  const requestedApply = hasApplyIntent(message);
  const stage = ALLOWED_STAGES.has(raw.stage) ? raw.stage : fallback.stage;
  const reply = String(raw.reply || raw.message || fallback.reply || "").trim();
  const rawPendingPlan = raw.pendingPlan && typeof raw.pendingPlan === "object"
    ? raw.pendingPlan
    : (raw.weeklyPlan || raw.profile || raw.checkin)
      ? {
          concern: raw.concern,
          checkin: raw.checkin,
          profile: raw.profile,
          weeklyPlan: raw.weeklyPlan,
        }
      : null;
  const pendingPlan = rawPendingPlan
    ? strengthenPatchForConcern({
        concern: String(rawPendingPlan.concern || fallback.pendingPlan?.concern || "general"),
        originalMessage: rawPendingPlan.originalMessage || fallback.pendingPlan?.originalMessage,
        checkin: normalizeCheckinPatch(rawPendingPlan.checkin),
        profile: normalizeProfilePatch(rawPendingPlan.profile),
        weeklyPlan: normalizeWeeklyPlan(rawPendingPlan.weeklyPlan || raw.weeklyPlan, fallback.currentPlan),
        meta: raw.meta || null,
        source: "llm-coach",
      }, fallback.pendingPlan)
    : fallback.pendingPlan || null;
  const preferenceAwarePlan = mergeExplicitTrainingPreference(pendingPlan, message);
  const raceAwarePlan = mergeExplicitRaceEvent(preferenceAwarePlan, message, fallback);
  const safetyLevel = ALLOWED_SAFETY_LEVELS.has(raw.safety?.level) ? raw.safety.level : "green";
  const hasChanges = pendingPlanHasChanges(raceAwarePlan, fallback);

  if (!hasChanges && (replyClaimsChange(reply) || (stage === "proposal" && messageRequestsAppChange(message)))) {
    return buildUnappliedChangeResponse(reply, fallback, raceAwarePlan ? "no-effective-change" : "missing-structured-change");
  }

  return {
    stage: raceAwarePlan ? "proposal" : stage,
    pendingPlan: raceAwarePlan,
    reply: reply || fallback.reply,
    meta: {
      source: "llm-coach",
      fallbackReason: raw.meta?.contractVersion === COACH_CONTRACT_VERSION || raw.contractVersion === COACH_CONTRACT_VERSION
        ? "none"
        : "coach-contract-unverified",
      contractVersion: String(raw.meta?.contractVersion || raw.contractVersion || ""),
      expectedContractVersion: COACH_CONTRACT_VERSION,
      summary: String(raw.meta?.summary || raw.summary || "").slice(0, 600),
      safety: {
        level: safetyLevel,
        message: String(raw.safety?.message || "").slice(0, 600),
      },
    },
  };
}

function buildFallbackReply({ message, state, reason }) {
  const fallback = buildCoachReply({ message, state });
  const preferenceAwarePlan = mergeExplicitTrainingPreference(fallback.pendingPlan, message);
  const raceAwarePlan = mergeExplicitRaceEvent(preferenceAwarePlan, message, { currentPlan: state.plan });
  const hasChanges = pendingPlanHasChanges(raceAwarePlan, {
    currentPlan: state.plan,
    profile: state.profile,
    checkin: state.checkin,
  });
  return {
    ...fallback,
    stage: hasChanges ? "proposal" : fallback.stage,
    pendingPlan: hasChanges ? { ...raceAwarePlan, source: "llm-fallback" } : null,
    meta: {
      source: "llm-fallback",
      fallbackReason: reason,
      contractVersion: COACH_CONTRACT_VERSION,
      expectedContractVersion: COACH_CONTRACT_VERSION,
      summary: "LLM coach service was unavailable, so the local coach engine generated this response.",
      safety: null,
    },
  };
}

async function describeCoachError(error) {
  const status = error?.context?.status ? `status ${error.context.status}` : "";
  let body = "";
  try {
    body = error?.context ? await error.context.clone().text() : "";
  } catch {
    body = "";
  }
  return [error?.message, status, body].filter(Boolean).join(" / ");
}

export async function requestCoachReply({ supabase, authSession, message, state }) {
  const localFallback = {
    ...buildCoachReply({ message, state }),
    currentPlan: state.plan,
    profile: state.profile,
    checkin: state.checkin,
  };

  try {
    const request = buildCoachRequest({ message, state });
    const { data, error } = await withTimeout(
      supabase.functions.invoke(COACH_FUNCTION_NAME, {
        body: request,
        headers: authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {},
      }),
      COACH_TIMEOUT_MS
    );
    if (error) throw error;
    const normalized = normalizeCoachResponse(data, localFallback, message);
    if (normalized.meta?.fallbackReason === "missing-structured-change" || normalized.meta?.fallbackReason === "no-effective-change") {
      const { data: repairedData, error: repairError } = await withTimeout(
        supabase.functions.invoke(COACH_FUNCTION_NAME, {
          body: buildRepairCoachRequest({ message, state, previousReply: data?.reply || data?.message || "" }),
          headers: authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {},
        }),
        COACH_TIMEOUT_MS
      );
      if (!repairError) {
        const repaired = normalizeCoachResponse(repairedData, localFallback, message);
        if (repaired.pendingPlan) return repaired;
      }
    }
    return normalized;
  } catch (error) {
    const reason = await describeCoachError(error);
    console.warn("Coach service fallback", reason, error);
    return buildFallbackReply({
      message,
      state,
      reason: reason || "coach-service-unavailable",
    });
  }
}

export const __coachServiceTest = {
  hasApplyIntent,
  mergeExplicitTrainingPreference,
  normalizeCoachResponse,
  normalizeWeeklyPlan,
};
