"""
OS Command Injection – SECURE server  (educational demo only)
=============================================================
Mitigations applied:
  1. shell=False  – subprocess never invokes a shell; metacharacters are inert.
  2. Argument vector  – host is passed as a separate list element, not
     concatenated into a command string.
  3. Allow-list validation  – input is checked against a strict regex for
     valid IPv4 addresses and hostnames before the command even runs.
"""

import re
import subprocess
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

app = FastAPI(title="OS Command Injection – Secure")
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Allow-list: valid IPv4 or simple hostname (letters, digits, hyphens, dots)
_VALID_HOST_RE = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*"
    r"[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$"
    r"|^(?:\d{1,3}\.){3}\d{1,3}$"
)


def is_valid_host(host: str) -> bool:
    """Return True only if host matches the allow-list pattern."""
    return bool(_VALID_HOST_RE.match(host.strip()))


def _base_context(request: Request) -> dict:
    return {
        "request": request,
        "mode": "secure",
        "inband_cmd": None,
        "inband_output": None,
        "inband_error": None,
        "blind_cmd": None,
        "blind_status": None,
        "blind_error": None,
    }


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request, "index.html", _base_context(request))


@app.post("/ping/secure", response_class=HTMLResponse)
def secure_ping(request: Request, host: str = Form("")):
    # Mitigation 1: Allow-list validation
    if not is_valid_host(host):
        return templates.TemplateResponse(
            request,
            "index.html",
            {
                **_base_context(request),
                "inband_error": f"Rejected input: '{host}' is not a valid hostname or IP address.",
            },
            status_code=400,
        )

    # Mitigation 2: Argument vector (no shell interpolation)
    # Mitigation 3: shell=False (default) – shell metacharacters are NOT interpreted
    cmd_args = ["ping", "-c", "2", host.strip()]
    try:
        result = subprocess.run(
            cmd_args,            # list, not a string
            shell=False,         # <-- safe: OS receives args directly, no shell involved
            capture_output=True,
            text=True,
            timeout=10,
        )
        output = result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        output = "[ERROR] Command timed out."

    return templates.TemplateResponse(
        request,
        "index.html",
        {
            **_base_context(request),
            "inband_cmd": " ".join(cmd_args),
            "inband_output": output,
        },
    )


@app.post("/ping/secure/blind", response_class=HTMLResponse)
def secure_ping_blind(request: Request, host: str = Form("")):
    if not is_valid_host(host):
        return templates.TemplateResponse(
            request,
            "index.html",
            {
                **_base_context(request),
                "blind_error": f"Rejected input: '{host}' is not a valid hostname or IP address.",
            },
            status_code=400,
        )

    cmd_args = ["ping", "-c", "2", host.strip()]
    status = "Blind command dispatched safely. No shell interpretation occurred."
    error = None
    try:
        subprocess.run(
            cmd_args,
            shell=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except subprocess.TimeoutExpired:
        status = None
        error = "[ERROR] Blind command timed out."

    return templates.TemplateResponse(
        request,
        "index.html",
        {
            **_base_context(request),
            "blind_cmd": " ".join(cmd_args),
            "blind_status": status,
            "blind_error": error,
        },
    )


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8002)
