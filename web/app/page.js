"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function normalizeGithubRepoUrl(input) {
  const raw = (input || "").trim();
  if (!raw) return "";
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname !== "github.com") return raw;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return raw;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    return `https://github.com/${owner}/${repo}`;
  } catch {
    return raw;
  }
}

function statusTone(status) {
  const s = (status || "").toUpperCase();
  if (s === "SUCCESS") return { dot: "dotSuccess", label: "Completed" };
  if (s === "FAILURE") return { dot: "dotError", label: "Failed" };
  if (s === "STARTED") return { dot: "dotRunning", label: "Running" };
  if (s === "PENDING") return { dot: "dotPending", label: "Pending (worker queue)" };
  if (s === "QUEUED") return { dot: "dotQueued", label: "Queued" };
  return { dot: "dotQueued", label: status || "—" };
}

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoPoll, setAutoPoll] = useState(true);

  const normalizedRepoUrl = useMemo(() => normalizeGithubRepoUrl(repoUrl), [repoUrl]);
  const tone = useMemo(() => statusTone(status), [status]);
  const findings = result?.findings || [];
  const summary = result?.summary || null;

  async function startScan(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    setStatus("Submitting...");
    try {
      const res = await fetch(`${API_BASE}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: normalizedRepoUrl || repoUrl }),
      });
      if (!res.ok) throw new Error("Failed to queue scan.");
      const data = await res.json();
      setTaskId(data.task_id);
      setStatus(String(data.status || "queued").toUpperCase());
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function checkStatus() {
    if (!taskId) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/scans/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch status.");
      const data = await res.json();
      setStatus(String(data.status || "").toUpperCase());
      if (data.result) setResult(data.result);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!taskId || !autoPoll) return;
    const s = String(status || "").toUpperCase();
    if (s === "SUCCESS" || s === "FAILURE") return;
    const t = setInterval(() => checkStatus(), 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, autoPoll, status]);

  return (
    <div className="container">
      <header className="topbar">
        <div className="brand">
          <div className="logo" aria-hidden="true" />
          <div className="brandTitle">
            <strong>DevGhost</strong>
            <span>Repo analysis that turns into issues + patch drafts</span>
          </div>
        </div>
        <div className="muted">API: {API_BASE}</div>
      </header>

      <section className="hero">
        <div className="card">
          <h1 className="title">Haunt your repo. Ship fixes faster.</h1>
          <p className="subtitle">
            When you click <strong>Start Scan</strong>, DevGhost queues a background job. The worker clones the repo,
            runs analyzers (Semgrep + heuristics), and returns findings you can convert into GitHub issues and patch
            drafts.
          </p>
          <div className="pillRow" aria-label="capabilities">
            <span className="pill">Public repos</span>
            <span className="pill">Security smells</span>
            <span className="pill">Quality findings</span>
            <span className="pill">Issue drafts (next)</span>
            <span className="pill">Patch diffs (next)</span>
          </div>
          <div className="footer">
            Tip: If status stays <strong>PENDING</strong>, your worker is not running or can’t reach Redis.
          </div>
        </div>

        <div className="card">
          <form className="scanForm" onSubmit={startScan}>
            <div>
              <div className="muted" style={{ marginBottom: 8 }}>
                GitHub repository URL
              </div>
              <div className="inputRow">
                <input
                  className="input"
                  type="url"
                  required
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
                <button className="button" type="submit" disabled={busy}>
                  {busy ? "Starting..." : "Start Scan"}
                </button>
              </div>
              {normalizedRepoUrl && normalizedRepoUrl !== repoUrl.trim() && (
                <div className="muted" style={{ marginTop: 6 }}>
                  Normalized: <code>{normalizedRepoUrl}</code>
                </div>
              )}
            </div>

            {taskId ? (
              <div>
                <div className="statusRow">
                  <span className="badge">
                    <span className={`dot ${tone.dot}`} aria-hidden="true" />
                    {tone.label}
                  </span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={autoPoll} onChange={(e) => setAutoPoll(e.target.checked)} />
                      Auto-refresh
                    </label>
                    <button className="buttonSecondary" type="button" onClick={checkStatus}>
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="muted" style={{ marginTop: 10 }}>
                  <div>
                    <strong>Task</strong>: <code>{taskId}</code>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>What “Pending” means</strong>: queued in Redis; worker hasn’t started it yet.
                  </div>
                </div>
              </div>
            ) : (
              <div className="muted">
                Paste a repo and start a scan. You’ll see a task ID and live status here.
              </div>
            )}

            {error && (
              <div className="muted" style={{ color: "rgba(239, 68, 68, 0.95)" }}>
                {error}
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="card">
        <div className="muted" style={{ marginBottom: 10 }}>
          Scan output
        </div>

        <div className="grid3">
          <div className="stat">
            <div className="statLabel">Findings</div>
            <div className="statValue">{summary ? summary.findings : "—"}</div>
          </div>
          <div className="stat">
            <div className="statLabel">High / Medium / Low</div>
            <div className="statValue">
              {summary ? `${summary.high} / ${summary.medium} / ${summary.low}` : "—"}
            </div>
          </div>
          <div className="stat">
            <div className="statLabel">Next step</div>
            <div className="statValue" style={{ fontSize: 14, fontWeight: 700 }}>
              Issue drafts + patch diffs
            </div>
          </div>
        </div>

        <div className="resultsGrid">
          <div>
            <div className="muted" style={{ margin: "12px 0 8px" }}>
              How it works (today)
            </div>
            <ol className="list">
              <li>Web calls API: <code>POST /scans</code></li>
              <li>API enqueues task in Redis</li>
              <li>Worker clones repo + runs analyzers</li>
              <li>Web polls <code>GET /scans/&lt;task_id&gt;</code> until complete</li>
            </ol>
            <div className="footer">
              Private repos aren’t supported yet (needs GitHub token cloning).
            </div>
          </div>

          <div>
            <div className="muted" style={{ margin: "12px 0 8px" }}>
              Findings (preview)
            </div>
            {findings.length === 0 ? (
              <div className="muted">No findings yet. Run a scan to populate this.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {findings.slice(0, 6).map((f, idx) => (
                  <div className="finding" key={`${f.title}-${idx}`}>
                    <div className="findingTitle">
                      {String(f.severity || "").toUpperCase()} · {f.title}
                    </div>
                    <div className="findingMeta">
                      {f.tool} · {f.file_path}
                      {f.line_start ? `:${f.line_start}` : ""}
                    </div>
                    <div className="findingDesc">{f.description}</div>
                  </div>
                ))}
                {findings.length > 6 && (
                  <div className="muted">Showing 6 of {findings.length} findings.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
