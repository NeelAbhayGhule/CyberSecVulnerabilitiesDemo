from pathlib import Path

import uvicorn
from fastapi import FastAPI, Form
from fastapi.responses import FileResponse

from db import get_connection

app = FastAPI(title="SQL Injection – UNION-Based Product Lookup")
BASE_DIR = Path(__file__).resolve().parent


@app.get("/style.css", name="stylesheet", include_in_schema=False)
def stylesheet():
    return FileResponse(BASE_DIR / "style.css", media_type="text/css")


@app.get("/")
def index():
    return FileResponse(BASE_DIR / "index.html")


@app.post("/products/vulnerable")
def vulnerable_products(product_id: str = Form("")):
    
    query = f"SELECT name, description FROM products WHERE id = {product_id}"
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()
    return {"rows": rows, "query": query, "message": f"Returned {len(rows)} row(s)."}


@app.post("/products/secure")
def secure_products(product_id: str = Form("")):
    query = "SELECT name, description FROM products WHERE id = %s"
    if not product_id.isdecimal():
        return {"rows": [], "query": query, "message": "Invalid product ID. Enter digits only."}

    with get_connection() as connection:
        with connection.cursor() as cursor:
            
            cursor.execute(query, (int(product_id),))
            rows = cursor.fetchall()
    return {"rows": rows, "query": query, "message": f"Returned {len(rows)} row(s)."}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
