"use client";

import { createContext, useContext } from "react";

export type AuthContextType = {
  isSignedIn: boolean;
  userName?: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);


