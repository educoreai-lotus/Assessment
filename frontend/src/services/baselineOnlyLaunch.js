const STORAGE_KEY = 'assessment_baseline_only_launch';
const STORAGE_VALUE = '1';

/** Dispatched on the window after the marker is written so UI can re-sync (sessionStorage has no same-tab storage event). */
export const BASELINE_ONLY_LAUNCH_EVENT = 'assessment-baseline-only-changed';

export function setBaselineOnlyLaunch() {
  try {
    sessionStorage.setItem(STORAGE_KEY, STORAGE_VALUE);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BASELINE_ONLY_LAUNCH_EVENT));
    }
  } catch {
    // ignore
  }
}

export function isBaselineOnlyLaunch() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === STORAGE_VALUE;
  } catch {
    return false;
  }
}
