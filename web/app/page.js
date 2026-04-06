"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function startScan(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setStatus("Submitting...");
    try {
      const res = await fetch(`${API_BASE}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      if (!res.ok) throw new Error("Failed to queue scan.");
      const data = await res.json();
      setTaskId(data.task_id);
      setStatus(data.status);
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  async function checkStatus() {
    if (!taskId) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/scans/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch status.");
      const data = await res.json();
      setStatus(data.status);
      if (data.result) setResult(data.result);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16 }}>
      <h1>DevGhost</h1>
      <p>Paste a GitHub repo URL and run a starter scan job.</p>

      <form onSubmit={startScan} style={{ display: "flex", gap: 8 }}>
        <input
          type="url"
          required
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          style={{ flex: 1, padding: "10px 12px" }}
        />
        <button type="submit">Start Scan</button>
      </form>

      {taskId && (
        <div style={{ marginTop: 16 }}>
          <p>
            <strong>Task:</strong> {taskId}
          </p>
          <p>
            <strong>Status:</strong> {status}
          </p>
          <button onClick={checkStatus}>Refresh Status</button>
        </div>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {result && (
        <pre style={{ marginTop: 16, background: "#f4f4f4", padding: 12, overflowX: "auto" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
