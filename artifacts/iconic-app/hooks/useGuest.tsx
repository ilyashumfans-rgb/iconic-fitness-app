import { createContext, useContext, type ReactNode } from "react";

type GuestContextValue = {
  /** Compatibility for existing consumers; guest access is disabled. */
  isGuest: boolean;
  /** Leave guest mode (e.g. when heading to sign in / after auth). */
  exitGuest: () => void;
};

const GuestContext = createContext<GuestContextValue | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  return (
    <GuestContext.Provider
      value={{
        isGuest: false,
        exitGuest: () => {},
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return ctx;
}
