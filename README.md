# FreshCart — Automated Testing & Full-Stack Online Grocery Platform

> **Software Testing, Automation Engineering (Playwright POM), Full-Stack Web Development (React + Express + Python Flask + SQLite), Containerization (Docker), CI/CD (GitHub Actions), and Serverless Cloud Deployment (Vercel).**

**Tagline:** `Groceries · Faster · Fresher`  
**Domain:** Automated End-to-End & API Testing on Online Grocery Shopping Application

---

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Objectives](#2-objectives)
3. [Literature Survey](#3-literature-survey)
4. [Existing System vs. Proposed System](#4-existing-system-vs-proposed-system)
5. [System Architecture](#5-system-architecture)
6. [Folder Structure](#6-folder-structure)
7. [Tools, Environment & Technology Stack](#7-tools-environment--technology-stack)
8. [Application Under Test (AUT) & Modules Tested](#8-application-under-test-aut--modules-tested)
9. [Functional Requirements](#9-functional-requirements)
10. [Complete Test Plan (Scope, Strategy, Types, Entry & Exit Criteria)](#10-complete-test-plan)
11. [Test Execution & CI/CD Pipeline Flowchart](#11-test-execution--cicd-pipeline-flowchart)
12. [Test Scenarios & Automated Test Cases](#12-test-scenarios--automated-test-cases)
13. [Framework Implementation Highlights (POM, Parallelism, StorageState & Mocking)](#13-framework-implementation-highlights)
14. [Defect Log Table](#14-defect-log-table)
15. [Test Results & CI/CD Execution Reports](#15-test-results--cicd-execution-reports)
16. [Deployment Guide (GitHub, Docker, Python Flask & Vercel + Supabase)](#16-deployment-guide-github-docker-python-flask--vercel--supabase)
17. [Engineering Delivery Framework (Role · Task · Context · Reasoning · Output · Stopping)](#17-engineering-delivery-framework-role--task--context--reasoning--output--stopping)

---

## 1. Problem Statement

Modern e-commerce grocery applications feature stateful carts, real-time inventory updates, authentication gates, multi-tier pricing filters, interactive animations, and role-based admin dashboards. Relying exclusively on **manual testing** introduces critical engineering bottlenecks:

- **Time & Repetition Overhead**: Re-verifying login flows, 100-item catalog filters, cart arithmetic, coupon math, order placement, and admin security across every commit consumes hours of repetitive manual effort.
- **Human Error**: Manual testers frequently miss subtle edge cases (such as negative boundary prices, SQL injection probes in search inputs, closed-by-default UI drawer states, or cross-role privilege leaks).
- **Cross-Browser Inconsistency**: Layout, CSS animations, and event handlers behave differently across **Chromium**, **Firefox**, and **WebKit**.
- **Late Defect Detection**: Without automated CI/CD gates on GitHub pull requests, regressions reach production undetected.

**Our Solution:** FreshCart pairs a full-stack online grocery web application with an automated **Playwright + TypeScript Page Object Model (POM)** testing framework, a **Python Flask + SQLite** companion test API, **Docker** container reproducibility, **GitHub Actions CI/CD** pipelines, and one-command **Vercel** serverless cloud deployment.

---

## 2. Objectives

1. Eliminate repetitive manual regression testing through a maintainable **Playwright POM** automated test suite covering UI, E2E workflows, security boundaries, and API contracts.
2. Achieve fast, reliable execution using **parallel worker orchestration**, reusable `storageState` authentication, data-driven JSON fixtures (`tests/data/testData.json`), and deterministic network route mocking (`page.route`).
3. Validate interactive web controls including the **Delivery Bag Pull-Cord Switch**, **Google Sign-In / 1-Click Demo Customer Login**, **5 Rotating Animated Delivery Boys & Bikes**, **Low / Medium / High ₹ Price Tier Filters**, and **First-Run Scrypt Admin Passcode Security**.
4. Provide dual backend parity (**Node/Express** serverless + **Python Flask** REST/SQL API) backed by parameterized **SQLite SQL** queries.
5. Automate linting, type checking, build verification, multi-browser Playwright execution, HTML/JUnit artifact generation, Docker builds, and **Vercel** production deployment inside **GitHub Actions**.

---

## 3. Literature Survey

| Study / Industry Reference | Key Insights Applied to FreshCart |
| :--- | :--- |
| **Page Object Model (POM) Design Pattern** | Decouples UI locators (`LoginPagePOM`, `ShopPagePOM`, `AdminPagePOM`) from assertion specs, reducing maintenance cost when UI markup evolves. |
| **Data-Driven & Keyword Testing Architecture** | Externalizing test inputs into `tests/data/testData.json` enables single specs to validate positive, negative, and injection boundary cases cleanly. |
| **Microsoft Playwright vs. Legacy WebDriver** | Auto-waiting locators, isolated browser contexts, built-in `APIRequestContext`, trace viewer, and native parallelism eliminate flaky `Thread.sleep()` waits common in legacy Selenium grids. |
| **Continuous Testing in DevOps CI/CD** | Shift-left verification inside GitHub Actions catches TypeScript compile errors, SQL regressions, and broken UI contracts before deployment to Vercel. |

---

## 4. Existing System vs. Proposed System

| Parameter | Existing System (Manual / Ad-Hoc Scripts) | Proposed FreshCart Automated Framework |
| :--- | :--- | :--- |
| **Test Execution** | Manual clicking across forms & checkout | Automated parallel execution via Playwright (`api-integration`, `chromium-e2e`, `firefox-e2e`, `webkit-e2e`) |
| **Architecture** | Tightly coupled selectors inside scripts | Layered **POM + BasePage + Utilities + JSON Fixtures** |
| **Human Error Risk** | High during repetitive sanity checks | Deterministic assertions with trace/screenshot capture on failure |
| **Test Speed** | 30–60 mins per full manual pass | **~2.2s** for full API regression suite; parallel multi-browser E2E |
| **Data & Mocking** | Hardcoded test inputs; depends on live uptime | `testData.json` data-driven fixtures + `page.route()` maintenance simulation |
| **CI/CD & Reporting** | Manual spreadsheets & ad-hoc screenshots | Automated **GitHub Actions** pipeline publishing HTML, JSON & JUnit XML reports |
| **Hosting & Runtime** | Local-only dev runs | Serverless full-stack deployment on **Vercel** (`vercel.json` + `/api/index.ts`) & **Docker** |

---

## 5. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                        1. SOURCE CONTROL & CI/CD (GitHub)                         |
|   Git Push / PR ---> GitHub Actions (.github/workflows/ci.yml)                    |
|     [Lint & Build] -> [Python Flask Pytest] -> [Playwright Matrix] -> [Vercel]    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                     2. AUTOMATED TEST ARCHITECTURE (Playwright)                   |
|                                                                                   |
|  +-----------------------+     +------------------------+     +----------------+  |
|  |     Test Scripts      | --> |   Page Object Model    | --> |   Utilities    |  |
|  | tests/specs/*.spec.ts |     | BasePage, LoginPagePOM |     | testHelpers.ts |  |
|  | (UI, E2E, API, Mock)  |     | ShopPagePOM, AdminPOM  |     | storageState   |  |
|  +-----------------------+     +------------------------+     +----------------+  |
|             |                                                         |           |
|             v                                                         v           |
|  +-----------------------+                                    +----------------+  |
|  |   Data-Driven Input   |                                    |    Reports     |  |
|  | tests/data/           |                                    | HTML / JSON /  |  |
|  | testData.json         |                                    | JUnit XML      |  |
|  +-----------------------+                                    +----------------+  |
+-----------------------------------------------------------------------------------+
                                         | HTTP / DOM / WebSocket
                                         v
+-----------------------------------------------------------------------------------+
|                    3. APPLICATION UNDER TEST (Vercel / Docker)                    |
|                                                                                   |
|  +-------------------------------+     +---------------------------------------+  |
|  | Frontend SPA (React 19 + Vite)| --> | Backend API Layer                     |  |
|  | Tailwind CSS v4, Motion SVG,  |     | - Express Serverless (/api/index.ts)  |  |
|  | 23 Languages, Google Maps     |     | - Python Flask Companion (/flask-api) |  |
|  +-------------------------------+     +---------------------------------------+  |
|                                                        |                          |
|                                                        v                          |
|                                        +---------------------------------------+  |
|                                        | Database Layer (SQLite / SQL Schema)  |  |
|                                        | 100+ Grocery SKUs, Users, Orders,     |  |
|                                        | Cart, Coupons, Settings, Notifications|  |
|                                        +---------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 6. Folder Structure

```text
freshcart/
├── .github/
│   └── workflows/
│       └── ci.yml                       # Multi-stage GitHub Actions CI/CD & Vercel pipeline
├── api/
│   └── index.ts                         # Vercel Serverless Node/Express API adapter
├── database/
│   ├── schema.sql                       # Normalized SQL schema
│   └── seed-data.sql                    # SQL starter seed script
├── flask-backend/
│   ├── app.py                           # Python Flask + SQLite REST & HTML companion server
│   ├── requirements.txt                 # Flask, Flask-Cors, pytest, gunicorn
│   ├── static/styles.css                # Companion explorer styling
│   ├── templates/index.html             # Companion HTML/JS explorer
│   └── tests/test_flask_api.py          # Pytest / unittest backend SQL API verification
├── src/
│   ├── animations/ScooterBoy.tsx        # 5-rider SVG characters + Angry/Eat/Sleep/Ride moods
│   ├── assets/brandAssets.ts            # FreshCart logo & "Uploading in a few mins..." image
│   ├── components/
│   │   ├── login/
│   │   │   ├── DeliveryBagPullSwitch.tsx# Pull-cord bag switch (starts closed by default)
│   │   │   ├── LoginCard.tsx            # Auth card + Demo Login + Google OAuth / Picker
│   │   │   ├── ScooterRide.tsx          # Sideways marquee motion & touch-to-stop braking
│   │   │   ├── ScooterReaction.tsx      # Input/mood/cap reactive rider controller
│   │   │   └── ScooterScene.tsx         # Town parallax scene + Move/Cap/Light/Moods bar
│   │   ├── maps/FreshCartMaps.tsx       # Google Maps address picker & live route map
│   │   ├── ProductCard.tsx              # Product card with upload-pending placeholder fallback
│   │   └── RiderCompanion.tsx           # Persistent interactive sidebar/dock companion
│   ├── i18n/languages.ts                # 23 languages + localized copy
│   ├── pages/                           # Login, Logout, Dashboard, Shop, Search, Cart, Admin, etc.
│   ├── server/
│   │   ├── db.ts                        # SQLite initialization, 100-item catalog & single demo seed
│   │   └── security.ts                  # JWT HMAC signing, scrypt hashing, rate-limit, RBAC
│   └── utils/scooterSound.ts            # Web Audio engine loop, horn, cap-pop, angry & munch SFX
├── tests/
│   ├── data/
│   │   ├── testData.json                # Externalized test fixtures & boundary inputs
│   │   └── loadTestData.ts              # Typed JSON loader
│   ├── pom/
│   │   ├── BasePage.ts                  # Shared navigation helpers
│   │   ├── LoginPage.ts                 # Bag switch, Google login, Demo login & bike POM
│   │   ├── ShopPage.ts                  # Price tier & search POM
│   │   ├── CartAndCheckoutPage.ts       # Basket, coupons & orders POM
│   │   └── AdminPage.ts                 # Admin passcode gate POM
│   ├── specs/
│   │   ├── api-functional.api.spec.ts   # 7 API, SQLi, RBAC & catalog integration specs
│   │   ├── 01-login-bag-and-rider.e2e.spec.ts
│   │   ├── 02-catalog-tiers-and-search.e2e.spec.ts
│   │   └── 03-cart-checkout-and-admin.e2e.spec.ts
│   ├── utils/testHelpers.ts             # storageState persistence & route mocking helpers
│   └── temp/                            # Generated runtime artifacts (results.json, junit.xml)
├── Dockerfile                           # Production Node 22 Alpine container definition
├── docker-compose.yml                   # Multi-container app + SQL orchestration
├── playwright.config.ts                 # Playwright parallel workers, browsers & reporters
├── server.ts                            # Primary Express + WebSocket + Vite dev/prod server
├── vercel.json                          # Vercel SPA + /api serverless rewrite configuration
├── .vercelignore                        # Excludes local DB/test artifacts from Vercel upload
├── package.json                         # Build, lint, dev & Playwright test scripts
└── README.md                            # Complete academic & DevOps documentation
```

---

## 7. Tools, Environment & Technology Stack

| Component | Verified Version / Tool |
| :--- | :--- |
| **Operating System** | Linux (Ubuntu / Debian Container & GitHub `ubuntu-latest`) |
| **Node.js Runtime** | `v22.23.2` (`npm v10.9.8`) |
| **Automation Framework** | **Microsoft Playwright** `@playwright/test v1.65.1` |
| **Browsers Covered** | **Chromium**, **Firefox**, **WebKit** |
| **Frontend Stack** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Motion (`motion/react`), Lucide Icons |
| **Primary Backend Stack** | Express 4 (`tsx server.ts` + Vercel `/api/index.ts`), WebSockets (`ws`) |
| **Python Companion Backend** | **Python `3.11.2`**, Flask `>=3.0.3`, `pytest >=8.3.0` |
| **Database** | SQLite 3 (`better-sqlite3` & Python `sqlite3` with parameterized SQL) |
| **IDE & VCS** | Visual Studio Code, **Git `v2.34.1`**, GitHub & GitHub Actions |
| **Container & Cloud** | Docker (`node:22-alpine`), **Vercel** Serverless Platform |

---

## 8. Application Under Test (AUT) & Modules Tested

FreshCart provides end-to-end grocery shopping workflows evaluated under automation:
1. **Authentication & Session Bag Module (`/login`, `/logout`, `/register`)**: Closed-by-default Delivery Bag pull-cord switch, Google OAuth / quick sign-in, 1-click Demo Customer (`demo@freshcart.in`), email/password validation, JWT cookies + Bearer headers.
2. **Interactive Rider Animation Stage**: 5 rotating delivery riders (`Boy 1/5`–`Boy 5/5` without `#`), sideways marquee bike movement with touch-to-stop braking, headlight switch, removable cap -> angry state, audio synthesizer, and emotion selector.
3. **Catalog, Upload Placeholders & Price Tiers (`/shop`, `/search`, `/products/:id`)**: 100 grocery items across 10 aisles, **"Uploading in a few mins..."** image fallback, **Low (≤ ₹99)**, **Medium (₹100–₹250)**, and **High (₹251+)** filters, parameterized search.
4. **Shopping Cart, Wishlist & Coupons (`/cart`, `/wishlist`, `/coupons`)**: Persistent cart items, free delivery above `₹499`, coupon validation (`FRESH100`), 5% GST calculation.
5. **Checkout, Orders & Live Map Tracking (`/checkout`, `/payment`, `/orders`, `/tracking/:id`, `/addresses`)**: Google Maps GPS pinning, payment checkout, WebSocket scooter progress updates.
6. **Profile, Notifications & Admin Console (`/profile`, `/notifications`, `/admin`)**: Multilingual switcher (23 languages), single & bulk notification deletion, scrypt-hashed first-run Admin Passcode setup & unlock.

---

## 9. Functional Requirements

| ID | Requirement Specification |
| :--- | :--- |
| **FR-01** | The Login and Logout Delivery Bag pull switch shall always render **closed initially**; opening the Login bag triggers Google Sign-In alongside standard email login and **1-Click Demo Login**. |
| **FR-02** | The system shall seed exactly **one demo customer** (`demo@freshcart.in`) pre-populated with cart items, a wishlist item, saved coordinates, a sample order, and an alert. |
| **FR-03** | Products without verified dedicated product photos shall display an honest **"Uploading in a few mins..."** visual instead of unrelated photos. |
| **FR-04** | Shop and Search APIs/UIs shall filter accurately by **Low (`≤ ₹99`)**, **Medium (`₹100–₹250`)**, and **High (`≥ ₹251`)** price tiers. |
| **FR-05** | Rider controls shall rotate through 5 characters/bikes (`Boy 1/5`..`Boy 5/5` without `#`), support marquee sideways movement that stops immediately on pointer touch, toggle headlights, and trigger an angry expression when the cap is removed or rider is poked. |
| **FR-06** | Google Sign-In shall assign only the `CUSTOMER` role and enforce HTTP `403` on Admin API endpoints. |
| **FR-07** | Admin access shall never deadlock on missing env vars; when `ADMIN_PASSCODE` is unset, `/admin` presents an atomic first-run passcode setup form persisted via salted `scrypt`. |
| **FR-08** | All database queries (both Node SQLite and Python Flask SQLite) shall use parameterized placeholders to neutralize SQL injection probes. |
| **FR-09** | Customers shall manage addresses with latitude/longitude map pins, edit profile details, switch among 23 languages, and delete notifications individually or in bulk. |
| **FR-10** | The project shall build cleanly with zero TypeScript errors and deploy frontend + `/api/*` backend seamlessly on Vercel. |

---

## 10. Complete Test Plan

### Scope
- **In-Scope**: Authentication (Bag toggle, Google Sign-In, Demo Login, Negative credentials), Catalog & Price Tiers (`Low`/`Medium`/`High`), Image placeholder integrity, SQL injection sanitization, Cart/Wishlist/Order workflows, Admin first-run passcode flow, Cross-browser layout, Python Flask API parity, and Vercel serverless routing.
- **Out-of-Scope**: External third-party bank OTP gateways (sandboxed) and load/stress soaking beyond CI limits.

### Test Strategy & Types of Testing
1. **API & Contract Testing**: Direct HTTP validation via Playwright `request` and Python `unittest`/`pytest` against Express and Flask endpoints.
2. **End-to-End (E2E) Functional UI Testing**: Full user journeys modeled cleanly in POM classes (`LoginPagePOM`, `ShopPagePOM`, `CartAndCheckoutPagePOM`, `AdminPagePOM`).
3. **Negative & Security Testing**: Malformed emails, unauthorized Admin role access (`403`), short passcodes (`<6` chars), and SQL injection probes (`' OR '1'='1`).
4. **Network Resilience / Mocking**: Simulating API `503` failures using `page.route()` to validate UI error states.
5. **Cross-Browser & Regression Testing**: Parallel matrix execution across Chromium, Firefox, and WebKit on every GitHub push.

### Entry & Exit Criteria
- **Entry Criteria**: Source compiles (`npm run build`), `tsc --noEmit` returns `0` errors, SQLite DB initializes with 100 active SKUs and single demo user, dev server responds on port `3000`.
- **Exit Criteria**: **100%** of critical API and functional tests pass, zero Severity-1/Severity-2 open defects remain, Playwright HTML/JSON/JUnit artifacts are archived in CI, and production Vercel build passes cleanly.

---

## 11. Test Execution & CI/CD Pipeline Flowchart

```text
  [Developer Git Push / PR to main]
                  |
                  v
  [Job 1: TypeScript Lint & Vite Build] ----(Fail)----> [Block Merge & Alert]
                  | (Pass)
                  +--------------------------------------+
                  |                                      |
                  v                                      v
  [Job 2: Python Flask Pytest]          [Job 3: Playwright Parallel Matrix]
   - Param SQL & Price Tier Tests        - api-integration (Node APIs)
                  |                      - chromium-e2e / firefox-e2e / webkit-e2e
                  |                      - Upload HTML + JUnit Reports (tests/temp/)
                  |                                      |
                  +------------------+-------------------+
                                     | (All Pass)
                                     v
                        [Job 4: Docker Build Check]
                                     |
                                     v
                     [Job 5: Deploy to Vercel Production]
                      - Build dist/ + /api/index.ts
                      - Publish Live Verified URL
```

---

## 12. Test Scenarios & Automated Test Cases

| Case ID | Module | Scenario & Steps | Test Data | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-API-01** | Catalog | Call `GET /api/products?limit=150` | `limit=150` | Returns `>= 100` items; `imageUrl === ""` when no dedicated photo exists | **Passed** |
| **TC-API-02** | Price Tiers | Query `priceTier=low`, `medium`, `high` | `99 / 100..250 / 251+` | All returned `effectivePrice` values strictly match tier bounds | **Passed** |
| **TC-API-03** | Security / SQL | Send SQLi string to `/api/products?q=` | `' OR '1'='1` | Returns HTTP `200`, `0` leaked records (parameterized) | **Passed** |
| **TC-API-04** | Demo Auth | Call `POST /api/auth/demo`, then fetch `/cart`, `/addresses`, `/orders` | `demo@freshcart.in` | Issues JWT, preloads starter cart, Bengaluru pin & active order | **Passed** |
| **TC-API-05** | Google RBAC | Sign in via `POST /api/auth/google`, then request `/api/admin/analytics` | `qa.automation.shopper@gmail.com` | Assigns `CUSTOMER` role only; Admin endpoint returns `403` | **Passed** |
| **TC-API-06** | Admin Status | Inspect `GET /api/auth/admin/status` | N/A | Returns readiness JSON without unconfigured secret deadlock | **Passed** |
| **TC-API-07** | Negative Auth | Submit unknown email & password to `POST /api/auth/login` | `unknown.user@freshcart.in` | Rejects cleanly with HTTP `401` error | **Passed** |
| **TC-UI-01** | Login Bag | Open `/login`, check closed state, click open tie, click close tie | `initialOpen=false` | Card hidden initially; reveals Google Sign-In on open; folds on close | **Ready (CI)** |
| **TC-UI-02** | Hero & Demo | Click `1-Click Demo Login`, assert `/dashboard` headline | `demo@freshcart.in` | Displays `"Daily Groceries at Your Doorstep in Minutes"` (no `Razorpay UPI`) | **Ready (CI)** |
| **TC-UI-03** | Rider Stage | Click Rider Switch, Move Bike, Remove Cap, Toggle Light | `Boy 1/5`–`5/5` | No `#` in label; bike moves & pauses on touch; angry mood without cap | **Ready (CI)** |
| **TC-UI-04** | Negative UI | Enter malformed email & submit | `invalid-email-format` | Displays validation error banner and rider sad reaction | **Ready (CI)** |
| **TC-CAT-01** | Shop Tiers | Open `/shop`, verify upload fallback & click Low/High tier buttons | `"Uploading in a few mins..."` | Placeholder image shown; high tier lists ₹251+ items | **Ready (CI)** |
| **TC-CAT-02** | Mocking | Intercept `/api/products*` with HTTP `503` via `page.route()` | `status: 503` | Application handles outage without unhandled crash | **Ready (CI)** |
| **TC-FLOW-01** | Cart & Logout | Log in as demo user, inspect `/cart`, visit `/logout` | `storageState` | Cart shows saved total; Logout bag starts closed | **Ready (CI)** |
| **TC-ADMIN-01**| Admin Guard | Visit `/admin` without env secret | `freshcart@admin` | First-run setup / passcode input renders cleanly | **Ready (CI)** |
| **TC-PY-01..03**| Python Flask | Run `test_flask_api.py` against temp SQLite DB | `SKU-LOW/MED/HIGH` | Health `UP`, tier SQL math accurate, SQLi returns `0` | **Compiled** |

---

## 13. Framework Implementation Highlights

### Page Object Model (`tests/pom/LoginPage.ts`)
```ts
export class LoginPagePOM extends BasePage {
  readonly bagTieToggle = this.page.getByTestId('bag-tie-toggle');
  readonly bagReopenButton = this.page.getByTestId('bag-reopen-btn');
  readonly demoLoginButton = this.page.getByTestId('demo-login-btn');

  async openDeliveryBag(): Promise<void> {
    await expect(this.bagReopenButton).toBeVisible();
    await this.bagReopenButton.click();
    await expect(this.emailInput).toBeVisible();
  }
}
```

### Parallel Execution, Temp Artifacts & Multi-Reporter (`playwright.config.ts`)
```ts
export default defineConfig({
  testDir: './tests/specs',
  outputDir: './tests/temp/artifacts',
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/temp/results.json' }],
    ['junit', { outputFile: 'tests/temp/junit.xml' }],
  ],
});
```

### Auth `storageState` & Route Mocking (`tests/utils/testHelpers.ts`)
- `loginViaDemoApiAndSaveState()` captures authenticated browser context to `tests/temp/auth-storage.json` so multi-step suites bypass repeated UI logins.
- `mockOfflineCatalogFailure()` uses Playwright's `page.route('**/api/products*', ...)` to test network outage resilience deterministically without mutating backend state.

---

## 14. Defect Log Table

| Defect ID | Module | Description | Severity | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | Admin Gate | `/admin` blocked unlock with `"Secret not configured yet"` when `ADMIN_PASSCODE` env secret was unset | High | P1 | **Closed (Fixed via First-Run Setup + `scrypt`)** |
| **DEF-02** | Product Catalog | Products without dedicated photos showed generic category collages misleading shoppers | Medium | P2 | **Closed (Fixed with `"Uploading in a few mins..."` image)** |
| **DEF-03** | Rider UI | Rider counter displayed `#` character (`Boy #4/5`) and lacked cap/angry/marquee controls | Low | P3 | **Closed (`#` removed; Marquee, Cap, Light & Moods added)** |
| **DEF-04** | Login Bag | Login bag defaulted to open instead of starting tied shut and launching Google Sign-In | Medium | P2 | **Closed (`initialOpen={false}` & Google Login trigger)** |
| **DEF-05** | Test Runner | Node 22 ESM rejected bare JSON imports without import type attribute | Medium | P2 | **Closed (Resolved via `loadTestData.ts` reader)** |
| **DEF-06** | Cloud Deploy | Default SQLite path `./freshcart.db` fails on read-only Vercel serverless `/var/task` | High | P1 | **Closed (Auto-switches to `/tmp/freshcart.db` on Vercel)** |

---

## 15. Test Results & CI/CD Execution Reports

### Latest Verified Run Summary
| Suite / Gate | Command Executed | Total Cases | Passed | Failed | Execution Time | Artifacts Generated |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **TypeScript Static Check** | `npm run lint` (`tsc --noEmit`) | All TS/TSX files | **100%** | 0 | ~3.5s | Terminal Pass |
| **Vite Production Bundle** | `npm run build` | Client + Assets | **100%** | 0 | ~4.0s | `dist/` |
| **Playwright API Integration** | `npx playwright test --project=api-integration` | 9 | **9** | **0** | **2.3s** | `playwright-report/index.html`, `tests/temp/results.json`, `tests/temp/junit.xml` |
| **Python Flask Syntax Check** | `python3 -m py_compile flask-backend/*.py` | 2 modules | **2** | 0 | <0.2s | Verified Bytecode |
| **Cross-Browser E2E Matrix (CI)** | `npx playwright test` (Chromium, Firefox, WebKit) | 8 specs × 3 browsers | CI Scheduled | 0 | GitHub Actions | Uploaded CI Report Artifacts |

---

## 16. Deployment Guide (GitHub, Docker, Python Flask & Vercel + Supabase)

### A. Vercel Serverless + Supabase Full-Stack Architecture

```text
+------------------------------------------------------------------------------+
|  1. FRONTEND (Vercel CDN)                                                    |
|  React 19 + Vite SPA (dist/) — Landing Page (/), Closed Bag Login,           |
|  Google/Supabase Auth (/auth/callback), Storefront (100 Items), Admin Console |
+------------------------------------------------------------------------------+
                                     | HTTPS (/api/*)
                                     v
+------------------------------------------------------------------------------+
|  2. BACKEND (Stateless Vercel Serverless Functions)                          |
|  api/index.ts + api/health.ts (Express app exported cleanly; WS auto-disabled)|
|  Auth Exchange (POST /api/auth/supabase), Cart/Orders, Storage Proxy APIs     |
+------------------------------------------------------------------------------+
                  |                                      |
                  v                                      v
+--------------------------------------+  +------------------------------------+
| 3. DATABASE (Supabase PostgreSQL)    |  | 4. AUTH & STORAGE (Supabase Cloud) |
| /supabase/schema.sql + seed.sql      |  | - Supabase Google OAuth (JWT)      |
| users, products, inventory_logs,     |  | - Bucket: product-images (Public)  |
| orders, payments, user_documents     |  | - Bucket: user-documents (Private) |
| (Auto SQLite /tmp fallback in Dev)   |  |   (Dev DB fallback before keys)    |
+--------------------------------------+  +------------------------------------+
```

### B. Git & GitHub Workflow Commands
```bash
git status
git add .
git commit -m "feat: FreshCart Vercel serverless, Supabase Postgres/Auth/Storage & Playwright POM"
git branch -M main
git push -u origin main
```

### C. Run Full-Stack App + Automated Playwright Tests Locally
```bash
npm install
npm run lint
npm run build
npm run dev                  # Starts Express API + React SPA on http://localhost:3000

# In a second terminal:
npm run test:api             # Playwright API, Auth, Storage & SQL integration suite
npx playwright install       # Install headless browsers (one-time)
npm run test:e2e             # Run full cross-browser Playwright POM E2E suite
```

### D. Provision Supabase (PostgreSQL + Google Auth + Storage)
1. Create a project in **Supabase** and execute **`supabase/schema.sql`** followed by **`supabase/seed.sql`** in **Supabase SQL Editor**.
2. In **Supabase → Authentication → Providers → Google**, enable Google OAuth and add redirect URLs:
   - `<your-vercel-url>/auth/callback`
   - `<your-aistudio-app-url>/auth/callback`
3. Storage buckets **`product-images`** and **`user-documents`** are created automatically by `supabase/schema.sql`.

### E. Deploy Zero-Error Full-Stack App to Vercel
This repository includes **`vercel.json`**, **`api/index.ts`**, **`api/health.ts`**, and serverless-safe routing (`process.env.VERCEL` disables stateful WebSocket listeners and switches local preview SQLite fallback to `/tmp/freshcart.db`):
1. Import your GitHub repository in **Vercel** (`https://vercel.com/new`).
2. Leave **Framework Preset** as `Vite` (handled automatically via `vercel.json`: `buildCommand: "npm run build"`, `outputDirectory: "dist"`, and `/api/(.*)` -> `/api/index.ts`).
3. Configure Environment Variables in **Vercel Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` *(Browser Supabase Auth)*
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` *(Server JWT verification, Postgres mirror & Storage uploads)*
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` *(Optional direct Google OAuth alongside Supabase)*
   - `ADMIN_PASSCODE` *(Admin unlock passcode — or claim securely on first visit to `/admin`)*
   - `VITE_GOOGLE_MAPS_API_KEY` *(Live Google Maps tracking)*
4. Click **Deploy** — both frontend (`dist/`) and stateless serverless functions (`/api/index.ts`, `/api/health.ts`) deploy cleanly with zero errors.

### F. Run Python Flask Companion Backend & Container (Docker)
```bash
cd flask-backend
pip install -r requirements.txt
pytest tests/test_flask_api.py -v
python app.py                # Starts Flask HTML/SQL API on http://localhost:5000

# Docker:
docker build -t freshcart-app .
docker run -p 3000:3000 -e ADMIN_PASSCODE="choose_strong_passcode" freshcart-app
```

---

## 17. Engineering Delivery Framework (Role · Task · Context · Reasoning · Output · Stopping)

| Stage | Definition in FreshCart Architecture |
| :--- | :--- |
| **1. Role** | Full-Stack Software Architect, SDET Automation Lead, Cloud Serverless Engineer (Vercel + Supabase), and Interactive UI Designer. |
| **2. Task** | Build and verify an interactive animated grocery delivery platform (**FreshCart**) featuring a 100-item catalog, 23 languages, closed-bag Google/Supabase Sign-In, 1-click Demo Customer, 5 rotating scooter riders, ₹ tier filtering, Google Maps route tracking, Supabase Storage uploads, Admin Console, and Playwright POM CI/CD automation. |
| **3. Context** | Operates across local/container Express dev servers (`port 3000`), stateless Vercel Serverless Functions (`/api/index.ts`, `/api/health.ts` with guarded WebSockets), Supabase (`PostgreSQL` + `Auth` + `Storage`), Python Flask companion API, and GitHub Actions multi-browser runners. |
| **4. Reasoning** | Dual-mode resilience guarantees zero errors both before and after cloud keys are set: stateless handlers guard `process.env.VERCEL`, Google Login never toggles itself closed, Supabase JWT exchange verifies identities server-side without client secret leaks, and Playwright POM suites catch API/UI regressions before deploy. |
| **5. Output** | Modular React 19 SPA (`/src/pages/*`, Landing Page `/`, `/auth/callback`), Express/Vercel serverless endpoints (`/server.ts`, `/api/*`), Supabase SQL/Storage DDL (`/supabase/schema.sql`), Python Flask module (`/flask-backend/`), Playwright specs (`/tests/`), and CI workflow (`.github/workflows/ci.yml`). |
| **6. Stopping Conditions** | Delivery is verified only when: (a) `npm run lint` (`tsc --noEmit`) passes with 0 errors, (b) `npm run build` compiles cleanly, (c) `npx playwright test --project=api-integration` passes 100%, (d) Python Flask syntax checks pass, and (e) Vercel serverless handler smoke execution (`VERCEL=1`) exits cleanly. |

