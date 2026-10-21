import { cacheLife } from "next/cache";
import Link from "next/link";
import { FOOTER_NAV, SITE } from "@/lib/site";

async function CopyrightYear() {
  "use cache";
  cacheLife("reference");
  return <>{new Date().getUTCFullYear()}</>;
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ys-fwidget">
      <div className="ys-fw-title">
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="ys-footer">
      <div className="ys-fw-area">
        <div className="ys-container ys-fw-row">
          <Widget title={SITE.name}>
            <p>
              موقع معلوماتي مستقل لمواعيد ونتائج المباريات بتوقيت القاهرة، مع أولوية للكرة المصرية. لا نقدم بثًا مباشرًا ولا
              روابط مشاهدة، ولا نرتبط رسميًا بأي اتحاد أو نادٍ أو قناة.
            </p>
          </Widget>
          <Widget title="جدول المباريات">
            <nav aria-label="روابط المباريات">
              <ul>
                <li><Link href="/matches/yesterday">مباريات الأمس</Link></li>
                <li><Link href="/matches/today">مباريات اليوم</Link></li>
                <li><Link href="/matches/tomorrow">مباريات الغد</Link></li>
                <li><Link href="/search">البحث عن فريق أو بطولة</Link></li>
              </ul>
            </nav>
          </Widget>
          <Widget title="البطولات">
            <nav aria-label="روابط البطولات">
              <ul>
                <li><Link href="/leagues/egyptian-premier-league-233">الدوري المصري الممتاز</Link></li>
                <li><Link href="/leagues">كل البطولات والدوريات</Link></li>
                <li><Link href="/news">الأخبار</Link></li>
              </ul>
            </nav>
          </Widget>
          <Widget title="معلومات">
            <nav aria-label="معلومات قانونية">
              <ul>
                {FOOTER_NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Widget>
        </div>
      </div>
      <div className="ys-site-info">
        <div className="ys-container">
          <div className="ys-site-info-row">
            <ul>
              <li><Link href="/">{SITE.name}</Link></li>
              <li><Link href="/matches/today">مباريات اليوم</Link></li>
              <li><Link href="/leagues">البطولات</Link></li>
              <li><Link href="/privacy">الخصوصية</Link></li>
              <li><Link href="/contact">اتصل بنا</Link></li>
            </ul>
            <p className="ys-copy">
              © <CopyrightYear /> {SITE.name}
            </p>
          </div>
          <p className="ys-legal">
            البيانات الرياضية مقدمة من مزود بيانات خارجي (API-Football) وقد تتأخر أو تتغير. الشعارات والأسماء ملك لأصحابها.
          </p>
        </div>
      </div>
    </footer>
  );
}
