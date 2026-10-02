import {
  Building2,
  Clock3,
  MapPin,
  ShieldCheck,
  CircleHelp,
  ExternalLink,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export type TrustState = { tone: "reviewed" | "pending"; label: string };
export type Source = { name: string; href: string };

export function OfficialSource({ source }: { source: Source }) {
  return (
    <a className="source-label" href={source.href}>
      <Building2 aria-hidden="true" size={16} />
      <span>
        <span lang="en">{source.name}</span> 官方来源
      </span>
      <ExternalLink aria-hidden="true" size={13} />
    </a>
  );
}
export function TrustBadge({ state }: { state: TrustState }) {
  const Icon = state.tone === "reviewed" ? ShieldCheck : CircleHelp;
  return (
    <span className={`trust-badge trust-${state.tone}`}>
      <Icon aria-hidden="true" size={15} />
      {state.label}
    </span>
  );
}
export function Freshness({
  label,
  dateTime,
}: {
  label: string;
  dateTime: string;
}) {
  return (
    <span className="metadata">
      <Clock3 aria-hidden="true" size={15} />
      <time dateTime={dateTime}>{label}</time>
    </span>
  );
}
export function GeographicApplicability({ region }: { region: string }) {
  return (
    <span className="metadata">
      <MapPin aria-hidden="true" size={15} />
      <span>
        适用地区：<span lang="en">{region}</span>
      </span>
    </span>
  );
}

export type InformationCardProps = {
  title: string;
  summary: string;
  source: Source;
  trust: TrustState;
  freshness: { label: string; dateTime: string };
  region: string;
  category?: string;
  icon?: ReactNode;
};
export function InformationCard({
  title,
  summary,
  source,
  trust,
  freshness,
  region,
  category,
  icon,
}: InformationCardProps) {
  return (
    <article className="information-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {category && (
          <span className="category">
            {icon}
            {category}
          </span>
        )}
        <TrustBadge state={trust} />
      </div>
      <h3>{title}</h3>
      <p className="card-summary">{summary}</p>
      <div className="provenance">
        <OfficialSource source={source} />
        <GeographicApplicability region={region} />
        <Freshness {...freshness} />
      </div>
      <div className="card-bottom">
        <span className="text-muted text-sm">本地展示样例 · 非实时资讯</span>
        <Button asChild variant="secondary">
          <a href={source.href}>
            查看官方原文
            <ExternalLink aria-hidden="true" size={16} />
          </a>
        </Button>
      </div>
    </article>
  );
}
