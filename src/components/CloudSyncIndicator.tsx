import { useEffect, useState } from "react";
import { useTenant } from "@/lib/tenant-context";
import { Cloud, CloudOff, Wifi, WifiOff } from "lucide-react";

export function CloudSyncIndicator() {
  const { cloudUser, activeTenant } = useTenant();
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!cloudUser || !activeTenant) {
    return (
      <div
        className="pebble-sm hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-muted-foreground md:flex"
        title="Local-only mode. Data stays in this browser."
      >
        <CloudOff className="h-3.5 w-3.5" />
        <span>Local</span>
      </div>
    );
  }

  if (!online) {
    return (
      <div
        className="pebble-sm hidden items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-700 md:flex dark:text-amber-300"
        title="Offline. Changes save locally and will sync when back online."
      >
        <WifiOff className="h-3.5 w-3.5" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div
      className="pebble-sm hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 md:flex dark:text-emerald-300"
      title={`Cloud connected · ${activeTenant.company_name}`}
    >
      <Cloud className="h-3.5 w-3.5" />
      <span>Cloud</span>
      <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
    </div>
  );
}
