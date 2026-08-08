import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, qk, type Profile } from "@/lib/chat";

export function useSession() {
  return useQuery<Session | null>({
    queryKey: qk.session,
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30_000,
  });
}

export function useMyProfile() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  return useQuery<Profile | null>({
    queryKey: qk.profile(userId),
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
  });
}
