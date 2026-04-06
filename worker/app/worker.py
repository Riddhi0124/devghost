import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from celery import Celery

from .analyzers import run_repo_analyzers

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("devghost_worker", broker=REDIS_URL, backend=REDIS_URL)


@celery_app.task(name="devghost.scan_repo")
def scan_repo(repo_url: str) -> dict[str, object]:
    parsed = urlparse(repo_url)
    repo_path = parsed.path.strip("/")
    temp_root = tempfile.mkdtemp(prefix="devghost-")
    clone_dir = os.path.join(temp_root, "repo")

    try:
        clone_proc = subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, clone_dir],
            capture_output=True,
            text=True,
            check=False,
        )
        if clone_proc.returncode != 0:
            return {
                "repo_url": repo_url,
                "repo_path": repo_path,
                "summary": {"findings": 0, "high": 0, "medium": 0, "low": 0},
                "warnings": ["Unable to clone repository."],
                "error": clone_proc.stderr.strip() or "git clone failed",
                "findings": [],
            }

        findings, warnings = run_repo_analyzers(Path(clone_dir))
        high = sum(1 for f in findings if f["severity"] == "high")
        medium = sum(1 for f in findings if f["severity"] == "medium")
        low = sum(1 for f in findings if f["severity"] == "low")
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)

    return {
        "repo_url": repo_url,
        "repo_path": repo_path,
        "summary": {
            "findings": len(findings),
            "high": high,
            "medium": medium,
            "low": low,
        },
        "warnings": warnings,
        "findings": findings,
        "message": "Scan completed with starter analyzer pipeline.",
    }


if __name__ == "__main__":
    celery_app.worker_main(
        [
            "worker",
            "--loglevel=info",
            "--pool=solo",
        ]
    )
