/** Public website shell: navbar, page, footer. Visually separate from the logged-in POS. */
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader.jsx";
import { SiteFooter } from "./components/SiteFooter.jsx";

export default function SiteLayout({ children }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-full flex-col bg-cream text-ink">
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children ?? <Outlet />}</main>
      <SiteFooter />
    </div>
  );
}
