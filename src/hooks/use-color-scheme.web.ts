import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * Web color scheme hook.
 *
 * useSyncExternalStore is used here instead of useEffect + setState
 * so the hook remains compatible with React's rendering rules and
 * avoids cascading state updates during effects.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return "light";
}
