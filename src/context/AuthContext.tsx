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
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string; resetLink?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helper to get cookie value
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  // Helper to set cookie
  const setAuthCookie = (tokenVal: string) => {
    if (typeof document !== "undefined") {
      document.cookie = `auth_token=${tokenVal}; path=/; max-age=604800; SameSite=Lax`;
    }
  };

  // Helper to remove cookie
  const removeAuthCookie = () => {
    if (typeof document !== "undefined") {
      document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    }
  };

  // Authenticated fetch helper that automatically attaches the token
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null);
      const headers = new Headers(options.headers || {});

      if (activeToken) {
        headers.set("Authorization", `Bearer ${activeToken}`);
      }
      headers.set("Content-Type", "application/json");

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [token]
  );

  // Initialize and verify user on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken =
          localStorage.getItem("auth_token") || getCookie("auth_token");

        if (storedToken) {
          setToken(storedToken);
          // Verify current user with /api/auth/me
          const res = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
          } else {
            // Token is invalid/expired
            localStorage.removeItem("auth_token");
            removeAuthCookie();
            setUser(null);
            setToken(null);
          }
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
      localStorage.setItem("auth_token", data.token);
      setAuthCookie(data.token);

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
      localStorage.setItem("auth_token", data.token);
      setAuthCookie(data.token);

      router.push("/portal");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "An unexpected error occurred" };
    }
  };

  // Logout
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    removeAuthCookie();
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
        resetLink: data.resetLink,
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
