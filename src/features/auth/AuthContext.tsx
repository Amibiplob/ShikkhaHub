import { toast } from "sonner";
import { Fragment, useCallback, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AppRole, type AuthContextType } from "./auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let currentUserId: string | null | undefined;
    const applySession = async (next: Session | null) => {
      const request = ++generation;
      const identityChanged = currentUserId !== (next?.user.id ?? null);
      currentUserId = next?.user.id ?? null;
      // Supabase revalidates SIGNED_IN on tab return. Refresh server roles in
      // place for the same identity; unmounting here destroys live media.
      if (identityChanged) { setLoading(true); setRoles([]); setProfile(null); }
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
        if (active && request === generation) { setRoles([]); setProfile(null); }
        // Revalidation fails closed for role-gated controls without resetting media routes.
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
      <Fragment key={user?.id ?? "guest"}>{children}</Fragment>
    </AuthContext.Provider>
  );
};
