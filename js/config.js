const env = window.RUN_NERDS_ENV;

if (!env?.SUPABASE_URL || !env?.SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing RUN_NERDS_ENV. Create env.js from env.example.js before starting the app.");
}

export const SUPABASE_URL = env.SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_PUBLISHABLE_KEY;
export const ONBOARDING_TEMP_DISABLED = false;

export const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
};

export const defaultProfile = {
  name: "Runner",
  email: "",
  goalRace: "가을 하프",
  goalTime: "하프 1:50",
  weeklyMileage: 30,
  availableDays: 4,
  preferredDays: "화, 목, 토",
  longRunDay: "sat",
  raceType: "half",
  qualityFocus: "tempo",
  fatigue: "normal",
  pain: "none",
  notes: "",
  physicalNotes: "",
  goalNotes: "",
  coachNotes: "",
};

export const defaultCheckin = {
  fatigue: "medium",
  pain: "none",
  sleep: "okay",
  schedule: "stable",
  confidence: "steady",
  comment: "",
  temporaryAvailableDays: null,
  temporaryPreferredDays: "",
  temporaryLongRunDay: "",
};

export function createDefaultOnboarding() {
  return {
    step: 0,
    completedAt: null,
    initialPlanningProfile: null,
    draft: {
      goalType: "",
      raceName: "",
      raceType: "half",
      raceDate: "",
      raceGoalTime: "",
      nonRaceFocus: "consistency",
      programDurationWeeks: "8",
      availableTrainingDays: "4",
      latestRunDate: "",
      latestRunDistance: "",
      latestRunAvgPace: "",
      latestRunAvgHeartRate: "",
      latestRunRpe: "",
      latestRunDifficulty: "manageable",
      latestRunFeeling: "",
      recentMileage4Weeks: ["", "", "", ""],
      recentWeeklyFrequency: "",
      pbs: {
        fiveK: "",
        tenK: "",
        half: "",
        full: "",
      },
      bodyCondition: "normal",
      painArea: "",
      bodyConditionNote: "",
      coachingStyle: "balanced",
    },
  };
}
