import { ArrowRight, Wallet } from "lucide-react";
import { Link } from "../Link";
import "./Money.css";

/** Home-page entry into the Money & Finance section. */
export function MoneyEntry() {
  return (
    <section className="money-entry" aria-labelledby="money-entry-title">
      <div>
        <span className="category money-entry-category">
          <Wallet size={18} aria-hidden="true" />
          金钱与财务
        </span>
        <h2 id="money-entry-title">在英国打理钱的事，从这里开始</h2>
        <p>
          开户、存钱等常见问题先看简短回答，每条都能查看依据；需要细节再看完整指南。
        </p>
      </div>
      <Link to="/money" className="button money-entry-button">
        进入金钱与财务
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </section>
  );
}
