# e-Tender India — Government e-Procurement dApp

A blockchain-based reverse-auction platform for Indian government procurement. Ministries and nodal authorities publish tenders on-chain; vetted contractors compete by submitting progressively **lower** offers, with Earnest Money Deposits (EMD) held in a smart contract and refunded automatically to every outbid vendor.

Built with **Solidity, Hardhat, Ethers.js v6 and React 19 (Vite)**.

---

## Why a blockchain tender box

Conventional e-procurement asks vendors to trust a portal operator with the bid box. Sealed bids, evaluation order and award decisions are all opaque, and a compromised operator can rewrite history. Moving the tender box onto an Ethereum Virtual Machine (EVM) chain changes the trust model:

| Property | Traditional portal | e-Tender India |
|---|---|---|
| Bid confidentiality | Operator's database | Sealed on-chain; only the offer total is revealed at close |
| Bid history | Mutable logs | Append-only, hash-linked audit trail |
| EMD custody | Operator account | Locked in contract state, released by rule not by discretion |
| Award decision | Announced | Emit-able, timestamped, publicly verifiable |
| Downtime | Single operator | Any EVM node |

### The reverse-auction mechanic

Indian works and services procurement commonly runs a reverse auction: the lowest responsive bid wins. `TenderVault` enforces this on-chain:

1. An authority publishes a tender with a reference number, department, estimated value, EMD and closing time.
2. A contractor calls `submitBid(tenderId)` sending **at least the EMD**. The first bid is accepted outright.
3. Every later bid must be **strictly lower** than the current lowest. A higher offer reverts.
4. When a bid is displaced, its full value moves into the previous bidder's `pendingReturns` balance.
5. After close, `awardTender()` marks the tender awarded to the lowest bidder.
6. Any outbid or non-winning contractor calls `claimEmdRefund()` to withdraw their accumulated EMD.

Because the EMD is part of the bid value, a contractor cannot bid on a tender they could not back with a deposit, and a contractor cannot win a tender they have not escrowed.

---

## Features

**Live Procurement Console** — an active-tender selector drives a two-pane console: tender facts (department, category, estimated value in ETH and INR, live closing countdown, current lowest bid and bidder) on the left, and the reverse-auction offer form on the right. The form validates that your offer plus EMD undercuts the current lowest before any transaction is signed, and previews the INR equivalent.

**Multi-tender participation** — contractors hold concurrent positions across every open tender. Being outbid on one tender never touches your position on another; each tender's displaced value accrues independently and sums into a single claimable balance.

**Claimable EMD Vault** — a running total of every EMD released to you by an outbid or a non-winning close, with a one-click claim. Uses the pull-over-push refund pattern so a reverting recipient cannot block other contractors' withdrawals.

**Contractor Dashboard** — wallet balance, claimable EMD, tenders participated and bids submitted, plus a per-tender table of your offer, EMD and live status (`OPEN` / `EVALUATING` / `AWARDED`).

**Explore feed** — all live tenders with department filtering (NHAI, CPWD, Railways, Smart Cities), free-text search on title and reference number, status filtering and live closing countdowns. One click routes a tender into the console.

**On-chain audit trail** — every `TenderBidSubmitted` event rendered as a table with vendor ID, tender reference, offer in ETH and INR, EMD, timestamp and transaction hash. Filterable to a single tender or global.

**Department-aware imagery** — each department resolves a contextually relevant image, so a highway bridge tender does not render alongside a rolling-stock tender.

**Role-based local authentication** — Government Authority and Vetted Contractor roles with distinct permissions, resolved against a local user directory.

---

## Tech stack

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

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm

### 1. Install

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Start a local chain

```bash
npx hardhat node
```

Leave this running. It seeds ten pre-funded development accounts holding 10,000 ETH each.

### 3. Deploy the contract

In a second terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Copy the printed `Contract Address` into `CONTRACT_ADDRESS` in [`frontend/src/utils/constants.js`](frontend/src/utils/constants.js).

### 4. Seed demo tenders

The contract constructor seeds one NHAI highway tender. To add tenders across CPWD, Railways and Smart Cities:

```bash
npx hardhat run scripts/seed-tenders.js --network localhost
```

This is idempotent — already-published reference numbers are skipped.

### 5. Start the frontend

```bash
cd frontend && npm run dev
```

Open http://localhost:5173.

---

## Demo accounts

Sign in with any of these. Passwords are deliberately trivial because this is a **local development build only**.

| Role | Username | Password | Identity |
|---|---|---|---|
| Authority | `cpwd.nodal` | `govt123` | CPWD Nodal Officer |
| Authority | `nhai.officer` | `nhai456` | NHAI Project Director |
| Contractor | `sharma.contractors` | `vendor123` | Sharma Infrastructure Pvt Ltd |
| Contractor | `gupta.builders` | `build456` | Gupta Builders & Associates |
| Contractor | `singh.engineers` | `eng789` | Singh Engineering Works |

### A walkthrough

1. Sign in as `sharma.contractors` and submit an offer on tender `#0`.
2. Sign out, sign in as `gupta.builders`, and submit a **lower** offer on the same tender. Sharma is displaced.
3. Sign back in as `sharma.contractors`. The dashboard now shows a claimable EMD equal to Sharma's first offer, and the audit trail holds both bids.
4. Claim the refund and watch the wallet balance restore while the vault empties.

Submitting an offer **higher** than the current lowest is rejected client-side before any transaction is signed, and would revert on-chain regardless.

---

## Repository layout

```text
auction-dapp/
├── contracts/
│   └── TenderVault.sol        # Reverse-auction tender contract
├── scripts/
│   ├── deploy.js              # Deploys TenderVault
│   ├── seed-tenders.js        # Publishes demo tenders (idempotent)
│   ├── test-bidder2.mjs
│   └── validate-wallets.mjs
├── frontend/
│   └── src/
│       ├── components/        # Modals, toasts, countdown
│       ├── pages/             # Home console, Explore, Profile
│       └── utils/
│           ├── auth.js        # Local role directory + session
│           ├── accounts.js    # Virtual wallet signers
│           └── constants.js   # Contract address, ABI, imagery
├── artifacts/                 # Compiled contract output
├── hardhat.config.js
└── package.json
```

---

## Contract interface

```solidity
function createTender(
    string  referenceNo,
    string  title,
    string  description,
    string  category,
    string  department,
    string  documentUrl,
    uint256 estimatedValueWei,
    uint256 emdAmountWei,
    uint256 duration
) returns (uint256);

function submitBid(uint256 tenderId) payable;
function claimEmdRefund() returns (bool);
function awardTender(uint256 tenderId);
function pendingReturns(address bidder) view returns (uint256);
function getAllTenders() view returns (Tender[] memory);
```

Events emitted: `TenderCreated`, `TenderBidSubmitted`, `TenderAwarded`, `RefundClaimed`.

### Invariants the contract enforces

- A tender cannot be bid on after its `closingTime`.
- The authority that published a tender cannot bid on it.
- A bid below the EMD reverts.
- A bid at or above the current lowest reverts.
- Displaced value is credited before the new lowest is written.
- `claimEmdRefund` zeroes the balance **before** the transfer (checks-effects-interactions), so a reentrant recipient cannot double-spend.

---

## Deploying to a public network

The build targets a local Hardhat node. To run it against Sepolia or another EVM testnet:

1. Add the network to `hardhat.config.js` with an RPC URL and a funded deployer key via environment variables.
2. Deploy with `npx hardhat run scripts/deploy.js --network <name>`.
3. Build with the target chain and address set, so the frontend never falls back to the local defaults:

   ```bash
   VITE_RPC_URL=https://sepolia.infura.io/v3/<key> \
   VITE_CONTRACT_ADDRESS=0xYourDeployedAddress \
   npm run build
   ```

4. Replace the local `USER_DIRECTORY` with real wallet-based authentication.

**Do not** deploy the current `auth.js` or `accounts.js` to a public network. They contain the well-known Hardhat development keys and plaintext passwords, which anyone can spend from. Those values are imported at module scope, so they are bundled into whatever JavaScript you serve — deleting them from the UI is not enough. Until that auth layer is replaced, this project should stay on a local Hardhat node.

---

## Security notes

- This is a **demonstration build**. It has not been audited and is not fit for real procurement.
- EMDs are held in the contract. On a public network that means real value at risk.
- Local authentication is client-side and trivially bypassable by editing `localStorage`. Production use needs a wallet-signature challenge.
- Reverse auctions reward aggressive underbidding. Real tender rules usually require a qualifying floor and a security agreement; neither is modelled here.

---

## License

MIT
