import { useEffect, useRef, useState } from "react";

/**
 * Returns `[openKey, bumpKey]` where:
 * - `openKey` increments automatically each time the modal opens (`show` goes
 *   false → true). Pass it as the `key` prop to content components to force
 *   a remount and re-fetch on every open.
 * - `bumpKey` is a stable callback you can call manually (e.g. after a nested
 *   detail modal closes) to force an additional remount of the content.
 */
export function useModalRemountKey(show) {
  const [openKey, setOpenKey] = useState(0);
  const prevShow = useRef(false);

  useEffect(() => {
    if (show && !prevShow.current) {
      setOpenKey((k) => k + 1);
    }
    prevShow.current = show;
  }, [show]);

  const bumpKey = () => setOpenKey((k) => k + 1);

  return [openKey, bumpKey];
}
