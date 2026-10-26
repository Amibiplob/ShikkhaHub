import { toast } from "sonner";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  profile: { full_name: string | null; avatar_url: string | null; bio: string | null } | null;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  useEffect(() => {
    let active = true;
    let generation = 0;
    const applySession = async (next: Session | null) => {
      const request = ++generation;
      setLoading(true);
      setRoles([]);
      setProfile(null);
      setSession(next);
      setUser(next?.user ?? null);
      try {
        if (next?.user) {
          const [rolesRes, profileRes] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", next.user.id),
            supabase.from("profiles").select("full_name, avatar_url, bio").eq("user_id", next.user.id).single(),
          ]);
          if (!active || request !== generation) return;
          setRoles(rolesRes.data?.map((r) => r.role) ?? []);
          setProfile(profileRes.data ?? null);
        }
      } catch {
        // Role/profile failures leave access denied, never reuse previous privileges.
      } finally {
        if (active && request === generation) setLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      // Leave the auth callback before querying, avoiding the Supabase auth lock.
      queueMicrotask(() => { if (active) void applySession(next); });
    });
    const initialGeneration = generation;
    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (active && generation === initialGeneration) void applySession(initial);
    }).catch(() => { if (active && generation === initialGeneration) void applySession(null); });
    return () => { active = false; generation++; subscription.unsubscribe(); };
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) toast.error("Could not sign out. Please try again.");
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  }, []);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, profile, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
