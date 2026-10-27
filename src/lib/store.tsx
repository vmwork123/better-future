"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppState } from "./types";
import { demoState, emptyState } from "./defaults";
import { accountSavesDone, endAllSessions, getSessionEmail, loadSecureProfile, saveAccountProfile } from "./auth-local";
import { isFerpaMode, writeFerpaCookie } from "./ferpa";

const KEY = "aether.collegefit.v4";
const OLD_KEYS = ["aether.collegefit.v3", "aether.collegefit.v2", "aether.collegefit.v1"];
/** Left over from the retired sample/subscription mode: the profile set aside while the sample was open. */
const LEGACY_ACCESS_KEY = "aether.access.v1";
const LEGACY_BACKUP_KEY = "aether.full-backup.v1";

function mergeState(saved: Partial<AppState> | null): AppState {
  const base = emptyState();
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    student: { ...base.student, ...saved.student },
    academic: { ...base.academic, ...saved.academic },
    courses: saved.courses ?? base.courses,
    testing: { ...base.testing, ...saved.testing },
    activities: saved.activities ?? base.activities,
    work: saved.work ?? base.work,
    awards: saved.awards ?? base.awards,
    career: { ...base.career, ...saved.career },
    careerAssessment: {
      ...base.careerAssessment,
      ...saved.careerAssessment,
      feedback: { ...base.careerAssessment.feedback, ...saved.careerAssessment?.feedback },
      values: { ...base.careerAssessment.values, ...saved.careerAssessment?.values },
      academicInterests: { ...base.careerAssessment.academicInterests, ...saved.careerAssessment?.academicInterests },
    },
    savedCareerIds: saved.savedCareerIds ?? base.savedCareerIds,
    preferences: {
      ...base.preferences,
      ...saved.preferences,
      academic: { ...base.preferences.academic, ...saved.preferences?.academic },
      campusSliders: { ...base.preferences.campusSliders, ...saved.preferences?.campusSliders },
      campus: { ...base.preferences.campus, ...saved.preferences?.campus },
      geographic: { ...base.preferences.geographic, ...saved.preferences?.geographic },
      lifestyle: { ...base.preferences.lifestyle, ...saved.preferences?.lifestyle },
      financial: { ...base.preferences.financial, ...saved.preferences?.financial },
    },
    savedCollegeIds: saved.savedCollegeIds ?? base.savedCollegeIds,
    banishedCollegeIds: saved.banishedCollegeIds ?? base.banishedCollegeIds,
    compareIds: saved.compareIds ?? base.compareIds,
    resumes: saved.resumes ?? base.resumes,
    activeResumeId: saved.activeResumeId ?? base.activeResumeId,
    onboardingComplete: saved.onboardingComplete ?? false,
    accountEmail: saved.accountEmail ?? null,
    profileRevisions: saved.profileRevisions ?? [],
  };
}

/**
 * Turn FERPA mode on or off, then reload so the whole app (and the server's headers) use the new mode.
 * Signed-in students are signed out; their profile stays in the account and is converted at next login.
 * A guest's work moves along: into this tab only (FERPA) or into localStorage (regular).
 */
export async function switchFerpaMode(on: boolean, state: AppState) {
  if (state.accountEmail) {
    await accountSavesDone();
    endAllSessions();
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } else if (on) {
    sessionStorage.setItem(KEY, JSON.stringify(state));
    for (const k of [KEY, ...OLD_KEYS, LEGACY_BACKUP_KEY, LEGACY_ACCESS_KEY]) localStorage.removeItem(k);
  } else {
    localStorage.setItem(KEY, JSON.stringify(state));
    sessionStorage.removeItem(KEY);
  }
  writeFerpaCookie(on);
  window.location.reload();
}

type Store = {
  state: AppState;
  hydrated: boolean;
  setState: (updater: AppState | ((prev: AppState) => AppState)) => void;
  reset: () => void;
  loadDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isFerpaMode()) {
      // Never leave a readable profile behind in localStorage; guests keep theirs in this tab only.
      for (const k of [KEY, ...OLD_KEYS, LEGACY_BACKUP_KEY, LEGACY_ACCESS_KEY]) localStorage.removeItem(k);
      loadSecureProfile()
        .then((profile) => {
          const raw = profile ? null : sessionStorage.getItem(KEY);
          setStateRaw(mergeState(profile ?? (raw ? (JSON.parse(raw) as Partial<AppState>) : null)));
        })
        .catch(() => {
          /* ignore */
        })
        .finally(() => setHydrated(true));
      return;
    }
    try {
      let raw = localStorage.getItem(LEGACY_BACKUP_KEY);
      for (const k of raw ? [] : [KEY, ...OLD_KEYS]) {
        raw = localStorage.getItem(k);
        if (raw) break;
      }
      let next = mergeState(raw ? (JSON.parse(raw) as Partial<AppState>) : null);
      const session = getSessionEmail();
      if (session && !next.accountEmail) next = { ...next, accountEmail: session };
      setStateRaw(next);
      localStorage.removeItem(LEGACY_BACKUP_KEY);
      localStorage.removeItem(LEGACY_ACCESS_KEY);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isFerpaMode()) {
      if (state.accountEmail) {
        sessionStorage.removeItem(KEY);
        saveAccountProfile(state.accountEmail, state);
      } else {
        sessionStorage.setItem(KEY, JSON.stringify(state));
      }
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(state));
    if (state.accountEmail) {
      try {
        saveAccountProfile(state.accountEmail, state);
      } catch {
        /* ignore */
      }
    }
  }, [state, hydrated]);

  const setState = useCallback((updater: AppState | ((prev: AppState) => AppState)) => {
    setStateRaw((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  const reset = useCallback(() => setStateRaw(emptyState()), []);
  const loadDemo = useCallback(() => setStateRaw(demoState()), []);

  const value = useMemo(
    () => ({ state, hydrated, setState, reset, loadDemo }),
    [state, hydrated, setState, reset, loadDemo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
