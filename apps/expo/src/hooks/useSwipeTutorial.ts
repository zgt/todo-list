import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

const TUTORIAL_SEEN_KEY = "swipe_tutorial_seen";

export function useSwipeTutorial() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(TUTORIAL_SEEN_KEY).then((value) => {
      setShouldShow(value !== "true");
      setIsLoading(false);
    });
  }, []);

  const markSeen = useCallback(async () => {
    await SecureStore.setItemAsync(TUTORIAL_SEEN_KEY, "true");
    setShouldShow(false);
  }, []);

  return { shouldShow, isLoading, markSeen };
}
