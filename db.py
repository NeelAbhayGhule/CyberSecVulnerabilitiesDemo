import os

import psycopg


def get_connection():
    """Use PostgreSQL's standard PG* environment variables for credentials."""
    return psycopg.connect(
        host=os.environ.get("PGHOST", "127.0.0.1"),
        port=os.environ.get("PGPORT", "5432"),
        dbname=os.environ.get("PGDATABASE", "sql_injection_demo"),
        user=os.environ.get("PGUSER", "adithnr"),
        password=os.environ.get("PGPASSWORD", ""),
        connect_timeout=5,
    )
