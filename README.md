# ORBINOVA — Integrated Healthcare Intelligence Platform

> **Connecting Healthcare. Advancing Intelligence. Saving Lives.**

---

## 1. About ORBINOVA

**ORBINOVA** is an Integrated Healthcare Intelligence Platform connecting healthcare institutions, medical professionals, blood donation networks, and intelligent diagnostic technologies through an integrated digital health ecosystem.

ORBINOVA serves as the parent brand for two specialized healthcare products:

1. **ORBINOVA Donor**: A healthcare donor coordination and blood-matching platform designed to connect verified healthcare institutions, eligible voluntary donors, blood banks, and patients requiring blood products.
2. **ORBINOVA Imaging**: An AI-assisted medical imaging platform designed to support radiologists and healthcare professionals in reviewing medical images, identifying potential abnormalities, and prioritizing clinical review.

---

## 2. Architecture & Repository Responsibilities

ORBINOVA is architected as **three independent applications** across separate repositories and deployments:

| Application | Repository Responsibility | Deployment | Planned Custom Domain |
|---|---|---|---|
| **ORBINOVA Main Website** | **This Repository** (Brand, landing page, solutions, external module links) | Independent Vercel Project | `https://www.orbinova.com` |
| **ORBINOVA Donor** | External Team Repository (Donor coordination, blood inventory, hospital triage) | Independent Vercel Project | `https://donor.orbinova.com` |
| **ORBINOVA Imaging** | External Team Repository (AI medical image review, diagnostic decision support) | Independent Vercel Project | `https://imaging.orbinova.com` |

### Strict Architectural Boundaries:
- **No Monorepo / No Merged Repositories**: This repository contains only the main ORBINOVA website.
- **Independent Deployments**: Neither external module's source code is copied into or coupled with this repository.
- **Environment-Driven Connections**: All module access buttons and navigation links route externally through validated environment variables (`NEXT_PUBLIC_DONOR_APP_URL` and `NEXT_PUBLIC_IMAGING_APP_URL`).

---

## 3. Environment Variables Configuration

Centralized in `src/config/modules.ts`, all external module destinations are controlled via environment variables.

### Required Public Variables

Create a `.env.local` file (or configure environment variables in your Vercel Project Settings):

```env
# ------------------------------------------------------------------------------
# ORBINOVA External Module URLs
# ------------------------------------------------------------------------------
# Staging / Preview (Team-provided Vercel URLs):
# NEXT_PUBLIC_DONOR_APP_URL=https://orbinova-donor.vercel.app
# NEXT_PUBLIC_IMAGING_APP_URL=https://orbinova-imaging.vercel.app/login

# Production (Custom Subdomains once DNS is configured):
NEXT_PUBLIC_DONOR_APP_URL=https://donor.orbinova.com
NEXT_PUBLIC_IMAGING_APP_URL=https://imaging.orbinova.com/login

# ------------------------------------------------------------------------------
# Main Website Configuration
# ------------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Security Note:** Never put secrets, passwords, or backend private service keys in `NEXT_PUBLIC_` environment variables.

---

## 4. How to Run Locally

### Prerequisites
- Node.js `v20.x` or higher
- npm `v10.x` or higher

### Installation & Execution

```bash
# 1. Install dependencies
npm install

# 2. Run TypeScript type checks
npx tsc --noEmit

# 3. Run test suites
npm run test:modules     # Verifies external module configuration and URL sanitation
npm run test:matching    # Verifies red-cell compatibility and matching engine

# 4. Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Production Build & Deployment to Vercel

```bash
# Run optimized production build
npm run build

# Start local production preview
npm run start
```

### Deploying to Vercel:
1. Import this repository into **Vercel** as a Next.js project.
2. In **Project Settings &rarr; Environment Variables**, configure:
   - `NEXT_PUBLIC_DONOR_APP_URL`
   - `NEXT_PUBLIC_IMAGING_APP_URL`
   - `NEXT_PUBLIC_APP_URL` (`https://www.orbinova.com`)
3. Trigger deployment.
4. *Important*: Whenever a public environment variable is updated in Vercel, a **Redeploy** is required for the new variable to take effect in the client bundle.

---

## 6. Future Custom Domain & DNS Setup

Once domain registration is complete for `orbinova.com`, each independent team will configure their assigned hostname in their respective Vercel project:

### Main Website (This Project):
- **Domain**: `www.orbinova.com` and `orbinova.com`
- **DNS Records** (provided by Vercel for this project):
  - `CNAME` for `www` &rarr; `cname.vercel-dns.com`
  - `A` record for root domain &rarr; `76.76.21.21`

### ORBINOVA Donor (External Team Responsibility):
- **Domain**: `donor.orbinova.com`
- **DNS Record**: `CNAME` for `donor` &rarr; points to the Donor team's Vercel deployment DNS record.

### ORBINOVA Imaging (External Team Responsibility):
- **Domain**: `imaging.orbinova.com`
- **DNS Record**: `CNAME` for `imaging` &rarr; points to the Imaging team's Vercel deployment DNS record.

---

## 7. Security Standards & Separation of Responsibility

1. **Authentication Token Storage**:
   - Authentication sessions in this repository strictly adhere to **secure, HttpOnly cookies**.
   - No authentication tokens are stored in `localStorage`, `sessionStorage`, `IndexedDB`, or JavaScript-accessible browser state.
2. **Independent Authentication**:
   - Each application maintains its own isolated authentication and authorization boundaries.
   - The main website **never** passes authentication credentials, session tokens, or private keys through URL parameters or cross-domain queries.
3. **Clinical Safety & Governance**:
   - **ORBINOVA Donor**: Donors cannot independently self-verify. Verification is strictly performed by authorized healthcare facilities. Mandatory ABO/Rh compatibility rules are never overridden by AI.
   - **ORBINOVA Imaging**: Operates strictly as an adjunct clinical decision-support tool. It does not replace qualified clinicians or independently formulate diagnoses. Final clinical conclusions remain with licensed medical professionals.

---

## 8. Available Scripts

- `npm run dev`: Runs Next.js local development server.
- `npm run build`: Generates optimized production build for all routes.
- `npm run start`: Runs production server locally.
- `npm run test:modules`: Runs automated test suite for centralized module URL routing.
- `npm run test:matching`: Runs automated test suite for clinical blood compatibility matching rules.
- `npm run test:all`: Runs all automated test suites.
- `npm run lint`: Checks project for ESLint issues.
