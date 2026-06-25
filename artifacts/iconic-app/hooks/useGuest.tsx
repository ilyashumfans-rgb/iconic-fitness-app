import { createContext, useContext, useState, type ReactNode } from "react";

type GuestContextValue = {
  /** True when the user chose "Continue without login". */
  isGuest: boolean;
  /** Enter guest mode (browse the app without an account). */
  enterGuest: () => void;
  /** Leave guest mode (e.g. when heading to sign in / after auth). */
  exitGuest: () => void;
};

const GuestContext = createContext<GuestContextValue | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  return (
    <GuestContext.Provider
      value={{
        isGuest,
        enterGuest: () => setIsGuest(true),
        exitGuest: () => setIsGuest(false),
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
