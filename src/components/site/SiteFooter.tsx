import { HOME_TOPICS } from "../../home/topics";
import { Link } from "../Link";
import "./Site.css";

/** Shared site footer: section navigation, About and the independence note. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <strong lang="en">
            Life in UK<span className="brand-dot">.</span>
          </strong>
          <p>在英国，把日子过明白。</p>
          <p className="site-footer-note">
            面向在英国生活的中文读者的独立信息服务。内容依据英国官方及一手公开来源整理，仅供参考，不能替代医生、律师或持牌顾问的专业意见。
          </p>
        </div>
        <nav className="site-footer-nav" aria-label="页脚导航">
          <div>
            <h2>主题</h2>
            <ul>
              {HOME_TOPICS.map((topic) => (
                <li key={topic.id}>
                  {topic.domain ? (
                    <Link to={topic.domain.basePath}>{topic.title}</Link>
                  ) : (
                    <span className="site-footer-upcoming">
                      {topic.title}
                      <small>即将推出</small>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>关于</h2>
            <ul>
              <li>
                <Link to="/#about">关于我们</Link>
              </li>
              <li>
                <Link to="/#about">内容来源与核对</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>官方渠道</h2>
            <ul>
              <li>
                <a href="https://www.gov.uk/" lang="en">
                  GOV.UK
                </a>
              </li>
              <li>
                <a href="https://www.nhs.uk/" lang="en">
                  NHS.uk
                </a>
              </li>
              <li>
                <a href="https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-use-111/">
                  <span lang="en">NHS 111</span>（非紧急医疗求助）
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div className="site-footer-bottom">
        <span>© 2026 Life in UK</span>
        <span>独立的中文生活信息服务，与 NHS 及英国政府无隶属关系。</span>
      </div>
    </footer>
  );
}
