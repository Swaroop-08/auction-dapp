# e-Tender India — Government e-Procurement dApp

![GitHub Banner](screenshots/home-desktop-grid.png)

---

## Project Introduction

**e-Tender India** is a blockchain-based reverse-auction platform for Indian government procurement. It redefines the trust model by moving the tender box onto an Ethereum Virtual Machine (EVM) chain, ensuring that bid confidentiality, history, EMD custody, and award decisions are transparent, immutable, and publicly verifiable.

Ministries and nodal authorities publish tenders on-chain; vetted contractors compete by submitting progressively **lower** offers. Earnest Money Deposits (EMD) are held in a smart contract and automatically refunded to every outbid vendor. The platform is built for the Indian government procurement ecosystem, supporting departments including NHAI, CPWD, Railways, and Smart Cities.

---

## Problem Statement

Traditional government e-procurement systems suffer from several critical limitations:

| Property | Traditional Portal | e-Tender India |
|---|---|---|
| Bid confidentiality | Operator's database | Sealed on-chain; only offer total revealed at close |
| Bid history | Mutable logs | Append-only, hash-linked audit trail |
| EMD custody | Operator account | Locked in contract state, released by rule not discretion |
| Award decision | Announced | Emit-able, timestamped, publicly verifiable |
| Downtime | Single operator | Any EVM node |

**Core problems solved:**
- **No bid transparency:** Vendors cannot verify fair evaluation.
- **EMD risk:** Funds held by operators expose contractors to potential loss.
- **No verifiable process:** Bidding timeline and award decisions cannot be independently audited.
- **Delayed refunds:** Outbid vendors must manually request EMD refunds.
- **Information asymmetry:** Only the portal operator has full bid history access.

---

## Key Features

| Feature | Description |
|---|---|
| **Live Procurement Console** | Two-pane console: tender facts (department, category, estimated value in ETH/INR, live closing countdown, current lowest bid and bidder) on the left, and reverse-auction offer form on the right. Client-side validation ensures offer + EMD undercuts current lowest before any transaction is signed. |
| **Multi-tender Participation** | Contractors hold concurrent positions across every open tender. Being outbid on one tender never affects position on another; each tender's displaced value accrues independently and sums into a single claimable balance. |
| **Claimable EMD Vault** | Running total of every EMD released by outbid/non-winning close, with one-click claim. Uses pull-over-push refund pattern so a reverting recipient cannot block other contractors' withdrawals. |
| **Contractor Dashboard** | Wallet balance, claimable EMD, tenders participated and bids submitted, plus per-tender table of offer, EMD and live status (OPEN / EVALUATING / AWARDED). |
| **Explore Feed** | All live tenders with department filtering (NHAI, CPWD, Railways, Smart Cities), free-text search on title and reference number, status filtering and live closing countdowns. One click routes a tender into the Live Procurement Console. |
| **On-Chain Audit Trail** | Every `TenderBidSubmitted` event rendered as a table with vendor ID, tender reference, offer in ETH and INR, EMD, timestamp and transaction hash. Filterable to a single tender or global view. |
| **Department-Aware Imagery** | Each department resolves a contextually relevant image (NHAI = bridge at sunset, CPWD = office towers, Railways = freight locomotive, Smart Cities = city skyline), so a highway bridge tender does not render alongside a rolling-stock tender. |
| **Role-Based Local Authentication** | Government Authority and Vetted Contractor roles with distinct permissions, resolved against a local user directory. |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity `^0.8.20`, optimizer at 200 runs, `viaIR` |
| Development network | Hardhat, chain ID `31337` |
| Frontend | React 19 + Vite 8 |
| Blockchain I/O | Ethers.js v6 |
| Routing | React Router v7 |
| Styling | Hand-written CSS, dark government-slate theme |
| Icons | Lucide React |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 19 + Vite 8)               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  App.jsx        │  │  Home.jsx       │  │  Explore.jsx    │ │
│  │  (Router, auth)│  │  (Live Console)│  │  (Browse feed)  │ │
│  └───────┬─────────┘  └───────┬─────────┘  └───────┬─────────┘ │
│          │                    │                    │          │
│  ┌───────▼─────────┐  ┌───────▼─────────┐  ┌───────▼─────────┐│
│  │  MetaMask Simulator│  │  Toast Container│  │  Countdown Hook││
│  │  (tx simulation)   │  │  (notifications) │  │  (HH:mm:ss)    ││
│  └───────┬─────────┘  └───────┬─────────┘  └───────┬─────────┘│
│          │                    │                    │          │
│  ┌───────▼─────────┐  ┌───────▼─────────┐  ┌───────▼─────────┐│
│  │  constants.js     │  │  auth.js          │  │  accounts.js    ││
│  │  (ABI, images)    │  │  (USER_DIRECTORY)│  │  (HARDHAT_ACCOUNTS)││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
│                              │                    │              │
│                      ┌───────▼────────────────────▼─────┐│
│                      │  ETHEREUM RPC PROVIDER (VITE_RPC_URL)││
│                      │  (http://127.0.0.1:8545 default)      ││
│                      └───────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                ┌─────────────────────────────────────┐
                              │  SMART CONTRACT: TenderVault.sol │
                              │  (Solidity ^0.8.20, optimizer 200 runs)│
                              │  ├─ createTender() ││
                              │  ├─ submitBid() ││
                              │  ├─ claimEmdRefund() ││
                              │  ├─ awardTender() ││
                              │  ├─ getAllTenders() ││
                              │  └─ Events: TenderCreated, ││
                              │       TenderBidSubmitted, ││
                              │       TenderAwarded, RefundClaimed ││
                              └─────────────────────────────────────┘
```

---

## Installation and Setup

### Prerequisites

- Node.js 18 or newer
- npm (v10.x verified)

### 1. Install Dependencies

```bash
# Root — Hardhat + typechain + all deps
npm install

# Frontend — React + Vite + Ethers
cd frontend && npm install && cd ..
```

### 2. Start a Local Chain

```bash
npx hardhat node
```

⚠️ **Leave this running.** It seeds ten pre-funded development accounts holding 10,000 ETH each on chain ID: 31337.

### 3. Deploy the Contract

In a second terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Copy the printed `Contract Address` into `frontend/src/utils/constants.js` (overrides the hardcoded default).

### 4. Seed Demo Tenders

```bash
npx hardhat run scripts/seed-tenders.js --network localhost
```

Idempotent — already-published reference numbers are skipped. Seeds 4 tenders:

- `CPWD/2026/STR-12/002` — Seismic Retrofitting of Government Office Buildings
- `Railway/2026/TRK-88/014` — Doubling of Track Between Kishanganj and Barsoi
- `SMART/2026/SC-07/009` — Integrated Command & Control Centre Setup
- Default: `NHAI/2026/HP-45/001` — Highway Bridge (seeded by constructor)

### 5. Start the Frontend

```bash
cd frontend && npm run dev
```

Open http://localhost:5173.

---

## Environment Variable Configuration

The build reads from environment variables instead of hardcoded values. Create a `.env` file in the `frontend/` directory:

```env
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CONTRACT_ADDRESS=0xYourDeployedAddress
VITE_BASE_PATH=/auction-dapp
```

| Variable | Default | Description |
|---|---|---|
| `VITE_RPC_URL` | `http://127.0.0.1:8545` | Ethereum RPC endpoint (Hardhat local node) |
| `VITE_CONTRACT_ADDRESS` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | TenderVault contract address |
| `VITE_BASE_PATH` | `/` | Base path for GitHub Pages subpath deployment (e.g., `/auction-dapp/`) |

⚠️ **Important:** Never commit `.env` to version control. It is excluded by `.gitignore`. The project contains `.env.example` with placeholder values for reference only.

---

## Complete Application Workflow

### 1. User Onboarding (Login)

1. Navigate to http://localhost:5173.
2. The login card appears. Enter credentials from the demo accounts table.
3. Validated against `USER_DIRECTORY` in `frontend/src/utils/auth.js`.
4. Session stored in `localStorage` under `"etender_session"`.
5. Navbar updates: role pill, wallet balance, department/vendor display.

**Demo Credentials:**

| Role | Username | Password | Identity |
|---|---|---|---|
| Authority | `cpwd.nodal` | `govt123` | CPWD Nodal Officer |
| Authority | `nhai.officer` | `nhai456` | NHAI Project Director |
| Contractor | `sharma.contractors` | `vendor123` | Sharma Infrastructure Pvt Ltd |
| Contractor | `gupta.builders` | `build456` | Gupta Builders & Associates |
| Contractor | `singh.engineers` | `eng789` | Singh Engineering Works |

### 2. Browsing and Selecting a Tender

1. The **Explore** page defaults to showing all live tenders.
2. Use department filter pills (ALL, NHAI, CPWD, Railways, Smart Cities) to narrow results.
3. Use the status dropdown (All, Open, Evaluated, Awarded).
4. Use the search input to filter by title or reference number.
5. Click "Set Active Tender" on any card to navigate to the Home console with that tender selected.

### 3. Submitting a Tender Offer (Reverse Auction)

1. The Home console displays the selected tender's hero image, stats panel (value in ETH/₹, EMD requirement, countdown), and current lowest bid.
2. The right panel contains the offer form:
   - Input field for tender offer amount (ETH).
   - Automatic EMD addition displayed below.
   - Real-time total: offer + EMD.
   - Client-side validation: if a lowest bid exists, total must be strictly lower; else error shown.
3. Click "Submit Tender Offer".
4. A MetaMask simulator modal appears with transaction details (from address, type: "Submit Tender Offer", amount: total ETH).
5. User clicks "Confirm".
6. App derives the user's wallet from their private key (looked up in `accounts.js` via `getDirectSignerForUser()`), verifies the derived address matches the session address.
7. Transaction sent: `contract.submitBid(tenderId, { value: bidValue, gasLimit: 500000 })`.
8. On receipt: success toast "Tender Offer Submitted! Offer submitted for tender #X". Audit trail updates with new bid. Tender state refreshes.

### 4. Being Outbid and Claiming Refund

1. If another contractor submits a lower total, the previous bidder is displaced.
2. The displaced bidder's move amount is credited to `pendingReturns[bidderAddress]`.
3. The displaced bidder navigates to their Profile.
4. If `pendingRefund > 0`, a green banner appears: "EMD Refund Available — {amount} ETH held across all outbid/non-winning tenders".
5. User clicks "Claim EMD Refund".
6. MetaMask simulator appears with amount: `pendingRefund` ETH.
7. User confirms.
8. `contract.claimEmdRefund({ gasLimit: 200000 })` executes.
9. Success toast: "EMD Refund Claimed! Funds returned to wallet". Balance updates; `pendingRefund` → 0.

### 5. Authority Tender Publication

1. Authority signs in.
2. (Currently via `scripts/seed-tenders.js`; production would have a `/create-tender` endpoint.)
3. New tender appears in the Explore feed immediately.

### 6. Logout

1. Click the logout button in the navbar.
2. `handleLogout()` removes `localStorage etender_session`.
3. Session reverts to unauthenticated state; login screen re-displays.

---

## MetaMask Connection and Transaction Approval Explanation

### Important Note on Authentication

This project uses **local username/password authentication** for demo accessibility, not a true MetaMask wallet connection. The credentials (`cpwd.nodal`/`govt123`, `sharma.contractors`/`vendor123`, etc.) are pre-configured in `frontend/src/utils/auth.js` and map to Hardhat development accounts.

However, the transaction approval flow is functionally equivalent to MetaMask:

1. **Session Login:** User enters username/password. Session stored in `localStorage`.
2. **Transaction Initiation:** User clicks "Submit Tender Offer" or "Claim EMD Refund".
3. **Simulator Modal:** A modal appears simulating MetaMask's popup, showing:
   - `fromAddress`: The user's wallet address (derived from the session).
   - `type`: e.g., "Submit Tender Offer" or "Claim EMD Refund".
   - `amount`: The total ETH amount being sent (offer + EMD, or the cumulative refund amount).
4. **User Confirmation:** User clicks "Confirm" or "Cancel" in the simulator.
5. **On-Chain Signing:** If confirmed, the app calls `getDirectSignerForUser(session, provider)`:
   - Looks up the user's `privateKey` from `frontend/src/utils/accounts.js` `HARDHAT_ACCOUNTS`.
   - Creates `new ethers.Wallet(privateKey, provider)`.
   - Derives the address and verifies it matches the session address exactly (case-insensitive).
   - If mismatch: throws configuration error.
6. **Transaction Execution:** The contract method is called via the signer (e.g., `contract.submitBid(tenderId, {value, gasLimit})`).
7. **Receipt & Confirmation:** `tx.wait()` confirms mining. On success, a toast notification appears with type-specific messaging and the transaction hash. The UI refreshes: `fetchData()` re-reads contract state, `updateBalance()` fetches the new wallet balance.

### Why This Approach?

- **Low barrier to entry:** Government contractors who are not familiar with MetaMask wallet extensions can use simple username/password login.
- **Functionally equivalent:** The on-chain transaction mechanism is identical to MetaMask-based signing.
- **Development-friendly:** No need for users to install browser extensions or manage seed phrases during the demo phase.
- **Production migration path:** The auth layer can be replaced with real wallet-signature challenge (e.g., MetaMask `eth_requestAccounts`, `signTypedData`) without changing the contract or most frontend logic.

---

## Project Structure

```
auction-dapp/
├── contracts/
│   ├── TenderVault.sol        # Reverse-auction tender contract (primary)
│   └── Auction.sol            # Original auction contract (legacy)
├── scripts/
│   ├── deploy.js              # Deploys TenderVault
│   ├── seed-tenders.js        # Publishes demo tenders (idempotent)
│   ├── test-bidder2.mjs       # Bid test script
│   └── validate-wallets.mjs   # Wallet validation
├── artifacts/                 # Compiled contract output (Hardhat)
├── hardhat.config.js
├── package.json
└── frontend/
    ├── src/
    │   ├── components/        # Modals, toasts, countdown
    │   │   ├── CreateAuctionModal.jsx
    │   │   ├── MetaMaskSimulatorModal.jsx
    │   │   └── ToastContainer.jsx
    │   ├── pages/             # Home console, Explore, Profile
    │   │   ├── Home.jsx
    │   │   ├── Explore.jsx
    │   │   └── Profile.jsx
    │   └── utils/
    │       ├── auth.js        # Local role directory + session
    │       ├── accounts.js    # Virtual wallet signers + error messages
    │       └── constants.js   # Contract address, ABI, imagery
    ├── package.json
    └── vite.config.js
```

---

## Updated Screenshots

The repository includes the following application screenshots, organized in `screenshots/`:

| Screenshot | Description |
|---|---|
| `screenshots/home-desktop-grid.png` | Full desktop view of the Home dashboard — two-column grid with hero tender and bid console. |
| `screenshots/home-hero.png` | Hero section of the active tender — title, description, department badge, stats (value/EMD/countdown). |
| `screenshots/explore.png` | Explore feed page — tender cards with department tags, reference numbers, status filters. |
| `screenshots/explore-4-tenders.png` | Explore feed showing all 4 seeded tenders (CPWD, Railways, Smart Cities + NHAI). |
| `screenshots/profile.png` | Contractor Profile — unpopulated state with 4 metric cards and empty tables. |
| `screenshots/profile-populated.png` | Contractor Profile — populated with tender participation, bid history, and claimable EMD banner. |

> **Note:** The transaction approval flow (MetaMask simulator popup) is demonstrated in the `MetaMaskSimulatorModal.jsx` component and is visible during live application use. Screenshots of the simulator in action can be captured by running the app and navigating through the bid/submit flow.

---

## Links to Additional Documentation

- [PATENT_DOCUMENTATION.md](PATENT_DOCUMENTATION.md) — Patent preparation document with technical field, prior art, innovative features, step-by-step methodology, and suggested patent claims.
- [CONTRACTS](contracts/TenderVault.sol) — Smart contract source code with full Solidity implementation.
- [SCRIPTS](scripts/) — Deployment and seeding scripts.

---

## License

MIT

---

*Last updated: October 2025*