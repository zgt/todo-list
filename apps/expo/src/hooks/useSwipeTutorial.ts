import { useCallback, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";

const TUTORIAL_SEEN_KEY_PREFIX = "swipe_tutorial_seen";

function getTutorialSeenKey(userId?: string) {
  if (!userId) return null;

  return `${TUTORIAL_SEEN_KEY_PREFIX}_${userId.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

export function useSwipeTutorial(userId?: string) {
  const tutorialSeenKey = useMemo(() => getTutorialSeenKey(userId), [userId]);
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!tutorialSeenKey) return;

    let isMounted = true;

    void SecureStore.getItemAsync(tutorialSeenKey)
      .then((value) => {
        if (!isMounted) return;
        setCheckedKey(tutorialSeenKey);
        setShouldShow(value !== "true");
      })
      .catch((error: unknown) => {
        console.warn("Unable to read swipe tutorial state", error);
        if (!isMounted) return;
        setCheckedKey(tutorialSeenKey);
        setShouldShow(true);
      });

    return () => {
      isMounted = false;
    };
  }, [tutorialSeenKey]);

  const markSeen = useCallback(async () => {
    if (!tutorialSeenKey) return;

    await SecureStore.setItemAsync(tutorialSeenKey, "true");
    setShouldShow(false);
  }, [tutorialSeenKey]);

  return {
    shouldShow: tutorialSeenKey ? shouldShow : false,
    isLoading: tutorialSeenKey ? checkedKey !== tutorialSeenKey : false,
    markSeen,
  };
}
