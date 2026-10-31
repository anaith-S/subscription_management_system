"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  isActive: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Authenticated fetch helper.
  // The session lives in an httpOnly cookie, so same-origin requests are
  // already authenticated; the in-memory token is only sent along when this
  // browser tab logged in during the current page load.
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      headers.set("Content-Type", "application/json");

      return fetch(url, {
        ...options,
        headers,
        credentials: "same-origin",
      });
    },
    [token]
  );

  // Initialize and verify user on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // The httpOnly cookie is sent automatically; ask the server who we are.
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Helper to redirect users based on their role
  const redirectByRole = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        router.push("/dashboard");
        break;
      case "STAFF":
        router.push("/subscriptions");
        break;
      case "CUSTOMER":
      default:
        router.push("/portal");
        break;
    }
  };

  // Login
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      setToken(data.token);
      setUser(data.user);

      redirectByRole(data.user.role);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "An unexpected error occurred" };
    }
  };

  // Signup
  const signup = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Sign-up failed" };
      }

      setToken(data.token);
      setUser(data.user);

      router.push("/portal");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "An unexpected error occurred" };
    }
  };

  // Logout: the cookie is httpOnly, so only the server can clear it.
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setToken(null);
    setUser(null);
    router.push("/auth/login");
  };

  // Forgot Password
  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to request password reset" };
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  // Reset Password
  const resetPassword = async (resetToken: string, password: string) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to reset password" };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        forgotPassword,
        resetPassword,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
