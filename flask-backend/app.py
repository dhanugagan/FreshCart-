import os
import sqlite3
from pathlib import Path
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DEFAULT_DB = ROOT_DIR / "freshcart.db"

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
)
# Restrict CORS to localhost and configured APP_URL
allowed_origins = [
    o for o in [os.environ.get("APP_URL", ""), "http://localhost:3000", "http://127.0.0.1:5000"] if o
]
CORS(app, origins=allowed_origins)


def get_db_connection() -> sqlite3.Connection:
    db_path = Path(os.environ.get("DB_PATH", str(DEFAULT_DB)))
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    db_path = Path(os.environ.get("DB_PATH", str(DEFAULT_DB)))
    return jsonify({
        "service": "freshcart-flask-api",
        "status": "UP",
        "databaseConnected": db_path.exists(),
    })


@app.get("/api/categories")
def list_categories():
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT c.id, c.name, c.slug, c.description, COUNT(p.id) AS product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
            GROUP BY c.id
            ORDER BY c.display_order ASC, c.id ASC
            """
        ).fetchall()
        return jsonify({"categories": [dict(r) for r in rows]})


@app.get("/api/products")
def list_products():
    q = (request.args.get("q") or "").strip()
    tier = (request.args.get("priceTier") or "").strip().lower()
    category_slug = (request.args.get("category") or "").strip().lower()

    sql = """
        SELECT p.id, p.sku, p.name, p.brand, p.unit, p.price, p.discount_percent,
               ROUND(p.price * (1 - p.discount_percent / 100.0), 2) AS effective_price,
               p.stock_quantity, c.name AS category_name, c.slug AS category_slug
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = 1
    """
    params: list[object] = []

    if q:
        sql += " AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.brand) LIKE LOWER(?))"
        pattern = f"%{q}%"
        params.extend([pattern, pattern])

    if category_slug:
        sql += " AND c.slug = ?"
        params.append(category_slug)

    if tier == "low":
        sql += " AND (p.price * (1 - p.discount_percent / 100.0)) <= 99"
    elif tier == "medium":
        sql += " AND (p.price * (1 - p.discount_percent / 100.0)) > 99 AND (p.price * (1 - p.discount_percent / 100.0)) <= 250"
    elif tier == "high":
        sql += " AND (p.price * (1 - p.discount_percent / 100.0)) > 250"

    sql += " ORDER BY p.is_featured DESC, p.id ASC"

    with get_db_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
        return jsonify({
            "count": len(rows),
            "priceTier": tier or "all",
            "items": [dict(r) for r in rows],
        })


@app.get("/api/orders/stats")
def order_stats():
    with get_db_connection() as conn:
        totals = conn.execute(
            """
            SELECT COUNT(*) AS total_orders,
                   COALESCE(SUM(total_amount), 0) AS total_revenue
            FROM orders
            """
        ).fetchone()
        return jsonify(dict(totals))


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
