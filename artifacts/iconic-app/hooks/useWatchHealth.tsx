import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";
import { useGuest } from "./useGuest";
import { istDateNDaysAgo, istToday, istDateStr } from "@/lib/dates";
import { emptyWatchStore, sanitizeWatchRecords, sanitizeWatchStore, watchStorageKey, type WatchStore } from "@/lib/watchHealth";
import { getHealthAvailability, healthNative, type HealthAvailability } from "@/lib/watchHealthNative";

type WatchContext = WatchStore & { owner: string | null; ready: boolean; busy: boolean; error: string; availability: HealthAvailability | null; connect(): Promise<void>; sync(): Promise<void>; disconnect(): Promise<void>; openSettings(): Promise<void> };
const Context = createContext<WatchContext | null>(null);
export function WatchHealthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isGuest } = useGuest();
  const owner = isLoaded && isSignedIn && userId && !isGuest ? userId : null;
  // Keyed scope drops all memory on identity changes; no health data enters query persistence.
  return <WatchScope key={owner ?? "signed-out"} owner={owner}>{children}</WatchScope>;
}
function WatchScope({ owner, children }: { owner: string | null; children: ReactNode }) {
  const [store, setStore] = useState(emptyWatchStore);
  const storeRef = useRef(store);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState<HealthAvailability | null>(null);
  const live = useRef(true);
  const generation = useRef(0);
  const pending = useRef(false);
  const lastAttempt = useRef(0);
  const lastDay = useRef("");
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const commit = async (next: WatchStore, token: number) => {
    if (!owner || !live.current || token !== generation.current) return;
    const write = writes.current.catch(() => {}).then(async () => {
      if (!live.current || token !== generation.current) return;
      await AsyncStorage.setItem(watchStorageKey(owner), JSON.stringify(next));
      if (live.current && token === generation.current) { storeRef.current = next; setStore(next); }
    });
    writes.current = write;
    await write;
  };
  useEffect(() => {
    live.current = true;
    if (owner) {
      AsyncStorage.getItem(watchStorageKey(owner)).then(raw => {
        const next = raw ? sanitizeWatchStore(JSON.parse(raw)) : emptyWatchStore();
        if (live.current) {
          storeRef.current = next; setStore(next);
          if (next.lastReadAt) {
            lastAttempt.current = Math.min(Date.now(), Date.parse(next.lastReadAt));
            lastDay.current = istDateStr(new Date(next.lastReadAt));
          }
          setReady(true);
        }
      }).catch(() => { if (live.current) setError("Could not load saved health connection. Reopen this screen to retry; no records were changed."); });
      getHealthAvailability().then(v => { if (live.current) setAvailability(v); })
        .catch(() => { if (live.current) setError("Could not check health availability."); });
    }
    return () => { live.current = false; generation.current++; };
  }, [owner]);
  const read = async (connect = false, automatic = false) => {
    if (!owner || !ready || pending.current || !live.current || !availability?.available || (!connect && !storeRef.current.connected)) return;
    const day = istToday();
    if (automatic && Date.now() - lastAttempt.current < 300000 && lastDay.current === day) return;
    pending.current = true; setBusy(true); setError("");
    lastAttempt.current = Date.now(); lastDay.current = day;
    const token = generation.current;
    const valid = () => live.current && token === generation.current;
    try {
      let next = storeRef.current;
      if (connect) {
        await healthNative().requestPermissions();
        if (!valid()) return;
        next = { ...next, connected: true, provider: availability.provider, requestedAt: new Date().toISOString() };
        await commit(next, token);
      }
      if (!valid()) return;
      const start = istDateNDaysAgo(29);
      const records = await healthNative().readDailyRecords(start, day);
      if (!valid()) return;
      if (!Array.isArray(records)) throw new Error("The health provider returned an invalid response.");
      await commit({ ...next, records: sanitizeWatchRecords(records).filter(r => r.date >= start && r.date <= day), lastReadAt: new Date().toISOString() }, token);
    } catch (e) {
      if (valid()) setError(e instanceof Error ? e.message : "Health read failed. Previous records are kept.");
    } finally {
      pending.current = false;
      if (valid()) setBusy(false);
    }
  };
  const readRef = useRef(read); readRef.current = read;
  useEffect(() => {
    if (!ready || !store.connected || !availability?.available) return;
    void readRef.current(false, true);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void readRef.current(false, true); });
    const timer = setInterval(() => { if (AppState.currentState === "active" && lastDay.current !== istToday()) void readRef.current(false, true); }, 30000);
    return () => { listener.remove(); clearInterval(timer); };
  }, [ready, store.connected, availability?.available]);
  const disconnect = async () => {
    if (!owner) return;
    const token = ++generation.current;
    setBusy(false); setError("");
    storeRef.current = emptyWatchStore(); setStore(emptyWatchStore());
    try { await commit(emptyWatchStore(), token); }
    catch { if (live.current) setError("Automatic reads stopped, but local deletion failed. Tap Disconnect again to retry before leaving."); }
  };
  const openSettings = async () => {
    if (!owner) return;
    try { await healthNative().openSettings(); }
    catch (e) { if (live.current) setError(e instanceof Error ? e.message : "Could not open health settings."); }
  };
  return <Context.Provider value={{ ...store, owner, ready, busy, error, availability, connect: () => read(true), sync: () => read(), disconnect, openSettings }}>{children}</Context.Provider>;
}
export function useWatchHealth() {
  const value = useContext(Context);
  if (!value) throw new Error("useWatchHealth requires WatchHealthProvider");
  return value;
}