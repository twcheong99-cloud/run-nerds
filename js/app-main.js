import { createDefaultOnboarding, defaultCheckin, defaultProfile, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js";
import { buildPlan, mergePreviousProgress } from "./plan.js";
import { buildInitialPlanningProfileFromOnboarding, getOnboardingSteps, renderOnboarding, shouldShowOnboarding, validateOnboardingStep } from "./onboarding.js";
import { renderHome } from "./home.js";
import { createDefaultCoachChat } from "./coach.js";
import { requestCoachReply } from "./coach-service.js";
import { enhanceThemeSelects } from "./theme-select.js";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const dom = {
  authGate: document.querySelector("#authGate"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  signupForm: document.querySelector("#signupForm"),
  authTabs: document.querySelectorAll("[data-auth-tab]"),
  authFeedback: document.querySelector("#authFeedback"),
  systemPulse: document.querySelector("#systemPulse"),
  logoutBtn: document.querySelector("#logoutBtn"),
  onboardingShell: document.querySelector("#onboardingShell"),
  dashboard: document.querySelector("#dashboard"),
  onboardingForm: document.querySelector("#onboardingForm"),
  onboardingStepBadge: document.querySelector("#onboardingStepBadge"),
  onboardingProgressFill: document.querySelector("#onboardingProgressFill"),
  onboardingProgressText: document.querySelector("#onboardingProgressText"),
  onboardingCoachPrompt: document.querySelector("#onboardingCoachPrompt"),
  onboardingStepTitle: document.querySelector("#onboardingStepTitle"),
  onboardingStepBody: document.querySelector("#onboardingStepBody"),
  onboardingSummary: document.querySelector("#onboardingSummary"),
  onboardingBackBtn: document.querySelector("#onboardingBackBtn"),
  onboardingNextBtn: document.querySelector("#onboardingNextBtn"),
  onboardingCompleteBtn: document.querySelector("#onboardingCompleteBtn"),
  profileForm: document.querySelector("#profileForm"),
  generatePlanBtn: document.querySelector("#generatePlanBtn"),
  coachView: document.querySelector("#coachView"),
  homeView: document.querySelector("#homeView"),
  profileView: document.querySelector("#profileView"),
  tabButtons: document.querySelectorAll("[data-tab]"),
  coachMonthLabel: document.querySelector("#coachMonthLabel"),
  coachCalendar: document.querySelector("#coachCalendar"),
  coachMessages: document.querySelector("#coachMessages"),
  coachProposal: document.querySelector("#coachProposal"),
  coachForm: document.querySelector("#coachForm"),
  profileSummary: document.querySelector("#profileSummary"),
  goalStripMain: document.querySelector("#goalStripMain"),
  goalStripMeta: document.querySelector("#goalStripMeta"),
  todayFocusBadge: document.querySelector("#todayFocusBadge"),
  todayWorkoutCard: document.querySelector("#todayWorkoutCard"),
  weekSummaryBadge: document.querySelector("#weekSummaryBadge"),
  weekMiniCalendar: document.querySelector("#weekMiniCalendar"),
  goalSummaryCard: document.querySelector("#goalSummaryCard"),
  checkinForm: document.querySelector("#checkinForm"),
  debriefForm: document.querySelector("#debriefForm"),
  replanForm: document.querySelector("#replanForm"),
};

let state = {};
let authSession = null;
let saveTimer = null;
let isBootstrapping = false;
let isFirstConsultationActive = false;
let pulseTimer = null;
const supabaseProjectRef = (() => {
  try {
    return new URL(SUPABASE_URL).hostname.split(".")[0];
  } catch {
    return "";
  }
})();

function baseState() {
  return {
    profile: { ...defaultProfile },
    checkin: { ...defaultCheckin },
    plan: [],
    planMeta: { source: "local-coach-engine", fallbackReason: "none", summary: "", safety: null, stats: {} },
    activityLogs: {},
    selectedDayId: null,
    activeTab: "home",
    coachChat: createDefaultCoachChat(),
    onboarding: createDefaultOnboarding(),
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeCoachChatForToday(chat) {
  const todayKey = getLocalDateKey();
  if (!chat || chat.conversationDate !== todayKey) return createDefaultCoachChat(todayKey);
  return {
    ...chat,
    conversationDate: todayKey,
    messages: Array.isArray(chat.messages) && chat.messages.length ? chat.messages : createDefaultCoachChat(todayKey).messages,
  };
}

function formatErrorMessage(error, fallback) {
  const message = error?.message || error?.error_description || error?.description;
  if (!message) return fallback;
  if (message.includes("runner_workspaces") || message.includes("profiles") || error?.code === "42P01") {
    return "Supabase 테이블이 아직 없습니다. SQL Editor에서 supabase-setup.sql을 먼저 실행해 주세요.";
  }
  return message;
}

function setAuthFeedback(message, tone = "info") {
  dom.authFeedback.textContent = message;
  dom.authFeedback.className = `auth-feedback ${tone}`.trim();
}

function clearSupabaseAuthCache() {
  if (!supabaseProjectRef || !window.localStorage) return;
  const prefix = `sb-${supabaseProjectRef}`;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => window.localStorage.removeItem(key));
}

function runSystemPulse(lines, doneMessage = "", options = {}) {
  if (!dom.systemPulse) return Promise.resolve();
  clearTimeout(pulseTimer);
  const duration = options.duration ?? 1400;
  const doneDuration = options.doneDuration ?? 1200;
  const terminalLines = lines.map((line) => `<span>&gt; ${line}</span>`).join("");
  dom.systemPulse.innerHTML = `<div class="pulse-lines">${terminalLines}</div>`;
  dom.systemPulse.className = "system-pulse";
  return new Promise((resolve) => {
    pulseTimer = window.setTimeout(async () => {
      try {
        await options.onBeforeDone?.();
      } catch (error) {
        console.warn("System pulse action failed", error);
      }
      if (!doneMessage) {
        dom.systemPulse.classList.add("hidden");
        resolve();
        return;
      }
      dom.systemPulse.innerHTML = `<div class="pulse-done">${doneMessage}</div>`;
      dom.systemPulse.className = "system-pulse done";
      pulseTimer = window.setTimeout(() => {
        dom.systemPulse.classList.add("hidden");
        resolve();
      }, doneDuration);
    }, duration);
  });
}

function switchAuthTab(tab) {
  dom.authTabs.forEach((button) => button.classList.toggle("active", button.dataset.authTab === tab));
  dom.loginForm.classList.toggle("hidden", tab !== "login");
  dom.signupForm.classList.toggle("hidden", tab !== "signup");
}

function showAuthenticatedApp() {
  dom.authGate.classList.add("hidden");
  dom.appShell.classList.remove("hidden");
}

function showAuthGate() {
  dom.appShell.classList.add("hidden");
  dom.authGate.classList.remove("hidden");
}

function hasCompletedFirstConsultation(nextState) {
  return Boolean(nextState.onboarding?.completedAt && nextState.onboarding?.initialPlanningProfile);
}

function normalizeAppTab(tab) {
  if (tab === "coach" || tab === "home" || tab === "profile") return tab;
  if (tab === "records") return "profile";
  return "home";
}

function initializeState(loaded) {
  const stateDefaults = baseState();
  state = {
    ...stateDefaults,
    ...(loaded || {}),
    planMeta: loaded?.planMeta || loaded?.plan_meta || stateDefaults.planMeta,
    activityLogs: loaded?.activityLogs || loaded?.activity_logs || stateDefaults.activityLogs,
    selectedDayId: loaded?.selectedDayId || loaded?.selected_day_id || stateDefaults.selectedDayId,
    activeTab: normalizeAppTab(loaded?.activeTab || loaded?.active_tab || stateDefaults.activeTab),
    coachChat: normalizeCoachChatForToday(loaded?.coachChat || loaded?.coach_chat || stateDefaults.coachChat),
  };
  const defaults = createDefaultOnboarding();
  state.onboarding = {
    ...defaults,
    ...(state.onboarding || {}),
    draft: {
      ...defaults.draft,
      ...(state.onboarding?.draft || {}),
      pbs: { ...defaults.draft.pbs, ...(state.onboarding?.draft?.pbs || {}) },
      recentMileage4Weeks: Array.isArray(state.onboarding?.draft?.recentMileage4Weeks)
        ? [...state.onboarding.draft.recentMileage4Weeks, "", "", "", ""].slice(0, 4)
        : ["", "", "", ""],
    },
  };
  if (!state.plan.length) {
    const result = buildPlan(state.profile, state.checkin);
    state.plan = result.plan;
    state.planMeta = result.meta;
  }
}

function fillForm(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    const field = form?.elements?.namedItem?.(key);
    if (field) field.value = value ?? "";
  });
}

function syncUI() {
  fillForm(dom.profileForm, state.profile);
  fillForm(dom.checkinForm, state.checkin);
  const emailField = dom.profileForm?.elements?.namedItem("email");
  if (emailField) emailField.readOnly = true;
  const showOnboarding = isFirstConsultationActive || shouldShowOnboarding(state, authSession);
  const previousCoachDate = state.coachChat?.conversationDate;
  state.coachChat = normalizeCoachChatForToday(state.coachChat);
  dom.onboardingShell.classList.toggle("hidden", !showOnboarding);
  dom.dashboard.classList.toggle("hidden", showOnboarding);
  renderHome({ dom, state, updateSession, saveActivityLog, saveWorkoutStatusNote, switchAppTab, sendCoachMessage, applyCoachPlan, runSystemPulse });
  renderOnboarding({ dom, state, persistWorkspaceSoon });
  enhanceThemeSelects(dom.appShell);
  if (previousCoachDate && previousCoachDate !== state.coachChat?.conversationDate && !isBootstrapping) {
    persistWorkspaceSoon();
  }
}

async function saveProfileToSupabase() {
  if (!authSession?.user) return;
  const { error } = await supabase.from("profiles").upsert({
    id: authSession.user.id,
    email: state.profile.email,
    name: state.profile.name,
    goal_race: state.profile.goalRace,
    goal_time: state.profile.goalTime,
  });
  if (error) throw error;
}

async function persistWorkspace(options = {}) {
  if (!authSession?.user || (isBootstrapping && !options.force)) return;
  const { error } = await supabase.from("runner_workspaces").upsert({
    user_id: authSession.user.id,
    payload: {
      user_id: authSession.user.id,
      profile: state.profile,
      checkin: state.checkin,
      plan: state.plan,
      plan_meta: state.planMeta,
      activity_logs: state.activityLogs,
      selected_day_id: state.selectedDayId,
      active_tab: state.activeTab,
      coach_chat: state.coachChat,
      onboarding: state.onboarding,
    },
  });
  if (error) throw error;
}

function persistWorkspaceSoon() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    persistWorkspace().catch((error) => setAuthFeedback(formatErrorMessage(error, "저장에 실패했습니다."), "warning"));
  }, 250);
}

async function loadWorkspaceFromSupabase(user) {
  const { data, error } = await supabase.from("runner_workspaces").select("payload").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}

async function bootstrapWorkspaceForUser(user) {
  isBootstrapping = true;
  try {
    let remoteWorkspace = null;
    try {
      remoteWorkspace = await loadWorkspaceFromSupabase(user);
    } catch (error) {
      setAuthFeedback(formatErrorMessage(error, "워크스페이스를 불러오지 못했습니다."), "warning");
    }
    initializeState(remoteWorkspace);
    isFirstConsultationActive = !hasCompletedFirstConsultation(state);
    if (!isFirstConsultationActive) state.activeTab = "home";
    state.profile.email = normalizeEmail(user.email);
    state.profile.name = state.profile.name && state.profile.name !== "Runner" ? state.profile.name : user.user_metadata?.name || user.email?.split("@")[0] || "Runner";
    state.selectedDayId = state.selectedDayId || state.plan.find((session) => session.type === "quality")?.id || state.plan[0]?.id || null;
    syncUI();
    try {
      await saveProfileToSupabase();
      await persistWorkspace({ force: true });
    } catch (error) {
      setAuthFeedback(formatErrorMessage(error, "초기 저장 중 오류가 발생했습니다."), "warning");
    }
  } finally {
    isBootstrapping = false;
  }
}

function readProfileForm() {
  const nextProfile = Object.fromEntries(new FormData(dom.profileForm).entries());
  nextProfile.weeklyMileage = Number(nextProfile.weeklyMileage || 0);
  nextProfile.availableDays = Number(nextProfile.availableDays || 4);
  nextProfile.email = authSession?.user?.email || nextProfile.email;
  return nextProfile;
}

function rebuildPlanKeepingProgress(nextSelectedId) {
  const result = buildPlan(state.profile, state.checkin);
  state.plan = mergePreviousProgress(result.plan, state.plan);
  state.planMeta = result.meta;
  state.selectedDayId = nextSelectedId || state.plan.find((session) => session.type === "quality")?.id || state.plan[0]?.id || null;
}

function mergeCoachMeta(meta) {
  if (!meta) return;
  state.planMeta = {
    ...(state.planMeta || {}),
    source: meta.source || state.planMeta?.source || "local-coach-engine",
    fallbackReason: meta.fallbackReason || "none",
    safety: meta.safety || state.planMeta?.safety || null,
    coach: meta,
  };
}

function isExplicitApplyRequest(message) {
  return /반영|적용|바꿔|변경|수정|업데이트|조정해|줄여|늘려|다시 짜|다시짜|replan|apply|update|change/i.test(String(message || ""));
}

function applyPendingCoachPlan(pendingPlan) {
  state.profile = { ...state.profile, ...(pendingPlan.profile || {}) };
  state.checkin = { ...state.checkin, ...(pendingPlan.checkin || {}) };
  if (pendingPlan.checkin && Object.hasOwn(pendingPlan.checkin, "temporaryAvailableDays") && pendingPlan.checkin.temporaryAvailableDays === null) {
    state.checkin.temporaryAvailableDays = null;
  }
  rebuildPlanKeepingProgress(state.selectedDayId);
  state.planMeta = {
    ...(state.planMeta || {}),
    source: pendingPlan.source || state.planMeta?.source || "local-coach-engine",
    fallbackReason: pendingPlan.source === "llm-fallback" ? "used-local-coach-engine" : "none",
    coach: pendingPlan.meta || state.planMeta?.coach || null,
  };
}

function updateSession(dayId, patch, options = {}) {
  const applyUpdate = () => {
    state.plan = state.plan.map((session) => (session.id === dayId ? { ...session, ...patch } : session));
    syncUI();
    persistWorkspaceSoon();
  };
  if (options.silent) {
    applyUpdate();
    return;
  }
  runSystemPulse(["parsing check-in...", "syncing coach state..."], "상태가 반영됐어요", { onBeforeDone: applyUpdate });
}

function saveActivityLog(activityDate, log) {
  runSystemPulse(["parsing workout log...", "evaluating recovery load...", "syncing coach state..."], "훈련 기록을 저장했어요", {
    onBeforeDone: () => {
      state.activityLogs = {
        ...(state.activityLogs || {}),
        [activityDate]: {
          ...log,
          date: activityDate,
          source: "manual",
          savedAt: new Date().toISOString(),
        },
      };
      updateSession(log.dayId, { status: "complete" }, { silent: true });
    },
  });
}

function saveWorkoutStatusNote(activityDate, note) {
  const statusLabel = note.status === "skipped" ? "미실행" : "실패";
  runSystemPulse(["parsing coach check-in...", "updating recovery context...", "syncing coach state..."], "코칭에 반영했어요", {
    onBeforeDone: () => {
      state.activityLogs = {
        ...(state.activityLogs || {}),
        [activityDate]: {
          ...note,
          date: activityDate,
          source: "coach-check-in",
          savedAt: new Date().toISOString(),
        },
      };
      const commentParts = [
        state.checkin.comment,
        `${activityDate} ${statusLabel}: ${note.reason || "reason"}${note.progress ? ` / ${note.progress}` : ""}${note.memo ? ` / ${note.memo}` : ""}`,
      ].filter(Boolean);
      state.checkin = {
        ...state.checkin,
        fatigue: note.reason === "fatigue" ? "high" : state.checkin.fatigue,
        pain: note.reason === "pain" ? "worrying" : state.checkin.pain,
        schedule: note.reason === "schedule" ? "chaotic" : state.checkin.schedule,
        confidence: note.status === "skipped" || note.status === "failed" ? "steady" : state.checkin.confidence,
        comment: commentParts.join(" / "),
      };
      updateSession(note.dayId, { status: note.status }, { silent: true });
    },
  });
}

function switchAppTab(tab) {
  runSystemPulse(["loading workspace pane...", "syncing coach state..."], "화면을 전환했어요", {
    onBeforeDone: () => {
      state.activeTab = tab;
      syncUI();
      persistWorkspaceSoon();
    },
  });
}

function sendCoachMessage(message) {
  state.coachChat = normalizeCoachChatForToday(state.coachChat);
  state.coachChat = {
    ...(state.coachChat || createDefaultCoachChat()),
    conversationDate: getLocalDateKey(),
    messages: [...(state.coachChat?.messages || []), { role: "user", text: message }],
  };
  syncUI();
  runSystemPulse(["parsing check-in...", "evaluating recovery load...", "drafting coach response..."], "코치가 확인했어요", {
    onBeforeDone: async () => {
      const result = await requestCoachReply({ supabase, authSession, message, state });
      mergeCoachMeta(result.meta);
      const shouldApplyImmediately = isExplicitApplyRequest(message) && result.stage === "proposal" && result.pendingPlan;
      if (shouldApplyImmediately) applyPendingCoachPlan(result.pendingPlan);
      state.coachChat = {
        ...state.coachChat,
        stage: shouldApplyImmediately ? "idle" : result.stage,
        pendingPlan: shouldApplyImmediately ? null : result.pendingPlan,
        messages: [
          ...state.coachChat.messages,
          {
            role: "coach",
            text: shouldApplyImmediately ? `${result.reply} 요청대로 앱의 이번 주 훈련표에도 바로 반영했어.` : result.reply,
            source: result.meta?.source || "local-coach-engine",
            sourceDetail: result.meta?.fallbackReason || "",
          },
        ],
      };
      syncUI();
      persistWorkspaceSoon();
    },
  });
}

function applyCoachPlan() {
  const pendingPlan = state.coachChat?.pendingPlan;
  if (!pendingPlan) return;
  runSystemPulse(["reconciling plan...", "applying adjustments...", "syncing coach state..."], "조정이 반영됐어요", {
    onBeforeDone: () => {
      applyPendingCoachPlan(pendingPlan);
      state.coachChat = {
        ...state.coachChat,
        stage: "idle",
        pendingPlan: null,
        messages: [
          ...(state.coachChat?.messages || []),
          { role: "coach", text: "좋아, 방금 대화 기준으로 이번 주 캘린더를 다시 짰어. 오늘은 계획을 이기는 날이 아니라 몸과 약속을 다시 맞추는 날이야." },
        ],
      };
      syncUI();
      persistWorkspaceSoon();
    },
  });
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  state.profile = { ...state.profile, ...readProfileForm() };
  rebuildPlanKeepingProgress(state.selectedDayId);
  syncUI();
  try {
    await saveProfileToSupabase();
    await persistWorkspace();
    setAuthFeedback("프로필과 워크스페이스를 Supabase에 저장했습니다.", "success");
  } catch (error) {
    setAuthFeedback(formatErrorMessage(error, "프로필 저장에 실패했습니다."), "warning");
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(dom.signupForm).entries());
  const email = normalizeEmail(values.email);
  const password = String(values.password || "");
  const name = String(values.name || "").trim();
  if (!email || password.length < 6 || !name) {
    setAuthFeedback("회원가입에는 이름, 이메일, 6자 이상 비밀번호가 필요합니다.", "warning");
    return;
  }
  const pulse = runSystemPulse(["creating runner profile...", "syncing workspace..."], "계정 준비가 끝났어요", { duration: 1600 });
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) {
    await pulse;
    return setAuthFeedback(error.message, "warning");
  }
  if (!data.session) {
    await pulse;
    setAuthFeedback("회원가입이 생성되었습니다. 이메일 인증을 켠 프로젝트라면 메일 확인 후 로그인해 주세요.", "success");
    switchAuthTab("login");
    dom.loginForm.elements.namedItem("email").value = email;
    return;
  }
  authSession = data.session;
  await bootstrapWorkspaceForUser(data.session.user);
  await pulse;
  showAuthenticatedApp();
}

async function handleLogin(event) {
  event.preventDefault();
  const pulse = runSystemPulse(["authenticating runner...", "restoring workspace..."], "워크스페이스 동기화 완료", { duration: 1600 });
  const values = Object.fromEntries(new FormData(dom.loginForm).entries());
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(values.email),
    password: String(values.password || ""),
  });
  if (error) {
    await pulse;
    return setAuthFeedback(error.message, "warning");
  }
  authSession = data.session;
  await bootstrapWorkspaceForUser(data.session.user);
  await pulse;
  showAuthenticatedApp();
}

async function handleLogout() {
  clearSupabaseAuthCache();
  supabase.auth.signOut({ scope: "local" }).catch((error) => {
    console.warn("Local logout cleanup failed", error);
  });
  runSystemPulse(["closing workspace...", "clearing local session..."], "로그아웃됐어요", {
    onBeforeDone: () => {
      authSession = null;
      isFirstConsultationActive = false;
      initializeState(null);
      showAuthGate();
      switchAuthTab("login");
    },
  });
}

function handleOnboardingBack() {
  if (state.onboarding.step === 0) return;
  runSystemPulse(["loading previous prompt..."], "이전 단계로 돌아왔어요", {
    onBeforeDone: () => {
      state.onboarding.step -= 1;
      renderOnboarding({ dom, state, persistWorkspaceSoon });
      persistWorkspaceSoon();
    },
  });
}

function handleOnboardingNext() {
  if (!validateOnboardingStep(state, setAuthFeedback)) return;
  const steps = getOnboardingSteps(state);
  runSystemPulse(["parsing consultation input...", "syncing coach state..."], "다음 질문을 준비했어요", {
    onBeforeDone: () => {
      state.onboarding.step = Math.min(state.onboarding.step + 1, steps.length - 1);
      renderOnboarding({ dom, state, persistWorkspaceSoon });
      persistWorkspaceSoon();
    },
  });
}

async function handleOnboardingComplete(event) {
  event.preventDefault();
  const initialPlanningProfile = buildInitialPlanningProfileFromOnboarding(state);
  runSystemPulse(["parsing first consultation...", "reconciling plan...", "applying adjustments..."], "첫 계획이 준비됐어요", {
    onBeforeDone: () => {
      state.onboarding = { ...state.onboarding, completedAt: new Date().toISOString(), initialPlanningProfile };
      isFirstConsultationActive = false;
      state.profile = {
        ...state.profile,
        goalRace: initialPlanningProfile.race?.name || state.profile.goalRace,
        goalTime: initialPlanningProfile.race?.goalTime || state.profile.goalTime,
        raceType: initialPlanningProfile.race?.type || state.profile.raceType,
        weeklyMileage: initialPlanningProfile.averageMileage4Weeks || state.profile.weeklyMileage,
        availableDays: initialPlanningProfile.availableTrainingDays || state.profile.availableDays,
        fatigue: initialPlanningProfile.bodyCondition === "good" ? "fresh" : initialPlanningProfile.bodyCondition === "cautious" ? "tired" : "normal",
        physicalNotes: [state.profile.physicalNotes, initialPlanningProfile.bodyConditionNote].filter(Boolean).join(" / "),
      };
      rebuildPlanKeepingProgress(state.selectedDayId);
      syncUI();
      saveProfileToSupabase()
        .then(() => persistWorkspace())
        .catch((error) => setAuthFeedback(formatErrorMessage(error, "온보딩 저장에 실패했습니다."), "warning"));
    },
  });
}

async function hydrateFromSession(session) {
  authSession = session;
  if (session?.user) {
    await bootstrapWorkspaceForUser(session.user);
    showAuthenticatedApp();
    return;
  }
  initializeState(null);
  showAuthGate();
}

export function initApp() {
  switchAuthTab("login");
  dom.profileForm.addEventListener("submit", (event) => handleProfileSubmit(event).catch((error) => setAuthFeedback(formatErrorMessage(error, "프로필 저장 오류"), "warning")));
  dom.generatePlanBtn.addEventListener("click", () => {
    state.profile = { ...state.profile, ...readProfileForm() };
    rebuildPlanKeepingProgress(state.selectedDayId);
    syncUI();
    persistWorkspaceSoon();
  });
  dom.loginForm.addEventListener("submit", (event) => handleLogin(event).catch((error) => setAuthFeedback(formatErrorMessage(error, "로그인 처리 중 오류"), "warning")));
  dom.signupForm.addEventListener("submit", (event) => handleSignup(event).catch((error) => setAuthFeedback(formatErrorMessage(error, "회원가입 처리 중 오류"), "warning")));
  dom.logoutBtn.addEventListener("click", () => handleLogout().catch((error) => setAuthFeedback(formatErrorMessage(error, "로그아웃 오류"), "warning")));
  dom.tabButtons.forEach((button) => button.addEventListener("click", () => switchAppTab(button.dataset.tab)));
  dom.onboardingBackBtn.addEventListener("click", handleOnboardingBack);
  dom.onboardingNextBtn.addEventListener("click", handleOnboardingNext);
  dom.onboardingForm.addEventListener("submit", (event) => handleOnboardingComplete(event).catch((error) => setAuthFeedback(formatErrorMessage(error, "온보딩 완료 오류"), "warning")));
  dom.authTabs.forEach((button) => button.addEventListener("click", () => switchAuthTab(button.dataset.authTab)));
  supabase.auth.onAuthStateChange((_event, session) => { authSession = session; });
  supabase.auth.getSession().then(({ data }) => hydrateFromSession(data.session)).catch(() => {
    clearSupabaseAuthCache();
    initializeState(null);
    showAuthGate();
  });
}
