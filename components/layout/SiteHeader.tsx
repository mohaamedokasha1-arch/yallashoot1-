import { Suspense } from "react";
import { HeaderNav } from "@/components/client/HeaderNav";
import { ThemeToggle } from "@/components/client/ThemeToggle";
import { MAIN_NAV } from "@/lib/site";
import { HeaderNavMarkup } from "./NavMarkup";
import { SiteLogo } from "./SiteLogo";

/**
 * White header bar: maroon text logo, main menu and the night-skin button.
 * Below 1000px: ☰ button (start), centred logo, skin button (end) and the
 * menu becomes a drawer.
 */
export function SiteHeader() {
  return (
    <header className="ys-header">
      <div className="ys-header-bar">
        <div className="ys-container ys-header-row">
          <SiteLogo />
          {/* usePathname suspends on routes with request-time params: keep a static fallback. */}
          <Suspense fallback={<HeaderNavMarkup items={MAIN_NAV} />}>
            <HeaderNav items={MAIN_NAV} />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
