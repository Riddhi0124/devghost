import json
import subprocess
from pathlib import Path


def _run_semgrep(repo_dir: Path) -> list[dict[str, object]]:
    cmd = [
        "semgrep",
        "--config",
        "p/owasp-top-ten",
        "--json",
        str(repo_dir),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    except FileNotFoundError:
        return []
    if proc.returncode not in (0, 1):
        return []

    try:
        payload = json.loads(proc.stdout or "{}")
    except json.JSONDecodeError:
        return []

    findings: list[dict[str, object]] = []
    for item in payload.get("results", []):
        start = item.get("start", {})
        end = item.get("end", {})
        extra = item.get("extra", {})
        severity = str(extra.get("severity", "INFO")).upper()
        if severity == "INFO":
            mapped = "low"
        elif severity == "WARNING":
            mapped = "medium"
        else:
            mapped = "high"

        findings.append(
            {
                "title": item.get("check_id", "semgrep.finding"),
                "description": extra.get("message", "Potential issue detected"),
                "category": "security",
                "severity": mapped,
                "confidence": 0.65,
                "file_path": item.get("path", ""),
                "line_start": start.get("line"),
                "line_end": end.get("line"),
                "tool": "semgrep",
            }
        )
    return findings


def _run_fallback_heuristics(repo_dir: Path) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    patterns = [
        ("eval(", "Avoid eval usage; this can execute untrusted input."),
        ("exec(", "Avoid exec usage; this can execute arbitrary code."),
        ("password =", "Hardcoded credential pattern detected."),
        ("SECRET_KEY =", "Potential hardcoded secret detected."),
    ]

    for path in repo_dir.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".py", ".js", ".ts", ".tsx", ".jsx"}:
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        lines = content.splitlines()
        for i, line in enumerate(lines, start=1):
            for token, message in patterns:
                if token in line:
                    findings.append(
                        {
                            "title": f"heuristic.{token.strip(' (=')}",
                            "description": message,
                            "category": "security",
                            "severity": "medium",
                            "confidence": 0.4,
                            "file_path": str(path.relative_to(repo_dir)),
                            "line_start": i,
                            "line_end": i,
                            "tool": "heuristic",
                        }
                    )
    return findings


def run_repo_analyzers(repo_dir: Path) -> tuple[list[dict[str, object]], list[str]]:
    warnings: list[str] = []
    findings = _run_semgrep(repo_dir)
    if not findings:
        warnings.append("Semgrep returned no findings or is unavailable; used heuristics.")
        findings = _run_fallback_heuristics(repo_dir)
    return findings[:200], warnings
