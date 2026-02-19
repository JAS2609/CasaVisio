"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  getCurrentUser,
  puterSignIn as puterSignIn,
  puterSignOut as puterSignOut,
} from "@/lib/puter.action";

type AuthState = {
  isSignedIn: boolean;
  userName: string | null;
  userId: string | null;
};

type AuthContextType = AuthState & {
  refreshAuth: () => Promise<boolean>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
};

const DEFAULT_AUTH_STATE: AuthState = {
  isSignedIn: false,
  userName: null,
  userId: null,
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside provider");
  return ctx;
};

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authState, setAuthState] =
    useState<AuthState>(DEFAULT_AUTH_STATE);

  const refreshAuth = async () => {
    try {
      const user = await getCurrentUser();

      setAuthState({
        isSignedIn: !!user,
        userName: user?.username ?? null,
        userId: user?.uuid ?? null,
      });

      return !!user;
    } catch {
      setAuthState(DEFAULT_AUTH_STATE);
      return false;
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const signIn = async () => {
    await puterSignIn();
    return refreshAuth();
  };

  const signOut = async () => {
    await puterSignOut();
    return refreshAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        refreshAuth,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
