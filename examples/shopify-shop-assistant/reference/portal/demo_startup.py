"""Short-lived voice admission after Portal avatar preparation; no Runtime changes."""
import time

from pydantic import Field
from sqlalchemy import select

from ...core.encryption import open_json, seal_json
from ...core.errors import ApiError
from ...core.rate_limit import InMemoryRateLimiter
from ..identity.models import utcnow
from ..runtime.models import RuntimeSession
from .demo_config import StrictModel

limiter = InMemoryRateLimiter()


class VoiceAdmission(StrictModel):
    preparation: str = Field(min_length=1, max_length=4096)


def prepare_voice(ticket, purpose):
    # This grant cannot open a voice socket. It expires even if never activated.
    return seal_json({**ticket, "expires": time.time() + 240}, purpose + "-preparation")


def activate_voice(request, payload, db, purpose, origin):
    try:
        ticket = open_json(payload.preparation, purpose + "-preparation")
        if (ticket["expires"] <= time.time() or ticket["origin"] != origin
                or ticket["ip"] != request.client.host):
            raise ValueError("Invalid preparation")
        runtime = db.scalar(select(RuntimeSession).where(RuntimeSession.session_id == ticket["runtime_session"]))
        if (not runtime or runtime.status != "active" or runtime.expires_at <= utcnow()
                or runtime.origin != origin):
            raise ValueError("Runtime ended")
        if not limiter.check(purpose + ":" + ticket["nonce"], 4, 300).allowed:
            raise ValueError("Admission limit")
        # Preserve the nonce: activation cannot bypass the socket's replay guard.
        ticket["expires"] = min(ticket["expires"], time.time() + 60)
        return {"ticket": seal_json(ticket, purpose)}
    except Exception as error:
        raise ApiError(403, "demo_connection_failed", "Restart the demo session") from error
