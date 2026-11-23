import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app import app


class FlaskCatalogApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        os.environ["DB_PATH"] = self.tmp.name

        with sqlite3.connect(self.tmp.name) as conn:
            conn.executescript(
                """
                CREATE TABLE categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    slug TEXT NOT NULL UNIQUE,
                    description TEXT,
                    display_order INTEGER DEFAULT 1
                );
                CREATE TABLE products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_id INTEGER NOT NULL,
                    sku TEXT NOT NULL,
                    name TEXT NOT NULL,
                    brand TEXT NOT NULL,
                    unit TEXT NOT NULL,
                    price REAL NOT NULL,
                    discount_percent REAL DEFAULT 0,
                    stock_quantity INTEGER DEFAULT 50,
                    is_featured INTEGER DEFAULT 1,
                    is_active INTEGER DEFAULT 1
                );
                CREATE TABLE orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    total_amount REAL NOT NULL
                );
                INSERT INTO categories (name, slug, description, display_order)
                VALUES ('Fresh Vegetables', 'vegetables', 'Farm greens', 1);
                INSERT INTO products (category_id, sku, name, brand, unit, price, discount_percent)
                VALUES
                  (1, 'SKU-LOW', 'Fresh Palak Spinach', 'FreshFarm', '250 g', 28, 0),
                  (1, 'SKU-MED', 'Cold-Pressed Groundnut Oil', 'PureHarvest', '1 L', 180, 0),
                  (1, 'SKU-HIGH', 'Aged Basmati Rice', 'RoyalGrain', '5 kg', 540, 0);
                INSERT INTO orders (total_amount) VALUES (499.0);
                """
            )
        self.client = app.test_client()

    def tearDown(self) -> None:
        Path(self.tmp.name).unlink(missing_ok=True)

    def test_health_endpoint(self) -> None:
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "UP")

    def test_price_tiers_low_medium_high(self) -> None:
        low = self.client.get("/api/products?priceTier=low").get_json()
        med = self.client.get("/api/products?priceTier=medium").get_json()
        high = self.client.get("/api/products?priceTier=high").get_json()
        self.assertEqual(low["count"], 1)
        self.assertEqual(low["items"][0]["sku"], "SKU-LOW")
        self.assertEqual(med["count"], 1)
        self.assertEqual(med["items"][0]["sku"], "SKU-MED")
        self.assertEqual(high["count"], 1)
        self.assertEqual(high["items"][0]["sku"], "SKU-HIGH")

    def test_sql_injection_search_parameterized(self) -> None:
        res = self.client.get("/api/products?q=' OR '1'='1")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["count"], 0)


if __name__ == "__main__":
    unittest.main()
