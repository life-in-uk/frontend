import { CalendarCheck2, Landmark, MapPin, Scale } from "lucide-react";

// Each statement describes how the site already works (see GuidePage,
// EvidencePanel and Quick Answer verification); none is a new promise.
const POINTS = [
  {
    icon: <Landmark size={22} aria-hidden="true" />,
    title: "依据官方和一手来源",
    text: "每篇指南都列出所依据的来源，例如 GOV.UK、NHS、金融监管机构，以及银行自己公布的条件；关键说法可以逐条查看依据。",
  },
  {
    icon: <MapPin size={22} aria-hidden="true" />,
    title: "写清适用地区",
    text: "英国四个地区的规定常常不同。健康与 NHS 指南目前针对英格兰；苏格兰、威尔士和北爱尔兰可能不一样。",
  },
  {
    icon: <CalendarCheck2 size={22} aria-hidden="true" />,
    title: "标明日期，依据变了先撤下",
    text: "每篇指南都标明更新日期。快速解答所引用的依据如果发生变化，会先停止显示，直到重新核对。",
  },
  {
    icon: <Scale size={22} aria-hidden="true" />,
    title: "独立、不替代专业意见",
    text: "Life in UK 与 NHS、英国政府及任何银行均无隶属关系。内容仅供参考，具体情况请咨询医生、律师或持牌顾问。",
  },
];

export function TrustSection() {
  return (
    <section
      id="about"
      className="home-container home-section home-trust"
      aria-labelledby="about-title"
      tabIndex={-1}
    >
      <div className="home-section-head">
        <h2 id="about-title">关于 Life in UK：为什么可以参考</h2>
        <p>
          面向在英国生活的中文读者，把官方信息讲清楚。我们这样整理内容：
        </p>
      </div>
      <ul className="trust-grid">
        {POINTS.map((point) => (
          <li key={point.title}>
            <span className="trust-icon">{point.icon}</span>
            <h3>{point.title}</h3>
            <p>{point.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
