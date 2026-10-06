import { Link } from "../Link";
import "./Health.css";

export function NotFoundPage() {
  return (
    <main id="main" className="health-page">
      <div className="health-status-card" role="status">
        <h1>页面不存在</h1>
        <p>这个地址没有对应的页面。</p>
        <p className="not-found-links">
          <Link to="/" className="button button-secondary">
            回到首页
          </Link>
          <Link to="/health" className="button button-secondary">
            健康与 NHS
          </Link>
        </p>
      </div>
    </main>
  );
}
