import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export function useIsAdmin() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId as string, _role: "admin" });
      if (error) throw error;
      return Boolean(data);
    },
  });
}

export function useMyBan() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["my-ban", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("user_bans").select("reason, created_at").eq("user_id", userId as string).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
