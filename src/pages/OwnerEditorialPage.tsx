import { useEffect, useState } from "react";

type Session = { role: "DRAFT" | "APPROVAL"; csrfToken: string };
type Batch = { batchId: string; slug: string; sourceRevisionId: string; sourceContentHash: string; status: string; validFrom: string; validUntil: string | null };
type Locale = { localeRevisionId: string; locale: string; sourceRevisionId: string; canonicalContent: string | null; contentHash: string | null; validationStatus: string; reviewStatus: string; reviewedHash: string | null; reviewResult: string | null; reviewer: string | null; failureCode: string | null };
type Detail = { batch: Batch; policyVersion: string; sourceVersion: string; locales: Locale[] };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/owner/editorial${path}`, { ...init, credentials: "same-origin", headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ code: `HTTP_${response.status}` }));
    throw new Error(body.message || body.code || `Request failed (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export function OwnerEditorialPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Session["role"]>("DRAFT");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checklistId, setChecklistId] = useState("");
  const [verifiedOn, setVerifiedOn] = useState(new Date().toISOString().slice(0, 10));
  const [expectedPublication, setExpectedPublication] = useState("");

  async function loadBatches(active: Session) {
    const rows = await api<Batch[]>("/batches");
    setBatches(rows);
    if (rows.length) setDetail(await api<Detail>(`/batches/${rows[0].batchId}`));
    else setDetail(null);
    setSession(active);
  }

  useEffect(() => {
    api<Session>("/session").then((value) => loadBatches(value)).catch(() => undefined);
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const next = await api<Session>("/session", { method: "POST", body: JSON.stringify({ role, credential: data.get("credential") }) });
      form.reset();
      await loadBatches(next);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Login failed"); }
    finally { setBusy(false); }
  }

  async function selectBatch(id: string) {
    setError(""); setBusy(true);
    try { setDetail(await api<Detail>(`/batches/${id}`)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not load batch"); }
    finally { setBusy(false); }
  }

  async function mutate(path: string, body?: unknown) {
    if (!session) return;
    setError(""); setBusy(true);
    try {
      await api(path, { method: "POST", headers: { "X-CSRF-Token": session.csrfToken }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      await loadBatches(session);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Request failed"); }
    finally { setBusy(false); }
  }

  async function logout() {
    if (!session) return;
    try { await api("/session", { method: "DELETE", headers: { "X-CSRF-Token": session.csrfToken } }); }
    finally { setSession(null); setDetail(null); setBatches([]); }
  }

  if (!session) return <main id="main" className="owner-editorial"><h1>Owner editorial</h1><p>Sign in with a separate draft or approval password. Machine API tokens are not accepted here.</p>
    <form onSubmit={login}><label>Access role<select value={role} onChange={(event) => setRole(event.target.value as Session["role"])}><option value="DRAFT">Drafts and previews</option><option value="APPROVAL">Approval and publication</option></select></label>
      <label>Password<input name="credential" type="password" autoComplete="current-password" required /></label><button disabled={busy}>Sign in</button></form>
    {error && <p role="alert">{error}</p>}</main>;

  return <main id="main" className="owner-editorial"><header><div><h1>Guide editorial</h1><p>Signed in for {session.role === "DRAFT" ? "draft management" : "owner approval"}.</p></div><button onClick={logout}>Sign out</button></header>
    {error && <p role="alert">{error}</p>}
    <section><h2>Recent batches</h2>{batches.length === 0 ? <p>No batches found.</p> : <ul>{batches.map((batch) => <li key={batch.batchId}><button className="owner-batch" onClick={() => selectBatch(batch.batchId)}>{batch.slug} — {batch.status} — {batch.batchId}</button></li>)}</ul>}</section>
    {detail && <article><h2>{detail.batch.slug}</h2><dl><dt>Status</dt><dd>{detail.batch.status}</dd><dt>Chinese source revision</dt><dd>{detail.batch.sourceRevisionId}</dd><dt>Source hash</dt><dd><code>{detail.batch.sourceContentHash}</code></dd><dt>Policy/source version</dt><dd>{detail.policyVersion} / {detail.sourceVersion}</dd><dt>Validity</dt><dd>{detail.batch.validFrom} — {detail.batch.validUntil || "no end date"}</dd></dl>
      <h3>Locale drafts and review</h3><div className="owner-locales">{["zh-CN", "zh-TW", "en", "ur", "hi"].map((locale) => { const item = detail.locales.find((entry) => entry.locale === locale); return <section key={locale}><h4>{locale}</h4>{!item ? <p>Missing translation</p> : <><p>{item.validationStatus} · {item.reviewStatus}{item.reviewer ? ` · ${item.reviewer}` : ""}</p><p>Source revision: {item.sourceRevisionId}</p><p>Content hash: <code>{item.contentHash || "—"}</code></p>{item.reviewedHash && <p>Reviewed hash: <code>{item.reviewedHash}</code></p>}{item.failureCode && <p>Failure: {item.failureCode}</p>}{item.reviewResult && <pre>{item.reviewResult}</pre>}{item.canonicalContent && <details><summary>Preview draft JSON</summary><pre>{item.canonicalContent}</pre></details>}</>}</section>; })}</div>
      {session.role === "APPROVAL" && <section className="owner-actions"><h3>Owner actions</h3><p>Approval requires all five current locale drafts to pass independent review. Publishing replaces the current five-locale set atomically.</p><button disabled={busy || detail.batch.status !== "READY"} onClick={() => window.confirm("Approve this complete reviewed Guide batch?") && mutate(`/batches/${detail.batch.batchId}/approve`)}>Approve batch</button>
        <label>Checklist ID<input value={checklistId} onChange={(event) => setChecklistId(event.target.value)} /></label><label>Verified on<input type="date" value={verifiedOn} onChange={(event) => setVerifiedOn(event.target.value)} /></label><label>Expected current publication ID (blank if none)<input value={expectedPublication} onChange={(event) => setExpectedPublication(event.target.value)} /></label>
        <button disabled={busy || detail.batch.status !== "APPROVED" || !checklistId} onClick={() => window.confirm("Publish all five reviewed locales now?") && mutate(`/batches/${detail.batch.batchId}/publish`, { checklistId, verifiedOn, expectCurrentPublicationId: expectedPublication || null })}>Publish batch</button></section>}</article>}
  </main>;
}
