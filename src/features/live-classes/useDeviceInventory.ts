import { useCallback, useEffect, useState } from "react";
import type { MediaKind } from "./useWebRTCBroadcast";

/** Enumeration is a UI hint. It never grants permissions or admits a user. */
export function useDeviceInventory() {
  const [inventory, setInventory] = useState({ devices: [] as MediaDeviceInfo[], known: false });
  const refresh = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setInventory({ devices, known: true });
    } catch {
      setInventory({ devices: [], known: false });
    }
  }, []);
  useEffect(() => {
    const update = () => { void refresh(); };
    update();
    navigator.mediaDevices?.addEventListener("devicechange", update);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", update);
  }, [refresh]);
  const missing = (kind: MediaKind, stream?: MediaStream | null) =>
    inventory.known && !inventory.devices.some(d => d.kind === `${kind}input`) &&
    !stream?.getTracks().some(t => t.kind === kind && t.readyState === "live");
  return { ...inventory, refresh, missing };
}
