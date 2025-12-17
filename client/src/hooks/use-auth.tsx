import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { db, type User } from "@/lib/db";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is stored in session (simulated)
    const storedId = localStorage.getItem("tawfeex_user_id");
    if (storedId) {
      db.users.get(parseInt(storedId)).then((u) => {
        if (u) setUser(u);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, pass: string) => {
    // Simulating secure hash check (requirements said "Tawfeex" / "Taysiir")
    const u = await db.users.where("username").equals(username).first();
    
    if (u && u.passwordHash === pass) {
      setUser(u);
      localStorage.setItem("tawfeex_user_id", u.id!.toString());
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("tawfeex_user_id");
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
