# SQL Injection – Authentication Bypass (Variant 1)

A local FastAPI + PostgreSQL demonstration comparing unsafe f-string SQL with parameterized SQL. Requires Python 3.10+ and a running PostgreSQL server with `psql` available. Use only these dummy accounts and keep the app bound to `127.0.0.1`.

## Set up PostgreSQL

Install PostgreSQL using your operating system's installer/package manager and start its server. Connect as a database administrator (these commands use your existing `adithnr` role):

```sh
psql -U adithnr -d postgres
```

In `psql`, create the database using your existing role:

```sql
CREATE DATABASE sql_injection_demo;
\q
```

From the project directory, create and seed the table as the administrator:

```sh
psql -U adithnr -d sql_injection_demo -v ON_ERROR_STOP=1 -f schema.sql
```

`schema.sql` inserts `admin / admin123` and `student / student123`. It can be rerun to restore the dummy passwords. No new database role or password is created. In `.env`, set `PGUSER` to the existing role used above (the example uses `adithnr`). Leave `PGPASSWORD` empty only if your PostgreSQL configuration allows it; otherwise enter that role's existing password.

## Install and run

```sh
cd sql-injection-demo
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
# Edit .env if you chose different database connection settings.
set -a
source .env
set +a
python main.py
```

These commands use a POSIX shell (such as bash or zsh). `.env` is loaded into the shell explicitly; no dotenv dependency is needed. Open [http://127.0.0.1:8000](http://127.0.0.1:8000). The built-in startup binds Uvicorn to `127.0.0.1:8000`. Stop it with Ctrl+C.

Open the FastAPI URL above, not `index.html` directly or through an editor's Live Server. The HTML contains Jinja template instructions (`{% if ... %}`) that FastAPI renders before sending the page to the browser. Opening the file directly shows those instructions and does not run the Python login endpoints.

If login reports a database error, confirm PostgreSQL is running (`pg_isready -h 127.0.0.1 -p 5432`), complete the database setup above, and load `.env` in the same terminal before starting the app.

## Manually compare the two logins

| Username | Password | Vulnerable | Secure |
| --- | --- | --- | --- |
| `admin` | `admin123` | Success | Success |
| `student` | `student123` | Success | Success |
| `admin` | `wrong` | Failure | Failure |
| `' OR 1=1 --` | `anything` | Success | Failure |

Enter this exact payload into the username field:

```text
' OR 1=1 --
```

With password `anything`, `POST /login/vulnerable` constructs and displays:

```sql
SELECT id, username FROM users WHERE username = '' OR 1=1 --' AND password = 'anything'
```

The first quote closes the username string. `OR 1=1` makes the condition true for every row, and `--` comments out the remaining password check. Any supplied password works with this payload. The endpoint reports success when a row is returned; which account appears first is not guaranteed.

The vulnerable code inserts input directly into SQL:

```python
query = (
    f"SELECT id, username FROM users WHERE username = '{username}' "
    f"AND password = '{password}'"
)
cursor.execute(query)
```

`POST /login/secure` instead uses:

```python
query = "SELECT id, username FROM users WHERE username = %s AND password = %s"
cursor.execute(query, (username, password))
```

Psycopg sends the values separately from the SQL command. The payload is treated as a literal username, so it cannot alter the condition and matches no dummy account. Keep `%s` placeholders unquoted and pass values as the second `execute()` argument. See [Psycopg's parameter documentation](https://www.psycopg.org/psycopg3/docs/basic/params.html).

## Other mitigations

- Allow-list validation can restrict usernames to an expected format; it supplements parameterization.
- Least-privilege database roles limit damage. Outside this isolated local setup, use a restricted application role with only the required permissions, such as `SELECT` on `users`.
- Safe error handling avoids exposing database exceptions or connection details. Both endpoints return generic errors; the vulnerable query is deliberately displayed for learning and may include the dummy password.
- Production applications require password hashing with a suitable password hashing algorithm such as Argon2id, instead of storing or comparing plain-text passwords. This demo adds no sessions, JWT, or OAuth.
