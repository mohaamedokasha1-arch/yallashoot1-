import Link from "next/link";
import { SITE } from "@/lib/site";

/** Text logo: the site name in white on the maroon rounded box. */
export function SiteLogo() {
  return (
    <Link href="/" className="ys-logo" aria-label={`${SITE.name} — الصفحة الرئيسية`}>
      <span className="ys-logo-name">{SITE.name}</span>
      <span className="ys-logo-sub" aria-hidden="true" />
    </Link>
  );
}
