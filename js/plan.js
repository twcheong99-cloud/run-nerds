import { DAY_LABELS, DAY_ORDER } from "./config.js";

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

function easySession(id, km, raceType, subtitle = "회복성 볼륨 확보") {
  return createSession({
    id, type: "easy", title: `이지런 ${km}km`, subtitle,
    purpose: "강도를 올리지 않고 주간 볼륨과 러닝 감각을 안정적으로 유지합니다.",
    success: "대화 가능한 강도로 끝나고 다음 날 피로가 과하지 않으면 성공입니다.",
    failure: "다리가 무거우면 거리보다 강도를 더 낮추는 쪽이 맞습니다.",
    next: "다음 핵심 세션이나 롱런의 바탕이 됩니다.",
    intensity: "easy", duration: `${km * 6 + 5}~${km * 7}분`, distance: `${km}km`,
    blocks: ["워밍업 10분", `${km}km 이지런 (${estimateEasyCue(raceType)})`, "정리운동 5분"],
  });
}

function recoverySession(id) {
  return createSession({
    id, type: "recovery", title: "회복 조깅 5km", subtitle: "긴 세션 다음날 감각 회복",
    purpose: "피로를 풀면서도 다음 주 연결 감각을 유지합니다.",
    success: "상쾌하게 끝나거나, 피로가 크면 과감히 휴식해도 괜찮습니다.",
    failure: "생략해도 주간 핵심을 해친 것은 아닙니다.",
    next: "다음 체크인의 좋은 입력이 됩니다.",
    intensity: "easy", duration: "30~40분", distance: "5km", blocks: ["워밍업 5분", "편안한 조깅 25~30분", "정리운동 5분"],
  });
}

function qualitySession(id, profile, km, soft) {
  if (soft) return easySession(id, km, profile.raceType, "강도 대신 감각 회복 우선");
  if (profile.qualityFocus === "interval") {
    return createSession({
      id, type: "quality", title: "인터벌 세션", subtitle: "짧은 반복으로 속도 감각 확보",
      purpose: "10K~하프 구간의 효율을 높이되 과도한 고통보다는 리듬을 익히는 데 집중합니다.",
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
      purpose: "레이스 페이스보다 약간 여유 있는 강도로 지속 능력을 키웁니다.",
      success: "중간 이후에도 페이스와 호흡이 안정적이면 성공입니다.",
      failure: "힘들면 시간을 줄여도 되고 이번 주 피로 신호로 해석하면 됩니다.",
      next: "롱런 전 유산소 리듬을 정리합니다.",
      intensity: "moderate", duration: "50~65분", distance: `${km}~${km + 1}km`,
      blocks: ["워밍업 15분", "20~30분 steady run", "쿨다운 10~15분"],
    });
  }
  return createSession({
    id, type: "quality", title: "템포 세션", subtitle: "기록 확인이 아니라 목표 리듬 적응",
    purpose: "하프/풀 준비에 필요한 안정적인 템포 감각을 익히는 핵심 세션입니다.",
    success: "끝나고 한 단계 더 할 수 있을 듯한 여유가 남으면 적절합니다.",
    failure: "페이스가 안 나와도 현재 피로의 신호일 뿐 주간 전체 실패는 아닙니다.",
    next: "주중 이지런이 자극을 흡수하고 롱런으로 연결됩니다.",
    intensity: "moderate", duration: "55~70분", distance: `${km}~${km + 2}km`,
    blocks: ["워밍업 15분", "10분 템포 x 2~3세트 / 세트 사이 3분 조깅", "쿨다운 10~15분"],
  });
}

function longRunSession(id, km, raceType, tight) {
  const cue = raceType === "full" ? "후반 20분은 자세와 보급 리듬 유지에 집중" : "후반 15분은 페이스보다 자세와 호흡 안정에 집중";
  return createSession({
    id, type: "long", title: `롱런 ${km}km`, subtitle: tight ? "제한된 일정 안에서 지켜야 할 주간 핵심" : "이번 주의 가장 중요한 세션",
    purpose: "거리 적응과 지구력 형성이 목적이며 한 번 빠르게 뛰는 것보다 시즌 흐름에 더 중요합니다.",
    success: "후반에 자세가 크게 무너지지 않고 여유를 남기면 성공입니다.",
    failure: "거리 미달이어도 다음 주 증량으로 보상하지 않습니다. 현재 상태를 반영해 다시 잡으면 됩니다.",
    next: "다음 날 회복 조깅 또는 휴식으로 연결합니다.",
    intensity: "steady", duration: `${km * 6 + 10}~${km * 7 + 15}분`, distance: `${km}km`,
    blocks: ["워밍업 10분", `${km}km 이지~steady`, cue, "종료 후 수분과 탄수화물 보충"],
  });
}

export function mergePreviousProgress(nextPlan, previousPlan) {
  const prevMap = new Map((previousPlan || []).map((session) => [session.id, session]));
  return nextPlan.map((session) => {
    const prev = prevMap.get(session.id);
    return prev ? { ...session, note: prev.note || "", status: prev.status || "planned", debrief: prev.debrief || null } : session;
  });
}

export function buildPlan(profile, checkin) {
  const mileage = Number(profile.weeklyMileage) || 24;
  const safety = getSafetyState(profile, checkin);
  const tight = checkin.schedule === "chaotic";
  const soft = safety.level !== "green" || profile.fatigue === "heavy";
  const temporaryAvailableDays = Number(checkin.temporaryAvailableDays || 0);
  const availableDays = clamp(temporaryAvailableDays || Number(profile.availableDays) || 4, 2, 5);
  const effectiveRunDays = tight && !temporaryAvailableDays ? Math.min(availableDays, 2) : availableDays;
  const preferredDays = parsePreferredDays(checkin.temporaryPreferredDays || profile.preferredDays);
  const longRunDay = checkin.temporaryLongRunDay || profile.longRunDay || "sat";
  const qualityDay = preferredDays.find((day) => day !== longRunDay && !["mon", "fri"].includes(day)) || "tue";
  const longRunKm = clamp(Math.round(mileage * (soft ? 0.32 : 0.38)), 8, profile.raceType === "full" ? 28 : 22);
  const easyKm = clamp(Math.round(mileage * 0.18), 5, 10);
  const qualityKm = clamp(Math.round(mileage * 0.22), 6, 12);
  const supplementalDays = Array.from(new Set([...preferredDays, "thu", "sun", "sat", "wed"].filter((day) => day !== longRunDay && day !== qualityDay)));

  const sessionsByDay = new Map();
  sessionsByDay.set(longRunDay, longRunSession(longRunDay, longRunKm, profile.raceType, tight));
  sessionsByDay.set(qualityDay, qualitySession(qualityDay, profile, qualityKm, soft));

  supplementalDays.slice(0, Math.max(0, effectiveRunDays - 2)).forEach((day, index, days) => {
    if (sessionsByDay.has(day)) return;
    if (!tight && index === days.length - 1 && effectiveRunDays >= 4) {
      sessionsByDay.set(day, recoverySession(day));
      return;
    }
    sessionsByDay.set(day, easySession(day, easyKm, profile.raceType));
  });

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
        `${profile.name || "러너"}님은 이번 주에 ${soft ? "회복 우선" : "리듬 유지"} 주간으로 가져갑니다.`,
        `핵심은 ${tight ? "제한된 일정 안에서도 핵심 세션과 롱런을 지키는 것" : "품질 세션과 롱런의 균형"}입니다.`,
        safety.message,
      ].join(" "),
      safety,
      stats: {
        plannedMileage,
        runDays: plan.filter((session) => ["easy", "quality", "long", "recovery"].includes(session.type)).length,
        keySession: plan.find((session) => session.type === "quality")?.title || "없음",
        longRun: plan.find((session) => session.type === "long")?.title || "없음",
      },
    },
  };
}
