import {
  ArrowDown,
  House,
  Leaf,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "./components/Button";
import {
  Freshness,
  GeographicApplicability,
  OfficialSource,
  TrustBadge,
} from "./components/InformationCard";
import { UndergroundCard } from "./components/UndergroundCard";
import { RoadsCard } from "./components/RoadsCard";
import { BankHolidaysCard } from "./components/BankHolidaysCard";
import { Neighbourhood } from "./components/Neighbourhood";
import "./App.css";

const officialSource = { name: "GOV.UK", href: "https://www.gov.uk/bank-holidays" };
// Only the adjacent design-system sample uses demo freshness; the card uses API evidence.
const demoFreshness = {
  label: "样例更新：2026年10月2日 14:32",
  dateTime: "2026-10-02T14:32:00+01:00",
};
const palette = [
  ["page", "暖纸白", "#F7F5EE"],
  ["surface", "瓷白", "#FFFDF9"],
  ["brand", "邻里绿", "#315C49"],
  ["accent", "砖陶色", "#A34F37"],
  ["verified", "核对绿", "#38634B"],
  ["warning", "提醒琥珀", "#805B18"],
  ["text", "墨色", "#28372F"],
  ["muted", "石灰绿", "#60695F"],
  ["border", "浅石色", "#DADDD2"],
];

function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        跳至展示内容
      </a>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">
            <House size={23} aria-hidden="true" />
          </span>
          <div>
            <strong lang="en">
              Life in UK<span className="brand-dot">.</span>
            </strong>
            <span className="brand-caption">英国生活，有个好邻居</span>
          </div>
        </div>
        <span className="internal-label">
          内部设计系统展示 <span lang="en">/ v0.1</span>
        </span>
      </header>
      <main id="main" className="showcase">
        <section className="direction-panel" aria-labelledby="direction-title">
          <div className="direction-copy">
            <span className="eyebrow">
              <Leaf size={15} aria-hidden="true" />
              设计方向 · ILLUSTRATED EVERYDAY BRITAIN
            </span>
            <h1 id="direction-title">
              把英国日常，
              <br />
              讲得亲切、清楚。
            </h1>
            <p>
              像一位熟悉英国生活的中文邻居。
              <br />
              外在温暖可亲，信息严谨有据。
            </p>
            <Button asChild>
              <a href="#information">
                看看信息如何呈现
                <ArrowDown size={17} aria-hidden="true" />
              </a>
            </Button>
          </div>
          <div className="illustration-study">
            <Neighbourhood />
            <span>
              街角的房子，熟悉的日常。
              <span lang="en">Illustration study · 01</span>
            </span>
          </div>
        </section>
        <div className="review-note">
          <span className="note-dot" />
          仅供设计评审：银行假日卡片使用后端来源数据；右侧核对状态与更新时间仍为展示样例。本页不是产品首页。
        </div>
        <section
          id="information"
          className="information-section"
          aria-labelledby="information-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / INFORMATION & TRUST</span>
              <h2 id="information-title">亲切的信息，清楚的依据</h2>
            </div>
            <p>先读懂内容，再看来源、状态与适用范围。</p>
          </div>
          <div className="information-grid">
            <BankHolidaysCard />
            <aside className="trust-guide" aria-labelledby="trust-title">
              <h3 id="trust-title">让可信任，有迹可循</h3>
              <p className="text-muted text-sm">四层信息，各司其职。</p>
              <dl>
                <div>
                  <dt>01 · 来源</dt>
                  <dd>
                    <OfficialSource source={officialSource} />
                    <p>官方出处与原文链接，不等同于本站已核对。</p>
                  </dd>
                </div>
                <div>
                  <dt>02 · 核对状态</dt>
                  <dd>
                    <TrustBadge
                      state={{ tone: "pending", label: "待核对 · 状态示例" }}
                    />
                    <p>如实呈现传入状态；不默认标记为已核对。</p>
                  </dd>
                </div>
                <div>
                  <dt>03 · 更新信息</dt>
                  <dd>
                    <Freshness {...demoFreshness} />
                    <p>展示给定时间，不代表实时更新。</p>
                  </dd>
                </div>
                <div>
                  <dt>04 · 适用地区</dt>
                  <dd>
                    <GeographicApplicability region="England & Wales" />
                    <p>说明地域边界，避免把地方信息当作全英通用。</p>
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
        <UndergroundCard />
        <RoadsCard />
        <section
          className="foundation-section"
          aria-labelledby="foundation-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">02 / THE VISUAL FOUNDATION</span>
              <h2 id="foundation-title">一点温度，一套清晰的秩序</h2>
            </div>
            <p>自然的颜色 · 舒展的中文 · 克制的细节</p>
          </div>
          <div className="foundation-grid">
            <div className="foundation-card">
              <h3>从英国街角取色</h3>
              <p className="text-muted text-sm">
                纸张、绿篱与砖墙。深色文字承载重要信息。
              </p>
              <div className="swatches">
                {palette.map(([token, name, hex]) => (
                  <div className="swatch" key={token}>
                    <span style={{ background: `var(--color-${token})` }} />
                    <strong>{name}</strong>
                    <code>{hex}</code>
                  </div>
                ))}
              </div>
            </div>
            <div className="foundation-card type-study">
              <h3>中文先行，阅读从容</h3>
              <span className="sample-label">标题 / 24px · 600</span>
              <p className="type-heading">在英国，把日子过明白。</p>
              <span className="sample-label">正文 / 16px · 1.8 行高</span>
              <p>
                用熟悉的语言，说明实用的事情。重要细节不藏在小字里，让每一次阅读都轻松一些。
              </p>
              <span className="sample-label">元信息 / 14px · 1.6 行高</span>
              <p className="text-muted text-sm" lang="en">
                GOV.UK · England & Wales · 02 Oct 2026
              </p>
              <div className="button-study">
                <Button asChild>
                  <a href="#information">
                    主要操作
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="secondary">
                  <a href="#foundation-title">次要操作</a>
                </Button>
                <Button disabled>不可用</Button>
              </div>
            </div>
          </div>
          <div className="design-details">
            <span>4px 基础间距 · 16 / 24 / 32px 内容间距</span>
            <span>10px 操作圆角 · 20px 卡片圆角</span>
            <span>轻阴影，仅用于抬升信息层次</span>
          </div>
        </section>
      </main>
      <footer className="showcase-footer">
        <span>Life in UK · Design system foundation</span>
        <span>Issue #1 · 等待视觉评审</span>
      </footer>
    </>
  );
}
export default App;
