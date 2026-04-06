from fastapi import FastAPI, HTTPException

from .celery_app import celery_app
from .schemas import ScanAccepted, ScanRequest

app = FastAPI(title="DevGhost API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/scans", response_model=ScanAccepted)
def create_scan(payload: ScanRequest) -> ScanAccepted:
    task = celery_app.send_task("devghost.scan_repo", args=[str(payload.repo_url)])
    return ScanAccepted(task_id=task.id, status="queued")


@app.get("/scans/{task_id}")
def get_scan_status(task_id: str) -> dict[str, object]:
    result = celery_app.AsyncResult(task_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Task not found")

    response: dict[str, object] = {"task_id": task_id, "status": result.status}
    if result.ready():
        response["result"] = result.result
    return response
