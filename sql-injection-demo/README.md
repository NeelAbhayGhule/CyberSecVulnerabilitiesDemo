# SQL Injection – UNION-Based Product Lookup

A small local FastAPI + PostgreSQL demo with one HTML page and separate CSS. The vulnerable lookup can expose usernames and passwords through a UNION query. The secure lookup rejects the same input.

## Setup

Requires Python 3.10+ and a running PostgreSQL server. From the repository root:

```sh
cd sql-injection-demo
```

Create the database using your existing PostgreSQL role (`adithnr` here):

```sh
psql -U adithnr -d postgres -c 'CREATE DATABASE sql_injection_demo;'
```

Skip database creation if it already exists. Create/seed the tables (also run this when upgrading from the old demo):

```sh
psql -U adithnr -d sql_injection_demo -v ON_ERROR_STOP=1 -f schema.sql
```



```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
set -a
source .env
set +a
python main.py
```

Commands use bash/zsh. `PGPASSWORD` may be empty if your PostgreSQL configuration permits it; otherwise use your existing role's password. Open [http://127.0.0.1:8000](http://127.0.0.1:8000). The app binds to `127.0.0.1` only. Open this URL rather than the HTML file or Live Server: FastAPI serves the plain HTML/CSS files and handles the lookup endpoints. A small inline JavaScript block submits each form and displays the JSON response. No Jinja or Request object is used.

## Try it manually

Enter `1`, `2`, or `3` in either form to retrieve a product. Enter `999` to see no matching products.

Enter this exact input in both forms:

```sql
0 UNION SELECT username, password FROM users --
```

The vulnerable endpoint, `/products/vulnerable`, uses an unsafe Python f-string:

```python
query = f"SELECT name, description FROM products WHERE id = {product_id}"
cursor.execute(query)
```

The resulting query is:

```sql
SELECT name, description FROM products WHERE id = 0 UNION SELECT username, password FROM users --
```

There is no product with ID 0. `UNION` combines the original results with rows from `users`. Both SELECT statements return two text columns, so the dummy usernames and passwords appear under the Name and Description headings. Row order is not guaranteed.

The secure endpoint, `/products/secure`, checks that the ID contains digits and then uses a parameterized query:

```python
query = "SELECT name, description FROM products WHERE id = %s"
cursor.execute(query, (int(product_id),))
```

The same payload is rejected as an invalid ID before SQL executes. Parameterization also keeps accepted values separate from SQL syntax; values cannot add a UNION clause. The displayed `%s` query is the template, not an interpolated query.

