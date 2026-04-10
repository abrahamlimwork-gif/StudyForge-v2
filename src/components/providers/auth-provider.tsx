
"use client";

import React from 'react';

/**
 * DEPRECATED: Conflicting Auth Provider removed in favor of FirebaseClientProvider.
 * This file is now a pass-through to avoid build errors if still imported elsewhere.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const useAuth = () => {
  console.warn("useAuth from @/components/providers/auth-provider is deprecated. Use useUser() from @/firebase instead.");
  return { user: null, loading: false };
};
