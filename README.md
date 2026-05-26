# 🍃 TeaERP Pro — Advanced Tea Plantation Enterprise Resource Planning System

[![Vite](https://img.shields.io/badge/Vite-6.0.0-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0.0-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.18.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**TeaERP Pro** is a premium, full-stack, enterprise-grade ERP designed specifically for tea plantations and estates. It bridges the gap between field-level farming activities, biometric human resource management, geographic information mapping (GIS), advanced double-entry accounting, and high-level management decision-making. 

Featuring a sleek, fully responsive dark/light mode interface powered by **React 19**, **Tailwind CSS v4**, and **Vite**, backed by a robust **Express API** and a relational **MySQL database**, the system provides deep, real-time insights into tea production, workforce logistics, and financial health.

---

## 🚀 Key Modules & System Features

### 1. 👥 Smart Muster & Biometric Attendance
* **Facial Recognition Attendance**: Real-time biometric scanning at the muster terminal powered by `@vladmandic/face-api` using 128-float face vectors stored directly in the database.
* **QR Code Attendance**: Scan-based check-in using unique, dynamically generated worker QR codes.
* **Workforce Directory & Archives**: Full database profiles for field pluckers and casual workers, featuring emergency contacts, wage classifications (Permanent, Daily, Contract), and document uploads (NIC details).
* **Duty Releases & Leave Management**: Track operational deployment and attendance compliance.

### 2. 🗺️ GIS Field & Block Mapping
* **Interactive Field GIS**: Visual division maps powered by Leaflet (`react-leaflet`) displaying polygons representing physical estate blocks.
* **Dynamic Crop Block Stats**: Monitor spatial block sizes, tea varieties, planting years, and current resting/plucking/replanting status directly on a geographic map.
* **Real-time GPS Tracking**: Coordinates recording and field survey planning.

### 3. 📈 Crop Intelligence & Forestry Biometrics
* **Yield & Plucking Round Monitors**: Record and track daily plucking round yields, pluckers' productivity, and block-wise harvests.
* **Forestry & Timber Inventory**: Track biological tree assets (Teak, Mahogany, Eucalyptus, Rosewood) complete with height, girth categories, census logs, and timber asset valuation.
* **Agricultural Calculators**: Pre-loaded utilities for Soil pH / Dolomite recommendations and Foliar Spray measurements.
* **Operation Schedules**: Plan and record crucial field rounds (Weeding, Manure, Foliar spray, and Lopping cycles).

### 4. 💼 Advanced Finance & Double-Entry Accounting
* **Chart of Accounts (COA)**: Manage asset, liability, equity, income, and expense ledger categories.
* **Double-Entry Journal System**: Post validated double-entry ledger journals to keep standard balance sheets in equilibrium.
* **Cost of Production (COP)**: Calculate real-time Cost of Production (COP) on a daily, weekly, and monthly basis.
* **Accounts Payable & Expenses**: Integrated management of operational expenditures (OpEx) and capital expenditures (CapEx).
* **Automated Financial Reporting**: Instantly compile General Ledgers, Income Statements, and Trial Balances.

### 5. 💰 Muster Payroll & Cash Advances
* **Payroll Processing**: Automatic generation of monthly and casual wages based on daily plucking records, muster registers, and basic wages.
* **Cash Advances**: Manage interest-free or custom financial advances against next month's yield payout.
* **Welfare Tea Inventory**: Track tea packet issues and distribution to plantation workers as part of non-cash allowances.

### 6. 🌤️ Weather Monitoring & AI Krushi Advisor
* **Real-time Weather Forecasts**: Integrated dashboards displaying temperature, humidity, rainfall, and wind metrics.
* **Gemini-powered Crop Intelligence**: Leveraging Google Gemini models via API for diagnostic advice, fertilizer recommendations, and interactive AI Chatbots.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Core** | React 19, JavaScript (ES6+), Vite, React Router DOM |
| **Styling & UI** | Tailwind CSS v4, Lucide React, CSS variables (Glassmorphism & premium HSL palettes) |
| **Data Visualization** | Recharts (Responsive Line, Area, and Bar charts) |
| **Biometrics & Hardware** | `@vladmandic/face-api` (Local neural network engine), `html5-qrcode` (Camera scanner) |
| **Mapping & GIS** | `leaflet`, `react-leaflet` |
| **Document Export** | `xlsx`, `jspdf`, `jspdf-autotable`, `docx`, `html2canvas` |
| **Backend Core** | Node.js, Express, Nodemon |
| **Database** | MySQL (Connection pooled using `mysql2`) |
| **Security & JWT** | JWT (JSON Web Tokens), `bcryptjs`, `cors`, `helmet`, `express-rate-limit` |
| **AI Integration** | Google Gemini API (via `@google/generative-ai` / fetch) |

---

## 📁 System Directory Structure

```text
tea-erp-monorepo/
├── backend/                  # Node.js Express server API
│   ├── config/               # DB connection pooling (db.js)
│   ├── uploads/              # Storage for worker registration photos/NICs
│   ├── server.js             # API entrypoint, endpoints, and authentication logic
│   ├── package.json          # Node dependencies & backend scripts
│   └── .env                  # Backend environment secrets
├── frontend/                 # React SPA application source
│   ├── public/               # Static assets & face-api neural weights
│   ├── src/                  # React source files
│   │   ├── api/              # Axios interface and API service calls
│   │   ├── components/       # Global components (Layout, Theme switches)
│   │   ├── pages/            # Modules (Finance, Attendance, GIS, Crop, Weather)
│   │   ├── App.jsx           # Router configuration & dark mode logic
│   │   ├── index.css         # Tailwind v4 globals & premium theme variables
│   │   └── entry.jsx         # React application bootstrap
│   ├── package.json          # Vite configurations and frontend dependencies
│   └── tailwind.config.js    # Tailwind configurations
├── database/                 # Schema definitions and database seeders
│   ├── schema.sql            # Master schema (Estates, Users, Workers, Inventory)
│   ├── crop_intelligence.sql # Yields, health, soil, and operations tables
│   ├── face_recognition.sql  # Biometric facial descriptor schemas
│   ├── finance_migration.sql # Chart of Accounts, Journals, Trial Balance, COP
│   ├── forestry_migration.sql# Biological timber forestry assets schema
│   ├── seed.sql              # Initial system admin seed
│   └── seed_field_blocks.sql # GIS and estate boundaries initial data
├── package.json              # Monorepo global package configurations
└── README.md                 # Project handbook (this file)
```

---

## 💻 Installation & Setup

### Prerequisites
* **Node.js** (v18.x or later)
* **npm** (v9.x or later)
* **MySQL Server** (XAMPP / local install)

---

### Step 1: Database Setup
1. Open your MySQL client (e.g., phpMyAdmin, MySQL Workbench, or CLI).
2. Create the main database:
   ```sql
   CREATE DATABASE tea_erp;
   ```
3. Import the database migrations in order to build the schema:
   * Run the master schema `database/schema.sql`.
   * Run `database/crop_intelligence_module.sql` to setup crop logs.
   * Run `database/face_recognition_migration.sql` to setup biometrics.
   * Run `database/finance_migration.sql` to seed the Chart of Accounts and accounting schemas.
   * Run `database/forestry_migration.sql` to establish the biological forestry timber assets.
   * Import the initial sample seeds `database/seed.sql` and `database/seed_field_blocks.sql`.

---

### Step 2: Backend Configuration
1. Navigate to the `backend/` folder.
2. Create or open the `.env` file and set the configuration parameters:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=YOUR_PASSWORD_HERE
   DB_NAME=tea_erp
   JWT_SECRET=super_secret_tea_erp_key_2026
   GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
   ```

---

### Step 3: Install Workspace Dependencies
From the **root** of the workspace, run the global installation command:
```bash
npm run install:all
```
*This command executes root dependencies setup and automatically triggers recursive NPM installations inside both the `frontend/` and `backend/` workspace folders.*

---

### Step 4: Run the ERP System
To run the full stack concurrently (Backend API on `http://localhost:5000` and Frontend Dev Server on `http://localhost:5173`):

From the **root** directory, run:
```bash
npm run dev
```

---

## 🔒 Role-Based Access Control (RBAC)

The system enforces three security levels, instantly routing accounts to their custom workspace views upon successful authentication:

1. **Admin (`admin`)**: Comprehensive privileges. Manages Chart of Accounts, payroll parameters, user registration, compliance records, system logs, and full database access.
2. **Manager / Owner (`manager`)**: High-level financial and operational oversight. Focused on crop COP charts, Biological tree valuations, division budgets, asset disposals, and yield reports.
3. **Field Officer (`field_officer`)**: Mobile-ready, boots-on-the-ground interface. Logs daily worker attendance, registers green leaf pluckings, updates crop block states (resting vs plucking), and records weather observations.

---

## 🛡️ API and Security Implementation

* **JWT Authenticated Headers**: Secure endpoints using bearer tokens.
* **Bcrypt Password Hashing**: Ensures standard password hashing for all user accounts.
* **Express Rate Limiting**: Protects authorization/auth endpoints from brute force attempts.
* **Helmet Middleware**: Configured headers to prevent clickjacking, MIME sniffing, and cross-site scripting (XSS).
* **Database Connection Pooling**: Built using a robust pooled configuration in Node Express to guarantee high throughput.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---

*Developed and maintained for **TeaERP Pro System** 🍃*
