import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

/** Aligné sur le thème Xray (max-width: 1199.98px) et Bootstrap `xl`. */
export const SIDEBAR_DESKTOP_MIN_PX = 1200;

const SidebarLayoutContext = createContext(null);

export function SidebarLayoutProvider({ children }) {
  const location = useLocation();
  const [width, setWidth] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth : SIDEBAR_DESKTOP_MIN_PX),
  );
  /** Sous le breakpoint : menu « tiroir » ouvert (sans classes off-canvas). */
  const [narrowDrawerOpen, setNarrowDrawerOpen] = useState(false);

  const isDesktop = width >= SIDEBAR_DESKTOP_MIN_PX;

  useLayoutEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setNarrowDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktop) setNarrowDrawerOpen(false);
  }, [isDesktop]);

  const toggleNarrowDrawer = useCallback(() => {
    setNarrowDrawerOpen((v) => !v);
  }, []);

  const closeNarrowDrawer = useCallback(() => setNarrowDrawerOpen(false), []);

  const openNarrowDrawer = useCallback(() => setNarrowDrawerOpen(true), []);

  useEffect(() => {
    if (isDesktop || !narrowDrawerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeNarrowDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [narrowDrawerOpen, isDesktop, closeNarrowDrawer]);

  const value = useMemo(
    () => ({
      isDesktop,
      narrowDrawerOpen,
      toggleNarrowDrawer,
      closeNarrowDrawer,
      openNarrowDrawer,
    }),
    [isDesktop, narrowDrawerOpen, toggleNarrowDrawer, closeNarrowDrawer, openNarrowDrawer],
  );

  return <SidebarLayoutContext.Provider value={value}>{children}</SidebarLayoutContext.Provider>;
}

export function useSidebarLayout() {
  const ctx = useContext(SidebarLayoutContext);
  if (!ctx) {
    throw new Error("useSidebarLayout doit être utilisé sous SidebarLayoutProvider");
  }
  return ctx;
}
