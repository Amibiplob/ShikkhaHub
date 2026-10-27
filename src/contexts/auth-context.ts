import { createContext } from "react";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  profile: { full_name: string | null; avatar_url: string | null; bio: string | null } | null;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
