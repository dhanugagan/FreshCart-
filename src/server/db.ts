import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';

const dbPath =
  process.env.DB_PATH ||
  (process.env.VERCEL ? '/tmp/freshcart.db' : path.resolve(process.cwd(), 'freshcart.db'));
export const db = new Database(dbPath);

try {
  db.pragma('journal_mode = WAL');
} catch {
  // Fallback safely in read-only or serverless /tmp environments
}
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notify_orders INTEGER NOT NULL DEFAULT 1,
      notify_offers INTEGER NOT NULL DEFAULT 1,
      notify_delivery INTEGER NOT NULL DEFAULT 1,
      auth_provider TEXT NOT NULL DEFAULT 'local',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      jti TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT '500 g',
      description TEXT NOT NULL,
      price REAL NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 4.7,
      review_count INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_trending INTEGER NOT NULL DEFAULT 0,
      is_bestseller INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL UNIQUE,
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      low_stock_threshold INTEGER NOT NULL DEFAULT 10,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      applied_coupon_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (cart_id, product_id),
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wishlist_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (wishlist_id, product_id),
      FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED', 'FIRST_ORDER')),
      discount_value REAL NOT NULL,
      min_order_amount REAL NOT NULL DEFAULT 0,
      max_discount_amount REAL NOT NULL DEFAULT 500,
      expires_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      usage_limit_per_user INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupon_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coupon_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      order_id INTEGER,
      used_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT 'Home',
      recipient_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      street TEXT NOT NULL,
      apartment TEXT DEFAULT '',
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      lat REAL NOT NULL DEFAULT 12.9716,
      lng REAL NOT NULL DEFAULT 77.5946,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      address_id INTEGER,
      shipping_snapshot TEXT NOT NULL,
      delivery_slot TEXT NOT NULL DEFAULT 'Express (20-35 mins)',
      delivery_instructions TEXT DEFAULT '',
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      coupon_code TEXT,
      status TEXT NOT NULL DEFAULT 'ORDER_PLACED',
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      payment_method TEXT NOT NULL DEFAULT 'UPI',
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      product_image TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'INITIATED',
      transaction_ref TEXT NOT NULL UNIQUE,
      provider_message TEXT DEFAULT '',
      masked_instrument TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS delivery_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      driver_name TEXT NOT NULL DEFAULT 'Aarav Sharma (Scooter #KA-01-FC01)',
      current_status TEXT NOT NULL DEFAULT 'ORDER_PLACED',
      progress_percent INTEGER NOT NULL DEFAULT 15,
      eta_minutes INTEGER NOT NULL DEFAULT 28,
      current_lat REAL NOT NULL DEFAULT 12.9716,
      current_lng REAL NOT NULL DEFAULT 77.5946,
      is_simulated INTEGER NOT NULL DEFAULT 1,
      timeline_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL DEFAULT 'manual_adjustment',
      actor_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL DEFAULT 'DELIVERY_INSTRUCTION',
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      storage_url TEXT NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 'local',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    DROP TABLE IF EXISTS qa_results;
    DROP TABLE IF EXISTS qa_runs;

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id);
    CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);
  `);

  runMigrations();
  seedInitialData();
}

function runMigrations() {
  const addrCols = db.prepare(`PRAGMA table_info(addresses)`).all() as Array<{ name: string }>;
  const colNames = new Set(addrCols.map((c) => c.name));
  if (!colNames.has('lat')) {
    db.exec(`ALTER TABLE addresses ADD COLUMN lat REAL NOT NULL DEFAULT 12.9716`);
  }
  if (!colNames.has('lng')) {
    db.exec(`ALTER TABLE addresses ADD COLUMN lng REAL NOT NULL DEFAULT 77.5946`);
  }

  const userCols = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
  const userColNames = new Set(userCols.map((c) => c.name));
  if (!userColNames.has('auth_provider')) {
    db.exec(`ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local'`);
  }

  // Remove any legacy old US demo customer account
  db.prepare(`DELETE FROM users WHERE email = 'customer@freshcart.app'`).run();

  // Never show mismatched generic category collage photos on individual product items;
  // items without an exact dedicated photo will display the "Uploading in a few mins" visual.
  db.prepare(
    `UPDATE product_images
     SET image_url = ''
     WHERE image_url IN (
       '/src/assets/images/grocery_produce_fresh_1795318880386.jpg',
       '/src/assets/images/grocery_dairy_bakery_1795318881680.jpg',
       '/src/assets/images/grocery_beverages_snacks_1795318880931.jpg',
       '/src/assets/images/grocery_pantry_home_1795318880906.jpg'
     )`
  ).run();
}

const imgProduce = '/src/assets/images/grocery_produce_fresh_1795318880386.jpg';
const imgDairy = '/src/assets/images/grocery_dairy_bakery_1795318881680.jpg';
const imgBev = '/src/assets/images/grocery_beverages_snacks_1795318880931.jpg';
const imgPantry = '/src/assets/images/grocery_pantry_home_1795318880906.jpg';
const imgProductPending = '';

const CATEGORIES_INDIA = [
  ['Fresh Vegetables', 'vegetables', 'Daily farm-fresh Indian sabzi, leafy greens & roots', imgProduce, 1],
  ['Fresh Fruits', 'fruits', 'Seasonal Indian orchard mangoes, bananas, pomegranates & apples', imgProduce, 2],
  ['Dairy, Paneer & Eggs', 'dairy', 'Fresh milk, malai paneer, dahi, desi ghee, butter & eggs', imgDairy, 3],
  ['Atta, Rice & Dal', 'atta-rice-dal', 'Chakki fresh atta, basmati rice, toor dal, moong & rajma', imgPantry, 4],
  ['Spices & Masalas', 'spices-masalas', 'Pure haldi, Kashmiri mirch, garam masala & whole spices', imgPantry, 5],
  ['Oils, Ghee & Staples', 'oils-ghee', 'Cold-pressed mustard oil, cow ghee, sugar & rock salt', imgPantry, 6],
  ['Bakery & Breakfast', 'bakery-breakfast', 'Soft breads, poha, oats, idli batter & corn flakes', imgDairy, 7],
  ['Tea, Coffee & Drinks', 'tea-coffee-drinks', 'Assam CTC chai, filter coffee, lassi, coconut water & juices', imgBev, 8],
  ['Snacks & Biscuits', 'snacks-biscuits', 'Bhujia, makhana, Marie & butter biscuits, namkeen & dark chocolate', imgBev, 9],
  ['Home & Personal Care', 'home-personal-care', 'Dishwash, detergent, bathing soap, toothpaste & daily hygiene', imgPantry, 10],
] as const;

type SeedProduct = readonly [
  slug: string,
  sku: string,
  name: string,
  brand: string,
  unit: string,
  desc: string,
  price: number,
  disc: number,
  rating: number,
  rCount: number,
  feat: number,
  trend: number,
  best: number,
  imgUrl: string,
  qty: number
];

// 100 Everyday Indian Basic Grocery Essentials priced in INR (10 categories x 10 products)
const INDIA_100_PRODUCTS: SeedProduct[] = [
  // 1. Fresh Vegetables (10)
  ['vegetables', 'IN-VEG-001', 'Fresh Red Onions (Pyaz)', 'FreshFarm Bharat', '1 kg', 'Handpicked Nasik red onions essential for everyday tadka and curries.', 44, 10, 4.8, 340, 1, 1, 1, imgProductPending, 120],
  ['vegetables', 'IN-VEG-002', 'Desi Vine Tomatoes (Tamatar)', 'FreshFarm Bharat', '1 kg', 'Plump, juicy red tomatoes for gravies, dals, and rasam.', 38, 0, 4.7, 290, 1, 1, 1, imgProductPending, 110],
  ['vegetables', 'IN-VEG-003', 'New Crop Potatoes (Aloo)', 'FreshFarm Bharat', '1 kg', 'Clean, thin-skinned Agria & Jyoti potatoes for sabzi and paratha.', 34, 5, 4.8, 410, 1, 0, 1, imgProductPending, 150],
  ['vegetables', 'IN-VEG-004', 'Fresh Green Coriander (Dhaniya)', 'Mandya Organics', '100 g', 'Aromatic garden-fresh dhaniya leaves washed and bundled.', 18, 0, 4.9, 265, 0, 1, 1, imgProductPending, 85],
  ['vegetables', 'IN-VEG-005', 'Green Chillies & Ginger Combo', 'FreshFarm Bharat', '250 g', 'Fiery Guntur green chillies paired with aromatic fresh adrak.', 36, 0, 4.7, 198, 0, 0, 1, imgProductPending, 90],
  ['vegetables', 'IN-VEG-006', 'Tender Lady Finger (Bhindi)', 'Mandya Organics', '500 g', 'Young, snap-fresh green bhindi ideal for crispy bhindi masala.', 42, 8, 4.6, 154, 0, 1, 0, imgProductPending, 65],
  ['vegetables', 'IN-VEG-007', 'Baby Spinach Bunch (Palak)', 'Mandya Organics', '250 g', 'Hydro-washed tender palak leaves rich in iron for palak paneer.', 29, 0, 4.8, 224, 1, 0, 1, imgProductPending, 75],
  ['vegetables', 'IN-VEG-008', 'Fresh Cauliflower (Phool Gobhi)', 'FreshFarm Bharat', '1 pc (~600 g)', 'Tight creamy white gobhi florets free of blemishes.', 48, 10, 4.6, 132, 0, 0, 0, imgProductPending, 55],
  ['vegetables', 'IN-VEG-009', 'Red Carrot (Desi Gajar)', 'FreshFarm Bharat', '500 g', 'Sweet, crunchy red winter carrots for halwa, salads, and pulao.', 35, 0, 4.8, 178, 0, 1, 0, imgProductPending, 80],
  ['vegetables', 'IN-VEG-010', 'Desi Cucumber & Lemon Pack', 'FreshFarm Bharat', '500 g + 4 pcs', 'Crisp green kheera and juicy kagzi nimbu for daily salad & shikanji.', 45, 5, 4.7, 162, 0, 0, 1, imgProductPending, 95],

  // 2. Fresh Fruits (10)
  ['fruits', 'IN-FRT-011', 'Yelakki Bananas (Small Sweet)', 'Sahyadri Farms', '500 g (6-8 pcs)', 'Naturally ripened aromatic small Yelakki bananas rich in potassium.', 56, 8, 4.9, 315, 1, 1, 1, imgProductPending, 95],
  ['fruits', 'IN-FRT-012', 'Kashmiri Royal Apples', 'Himachal Harvest', '1 kg (5-6 pcs)', 'Crisp, honey-sweet mountain apples waxed zero-chemical.', 185, 12, 4.8, 240, 1, 1, 1, imgProductPending, 72],
  ['fruits', 'IN-FRT-013', 'Fresh Pomegranate (Anar)', 'Solapur Gold', '500 g (2-3 pcs)', 'Ruby-red Bhagwa anar bursting with sweet antioxidant-rich arils.', 119, 10, 4.8, 189, 1, 0, 1, imgProductPending, 64],
  ['fruits', 'IN-FRT-014', 'Nagpur Sweet Oranges (Santra)', 'Sahyadri Farms', '1 kg', 'Easy-peel tangy-sweet citrus segments straight from Nagpur orchards.', 89, 5, 4.7, 146, 0, 1, 0, imgProductPending, 70],
  ['fruits', 'IN-FRT-015', 'Ripe Red Papaya (Papita)', 'FreshFarm Bharat', '1 pc (~900 g)', 'Digestive fiber-rich sweet red papaya ready to slice.', 62, 0, 4.6, 118, 0, 0, 1, imgProductPending, 50],
  ['fruits', 'IN-FRT-016', 'Seedless Green Grapes', 'Nashik Vines', '500 g', 'Crunchy sweet Sonaka seedless green grapes in ventilated punnet.', 78, 10, 4.7, 165, 0, 1, 0, imgProductPending, 58],
  ['fruits', 'IN-FRT-017', 'Sweet Guava (Amrood)', 'Allahabad Greens', '500 g', 'Pink-fleshed fragrant guavas rich in Vitamin C.', 54, 0, 4.6, 94, 0, 0, 0, imgProductPending, 60],
  ['fruits', 'IN-FRT-018', 'Kiran Watermelon (Tarbooz)', 'FreshFarm Bharat', '1 pc (~2.2 kg)', 'Sweet deep-red hydrating summer watermelon chilled at hub.', 79, 12, 4.8, 205, 1, 1, 0, imgProductPending, 48],
  ['fruits', 'IN-FRT-019', 'Sweet Lime (Mosambi)', 'FreshFarm Bharat', '1 kg', 'Mild, low-acid mosambi ideal for fresh home-pressed juice.', 84, 0, 4.7, 134, 0, 0, 1, imgProductPending, 66],
  ['fruits', 'IN-FRT-020', 'Tender Coconut (Nariyal Pani)', 'Pollachi Fresh', '2 pcs', 'Naturally sweet hydrating coconut water sealed in green shell.', 110, 8, 4.9, 274, 1, 1, 1, imgProductPending, 84],

  // 3. Dairy, Paneer & Eggs (10)
  ['dairy', 'IN-DRY-021', 'Amul Taaza Toned Fresh Milk', 'Amul', '1 Litre', 'Everyday hygienic pasteurized toned milk with 3% milkfat.', 56, 0, 4.9, 680, 1, 1, 1, imgProductPending, 160],
  ['dairy', 'IN-DRY-022', 'Amul Gold Full Cream Milk', 'Amul', '1 Litre', 'Rich creamy 6% fat full-cream milk ideal for chai, kheer & dahi.', 68, 0, 4.9, 540, 1, 1, 1, imgProductPending, 130],
  ['dairy', 'IN-DRY-023', 'Amul Fresh Malai Paneer', 'Amul', '200 g', 'Soft, pillowy fresh cottage cheese block ready for curries & tikka.', 92, 5, 4.9, 490, 1, 1, 1, imgProductPending, 110],
  ['dairy', 'IN-DRY-024', 'Mother Dairy Classic Dahi', 'Mother Dairy', '400 g', 'Thick, creamy homestyle curd set with live probiotic cultures.', 38, 0, 4.8, 395, 1, 0, 1, imgProductPending, 125],
  ['dairy', 'IN-DRY-025', 'Amul Pasteurised Table Butter', 'Amul', '100 g', 'Utterly butterly delicious salted Indian breakfast butter.', 58, 0, 4.9, 620, 1, 1, 1, imgProductPending, 145],
  ['dairy', 'IN-DRY-026', 'Amul Cheese Cubes Pack', 'Amul', '200 g (8 cubes)', 'Savory cheddar cheese cubes great for parathas, sandwiches & pasta.', 135, 6, 4.8, 310, 0, 1, 1, imgProductPending, 90],
  ['dairy', 'IN-DRY-027', 'Farm Fresh White Eggs', 'Keggs Farms', '12 pcs', 'Clean, protein-rich farm eggs packed in protective pulp tray.', 96, 5, 4.8, 412, 1, 0, 1, imgProductPending, 115],
  ['dairy', 'IN-DRY-028', 'Mother Dairy Mishti Doi', 'Mother Dairy', '400 g', 'Traditional caramelized Bengali sweet curd in chilled tub.', 75, 0, 4.7, 164, 0, 1, 0, imgProductPending, 54],
  ['dairy', 'IN-DRY-029', 'Epigamia Natural Greek Yogurt', 'Epigamia', '400 g', 'High-protein strained natural dahi with zero added sugar.', 115, 10, 4.7, 142, 0, 0, 0, imgProductPending, 45],
  ['dairy', 'IN-DRY-030', 'Milky Mist Fresh Cream', 'Milky Mist', '250 ml', 'Smooth rich cooking cream for dal makhani, malai kofta & desserts.', 72, 0, 4.8, 215, 0, 0, 1, imgProductPending, 68],

  // 4. Atta, Rice & Dal (10)
  ['atta-rice-dal', 'IN-ARD-031', 'Aashirvaad Shudh Chakki Atta', 'Aashirvaad', '5 kg', '100% whole wheat chakki-ground atta for soft fluffy rotis.', 265, 8, 4.9, 780, 1, 1, 1, imgProductPending, 140],
  ['atta-rice-dal', 'IN-ARD-032', 'Aashirvaad Multigrain Atta', 'Aashirvaad', '5 kg', 'Nutritious blend of wheat, soya, channa, oats, maize & barley.', 325, 10, 4.8, 430, 1, 0, 1, imgProductPending, 85],
  ['atta-rice-dal', 'IN-ARD-033', 'India Gate Classic Basmati Rice', 'India Gate', '5 kg', '2-year aged extra-long slender pearl-white aromatic basmati rice.', 649, 14, 4.9, 590, 1, 1, 1, imgProductPending, 90],
  ['atta-rice-dal', 'IN-ARD-034', 'Daawat Rozana Super Basmati', 'Daawat', '5 kg', 'Everyday aged basmati rice with fluffy non-sticky grains.', 449, 10, 4.8, 420, 0, 1, 1, imgProductPending, 105],
  ['atta-rice-dal', 'IN-ARD-035', 'Sona Masoori Raw Steam Rice', '24 Mantra', '5 kg', 'Lightweight aromatic South Indian rice perfect for daily meals & pongal.', 359, 8, 4.8, 312, 0, 0, 1, imgProductPending, 96],
  ['atta-rice-dal', 'IN-ARD-036', 'Tata Sampann Unpolished Toor Dal', 'Tata Sampann', '1 kg', 'Naturally protein-rich unpolished arhar dal with zero artificial polish.', 189, 10, 4.9, 510, 1, 1, 1, imgProductPending, 135],
  ['atta-rice-dal', 'IN-ARD-037', 'Tata Sampann Moong Dal Yellow', 'Tata Sampann', '1 kg', 'Quick-cooking split yellow moong dal ideal for khichdi & tadka.', 158, 6, 4.8, 345, 0, 0, 1, imgProductPending, 110],
  ['atta-rice-dal', 'IN-ARD-038', 'Tata Sampann Masoor Dal Red', 'Tata Sampann', '1 kg', 'Unpolished pink-red lentils rich in plant protein and fiber.', 142, 5, 4.7, 228, 0, 0, 0, imgProductPending, 92],
  ['atta-rice-dal', 'IN-ARD-039', 'Tata Sampann Chana Dal', 'Tata Sampann', '1 kg', 'Wholesome split Bengal gram for tadka, puran poli & laddoo.', 118, 0, 4.8, 260, 0, 0, 1, imgProductPending, 100],
  ['atta-rice-dal', 'IN-ARD-040', 'Rajdhani Fine Besan (Gram Flour)', 'Rajdhani', '1 kg', 'Pure chana dal besan milled fine for pakodas, kadhi & chilla.', 108, 8, 4.8, 295, 0, 1, 1, imgProductPending, 115],

  // 5. Spices & Masalas (10)
  ['spices-masalas', 'IN-SPC-041', 'Everest Haldi (Turmeric) Powder', 'Everest', '200 g', 'Vibrant high-curcumin Salem turmeric powder sealed for aroma.', 64, 5, 4.9, 440, 1, 0, 1, imgProductPending, 120],
  ['spices-masalas', 'IN-SPC-042', 'Everest Tikhalal Chilli Powder', 'Everest', '200 g', 'Bold bright-red fiery chilli powder for vibrant tadka colour.', 88, 6, 4.8, 390, 1, 1, 1, imgProductPending, 110],
  ['spices-masalas', 'IN-SPC-043', 'Tata Sampann Coriander Powder', 'Tata Sampann', '200 g', 'Slow-ground whole dhaniya seeds preserving essential natural oils.', 62, 0, 4.8, 310, 0, 0, 1, imgProductPending, 105],
  ['spices-masalas', 'IN-SPC-044', 'MDH Garam Masala Blend', 'MDH', '100 g', 'Classic warm Indian spice mix of clove, cinnamon, cardamom & pepper.', 92, 5, 4.9, 520, 1, 1, 1, imgProductPending, 130],
  ['spices-masalas', 'IN-SPC-045', 'Whole Cumin Seeds (Jeera)', 'Tata Sampann', '200 g', 'Aromatic bold-grade Unjha jeera seeds for tempering & masala.', 135, 8, 4.8, 355, 0, 1, 1, imgProductPending, 98],
  ['spices-masalas', 'IN-SPC-046', 'Black Mustard Seeds (Rai)', 'Everest', '200 g', 'Crisp popping rai seeds essential for South & West Indian tempering.', 42, 0, 4.7, 215, 0, 0, 1, imgProductPending, 115],
  ['spices-masalas', 'IN-SPC-047', 'Everest Pav Bhaji Masala', 'Everest', '100 g', 'Authentic Mumbai-style aromatic spice mix for street-style pav bhaji.', 84, 5, 4.8, 280, 0, 1, 0, imgProductPending, 85],
  ['spices-masalas', 'IN-SPC-048', 'MDH Kitchen King Masala', 'MDH', '100 g', 'All-purpose rich curry masala for paneer, mix veg & gravy dishes.', 86, 5, 4.8, 340, 1, 0, 1, imgProductPending, 95],
  ['spices-masalas', 'IN-SPC-049', 'Catch Black Pepper Powder', 'Catch', '100 g', 'Pungent aromatic Tellicherry kali mirch in moisture-lock pack.', 112, 8, 4.8, 205, 0, 0, 0, imgProductPending, 72],
  ['spices-masalas', 'IN-SPC-050', 'Everest Hing (Asafoetida)', 'Everest', '50 g', 'Strong aromatic compounded hing jar a pinch away from flavourful dal.', 105, 0, 4.9, 290, 0, 0, 1, imgProductPending, 88],

  // 6. Oils, Ghee & Staples (10)
  ['oils-ghee', 'IN-OIL-051', 'Fortune Sunlite Sunflower Oil', 'Fortune', '1 Litre', 'Light, heart-friendly refined sunflower oil enriched with Vitamins A & D.', 142, 6, 4.8, 610, 1, 1, 1, imgProductPending, 145],
  ['oils-ghee', 'IN-OIL-052', 'Fortune Kachi Ghani Mustard Oil', 'Fortune', '1 Litre', 'Cold-pressed pungent sarson oil ideal for North & East Indian cooking.', 168, 8, 4.9, 540, 1, 1, 1, imgProductPending, 125],
  ['oils-ghee', 'IN-OIL-053', 'Amul Pure Desi Ghee', 'Amul', '1 Litre', 'Rich granular pure milkfat ghee with authentic traditional aroma.', 625, 8, 4.9, 710, 1, 1, 1, imgProductPending, 90],
  ['oils-ghee', 'IN-OIL-054', 'Patanjali Pure Cow Ghee', 'Patanjali', '500 ml', 'Golden cow ghee crafted for daily rotis, khichdi, and puja.', 335, 5, 4.8, 380, 0, 0, 1, imgProductPending, 85],
  ['oils-ghee', 'IN-OIL-055', 'Saffola Gold Blended Oil', 'Saffola', '1 Litre', 'Dual-seed rice bran and corn oil with LoSorb technology.', 178, 10, 4.8, 410, 0, 1, 1, imgProductPending, 95],
  ['oils-ghee', 'IN-OIL-056', 'Tata Salt Iodised Crystal Salt', 'Tata', '1 kg', 'Vacuum evaporated pure white free-flowing iodised daily cooking salt.', 28, 0, 4.9, 980, 1, 1, 1, imgProductPending, 220],
  ['oils-ghee', 'IN-OIL-057', 'Madhur Pure Sulphurless Sugar', 'Madhur', '1 kg', 'Sparkling fine white cane sugar hygienically packed.', 58, 0, 4.8, 520, 0, 0, 1, imgProductPending, 160],
  ['oils-ghee', 'IN-OIL-058', '24 Mantra Organic Jaggery (Gud)', '24 Mantra', '500 g', 'Chemical-free traditional cane jaggery block rich in minerals.', 74, 8, 4.8, 215, 0, 1, 0, imgProductPending, 80],
  ['oils-ghee', 'IN-OIL-059', 'Tata Himalayan Pink Salt', 'Tata', '1 kg', 'Pure mineral-rich sendha namak crystals for cooking & fasting.', 105, 10, 4.8, 240, 0, 0, 0, imgProductPending, 75],
  ['oils-ghee', 'IN-OIL-060', 'Dabur Pure Honey Squeeze Pack', 'Dabur', '400 g', '100% pure natural honey NMR-tested for morning warm water & toast.', 198, 12, 4.8, 430, 1, 1, 1, imgProductPending, 88],

  // 7. Bakery & Breakfast (10)
  ['bakery-breakfast', 'IN-BKB-061', 'Harvest Gold 100% Whole Wheat Bread', 'Harvest Gold', '450 g', 'Soft daily sandwich bread baked fresh with whole wheat flour.', 55, 0, 4.8, 460, 1, 1, 1, imgProductPending, 95],
  ['bakery-breakfast', 'IN-BKB-062', 'Britannia Milk Bread Family Loaf', 'Britannia', '400 g', 'Milky soft white bread slices great for butter toast and sandwiches.', 50, 0, 4.8, 415, 0, 0, 1, imgProductPending, 110],
  ['bakery-breakfast', 'IN-BKB-063', 'Fresh Soft Burger Buns & Pav', 'Modern Bakery', '250 g (6 pcs)', 'Fluffy ladi pav buns ready for hot vada pav or pav bhaji.', 38, 0, 4.7, 290, 0, 1, 1, imgProductPending, 85],
  ['bakery-breakfast', 'IN-BKB-064', 'iD Fresh Idli & Dosa Batter', 'iD Fresh', '1 kg', 'Stone-ground preservative-free rice and urad dal batter.', 89, 6, 4.9, 530, 1, 1, 1, imgProductPending, 100],
  ['bakery-breakfast', 'IN-BKB-065', 'Tata Sampann Thick Poha', 'Tata Sampann', '500 g', 'Clean crispy medium-thick flattened rice flakes for morning kanda poha.', 48, 0, 4.8, 340, 0, 0, 1, imgProductPending, 120],
  ['bakery-breakfast', 'IN-BKB-066', 'Quaker Rolled Oats Pouch', 'Quaker', '1 kg', '100% natural wholegrain oats rich in soluble fiber.', 185, 12, 4.8, 410, 1, 1, 1, imgProductPending, 90],
  ['bakery-breakfast', 'IN-BKB-067', 'Kelloggs Corn Flakes Original', 'Kelloggs', '475 g', 'Golden crunchy corn flakes fortified with B vitamins and iron.', 195, 10, 4.7, 315, 0, 0, 1, imgProductPending, 75],
  ['bakery-breakfast', 'IN-BKB-068', 'MTR Instant Rava Idli Mix', 'MTR', '500 g', 'Balanced semolina and spice mix for fluffy breakfast idlis in minutes.', 115, 8, 4.7, 210, 0, 0, 0, imgProductPending, 68],
  ['bakery-breakfast', 'IN-BKB-069', 'Kissan Mixed Fruit Jam', 'Kissan', '500 g', 'Kids-favourite sweet spread crafted from 8 real fruit pulps.', 165, 5, 4.8, 390, 0, 1, 1, imgProductPending, 82],
  ['bakery-breakfast', 'IN-BKB-070', 'Pintola All Natural Peanut Butter', 'Pintola', '350 g', 'Creamy 100% roasted peanuts with zero hydrogenated oil or sugar.', 149, 10, 4.9, 340, 1, 1, 0, imgProductPending, 76],

  // 8. Tea, Coffee & Drinks (10)
  ['tea-coffee-drinks', 'IN-BEV-071', 'Tata Tea Gold Assam Chai', 'Tata Tea', '500 g', 'Rich Assam CTC granules blended with long aromatic tea leaves.', 285, 8, 4.9, 640, 1, 1, 1, imgProductPending, 120],
  ['tea-coffee-drinks', 'IN-BEV-072', 'Red Label Masala Chai Pack', 'Brooke Bond', '500 g', 'Flavoured with 5 Ayurvedic herbs — tulsi, cardamom, ginger, clove & ashwagandha.', 295, 10, 4.8, 490, 1, 0, 1, imgProductPending, 105],
  ['tea-coffee-drinks', 'IN-BEV-073', 'Bru Instant Roast Coffee Jar', 'Bru', '100 g', 'Aromatic Arabica & Robusta chicory coffee blend for hot & cold coffee.', 215, 10, 4.8, 420, 1, 1, 1, imgProductPending, 85],
  ['tea-coffee-drinks', 'IN-BEV-074', 'Nescafe Classic Instant Coffee', 'Nescafe', '90 g', '100% pure freeze-dried roasted coffee beans in glass jar.', 299, 8, 4.9, 510, 1, 1, 1, imgProductPending, 78],
  ['tea-coffee-drinks', 'IN-BEV-075', 'Amul Masti Spiced Chaas', 'Amul', '1 Litre', 'Cooling jeera and pudina flavoured Indian buttermilk in tetrapack.', 72, 0, 4.8, 360, 0, 1, 1, imgProductPending, 115],
  ['tea-coffee-drinks', 'IN-BEV-076', 'Paper Boat Aamras Mango Drink', 'Paper Boat', '1 Litre', 'Thick velvety Alphonso mango nectar crafted with zero preservatives.', 115, 10, 4.8, 295, 0, 1, 0, imgProductPending, 80],
  ['tea-coffee-drinks', 'IN-BEV-077', 'Real Activ 100% Pomegranate Juice', 'Real', '1 Litre', 'No-added-sugar pure fruit juice packed chilled.', 135, 8, 4.7, 230, 0, 0, 1, imgProductPending, 70],
  ['tea-coffee-drinks', 'IN-BEV-078', 'Lipton Honey Lemon Green Tea', 'Lipton', '25 Tea Bags', 'Light zero-calorie soothing antioxidant green tea bags.', 165, 10, 4.8, 310, 0, 0, 1, imgProductPending, 88],
  ['tea-coffee-drinks', 'IN-BEV-079', 'Bournvita Health Drink Pouch', 'Cadbury', '500 g', 'Malted chocolate nutrition drink fortified with Vitamin D & calcium.', 235, 8, 4.8, 390, 0, 0, 1, imgProductPending, 92],
  ['tea-coffee-drinks', 'IN-BEV-080', 'Bisleri Mineral Water Case', 'Bisleri', '6 x 1 Litre', 'Safe crisp drinking water with added minerals for home & travel.', 114, 0, 4.9, 520, 0, 1, 1, imgProductPending, 135],

  // 9. Snacks & Biscuits (10)
  ['snacks-biscuits', 'IN-SNK-081', 'Maggi 2-Minute Masala Noodles', 'Nestle Maggi', '560 g (8-Pack)', 'Indias iconic spiced instant noodles made in 2 minutes.', 112, 0, 4.9, 920, 1, 1, 1, imgProductPending, 180],
  ['snacks-biscuits', 'IN-SNK-082', 'Parle-G Original Gluco Biscuits', 'Parle', '800 g Family', 'Classic golden-baked tea-time glucose biscuit pack.', 85, 0, 4.9, 840, 1, 0, 1, imgProductPending, 175],
  ['snacks-biscuits', 'IN-SNK-083', 'Britannia Good Day Cashew', 'Britannia', '600 g', 'Rich butter cookies studded with crunchy roasted cashew bits.', 135, 10, 4.8, 530, 1, 1, 1, imgProductPending, 120],
  ['snacks-biscuits', 'IN-SNK-084', 'Haldirams Aloo Bhujia Pouch', 'Haldirams', '400 g', 'Crispy tangy gram & potato vermicelli namkeen.', 105, 5, 4.8, 495, 1, 1, 1, imgProductPending, 130],
  ['snacks-biscuits', 'IN-SNK-085', 'Haldirams Khatta Meetha Mix', 'Haldirams', '400 g', 'Sweet and tangy crunchy teatime farsan mix.', 98, 0, 4.7, 310, 0, 0, 1, imgProductPending, 105],
  ['snacks-biscuits', 'IN-SNK-086', 'Britannia NutriChoice Digestive', 'Britannia', '500 g', 'High-fiber whole wheat atta digestive biscuits for mindful snacking.', 118, 8, 4.8, 370, 0, 1, 0, imgProductPending, 95],
  ['snacks-biscuits', 'IN-SNK-087', 'Lays Indias Magic Masala Chips', 'Lays', '90 g Jumbo', 'Crispy kettle-thin potato wafers coated in signature Indian masala.', 48, 0, 4.8, 610, 0, 1, 1, imgProductPending, 160],
  ['snacks-biscuits', 'IN-SNK-088', 'Roasted Makhana (Fox Nuts)', 'Farmley', '100 g', 'Crunchy slow-roasted Himalayan pink-salt puffed lotus seeds.', 149, 12, 4.8, 225, 1, 1, 0, imgProductPending, 72],
  ['snacks-biscuits', 'IN-SNK-089', 'Whole California Almonds (Badam)', 'Happilo', '250 g', 'Premium non-pareil raw whole almonds packed fresh.', 265, 14, 4.9, 440, 1, 0, 1, imgProductPending, 86],
  ['snacks-biscuits', 'IN-SNK-090', 'Amul 55% Dark Chocolate Bar', 'Amul', '150 g', 'Smooth bittersweet single-origin Indian dark chocolate bar.', 115, 0, 4.8, 345, 0, 1, 1, imgProductPending, 110],

  // 10. Home & Personal Care (10)
  ['home-personal-care', 'IN-HPC-091', 'Vim Lemon Dishwash Gel', 'Vim', '750 ml', 'Concentrated lime grease-cutter gel gentle on hands and tough on masala stains.', 169, 10, 4.9, 590, 1, 1, 1, imgProductPending, 130],
  ['home-personal-care', 'IN-HPC-092', 'Surf Excel Easy Wash Detergent', 'Surf Excel', '1.5 kg', 'Fast-dissolving stain removal washing powder for machine & bucket wash.', 215, 8, 4.9, 640, 1, 1, 1, imgProductPending, 120],
  ['home-personal-care', 'IN-HPC-093', 'Harpic Power Plus Toilet Cleaner', 'Harpic', '1 Litre', 'Thick disinfectant liquid formula eliminating 99.9% germs and limescale.', 195, 10, 4.8, 480, 0, 0, 1, imgProductPending, 95],
  ['home-personal-care', 'IN-HPC-094', 'Lizol Citrus Floor Cleaner', 'Lizol', '1 Litre', '10X cleaning & germ kill disinfectant surface cleaner with citrus freshness.', 209, 10, 4.8, 430, 0, 1, 1, imgProductPending, 90],
  ['home-personal-care', 'IN-HPC-095', 'Dettol Original Bathing Soap', 'Dettol', '4 x 125 g Pack', 'Trusted everyday antibacterial bathing soap with pine freshness.', 172, 6, 4.8, 520, 1, 0, 1, imgProductPending, 115],
  ['home-personal-care', 'IN-HPC-096', 'Colgate Strong Teeth Toothpaste', 'Colgate', '200 g Saver', 'Amino Shakti calcium-boost toothpaste for daily enamel care.', 118, 5, 4.9, 690, 1, 1, 1, imgProductPending, 140],
  ['home-personal-care', 'IN-HPC-097', 'Dove Intense Repair Shampoo', 'Dove', '340 ml', 'Keratin-active nourishing shampoo for soft smooth hair.', 269, 12, 4.8, 355, 0, 1, 0, imgProductPending, 78],
  ['home-personal-care', 'IN-HPC-098', 'Parachute 100% Pure Coconut Oil', 'Parachute', '300 ml', 'Untouched pure roasted-coconut hair & wellness oil bottle.', 135, 0, 4.9, 510, 0, 0, 1, imgProductPending, 125],
  ['home-personal-care', 'IN-HPC-099', 'Origami Soft Facial Tissue Box', 'Origami', '200 Pulls (2-Ply)', 'Ultra-soft virgin pulp facial tissues for home, kitchen, and car.', 99, 10, 4.7, 210, 0, 0, 0, imgProductPending, 105],
  ['home-personal-care', 'IN-HPC-100', 'Scotch-Brite Scrub Pad Saver', 'Scotch-Brite', '3 Pack', 'Long-lasting nylon green scrub pads for daily kitchen utensil cleaning.', 72, 0, 4.8, 390, 0, 0, 1, imgProductPending, 145],
];

function seedInitialData() {
  db.prepare(`INSERT OR IGNORE INTO roles (name) VALUES ('CUSTOMER'), ('ADMIN')`).run();

  const catCount = (db.prepare(`SELECT COUNT(*) as c FROM categories`).get() as { c: number }).c;
  const prodCount = (db.prepare(`SELECT COUNT(*) as c FROM products`).get() as { c: number }).c;
  const hasOldCatalog = Boolean(db.prepare(`SELECT id FROM products WHERE sku = 'FC-FRT-01'`).get());

  // Migrate old US-$ catalog cleanly to the 100 INR Indian daily basic catalog
  if (hasOldCatalog || prodCount < 100 || catCount < 10) {
    db.transaction(() => {
      // Remove orphan references only if replacing legacy seed catalog
      if (hasOldCatalog) {
        db.exec(`
          DELETE FROM cart_items;
          DELETE FROM wishlist_items;
          DELETE FROM order_items;
          DELETE FROM orders;
          DELETE FROM reviews;
          DELETE FROM product_images;
          DELETE FROM inventory;
          DELETE FROM products;
          DELETE FROM categories;
        `);
      }

      const insertCat = db.prepare(
        `INSERT OR IGNORE INTO categories (name, slug, description, image_url, display_order) VALUES (?, ?, ?, ?, ?)`
      );
      for (const c of CATEGORIES_INDIA) {
        insertCat.run(...c);
      }

      const catRows = db.prepare(`SELECT id, slug FROM categories`).all() as { id: number; slug: string }[];
      const catMap = new Map(catRows.map((c) => [c.slug, c.id]));

      const insertProd = db.prepare(`
        INSERT OR IGNORE INTO products (category_id, sku, name, brand, unit, description, price, discount_percent, rating, review_count, is_featured, is_trending, is_bestseller)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertImg = db.prepare(
        `INSERT OR IGNORE INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, 1, 0)`
      );
      const insertInv = db.prepare(
        `INSERT OR IGNORE INTO inventory (product_id, quantity, low_stock_threshold) VALUES (?, ?, 10)`
      );

      for (const item of INDIA_100_PRODUCTS) {
        const [slug, sku, name, brand, unit, desc, price, disc, rating, rCount, feat, trend, best, imgUrl, qty] = item;
        const catId = catMap.get(slug);
        if (!catId) continue;
        const res = insertProd.run(catId, sku, name, brand, unit, desc, price, disc, rating, rCount, feat, trend, best);
        if (res.changes > 0) {
          const pid = Number(res.lastInsertRowid);
          insertImg.run(pid, imgUrl);
          insertInv.run(pid, qty);
        }
      }
    })();
  }

  // Ensure INR coupons exist (and replace old USD coupon codes if still present)
  const hasOldCoupon = Boolean(db.prepare(`SELECT id FROM coupons WHERE code = 'SAVE5'`).get());
  if (hasOldCoupon) {
    db.prepare(`DELETE FROM coupons WHERE code IN ('FRESH20', 'SAVE5', 'WELCOME15', 'EXPIRED10')`).run();
  }

  const couponCount = (db.prepare(`SELECT COUNT(*) as c FROM coupons`).get() as { c: number }).c;
  if (couponCount === 0) {
    const insertCoupon = db.prepare(`
      INSERT OR IGNORE INTO coupons (code, title, description, discount_type, discount_value, min_order_amount, max_discount_amount, expires_at, is_active, usage_limit_per_user)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCoupon.run(
      'FRESH100',
      'Flat ₹100 Off Ration Basket',
      'Save instant ₹100 on monthly & daily grocery orders above ₹699.',
      'FIXED',
      100,
      699,
      100,
      '2029-12-31T23:59:59Z',
      1,
      5
    );
    insertCoupon.run(
      'DAILY15',
      '15% Off Fresh Sabzi & Dairy',
      'Save 15% on orders above ₹399 (maximum discount ₹150).',
      'PERCENTAGE',
      15,
      399,
      150,
      '2029-12-31T23:59:59Z',
      1,
      4
    );
    insertCoupon.run(
      'WELCOME20',
      '20% Off First FreshCart Order',
      'Flat 20% off your very first delivery above ₹299 (up to ₹180).',
      'FIRST_ORDER',
      20,
      299,
      180,
      '2029-12-31T23:59:59Z',
      1,
      1
    );
    insertCoupon.run(
      'MONSOON10',
      'Monsoon Saver Promo (Expired)',
      'Historical promo code for coupon expiry testing.',
      'PERCENTAGE',
      10,
      199,
      50,
      '2024-08-31T23:59:59Z',
      1,
      1
    );
  }

  seedSingleDemoCustomer();
}

export function seedSingleDemoCustomer(): number {
  const demoEmail = 'demo@freshcart.in';
  let existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(demoEmail) as { id: number } | undefined;
  if (existing) return existing.id;

  const demoPasswordHash = hashPassword(crypto.randomBytes(16).toString('hex'));
  return db.transaction(() => {
    const info = db
      .prepare(`INSERT INTO users (full_name, email, mobile, password_hash, auth_provider) VALUES (?, ?, ?, ?, 'demo')`)
      .run('Riya Sharma (Demo)', demoEmail, '9876543210', demoPasswordHash);
    const userId = Number(info.lastInsertRowid);
    const custRole = db.prepare(`SELECT id FROM roles WHERE name = 'CUSTOMER'`).get() as { id: number };
    db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`).run(userId, custRole.id);
    const cartInfo = db.prepare(`INSERT OR IGNORE INTO carts (user_id) VALUES (?)`).run(userId);
    const cartId = Number(cartInfo.lastInsertRowid);
    const wishInfo = db.prepare(`INSERT OR IGNORE INTO wishlists (user_id) VALUES (?)`).run(userId);
    const wishlistId = Number(wishInfo.lastInsertRowid);

    // Default saved address with GPS coordinates in Indiranagar, Bengaluru
    const addrRes = db
      .prepare(
        `INSERT INTO addresses (user_id, label, recipient_name, mobile, street, apartment, city, state, postal_code, lat, lng, is_default)
         VALUES (?, 'Home', 'Riya Sharma', '9876543210', '100 Feet Road, HAL 2nd Stage', 'Apt 304, Emerald Residency', 'Bengaluru', 'Karnataka', '560038', 12.9716, 77.6412, 1)`
      )
      .run(userId);
    const addrId = Number(addrRes.lastInsertRowid);

    // Preload 2 popular starter groceries into demo cart & wishlist
    const sampleProducts = db
      .prepare(`SELECT id, name, price, discount_percent FROM products WHERE is_active = 1 ORDER BY id ASC LIMIT 3`)
      .all() as Array<{ id: number; name: string; price: number; discount_percent: number }>;

    if (sampleProducts.length >= 2 && cartId) {
      db.prepare(`INSERT OR IGNORE INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, 1)`).run(cartId, sampleProducts[0].id);
      db.prepare(`INSERT OR IGNORE INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, 2)`).run(cartId, sampleProducts[1].id);
    }
    if (sampleProducts.length >= 3 && wishlistId) {
      db.prepare(`INSERT OR IGNORE INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)`).run(wishlistId, sampleProducts[2].id);
    }

    // Seed 1 sample delivered/active order with tracking for Demo Customer
    if (sampleProducts.length >= 1) {
      const p = sampleProducts[0];
      const orderNum = 'FC-DEMO-1001';
      const shippingSnap = JSON.stringify({
        label: 'Home',
        recipientName: 'Riya Sharma',
        mobile: '9876543210',
        street: '100 Feet Road, HAL 2nd Stage',
        apartment: 'Apt 304, Emerald Residency',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        lat: 12.9716,
        lng: 77.6412,
      });
      const ordRes = db
        .prepare(
          `INSERT INTO orders (order_number, user_id, address_id, shipping_snapshot, delivery_slot, subtotal, discount_amount, tax_amount, delivery_fee, total_amount, status, payment_status, payment_method)
           VALUES (?, ?, ?, ?, 'Express (20-35 mins)', 120, 0, 6, 39, 165, 'OUT_FOR_DELIVERY', 'PAID', 'UPI')`
        )
        .run(orderNum, userId, addrId, shippingSnap);
      const orderId = Number(ordRes.lastInsertRowid);
      db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
         VALUES (?, ?, ?, '', ?, 2, ?)`
      ).run(orderId, p.id, p.name, p.price, p.price * 2);

      const timeline = JSON.stringify([
        { step: 'ORDER_PLACED', label: 'Order Placed', completed: true, time: new Date(Date.now() - 20 * 60_000).toISOString() },
        { step: 'PACKING', label: 'Packing Fresh Items', completed: true, time: new Date(Date.now() - 12 * 60_000).toISOString() },
        { step: 'OUT_FOR_DELIVERY', label: 'Rider On The Way', completed: true, time: new Date(Date.now() - 4 * 60_000).toISOString() },
        { step: 'DELIVERED', label: 'Delivered at Doorstep', completed: false, time: null },
      ]);
      db.prepare(
        `INSERT INTO delivery_tracking (order_id, driver_name, current_status, progress_percent, eta_minutes, current_lat, current_lng, timeline_json)
         VALUES (?, 'Vikram Patel (Surya Crimson E-Cruiser)', 'OUT_FOR_DELIVERY', 72, 11, 12.9731, 77.6285, ?)`
      ).run(orderId, timeline);
    }

    db.prepare(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'AUTH', 'Welcome to FreshCart Demo!', 'You are signed in to the single FreshCart Demo account with saved Bengaluru GPS address, sample cart & live order tracking.')`
    ).run(userId);

    return userId;
  })();
}

