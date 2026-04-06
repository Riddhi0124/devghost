from pydantic import BaseModel, HttpUrl


class ScanRequest(BaseModel):
    repo_url: HttpUrl


class ScanAccepted(BaseModel):
    task_id: str
    status: str
