import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getTheme, setTheme, type AppTheme } from "@/lib/theme";

export function ThemeSettings() {
  const [theme, setT] = useState<AppTheme>("normal");
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    setT(getTheme());
    setUnlocked(localStorage.getItem("halo-theme") !== null);
  }, []);
  if (!unlocked) return null;
  const pick = (t: AppTheme) => { setTheme(t); setT(t); };
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Theme</h2>
      <p className="mt-1 text-sm text-muted-foreground">You found the secret theme. Switch anytime.</p>
      <div className="mt-4 flex gap-2">
        <Button variant={theme === "normal" ? "default" : "secondary"} onClick={() => pick("normal")}>Normal</Button>
        <Button variant={theme === "neon" ? "default" : "secondary"} onClick={() => pick("neon")}>Red neon</Button>
      </div>
    </div>
  );
}
