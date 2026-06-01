import { DAY_LABELS, DAY_ORDER } from "./config.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RACE_DISTANCES = {
  "10k": 10,
  half: 21.1,
  full: 42.2,
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function formatStatus(status) {
  if (status === "complete") return "완료";
  if (status === "failed") return "실패";
  if (status === "skipped") return "미실행";
  return "예정";
}

function parsePreferredDays(raw) {
  const map = {
    월: "mon", 화: "tue", 수: "wed", 목: "thu", 금: "fri", 토: "sat", 일: "sun",
    mon: "mon", tue: "tue", wed: "wed", thu: "thu", fri: "fri", sat: "sat", sun: "sun",
  };
  return String(raw || "")
    .split(/[,\s/]+/)
    .map((token) => map[token.trim().toLowerCase()] || map[token.trim()])
    .filter(Boolean);
}

function getSafetyState(profile, checkin) {
  if (profile.pain === "sharp") {
    return {
      level: "red",
      label: "RED",
      message: "날카로운 통증이 보고되어 고강도 훈련은 제안하지 않습니다. 러닝을 멈추고 전문가 평가를 우선 권합니다.",
    };
  }
  if (checkin.pain === "worrying" || checkin.fatigue === "high" || checkin.sleep === "poor") {
    return {
      level: "yellow",
      label: "YELLOW",
      message: "피로 또는 통증 신호가 있어 강도보다 회복을 우선합니다. 템포/인터벌은 이지런 또는 휴식으로 대체할 수 있습니다.",
    };
  }
  return {
    level: "green",
    label: "GREEN",
    message: "현재 입력 기준으로는 계획 유지가 가능하지만, 피로가 쌓이면 볼륨을 5~10% 조정합니다.",
  };
}

function estimateEasyCue(raceType) {
  if (raceType === "full") return "마라톤 페이스보다 충분히 여유 있는 강도";
  if (raceType === "10k") return "숨이 고르며 대화 가능한 강도";
  return "하프 목표 페이스보다 여유 있는 이지 강도";
}

function parseDateOnly(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function diffDays(from, to) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

function dayIdForDate(date) {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()];
}

function mondayOf(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(date), diff);
}

function weekContains(weekStart, date) {
  const offset = diffDays(weekStart, date);
  return offset >= 0 && offset <= 6;
}

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isFreshCheckin(checkin, today = new Date()) {
  const updatedAt = parseDateOnly(checkin?.updatedAt);
  if (!updatedAt) return false;
  const ageDays = diffDays(updatedAt, today);
  return ageDays >= 0 && ageDays <= 6;
}

function getCurrentCheckin(checkin, today = new Date()) {
  if (isFreshCheckin(checkin, today)) return checkin;
  const hasTemporarySchedule = Boolean(
    checkin?.temporaryAvailableDays
    || checkin?.temporaryPreferredDays
    || checkin?.temporaryLongRunDay
  );
  return {
    ...checkin,
    fatigue: "medium",
    pain: "none",
    sleep: "okay",
    schedule: hasTemporarySchedule ? checkin?.schedule || "stable" : "stable",
  };
}

function phaseForWeek(profile, weekStart, today = new Date()) {
  const raceDate = parseDateOnly(profile.goalDate);
  const raceType = profile.raceType || "half";
  const base = {
    kind: "base",
    label: "기초 축적",
    weekRole: "대회까지 시간이 남아 있어 무리한 피크보다 꾸준한 볼륨과 기본 리듬을 쌓는 주간입니다.",
    sessionReason: "장기 목표를 향한 기초 체력과 반복 가능한 루틴을 만드는 역할입니다.",
    mileageFactor: 0.9,
    longRunFactor: 0.34,
    longRunCap: raceType === "full" ? 28 : raceType === "half" ? 18 : 12,
    qualityMode: "aerobic",
    includeQuality: true,
    includeLongRun: true,
    raceDayId: "",
    daysToRace: null,
    weeksToRace: null,
  };
  if (!raceDate) return base;

  const weekEnd = addDays(weekStart, 6);
  const daysToRace = diffDays(today, raceDate);
  const weeksToRace = Math.ceil(diffDays(weekStart, raceDate) / 7);
  const raceDayId = weekContains(weekStart, raceDate) ? dayIdForDate(raceDate) : "";
  const daysSinceRaceAtWeekStart = diffDays(raceDate, weekStart);
  if (daysSinceRaceAtWeekStart > 13) {
    return {
      ...base,
      kind: "next-goal-bridge",
      label: "다음 목표 전환",
      weekRole: "이전 레이스 회복기가 끝났으므로 새 레이스를 반복하지 않고 기본 루틴과 다음 목표 선택을 준비합니다.",
      sessionReason: "이전 대회 자극을 무리하게 반복하지 않고 다음 목표를 세울 수 있는 지속 가능한 리듬을 회복합니다.",
      mileageFactor: 0.75,
      longRunFactor: 0.28,
      longRunCap: raceType === "full" ? 20 : raceType === "half" ? 12 : 8,
      qualityMode: "aerobic",
      daysToRace,
      weeksToRace,
    };
  }
  if (daysSinceRaceAtWeekStart > 0) {
    return {
      ...base,
      kind: "post-race",
      label: "레이스 후 회복",
      weekRole: "목표 레이스가 이미 끝난 뒤라 새 하프/풀 세션을 반복하지 않고 회복과 상태 확인을 우선합니다.",
      sessionReason: "레이스 자극을 흡수하고 통증/피로 신호를 확인해 다음 목표로 넘어가기 위한 회복 목적입니다.",
      mileageFactor: 0.35,
      longRunFactor: 0,
      longRunCap: 0,
      qualityMode: "none",
      includeQuality: false,
      includeLongRun: false,
      raceDayId: "",
      daysToRace,
      weeksToRace,
    };
  }
  if (raceDate >= weekStart && raceDate <= weekEnd) {
    return {
      ...base,
      kind: "race-week",
      label: "레이스 주간",
      weekRole: "이번 주가 목표 레이스 주간이므로 훈련량을 채우기보다 피로를 줄이고 레이스 실행력을 보존합니다.",
      sessionReason: "대회 당일에 몸을 신선하게 만들기 위해 볼륨을 낮추고 짧은 리듬만 남깁니다.",
      mileageFactor: 0.45,
      longRunFactor: 0,
      longRunCap: 0,
      qualityMode: "sharpen",
      includeQuality: true,
      includeLongRun: false,
      raceDayId,
      daysToRace,
      weeksToRace: 0,
    };
  }
  if (weeksToRace <= 2) {
    return {
      ...base,
      kind: "taper",
      label: "테이퍼",
      weekRole: "대회 1~2주 전이라 훈련 효과를 새로 만들기보다 누적 피로를 줄이고 가벼운 목표 리듬만 확인합니다.",
      sessionReason: "볼륨을 줄여 회복을 만들되 레이스 감각이 무뎌지지 않도록 짧고 통제된 자극을 둡니다.",
      mileageFactor: weeksToRace <= 1 ? 0.6 : 0.75,
      longRunFactor: weeksToRace <= 1 ? 0.24 : 0.3,
      longRunCap: raceType === "full" ? 22 : raceType === "half" ? 14 : 8,
      qualityMode: "sharpen",
      includeQuality: true,
      includeLongRun: true,
      raceDayId: "",
      daysToRace,
      weeksToRace,
    };
  }
  if (weeksToRace <= 6) {
    return {
      ...base,
      kind: "specific-build",
      label: "대회 특이성 빌드",
      weekRole: "대회 3~6주 전이라 주간 볼륨과 롱런을 점진적으로 키우되 피로가 남지 않는 선에서 특이성을 쌓습니다.",
      sessionReason: "목표 거리와 리듬에 가까워지는 자극을 만들면서 다음 테이퍼가 의미 있게 작동하도록 합니다.",
      mileageFactor: weeksToRace <= 3 ? 1.02 : 0.96,
      longRunFactor: 0.4,
      longRunCap: raceType === "full" ? 32 : raceType === "half" ? 19 : 13,
      qualityMode: "specific",
      includeQuality: true,
      includeLongRun: true,
      raceDayId: "",
      daysToRace,
      weeksToRace,
    };
  }
  return {
    ...base,
    daysToRace,
    weeksToRace,
  };
}

function buildSeasonPlan(profile, today, baseMileage) {
  const start = mondayOf(today);
  const raceDate = parseDateOnly(profile.goalDate);
  const weekCount = raceDate ? clamp(Math.ceil(Math.max(0, diffDays(start, raceDate) + 1) / 7) + 1, 4, 8) : 4;
  return Array.from({ length: weekCount }, (_, index) => {
    const weekStart = addDays(start, index * 7);
    const phase = phaseForWeek(profile, weekStart, today);
    const targetMileage = Math.round(baseMileage * phase.mileageFactor);
    const longRunKm = phase.includeLongRun
      ? clamp(Math.round(targetMileage * phase.longRunFactor), 6, phase.longRunCap || 6)
      : 0;
    const raceText = phase.raceDayId ? ` · ${DAY_LABELS[phase.raceDayId]} 레이스` : "";
    return {
      weekStart: formatDate(weekStart),
      label: `${index + 1}주차 · ${phase.label}${raceText}`,
      targetMileage,
      longRunKm,
      reason: phase.weekRole,
    };
  });
}

function phaseFocusText(phase, tight) {
  if (phase.kind === "post-race") return "레이스 반복이 아니라 회복 조깅, 휴식, 몸 상태 확인";
  if (phase.kind === "next-goal-bridge") return "다음 목표를 정하기 전 기본 루틴 회복";
  if (phase.kind === "race-week") return "훈련량보다 신선도와 레이스 실행";
  if (phase.kind === "taper") return "볼륨을 줄이고 짧은 목표 리듬만 남기는 것";
  if (phase.kind === "specific-build") return "롱런과 목표 리듬을 점진적으로 키우는 것";
  return tight ? "제한된 일정 안에서도 핵심 세션과 롱런을 지키는 것" : "품질 세션과 롱런의 균형";
}

function createSession(input) {
  return { ...input, day: DAY_LABELS[input.id], note: input.note || "", status: input.status || "planned", debrief: input.debrief || null };
}

function restSession(id, title, subtitle, purpose, next) {
  return createSession({
    id, type: "rest", title, subtitle, purpose, next,
    success: "몸 상태를 관찰하고 다음 세션을 위한 여유를 남기면 충분합니다.",
    failure: "쉬는 날은 밀린 훈련이 아니라 의도된 회복입니다.",
    intensity: "rest", duration: "10~20분", distance: "-", blocks: ["가벼운 스트레칭 또는 산책", "수면과 피로 확인"],
  });
}

function mobilitySession(id, compact) {
  return createSession({
    id, type: "mobility", title: compact ? "짧은 스트레칭" : "보강 + 걷기",
    subtitle: compact ? "바쁜 일정에 맞춘 최소 유지" : "러닝 경제성과 부상 예방 보조",
    purpose: "러닝 양보다 몸 상태를 정돈하는 날입니다.",
    success: "10~20분이라도 몸을 돌보는 행동이 있으면 충분합니다.",
    failure: "놓쳤더라도 다음 러닝을 더 단순하게 조정하면 됩니다.",
    next: "다음 러닝의 움직임을 더 부드럽게 만듭니다.",
    intensity: "rest", duration: "15~25분", distance: "-", blocks: ["종아리, 햄스트링, 둔근 위주 가동성", "가볍게 10분 걷기"],
  });
}

function easySession(id, km, raceType, subtitle = "회복성 볼륨 확보", phase = null) {
  return createSession({
    id, type: "easy", title: `이지런 ${km}km`, subtitle,
    purpose: phase ? `${phase.sessionReason} 강도를 올리지 않고 주간 볼륨과 러닝 감각을 안정적으로 유지합니다.` : "강도를 올리지 않고 주간 볼륨과 러닝 감각을 안정적으로 유지합니다.",
    success: "대화 가능한 강도로 끝나고 다음 날 피로가 과하지 않으면 성공입니다.",
    failure: "다리가 무거우면 거리보다 강도를 더 낮추는 쪽이 맞습니다.",
    next: "다음 핵심 세션이나 롱런의 바탕이 됩니다.",
    intensity: "easy", duration: `${km * 6 + 5}~${km * 7}분`, distance: `${km}km`,
    blocks: ["워밍업 10분", `${km}km 이지런 (${estimateEasyCue(raceType)})`, "정리운동 5분"],
  });
}

function recoverySession(id, phase = null, km = 5) {
  return createSession({
    id, type: "recovery", title: `회복 조깅 ${km}km`, subtitle: phase?.kind === "post-race" ? "레이스 후 회복 확인" : "긴 세션 다음날 감각 회복",
    purpose: phase ? `${phase.sessionReason} 피로를 풀면서도 다음 주 연결 감각을 유지합니다.` : "피로를 풀면서도 다음 주 연결 감각을 유지합니다.",
    success: "상쾌하게 끝나거나, 피로가 크면 과감히 휴식해도 괜찮습니다.",
    failure: "생략해도 주간 핵심을 해친 것은 아닙니다.",
    next: "다음 체크인의 좋은 입력이 됩니다.",
    intensity: "easy", duration: `${km * 6}~${km * 8}분`, distance: `${km}km`, blocks: ["워밍업 5분", "편안한 조깅", "정리운동 5분"],
  });
}

function qualitySession(id, profile, km, soft, phase = null) {
  if (soft || phase?.qualityMode === "none") return easySession(id, km, profile.raceType, "강도 대신 감각 회복 우선", phase);
  if (phase?.qualityMode === "sharpen") {
    return createSession({
      id, type: "quality", title: "레이스 리듬 확인", subtitle: "짧게 깨우고 길게 쉬는 테이퍼 자극",
      purpose: `${phase.sessionReason} 새 피로를 만들지 않고 목표 리듬을 짧게 확인합니다.`,
      success: "짧은 구간에서 리듬만 확인하고 더 하고 싶은 여유를 남기면 성공입니다.",
      failure: "무겁거나 통증이 있으면 가속 구간을 빼고 이지런으로 끝냅니다.",
      next: "남은 주간은 회복을 우선해 레이스 또는 롱런에 신선하게 연결합니다.",
      intensity: "moderate", duration: "35~50분", distance: `${km}km`,
      blocks: ["워밍업 12~15분", "목표 리듬 2~4분 x 3회 / 충분한 조깅 회복", "쿨다운 10분"],
    });
  }
  if (profile.qualityFocus === "interval") {
    return createSession({
      id, type: "quality", title: "인터벌 세션", subtitle: "짧은 반복으로 속도 감각 확보",
      purpose: `${phase?.sessionReason || "이번 주 핵심 자극입니다."} 10K~하프 구간의 효율을 높이되 과도한 고통보다는 리듬을 익히는 데 집중합니다.`,
      success: "후반에도 폼이 무너지지 않고 반복 간 회복이 되면 적절합니다.",
      failure: "반복 수를 줄여도 괜찮고 페이스 집착보다 자세 유지가 우선입니다.",
      next: "다음 이지런이 자극을 흡수합니다.",
      intensity: "moderate", duration: "55~70분", distance: `${km}~${km + 2}km`,
      blocks: ["워밍업 15분 + 가속주 4회", "3분 빠르게 x 5회 / 2분 조깅 회복", "쿨다운 10~15분"],
    });
  }
  if (profile.qualityFocus === "steady") {
    return createSession({
      id, type: "quality", title: "스테디 런", subtitle: "무리 없이 오래 유지하는 리듬 훈련",
      purpose: `${phase?.sessionReason || "이번 주 핵심 자극입니다."} 레이스 페이스보다 약간 여유 있는 강도로 지속 능력을 키웁니다.`,
      success: "중간 이후에도 페이스와 호흡이 안정적이면 성공입니다.",
      failure: "힘들면 시간을 줄여도 되고 이번 주 피로 신호로 해석하면 됩니다.",
      next: "롱런 전 유산소 리듬을 정리합니다.",
      intensity: "moderate", duration: "50~65분", distance: `${km}~${km + 1}km`,
      blocks: ["워밍업 15분", "20~30분 steady run", "쿨다운 10~15분"],
    });
  }
  return createSession({
    id, type: "quality", title: "템포 세션", subtitle: "기록 확인이 아니라 목표 리듬 적응",
    purpose: `${phase?.sessionReason || "이번 주 핵심 자극입니다."} 하프/풀 준비에 필요한 안정적인 템포 감각을 익히는 핵심 세션입니다.`,
    success: "끝나고 한 단계 더 할 수 있을 듯한 여유가 남으면 적절합니다.",
    failure: "페이스가 안 나와도 현재 피로의 신호일 뿐 주간 전체 실패는 아닙니다.",
    next: "주중 이지런이 자극을 흡수하고 롱런으로 연결됩니다.",
    intensity: "moderate", duration: "55~70분", distance: `${km}~${km + 2}km`,
    blocks: ["워밍업 15분", "10분 템포 x 2~3세트 / 세트 사이 3분 조깅", "쿨다운 10~15분"],
  });
}

function longRunSession(id, km, raceType, tight, phase = null) {
  const cue = raceType === "full" ? "후반 20분은 자세와 보급 리듬 유지에 집중" : "후반 15분은 페이스보다 자세와 호흡 안정에 집중";
  return createSession({
    id, type: "long", title: `롱런 ${km}km`, subtitle: tight ? "제한된 일정 안에서 지켜야 할 주간 핵심" : "이번 주의 가장 중요한 세션",
    purpose: `${phase?.sessionReason || "이번 주 장거리 적응을 위한 세션입니다."} 거리 적응과 지구력 형성이 목적이며 한 번 빠르게 뛰는 것보다 시즌 흐름에 더 중요합니다.`,
    success: "후반에 자세가 크게 무너지지 않고 여유를 남기면 성공입니다.",
    failure: "거리 미달이어도 다음 주 증량으로 보상하지 않습니다. 현재 상태를 반영해 다시 잡으면 됩니다.",
    next: "다음 날 회복 조깅 또는 휴식으로 연결합니다.",
    intensity: "steady", duration: `${km * 6 + 10}~${km * 7 + 15}분`, distance: `${km}km`,
    blocks: ["워밍업 10분", `${km}km 이지~steady`, cue, "종료 후 수분과 탄수화물 보충"],
  });
}

function raceSession(id, profile, phase) {
  const distance = RACE_DISTANCES[profile.raceType] || RACE_DISTANCES.half;
  const label = profile.raceType === "full" ? "마라톤" : profile.raceType === "10k" ? "10K" : "하프마라톤";
  return createSession({
    id,
    type: "long",
    title: `${label} 레이스`,
    subtitle: "훈련이 아니라 목표 레이스 실행",
    purpose: `${phase.weekRole} 오늘은 훈련량을 채우는 날이 아니라 목표 레이스를 안전하게 실행하는 날입니다.`,
    success: "초반을 여유 있게 열고 후반까지 자세, 호흡, 보급 리듬을 유지하면 성공입니다.",
    failure: "통증, 어지러움, 흉통 같은 위험 신호가 있으면 기록보다 중단 판단을 우선합니다.",
    next: "다음 주는 회복 주간으로 전환해 레이스 자극을 흡수합니다.",
    intensity: profile.raceType === "10k" ? "hard" : "steady",
    duration: "목표 기록 기준",
    distance: `${distance}km`,
    blocks: ["워밍업 10~15분", `${label} ${distance}km`, "종료 후 수분, 탄수화물, 통증 체크"],
  });
}

export function mergePreviousProgress(nextPlan, previousPlan) {
  const prevMap = new Map((previousPlan || []).map((session) => [session.id, session]));
  return nextPlan.map((session) => {
    const prev = prevMap.get(session.id);
    return prev ? { ...session, note: prev.note || "", status: prev.status || "planned", debrief: prev.debrief || null } : session;
  });
}

function isLogInWeek(log, weekStart) {
  if (!weekStart) return true;
  const date = parseDateOnly(log?.date);
  const start = parseDateOnly(weekStart);
  return Boolean(date && start && weekContains(start, date));
}

function hasRecordedTraining(session, activityLogs = {}, weekStart = "") {
  if (!session) return false;
  return Object.values(activityLogs || {}).some((log) => log?.dayId === session.id && isLogInWeek(log, weekStart));
}

export function mergePlanWithTrainingHistory(nextPlan, previousPlan, activityLogs = {}, options = {}) {
  const prevMap = new Map((previousPlan || []).map((session) => [session.id, session]));
  const preservePreviousStatus = options.preservePreviousStatus !== false;
  const weekStart = options.currentWeekStart || "";
  return nextPlan.map((session) => {
    const prev = prevMap.get(session.id);
    if (preservePreviousStatus && prev?.status && prev.status !== "planned") return prev;
    if (hasRecordedTraining(prev, activityLogs, weekStart)) return prev;
    return { ...session, status: "planned", note: "", debrief: null };
  });
}

export function buildPlan(profile, checkin, options = {}) {
  const mileage = Number(profile.weeklyMileage) || 24;
  const today = options.today ? startOfDay(parseDateOnly(options.today) || new Date(options.today)) : startOfDay(new Date());
  const weekStart = mondayOf(today);
  const currentCheckin = getCurrentCheckin(checkin, today);
  const phase = phaseForWeek(profile, weekStart, today);
  const safety = getSafetyState(profile, currentCheckin);
  const tight = currentCheckin.schedule === "chaotic";
  const soft = safety.level !== "green" || profile.fatigue === "heavy" || phase.kind === "post-race";
  const temporaryAvailableDays = Number(currentCheckin.temporaryAvailableDays || 0);
  const availableDays = clamp(temporaryAvailableDays || Number(profile.availableDays) || 4, 2, 5);
  const phaseRunCap = phase.kind === "post-race" ? 2 : phase.kind === "race-week" ? Math.min(availableDays, 3) : availableDays;
  const effectiveRunDays = tight && !temporaryAvailableDays ? Math.min(phaseRunCap, 2) : phaseRunCap;
  const preferredDays = parsePreferredDays(currentCheckin.temporaryPreferredDays || profile.preferredDays);
  const longRunDay = currentCheckin.temporaryLongRunDay || profile.longRunDay || "sat";
  const qualityDay = preferredDays.find((day) => day !== longRunDay && !["mon", "fri"].includes(day)) || "tue";
  const targetMileage = Math.max(8, Math.round(mileage * phase.mileageFactor));
  const longRunKm = phase.includeLongRun ? clamp(Math.round(targetMileage * (soft ? Math.min(phase.longRunFactor, 0.32) : phase.longRunFactor)), 6, phase.longRunCap || 8) : 0;
  const easyKm = clamp(Math.round(targetMileage * 0.18), phase.kind === "post-race" ? 3 : 4, phase.kind === "race-week" ? 7 : 10);
  const qualityKm = clamp(Math.round(targetMileage * (phase.qualityMode === "sharpen" ? 0.14 : 0.22)), 5, phase.qualityMode === "sharpen" ? 8 : 12);
  const supplementalDays = Array.from(new Set([...preferredDays, "thu", "sun", "sat", "wed"].filter((day) => day !== longRunDay && day !== qualityDay)));

  const sessionsByDay = new Map();
  if (phase.raceDayId) {
    sessionsByDay.set(phase.raceDayId, raceSession(phase.raceDayId, profile, phase));
  } else if (phase.includeLongRun) {
    sessionsByDay.set(longRunDay, longRunSession(longRunDay, longRunKm, profile.raceType, tight, phase));
  }
  if (phase.includeQuality && qualityDay !== phase.raceDayId) {
    sessionsByDay.set(qualityDay, qualitySession(qualityDay, profile, qualityKm, soft, phase));
  }

  supplementalDays.slice(0, Math.max(0, effectiveRunDays - 2)).forEach((day, index, days) => {
    if (sessionsByDay.has(day)) return;
    if (!tight && index === days.length - 1 && effectiveRunDays >= 4) {
      sessionsByDay.set(day, recoverySession(day, phase));
      return;
    }
    sessionsByDay.set(day, easySession(day, easyKm, profile.raceType, phase.kind === "race-week" ? "테이퍼 이지런" : "회복성 볼륨 확보", phase));
  });

  if (phase.kind === "post-race" && !sessionsByDay.size) {
    const recoveryDay = preferredDays.find((day) => !["mon", "fri"].includes(day)) || "thu";
    sessionsByDay.set(recoveryDay, recoverySession(recoveryDay, phase, 4));
  }

  if (!sessionsByDay.has("wed") && effectiveRunDays >= 4 && !tight) sessionsByDay.set("wed", mobilitySession("wed", false));

  const plan = DAY_ORDER.map((dayId) => {
    if (sessionsByDay.has(dayId)) return sessionsByDay.get(dayId);
    if (dayId === "mon") return restSession(dayId, "회복 / 휴식", "주간 리듬을 만들기 위한 리셋", "주 시작에 회복 여지를 두어 시즌 전체 지속 가능성을 지킵니다.", "이번 주 핵심 세션의 집중도를 높이는 준비입니다.");
    if (dayId === "fri") return restSession(dayId, "휴식", "주말 핵심 세션 전 회복", "고강도 연속 배치를 피하고 피로 누적을 막습니다.", "주말 롱런 또는 회복 러닝으로 연결합니다.");
    if (dayId === "wed") return mobilitySession(dayId, tight);
    return restSession(dayId, "휴식", "현실과 협상한 비훈련일", "지킬 수 있는 계획을 만들기 위해 비핵심 날은 과감히 비웁니다.", "남은 핵심 세션의 질을 지켜줍니다.");
  });

  const plannedMileage = plan.reduce((sum, session) => {
    const km = Number.parseInt(session.distance, 10);
    return sum + (Number.isFinite(km) ? km : 0);
  }, 0);

  return {
    plan,
    meta: {
      source: !profile.goalRace || !profile.goalTime ? "fallback-plan" : "local-coach-engine",
      fallbackReason: !profile.goalRace || !profile.goalTime ? "목표 대회 또는 목표 기록 정보가 부족해 기본 주간 플랜으로 생성" : "none",
      summary: [
        `${profile.name || "러너"}님은 이번 주에 ${phase.label} / ${soft ? "회복 우선" : "리듬 유지"} 주간으로 가져갑니다.`,
        phase.weekRole,
        `핵심은 ${phaseFocusText(phase, tight)}입니다.`,
        safety.message,
      ].join(" "),
      safety,
      season: {
        generatedAt: formatDate(today),
        currentWeekStart: formatDate(weekStart),
        phase: phase.kind,
        label: phase.label,
        daysToRace: phase.daysToRace,
        weeksToRace: phase.weeksToRace,
        targetMileage,
        reason: phase.weekRole,
        weeks: buildSeasonPlan(profile, today, mileage),
      },
      stats: {
        plannedMileage,
        runDays: plan.filter((session) => ["easy", "quality", "long", "recovery"].includes(session.type)).length,
        keySession: plan.find((session) => session.type === "quality")?.title || "없음",
        longRun: plan.find((session) => session.type === "long")?.title || "없음",
      },
    },
  };
}
