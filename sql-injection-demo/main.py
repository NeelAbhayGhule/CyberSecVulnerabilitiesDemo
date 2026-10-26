from pathlib import Path

import psycopg
import uvicorn
from fastapi import FastAPI, Form, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates

from db import get_connection

app = FastAPI(title="SQL Injection – Authentication Bypass (Variant 1)")
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR))


def render_page(request, mode=None, success=False, message=None, query=None, status=200):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "mode": mode,
            "success": success,
            "message": message,
            "query": query,
        },
        status_code=status,
    )


@app.get("/style.css", name="stylesheet", include_in_schema=False)
def stylesheet():
    return FileResponse(BASE_DIR / "style.css", media_type="text/css")


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return render_page(request)


@app.post("/login/vulnerable", response_class=HTMLResponse)
def vulnerable_login(
    request: Request, username: str = Form(""), password: str = Form("")
):
    # Deliberately unsafe: user input becomes part of the SQL syntax.
    query = (
        f"SELECT id, username FROM users WHERE username = '{username}' "
        f"AND password = '{password}'"
    )
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query)
                user = cursor.fetchone()
    except psycopg.Error:
        return render_page(
            request, mode="vulnerable", query=query, status=400,
            message="Login could not be completed. Check the database setup and input.",
        )

    return render_page(
        request, mode="vulnerable", success=user is not None, query=query,
        message=f"Login successful as {user[1]}." if user else "Login failed: invalid credentials.",
    )


@app.post("/login/secure", response_class=HTMLResponse)
def secure_login(
    request: Request, username: str = Form(""), password: str = Form("")
):
    query = "SELECT id, username FROM users WHERE username = %s AND password = %s"
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                # Values are sent separately; they cannot change the SQL syntax.
                cursor.execute(query, (username, password))
                user = cursor.fetchone()
    except psycopg.Error:
        return render_page(
            request, mode="secure", status=400,
            message="Login could not be completed. Check the database setup and input.",
        )

    return render_page(
        request, mode="secure", success=user is not None,
        message=f"Login successful as {user[1]}." if user else "Login failed: invalid credentials.",
    )


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
