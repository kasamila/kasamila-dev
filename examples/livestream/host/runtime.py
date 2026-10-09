import os
import httpx

sessions = {}


def finish_runtime(session_id, origin):
    token = sessions.pop(session_id, None)
    if token:
        with httpx.Client(timeout=15) as client:
            response = client.post(os.getenv("KASAMILA_API_BASE", "https://api.kasamila.com").rstrip("/") + "/api/v1/runtime/sessions/end",
                headers={"Authorization": "Bearer " + token, "Origin": origin})
            response.raise_for_status()
