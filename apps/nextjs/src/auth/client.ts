import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

// Export the useSession hook for use in client components
export const { useSession } = authClient;
