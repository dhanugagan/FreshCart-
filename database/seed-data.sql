-- FreshCart MySQL Seed Data (No plaintext passwords; uses BCrypt placeholders)
USE freshcart_db;

INSERT IGNORE INTO roles (name) VALUES ('CUSTOMER'), ('ADMIN');

INSERT IGNORE INTO categories (name, slug, description, image_url, display_order) VALUES
('Fruits', 'fruits', 'Sun-ripened orchard fruits picked at peak sweetness', '/src/assets/images/grocery_produce_fresh_1795318880386.jpg', 1),
('Vegetables', 'vegetables', 'Crisp hydroponic and farm-fresh organic greens', '/src/assets/images/grocery_produce_fresh_1795318880386.jpg', 2),
('Dairy', 'dairy', 'Pasture-raised milk, cultured butter, eggs & yogurt', '/src/assets/images/grocery_dairy_bakery_1795318881680.jpg', 3),
('Bakery', 'bakery', 'Naturally leavened sourdough & warm morning loaves', '/src/assets/images/grocery_dairy_bakery_1795318881680.jpg', 4),
('Beverages', 'beverages', 'Cold-pressed juices, ceremonial teas & botanicals', '/src/assets/images/grocery_beverages_snacks_1795318880931.jpg', 5),
('Snacks', 'snacks', 'Roasted nuts, dark cacao & wholesome pantry bites', '/src/assets/images/grocery_beverages_snacks_1795318880931.jpg', 6),
('Rice & Grains', 'rice-grains', 'Aged heirloom basmati, quinoa & whole grains', '/src/assets/images/grocery_pantry_home_1795318880906.jpg', 7),
('Household Essentials', 'household', 'Plant-based cleaners, cloths & sustainable home care', '/src/assets/images/grocery_pantry_home_1795318880906.jpg', 8),
('Personal Care', 'personal-care', 'Gentle botanical soaps, lotions & daily wellness', '/src/assets/images/grocery_pantry_home_1795318880906.jpg', 9);

INSERT IGNORE INTO coupons (code, title, description, discount_type, discount_value, min_order_amount, max_discount_amount, expires_at, is_active, usage_limit_per_user) VALUES
('FRESH20', '20% Off Fresh Produce & Dairy', 'Save 20% on orders above $25 (up to $15 off).', 'PERCENTAGE', 20.00, 25.00, 15.00, '2028-12-31 23:59:59', 1, 3),
('SAVE5', 'Instant $5 Basket Credit', 'Flat $5 off any grocery basket over $20.', 'FIXED', 5.00, 20.00, 5.00, '2028-12-31 23:59:59', 1, 5),
('WELCOME15', 'First Order Welcome Treat', '15% off your very first FreshCart delivery.', 'FIRST_ORDER', 15.00, 15.00, 12.00, '2028-12-31 23:59:59', 1, 1),
('EXPIRED10', 'Seasonal Flash Promo (Expired)', 'Historical promo code for QA expiry validation.', 'PERCENTAGE', 10.00, 10.00, 10.00, '2023-01-01 00:00:00', 1, 1);
