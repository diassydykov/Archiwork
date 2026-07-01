"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => string | null;
  register: (name: string, email: string, password: string) => string | null;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_KEY = "archiwork-users";
const SESSION_KEY = "archiwork-session";

interface StoredUser extends User {
  password: string;
}

function getUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      const users = getUsers();
      const found = users.find((u) => u.id === sessionId);
      if (found) {
        const { password: _, ...userData } = found;
        setUser(userData);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const users = getUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return "invalidCredentials";
    const { password: _, ...userData } = found;
    setUser(userData);
    localStorage.setItem(SESSION_KEY, found.id);
    return null;
  }, []);

  const register = useCallback(
    (name: string, email: string, password: string) => {
      const users = getUsers();
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return "emailExists";
      }
      const newUser: StoredUser = {
        id: crypto.randomUUID(),
        name,
        email,
        password,
      };
      users.push(newUser);
      saveUsers(users);
      const { password: _, ...userData } = newUser;
      setUser(userData);
      localStorage.setItem(SESSION_KEY, newUser.id);
      return null;
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
