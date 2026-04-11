"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// Global flag readable by formatMoney (non-hook utility)
let _privacyMode = false;

export function isPrivacyMode(): boolean {
  return _privacyMode;
}

interface PrivacyContextValue {
  privacyMode: boolean;
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  privacyMode: false,
  togglePrivacy: () => {},
});

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(() => {
    if (typeof document === "undefined") return false;
    const active = document.cookie.includes("fintrack_privacy=1");
    _privacyMode = active;
    return active;
  });

  // Counter to force full re-render of children when toggling
  const [renderKey, setRenderKey] = useState(0);

  const togglePrivacy = useCallback(() => {
    setPrivacyMode((prev) => {
      const next = !prev;
      _privacyMode = next;
      document.cookie = `fintrack_privacy=${next ? "1" : "0"};path=/;max-age=${365 * 86400}`;
      return next;
    });
    // Force all children to re-render so formatMoney picks up the new value
    setRenderKey((k) => k + 1);
  }, []);

  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacy }}>
      <div key={renderKey} className="contents">
        {children}
      </div>
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
