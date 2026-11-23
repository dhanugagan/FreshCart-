-- FreshCart Supabase Seed Script
-- Seeds roles, 10 grocery categories, promo coupons, and the single demo shopper account.

INSERT INTO public.roles (name)
VALUES ('CUSTOMER'), ('ADMIN')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name, slug, description, display_order)
VALUES
  ('Fresh Vegetables & Greens', 'fresh-vegetables', 'Daily farm-picked vegetables and leafy greens', 1),
  ('Fresh Fruits', 'fresh-fruits', 'Seasonal orchard and tropical fruits', 2),
  ('Dairy, Paneer & Eggs', 'dairy-eggs', 'Milk, curd, butter, paneer, and farm eggs', 3),
  ('Atta, Rice & Grains', 'atta-rice-grains', 'Whole wheat atta, basmati rice, and everyday dals', 4),
  ('Spices, Oil & Masala', 'spices-oil-masala', 'Cold-pressed oils, pure ghee, and whole spices', 5),
  ('Bakery & Breakfast', 'bakery-breakfast', 'Artisanal breads, oats, muesli, and honey', 6),
  ('Tea, Coffee & Beverages', 'beverages', 'Loose leaf tea, filter coffee, coconut water, and juices', 7),
  ('Snacks & Biscuits', 'snacks-biscuits', 'Roasted makhanas, namkeen, biscuits, and nuts', 8),
  ('Home & Cleaning', 'home-cleaning', 'Laundry care, dishwashing, and floor hygiene', 9),
  ('Personal Care', 'personal-care', 'Daily herbal soaps, toothpaste, shampoo, and skincare', 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.coupons (code, title, description, discount_type, discount_value, min_order_amount, max_discount_amount, expires_at, usage_limit_per_user)
VALUES
  ('WELCOME20', '20% Off First Basket', 'Save 20% on orders ₹199+ (max ₹150 discount)', 'FIRST_ORDER', 20, 199, 150, '2029-12-31T23:59:59Z', 1),
  ('FRESH50', 'Flat ₹50 Off Essentials', 'Instant ₹50 savings on baskets above ₹399', 'FIXED', 50, 399, 50, '2029-12-31T23:59:59Z', 5),
  ('DAIRY15', '15% Off Morning Staples', '15% off baskets ₹249+ up to ₹120', 'PERCENTAGE', 15, 249, 120, '2029-12-31T23:59:59Z', 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.users (full_name, email, mobile, auth_provider)
VALUES ('Demo Shopper', 'demo@freshcart.in', '9876543210', 'demo')
ON CONFLICT (email) DO NOTHING;
