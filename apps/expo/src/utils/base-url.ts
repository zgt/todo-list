import Constants from "expo-constants";

/**
 * Returns the API base URL.
 * - Production: Uses EXPO_PUBLIC_API_URL environment variable
 * - Development: Uses the Expo debugger host with port 3000
 */
export const getBaseUrl = () => {
  // Use environment variable for production builds (set in eas.json)

  // Development: use debugger host
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    // Fallback for production if env var not set
    return "https://calayo.net";
  }
  return `http://${localhost}:3000`;
};
