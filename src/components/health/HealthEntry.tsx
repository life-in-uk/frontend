import { ArrowRight, HeartPulse } from "lucide-react";
import { Link } from "../Link";
import "./Health.css";

/** Home-page entry into the Health & NHS section. */
export function HealthEntry() {
  return (
    <section className="health-entry" aria-labelledby="health-entry-title">
      <div>
        <span className="category">
          <HeartPulse size={18} aria-hidden="true" />
          健康与 NHS
        </span>
        <h2 id="health-entry-title">在英格兰看病，从这里开始</h2>
        <p>
          注册 GP、看病收费、生病了该去哪、买药、看牙——每篇都附上英国官方依据。
        </p>
      </div>
      <Link to="/health" className="button button-primary">
        进入健康与 NHS
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </section>
  );
}
