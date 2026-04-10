import { useEffect, useState } from 'react';
import { BASELINE_ONLY_LAUNCH_EVENT, isBaselineOnlyLaunch } from '../services/baselineOnlyLaunch';

export function useBaselineOnlyLaunch() {
  const [active, setActive] = useState(() => isBaselineOnlyLaunch());
  useEffect(() => {
    const sync = () => setActive(isBaselineOnlyLaunch());
    window.addEventListener(BASELINE_ONLY_LAUNCH_EVENT, sync);
    return () => window.removeEventListener(BASELINE_ONLY_LAUNCH_EVENT, sync);
  }, []);
  return active;
}
