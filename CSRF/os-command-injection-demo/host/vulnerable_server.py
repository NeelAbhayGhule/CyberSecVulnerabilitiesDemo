"""
OS Command Injection – VULNERABLE server  (educational demo only)
=================================================================
Intentional vulnerability: user input is interpolated directly into a shell
command string passed to subprocess.run(..., shell=True).

DO NOT deploy this in any production or internet-facing environment.
"""

import subprocess
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

app = FastAPI(title="OS Command Injection – Vulnerable")
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


def _base_context(request: Request) -> dict:
    return {
        "request": request,
        "mode": "vulnerable",
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


@app.post("/ping/vulnerable", response_class=HTMLResponse)
def vulnerable_ping(request: Request, host: str = Form("")):
    # -----------------------------------------------------------------------
    # VULNERABILITY: user-controlled `host` is embedded directly in a shell
    # command string.  A payload like:
    #   127.0.0.1; id
    #   127.0.0.1 && cat /etc/passwd
    #   127.0.0.1 | whoami
    # causes the shell to execute the appended command alongside ping.
    # -----------------------------------------------------------------------
    cmd = f"ping -c 2 {host}"          # <-- UNSAFE: shell injection point
    try:
        result = subprocess.run(
            cmd,
            shell=True,               # <-- shell=True means the OS shell interprets metacharacters
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
            "inband_cmd": cmd,
            "inband_output": output,
        },
    )


@app.post("/ping/vulnerable/blind", response_class=HTMLResponse)
def vulnerable_ping_blind(request: Request, host: str = Form("")):
    # Intentionally vulnerable blind execution: command output is not shown to user.
    cmd = f"ping -c 2 {host} > /dev/null 2>&1"
    status = "Blind command dispatched. Verify impact via OOB callback logs."
    error = None
    try:
        subprocess.run(
            cmd,
            shell=True,
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
            "blind_cmd": cmd,
            "blind_status": status,
            "blind_error": error,
        },
    )


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
