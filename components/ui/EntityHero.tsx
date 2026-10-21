import type { ReactNode } from "react";
import { TeamLogo } from "./TeamLogo";

/** Stadium banner used at the top of league, team and player pages. */
export function EntityHero({
  logo,
  logoName,
  rounded = false,
  title,
  subtitle,
  meta,
  label,
}: {
  logo: string | null;
  logoName: string;
  rounded?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  label: string;
}) {
  return (
    <section className="ys-hero" aria-label={label}>
      <div className="ys-hero-bg">
        <div className="ys-hero-overlay">
          <div className="ys-entity">
            <TeamLogo src={logo} name={logoName} size={90} rounded={rounded} className="ys-hero-flag" />
            <h1 className="ys-entity-title">{title}</h1>
            {subtitle ? <div className="ys-entity-sub">{subtitle}</div> : null}
            {meta ? <div className="ys-hero-meta">{meta}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
