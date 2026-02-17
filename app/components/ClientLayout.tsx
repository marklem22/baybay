"use client";

import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { AppProvider, useAppState } from "../context/AppContext";
import { Sidebar } from "../components/Sidebar";
import { Toast } from "../components/Toast";
import type { ReactNode } from "react";

function LayoutInner({ children }: { children: ReactNode }) {
  const { theme, toast, setToast, handleToggleTheme } = useAppState();
  const pathname = usePathname();
  const handleToastClose = useCallback(() => {
    setToast(null);
  }, [setToast]);

  // Derive active page from pathname
  let activePage = "rooms";
  if (pathname === "/logs") {
    activePage = "logs";
  } else if (pathname.startsWith("/rooms/archive")) {
    activePage = "archived-rooms";
  } else if (pathname.startsWith("/rooms/new")) {
    activePage = "add-room";
  } else if (pathname.startsWith("/tutorial")) {
    activePage = "tutorial";
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activePage={activePage}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
      {toast ? <Toast message={toast} onClose={handleToastClose} /> : null}
    </div>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <LayoutInner>{children}</LayoutInner>
    </AppProvider>
  );
}
