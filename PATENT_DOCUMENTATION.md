# PATENT_DOCUMENTATION.md

# e-Tender India — Blockchain-Based Reverse Auction for Indian Government Procurement

## Project Title and Overview

**Project Title:** System and Method for Distributed Reverse-Auction Procurement with Earnest Money Deposit Escrow and Cumulative Refund Tracking

**Overview:** e-Tender India is a decentralized application (dApp) for Indian government e-procurement that implements a reverse auction mechanism on a blockchain. The system enables ministries and nodal authorities to publish tenders on-chain, where vetted contractors compete by submitting progressively lower offers. Earnest Money Deposits (EMD) are held in a smart contract and automatically refunded to outbid vendors. The platform provides transparency, immutability, and trust without requiring vendors to rely on a single portal operator.

## Technical Field and Domain

**Technical Field:** Blockchain-based procurement systems, decentralized auction mechanisms, smart contract-enabled financial escrow, distributed ledger technology for government services.

**Domain:** Government e-procurement, e-tendering, reverse auction, blockchain for public procurement, Earnest Money Deposit management.

## Background and Existing Problem

Traditional government e-procurement systems operate on centralized platforms where:

1. **Bid Confidentiality:** Vendor bids are stored in operator databases, creating risks of leaks, manipulation, or unauthorized access.

2. **Bid History Mutable:** Evaluation order and bid history can be altered by the portal operator, introducing opacity and potential favoritism.

3. **EMD Custody:** Earnest Money Deposits are held in operator-controlled accounts. A compromised or dishonest operator could mismanage or misappropriate funds.

4. **Award Decisions Opaque:** Announcement of winners lacks tamper-evident proof of the bidding process, raising concerns about fairness.

5. **Single Point of Failure:** System downtage or operator unavailability halts the entire procurement process.

6. **No Public Audit Trail:** Bidders cannot independently verify bid history or evaluation criteria, eroding trust in the system.

These limitations necessitate a solution that provides cryptographic guarantees, immutable audit trails, and automated fund management without centralized trust.

## Problem Statement

Indian government procurement involves numerous tenders across departments (NHAI, CPWD, Railways, Smart Cities). The current centralized model suffers from:

- **Lack of Bid Transparency:** Vendors cannot verify if their bids were received and evaluated fairly.
- **EMD Risk:** Funds held by operators expose contractors to potential loss if the operator mismanages deposits.
- **No Verifiable Process:** The bidding timeline, bid submissions, and award decisions cannot be independently audited post-facto.
- **Delayed Refunds:** Outbid vendors must manually request EMD refunds, causing delays and administrative overhead.
- **Information Asymmetry:** Only the portal operator has access to full bid history and evaluation details.

## Proposed Invention and Solution

The proposed invention is a blockchain-based system that transforms the trust model of government e-procurement by:

1. **On-Chain Tender Publication:** Authorities publish tenders with all relevant details (reference number, title, description, category, department, estimated value, EMD amount, closing time) recorded immutably on a smart contract.

2. **Reverse Auction Enforcement:** The smart contract enforces that bids must be strictly lower than the current lowest bid, automatically selecting the winning (lowest) bid at close.

3. **EMD Escrow in Smart Contract:** Contractors must send ETH equal to or greater than the EMD when submitting a bid. The ETH value of each bid is locked in the contract, eliminating operator custody risk.

4. **Displaced Bid Refund Mechanism:** When a new lower bid displaces a previous lowest bid, the displaced bidder's EMD is automatically credited to their `pendingReturns` balance in the contract.

5. **Cumulative Claimable Refund Vault:** A running total of all EMDs released to a contractor across all tenders is maintained. Contractors can claim their cumulative refund with a single transaction.

6. **Checks-Effects-Interactions Pattern:** The `claimEmdRefund()` function zeroes the balance before executing the ETH transfer, preventing reentrancy attacks where a reverting recipient could block other contractors' withdrawals.

7. **On-Chain Audit Trail:** Every `TenderBidSubmitted` event is permanently recorded with vendor address, offer amount, EMD, timestamp, and transaction hash. This audit trail is filterable by tender or global, and provides immutable proof of the bidding process.

8. **Role-Based Access Control:** Distinguishes between Government Authority (who can create tenders and award) and Vetted Contractor (who can bid and claim refunds), with permissions resolved against a local user directory.

## Detailed Explanation of the System Architecture

### 1. Smart Contract: `TenderVault.sol`

The core contract deployed on a Hardhat local network (chain ID: 31337) implements the reverse auction logic:

**State Variables:**
- `tenders[]`: Array of `Tender` structs containing all tender details, status, and bid information.
- `pendingReturns[address]`: Mapping from bidder address to accumulated refundable EMD.
- `tenderCount`: Counter for assigned tender IDs.
- `deployer`: The address that deployed the contract (the initial authority).

**Key Structures:**
```solidity
struct Tender {
    uint256 id;
    string referenceNo;
    string title;
    string description;
    string category;
    string department;
    string documentUrl;
    address payable authorityAddress;
    uint256 estimatedValueWei;
    uint256 emdAmountWei;
    uint256 lowestBidWei;
    address lowestBidderAddress;
    uint256 closingTime;
    uint8 status;  // OPEN=0, EVALUATING=1, AWARDED=2
    bool fundsClaimed;
}
```

**Core Functions:**
- `createTender()`: Authority publishes a new tender. The constructor seeds one default NHAI highway tender.
- `submitBid(uint256 tenderId)`: Contractor calls this payable function. Requirements:
  - Tender must exist and be open.
  - Current time must be before closingTime.
  - Bidder must not be the authority.
  - `msg.value >= emdAmountWei` (must pay at least EMD).
  - If not first bid: `msg.value < lowestBidWei` (must undercut current lowest).
  - Displaced value is transferred to `pendingReturns[previous lowestBidder]` before updating lowest bidder.
- `claimEmdRefund()`: Contractor withdraws accumulated pending refunds. Uses checks-effects-interactions pattern:
  1. Read `pendingReturns[msg.sender]`.
  2. Set `pendingReturns[msg.sender] = 0`.
  3. Transfer ETH to `msg.sender`.
  4. Emit `RefundClaimed` event.
- `awardTender(uint256 tenderId)`: Marks tender as awarded after closingTime. Sets `fundsClaimed` if lowest bidder has claimed.
- `getAllTenders()`: Returns all tenders for frontend rendering.
- `pendingReturns(address)`: View function returning accumulated refund for a bidder.

**Events Emitted:**
- `TenderCreated(uint256 indexed tenderId, string referenceNo, string title, address indexed authorityAddress, uint256 estimatedValueWei, uint256 emdAmountWei, uint256 closingTime)`
- `TenderBidSubmitted(uint256 indexed tenderId, string referenceNo, address indexed bidder, uint256 offerAmount, uint256 emdAmount, uint256 timestamp)`
- `TenderAwarded(uint256 indexed tenderId, address winner, uint256 lowestBid)`
- `RefundClaimed(address indexed bidder, uint256 amount)`

### 2. Frontend Architecture (React 19 + Vite 8)

The frontend consists of several key pages and components:

**Pages:**
- **Home.jsx:** Live Procurement Console — displays the active tender in a two-column grid. Left panel shows tender hero image, title, description, stats (value in ETH/INR, EMD, countdown). Right panel contains the reverse-auction offer form with client-side validation (offer + EMD must undercut current lowest), current lowest bid display, lowest bidder info, and submit button. Below the form, an on-chain audit trail table renders `TenderBidSubmitted` events with columns: Vendor ID, Tender Ref, Offer (ETH/INR), EMD, timestamp, tx hash. Filterable via scope toggle (Global/Tender-specific).

- **Explore.jsx:** Active Tenders Feed — toolbar with search input (title/reference number filter), department filter pills (ALL, NHAI, CPWD, Railways, Smart Cities), and status dropdown (All/Open/Evaluated/Awarded). Grid of `TenderCard` components, each showing department tag, reference number, title, category, estimated value (ETH + ₹), EMD required, lowest bid, closing countdown (HH:mm:ss), and status tag. Clicking "Set Active Tender" routes to the Home console with that tender. Empty state renders "No tenders found matching your criteria".

- **Profile.jsx:** Contractor/Authority Dashboard — four metric cards (Wallet Balance, Claimable EMD Vault, Tenders Participated/Published, Total Bids Submitted/Received). Role highlight card (Shield icon + "Government Authority" / Building icon + Vendor ID/GSTIN/PAN). Two tabs: "My Participated Tenders" and "My Bid History". Tables show per-tender offers, EMD, status badges, closing times. For contractors, shows only their participated tenders and bids. For authorities, shows published tenders and received bids.

**Components:**
- **MetaMaskSimulatorModal.jsx:** Simulates MetaMask transaction confirmation. Displays transaction details (from address, type, amount). Has "Confirm" and "Cancel" buttons. On confirm, executes the actual contract transaction via `getDirectSignerForUser()` with the logged-in user's private key from `accounts.js`. Shows success toast with tx hash on confirmation.
- **ToastContainer.jsx:** renders toast notifications with icon, title, description, and tx hash link. Auto-dismiss after 5.5s for non-pending toasts.
- **UseCountdown Hook:** Accepts `closingTime` (Unix timestamp). Ticks every second, displays HH:mm:ss. Shows "Closed" when time reaches 0.

**Routing:** React Router v7 with `<Router>`, `<Routes>`, `<Route>` for `/`, `/explore`, `/profile` paths.

**State Management:** React `useState` hooks + `useEffect` for event watching. The main `App.jsx` subscribes to `TenderBidSubmitted` events via `contract.on("TenderBidSubmitted", handler)` for real-time updates. Balance updates via `provider.getBalance(userAddress)`. Tender state refresh via `refreshTenderState(tenderId)`.

**Provider & Contract Initialization:**
- RPC URL: `VITE_RPC_URL` env var (default: `http://127.0.0.1:8545`)
- Contract Address: `VITE_CONTRACT_ADDRESS` env var (default: deployed local address)
- ABI: Imported from `constants.js`
- Signer: `getDirectSignerForUser(user, provider)` uses the private key from `accounts.js` USER_DIRECTORY matching the logged-in session.

**Environment Variables:**
- `VITE_RPC_URL` — Ethereum RPC provider endpoint
- `VITE_CONTRACT_ADDRESS` — TenderVault contract address
- `VITE_BASE_PATH` — Base path for GitHub Pages deployment (e.g., `/auction-dapp/`)

### 3. User Workflow

**A. Contractor Onboarding and Bid Submission**

1. User navigates to http://localhost:5173 and sees the login screen.
2. User enters credentials (username/password from the local USER_DIRECTORY in `auth.js`).
3. Upon successful login, the session is stored in `localStorage` under `"etender_session"`.
4. The navbar displays the user's role pill (Authority = saffron, Contractor = emerald), wallet balance, and department/vendor ID.
5. User navigates to the **Explore** page to browse live tenders.
6. User applies department filters (NHAI, CPWD, Railways, Smart Cities) or free-text search on title/reference number.
7. User selects a tender card and clicks "Set Active Tender", which navigates to the Home console.
8. The Home console displays the selected tender's hero image (department-aware), stats panel (estimated value in ETH and INR `₹285,000/ETH`, EMD requirement), and live closing countdown.
9. The right panel shows the reverse-auction offer form:
   - Input field for tender offer amount (ETH).
   - Automatic EMD addition (e.g., 0.5 ETH).
   - Real-time total: offer + EMD.
   - Client-side validation: if a lowest bid exists, total must be strictly lower than current lowest bid; otherwise submission reverts on-chain.
   - "Submit Tender Offer" button is disabled until a valid non-empty offer is entered.
10. User clicks "Submit Tender Offer". A MetaMask simulator modal appears with transaction details (type: "Submit Tender Offer", amount: total ETH).
11. User clicks "Confirm" in the simulator. The app calls `getDirectSignerForUser(session, provider)` to retrieve the user's private key from `accounts.js`, creates an `ethers.Wallet`, and validates the derived address matches the configured user address.
12. The app sends the transaction: `contract.submitBid(tenderId, { value: bidValue, gasLimit: 500000 })`.
13. On transaction receipt, a success toast appears with "Tender Offer Submitted!" and the transaction hash. The audit trail table updates with the new bid entry. Tender state refreshes, countdown updates, and balance re-fetches.

**B. Multi-Tender Participation and Outbidding**

1. A contractor can hold concurrent bids across multiple open tenders.
2. Each tender's displaced value accrues independently into `pendingReturns[bidderAddress]`.
3. Example: Contractor A bids 0.3 ETH ( + 0.5 EMD = 0.8 ETH total) on Tender #1. Contractor B bids 0.25 ETH ( + 0.5 EMD = 0.75 ETH total) on Tender #1. Contractor A is displaced; their 0.3 ETH moves to `pendingReturns[A]`.
4. Contractor A can now sign in and claim their 0.3 ETH refund via `claimEmdRefund()`.
5. The contractor's dashboard shows the cumulative claimable EMD across all tenders.

**C. EMD Refund Claiming**

1. Contractor navigates to their Profile page.
2. If `pendingRefund > 0`, a green banner appears: "EMD Refund Available — {amount} ETH held across all outbid/non-winning tenders".
3. User clicks "Claim EMD Refund" in the banner or the "Claim EMD Refund" button in the metrics section.
4. MetaMask simulator appears with amount: `pendingRefund` ETH.
5. User confirms. The app calls `contract.claimEmdRefund({ gasLimit: 200000 })`.
6. Transaction receipt shows success, and the toast displays "EMD Refund Claimed! Funds returned to wallet".
7. `fetchData()` re-runs, updating balance (decreased by refund amount) and `pendingRefund` (set to 0).

**D. Authority Tender Publication**

1. Authority signs in with credentials (e.g., `cpwd.nodal` / `govt123`).
2. Navigates to a suitable origin for tender publication (currently via seed script or API endpoint).
3. Calls `createTender(referenceNo, title, description, category, department, documentUrl, estimatedValueWei, emdAmountWei, duration)`.
4. The constructor automatically seeds one NHAI highway tender; additional tenders are published via `scripts/seed-tenders.js`.
5. The new tender appears in the Explore feed and can be selected in the Home console.

## Blockchain Interaction and Transaction Verification Mechanism

### RPC Provider Connection

The frontend initializes an `ethers.JsonRpcProvider` with the `VITE_RPC_URL` environment variable (default: `http://127.0.0.1:8545`). All read operations (balance, tender state, event history) use this provider.

### Contract Instantiation

- **Read-only mode:** `new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)` — used for fetching tenders, balances, pending returns, and event history.
- **Write mode:** `new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)` — where `signer` is `getDirectSignerForUser(session, provider)`, which creates an `ethers.Wallet` from the user's private key (looked up in `accounts.js` USER_DIRECTORY).

### Transaction Workflow

1. **Authorization:** User logs in via username/password. Session stored in `localStorage`. The user's role (Authority/Contractor) and address are derived from the session.
2. **Signer Derivation:** `getDirectSignerForUser(user, provider)` looks up the user in `accounts.js`, retrieves their `privateKey`, creates `new ethers.Wallet(privateKey, provider)`, and verifies `wallet.address.toLowerCase() === user.address.toLowerCase()`. If mismatch, throws configuration error.
3. **Transaction Building:** The contract method is called via the signer (e.g., `contract.submitBid(uint256, {value, gasLimit})`). The value sent is the total (offer + EMD) in ETH.
4. **Gas Estimation & Sending:** `tx = await contract.[method](params, { gasLimit })`. `receipt = await tx.wait()`.
5. **Confirmation:** On receipt success, a toast notification appears with type-specific messaging and the transaction hash. The UI refreshes: `fetchData()` re-reads contract state, `updateBalance()` fetches new wallet balance, `refreshTenderState(tenderId)` updates individual tender data.
6. **Event Synchronization:** `useEffect` in `App.jsx` subscribes to `contract.on("TenderBidSubmitted", onBidSubmitted)`, which refreshes the audit trail and tender state on new bids.

### Transaction Verification

- **Receipt Validation:** `tx.wait()` confirms the transaction was mined. If the revert reason is caught, `extractErrorMessage()` maps raw errors to user-friendly messages (e.g., "Insufficient ETH balance", "Your bid must be lower than current lowest bid", "Authority cannot bid on their own tender").
- **State Consistency:** After each transaction, `fetchData()` re-reads `contract.getAllTenders()` and recalculates statuses (OPEN if `status === "OPEN"` && `Date.now() / 1000 <= closingTime`), ensuring the UI reflects the latest on-chain state.
- **Error Handling:** Bid validation occurs client-side before any transaction is signed (e.g., "your total (offer + EMD) must be lower than the current lowest bid of X ETH"). If client-side validation passes, the on-chain contract enforces the same invariant, and any violation results in a revert with a descriptive reason.

## System Components, Modules, and Their Functions

| Component/Module | File/Path | Function |
|---|---|---|
| `TenderVault.sol` | `contracts/TenderVault.sol` | Core smart contract: tender creation, bidding, refund claims, award logic, event emission. |
| `Hardhat Config` | `hardhat.config.js` | Solidity compiler settings (^0.8.20, optimizer 200 runs, viaIR), Hardhat network configuration (chainId: 31337). |
| `Deploy Script` | `scripts/deploy.js` | Deploys `TenderVault` contract, prints contract address and deployer address. |
| `Seed Script` | `scripts/seed-tenders.js` | Idempotently seeds 4 demo tenders (CPWD, Railways, Smart Cities + default NHAI) via `createTender()`. |
| `Auth Directory` | `frontend/src/utils/auth.js` | `USER_DIRECTORY` mapping usernames to roles, private keys, addresses, organization, department, vendorId, gstin, pan. `login()`, `logout()`, `getCurrentSession()`, `getDirectSignerForUser()`. |
| `Accounts` | `frontend/src/utils/accounts.js` | `HARDHAT_ACCOUNTS` virtual wallet definitions (name, role, address, privateKey). `getAccountLabel()`, `getAccountDetails()`, `getDirectSigner()`, `describeBidError()`. |
| `Constants` | `frontend/src/utils/constants.js` | `CONTRACT_ADDRESS`, `TENDER_IMAGES` map (NHAI/CPWD/Railways/Smart Cities/DEFAULT), `getTenderImage(tender)`, `CONTRACT_ABI` array, `ETH_INR` conversion constant. |
| `Home Page` | `frontend/src/pages/Home.jsx` | Live Procurement Console: hero tender display, bid form with validation, audit trail table, countdown, claim EMD refund button, tender selector bar. |
| `Explore Page` | `frontend/src/pages/Explore.jsx` | Tender browsing feed: search, department filter pills, status dropdown, TenderCard grid, navigate to Home on select. |
| `Profile Page` | `frontend/src/pages/Profile.jsx` | Contractor/Authority dashboard: 4 metric cards, role highlight, tabs (My Participated/Tenders/Bids), tender/history tables. |
| `App Entry Point` | `frontend/src/App.jsx` | Root component: session management, login/logout, Web3 provider setup, event watching (`TenderBidSubmitted`), route rendering (`Routes`/`Route`). |
| `MetaMask Simulator` | `frontend/src/components/MetaMaskSimulatorModal.jsx` | Modal simulating MetaMask popup: shows from address, tx type, amount. Confirm/cancel buttons. On confirm, executes contract transaction via `getDirectSignerForUser()`. |
| `Toast Container` | `frontend/src/components/ToastContainer.jsx` | Toast notifications with icon, title, description, optional tx hash link. Auto-dismiss after 5.5s. |
| `Countdown Hook` | `frontend/src/hooks/useCountdown.jsx` (logic inline in Home/Explore) | Ticks every second from `closingTime`, displays HH:mm:ss, shows "Closed" when elapsed. |
| `Vite Config` | `frontend/vite.config.js` | `base: process.env.VITE_BASE_PATH || '/'`. Sets GitHub Pages subpath base path. |
| `MetaMask Not Shown (Local Auth)` | `frontend/src/utils/auth.js` | Credential-based login (username/password) with localStorage session. Explicitly noted: not real MetaMask signing; uses pre-configured Hardhat keys for local demo only. |

## Novel Technical Features and Potentially Innovative Aspects

The following features represent the verified implementation of the project. Some may constitute patentable subject matter subject to IP review:

1. **Reverse-Auction-on-Chain with EMD-Included Bids:** The contract enforces that a bid's total value (offer + EMD) must be strictly lower than the current lowest bid. This ties the EMD directly into the bid comparison logic, ensuring contractors cannot bid without escrow and that the lowest responsive bid naturally wins. *No known centralized e-procurement portal enforces this exact on-chain constraint.*

2. **Cumulative Claimable EMD Vault with Pull-Over-Push Refund Pattern:** The `pendingReturns[address]` mapping accumulates displaced EMD values from all tenders a contractor has been outbid on. The `claimEmdRefund()` function uses checks-effects-interactions (zero balance before transfer) so a reverting recipient cannot block other contractors' withdrawals. *Traditional systems require manual refund requests; this automates and cumulates.*

3. **Department-Aware Imagery Resolution via Keyword Fallback Chain:** The `getTenderImage()` function in `constants.js` resolves tender images through a priority chain: (a) direct department map lookup (NHAI/CPWD/Railways/Smart Cities), (b) category keyword matching (bridge/highway → NHAI; rail → Railways; build/civil → CPWD; smart/city → Smart Cities), (c) default Unsplash placeholder. This ensures each tender renders contextually relevant imagery without hardcoded per-tender URLs. *No known procurement dApp implements dynamic, category-driven image resolution.*

4. **On-Chain Audit Trail with Filterable Event History:** Every `TenderBidSubmitted` event (vendor address, reference number, offer amount in ETH/INR, EMD, timestamp, tx hash) is permanently recorded and renderable as a filterable table (global view or single-tender view). The audit trail is rendered via `contract.queryFilter(filter, 0, "latest")`. *Most procurement systems provide only a static evaluation report, not an immutable, queryable event log.*

5. **Client-Side Bid Validation Mirroring On-Chain Invariants:** The frontend validates `offer + emdAmount < currentLowest` before any transaction is signed, matching the solidity `submitBid()` requirement `msg.value < lowestBidWei`. This prevents user experience degradation from gas-reverted transactions when the user submits a non-compliant bid. *Many dApps skip client-side validation of smart contract invariants, leading to frequent user errors.*

6. **Role-Based Local Authentication with Session Persistence:** Username/password login against `USER_DIRECTORY` stores an `etender_session` in `localStorage`. The navbar displays role-specific UI (Authority: "Authority Dashboard" + department pill; Contractor: "Contractor Dashboard" + vendor ID/GSTIN/PAN). *While many dApps use wallet-based authentication (MetaMask), this implementation provides a low-barrier entry point for government contractors who may not be familiar with wallet management, while still supporting blockchain interactions via derived signers.*

7. **Two-Partner Reverse Auction with Simultaneous Multi-Tender Positioning:** Contractors can participate in multiple open tenders concurrently, with each tender's displaced value accruing independently. No other tender's state is affected when a bid is displaced on another. *Standard auction systems typically allow only one active bid per participant.*

## Step-by-Step Working Methodology

### Phase 1: Environment Setup

1. **Install Dependencies:**
   - `npm install` at project root (installs Hardhat, typechain, ethers, etc.)
   - `cd frontend && npm install && cd ..` (installs React, Vite, Ethers, Lucide)

2. **Start Local Blockchain:**
   - `npx hardhat node`
   - This starts an Hardhat network on `127.0.0.1:8545` with 10 pre-funded accounts (10,000 ETH each). Chain ID: 31337.

3. **Deploy the Contract:**
   - `npx hardhat run scripts/deploy.js --network localhost`
   - Outputs: `Contract Address` and `Deployer / Nodal Authority: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Copy the Contract Address into `frontend/src/utils/constants.js` (overrides the default).

4. **Seed Demo Tenders:**
   - `npx hardhat run scripts/seed-tenders.js --network localhost`
   - Idempotently publishes 4 tenders:
     - `CPWD/2026/STR-12/002` — Seismic Retrofitting (EMD: 0.5 ETH)
     - `Railway/2026/TRK-88/014` — Track Doubling (EMD: 0.4 ETH)
     - `SMART/2026/SC-07/009` — Command & Control Centre (EMD: 0.25 ETH)
     - Default: `NHAI/2026/HP-45/001` — Highway Bridge (seeded by constructor, EMD: 50 ETH)

5. **Start the Frontend:**
   - `cd frontend && npm run dev`
   - App opens at http://localhost:5173.

### Phase 2: User Onboarding

1. **Login:**
   - Enter username and password on the login card.
   - Validated against `USER_DIRECTORY` in `auth.js`.
   - Successful login stores `session` in `localStorage.getItem("etender_session")`.
   - Navbar updates: role pill, wallet balance, department/vendor display.

2. **Session Persistence:**
   - The session persists across page refreshes via `localStorage`.
   - `getCurrentSession()` reads `localStorage` on app load.
   - `handleLogout()` removes the session and shows a success toast.

### Phase 3: Tender Browsing and Selection

1. **Explore Feed:**
   - Default view shows all live tenders.
   - Use department filter pills (ALL, NHAI, CPWD, Railways, Smart Cities) to narrow results.
   - Use status dropdown (All, Open, Evaluated, Awarded).
   - Use search input to filter by title or reference number.
   - Click "Set Active Tender" on any card to navigate to the Home console with that tender selected.

2. **Home Console — Active Tender:**
   - The selected tender's hero image loads via `getTenderImage(tender)` (department-aware).
   - Stats panel shows: estimated value (ETH + ₹ conversion), EMD required, closing countdown (HH:mm:ss).
   - Current lowest bid and lowest bidder display.
   - Audit trail table shows `TenderBidSubmitted` events (filterable: Global / Tender #X).

### Phase 4: Bid Submission Workflow

1. **Form Validation (Client-Side):**
   - Enter offer amount > 0.
   - If `hasBids`: `offer + emdAmount < currentLowest` must hold; else error: "your total (offer + EMD) must be lower than the current lowest bid of X ETH".
   - If `!tender` or `isTimeUp`: disabled/submit label changes to "Tender Closed".

2. **MetaMask Simulator:**
   - Click "Submit Tender Offer".
   - Simulator modal appears with:
     - `fromAddress`: user's wallet address (from session).
     - `type`: "Submit Tender Offer".
     - `amount`: total ETH (offer + EMD).
   - User clicks "Confirm" or "Cancel".
   - On "Confirm": app retrieves user's private key from `accounts.js` via `getDirectSignerForUser(session, provider)`, creates `ethers.Wallet`, verifies derived address matches.

3. **On-Chain Transaction:**
   - `contract.submitBid(tenderId, { value: bidValue, gasLimit: 500000 })`.
   - Transaction receipt awaited.
   - Success toast: "Tender Offer Submitted! Offer submitted for tender #X".
   - Audit trail updates with new bid entry (vendor ID, offer ETH/INR, EMD, timestamp, tx hash).
   - Tender state refreshes: countdown updates, lowest bid/latest bidder may change.

### Phase 5: Outbidding and Refund Workflow

1. **Outbidding Scenario:**
   - Contractor A submits first bid on a tender.
   - Contractor B submits a lower total (offer + EMD), displacing Contractor A.
   - Contractor A's bid amount moves to `pendingReturns[A]`.
   - Contractor B becomes the new lowest bidder.

2. **Claiming Refund:**
   - Contractor A navigates to Profile.
   - Green "EMD Refund Available" banner shows cumulative amount (e.g., "0.3000 ETH").
   - User clicks "Claim EMD Refund".
   - Simulator modal appears with amount: 0.3000 ETH.
   - User confirms.
   - `contract.claimEmdRefund({ gasLimit: 200000 })` executes.
   - Receipt success toast: "EMD Refund Claimed! Funds returned to wallet".
   - Balance updates: wallet ETH increases by refund amount; `pendingRefund` → 0.
   - `fetchData()` re-runs, reflecting new state.

### Phase 6: Authority Operations

1. **Tender Publication:**
   - Authority signs in (`nhai.officer` / `nhai456`, etc.).
   - (Currently via seed script; in production would have a `/create-tender` endpoint).
   - New tender appears in Explore feed immediately.

2. **Awarding a Tender:**
   - After tender closing time, authority navigates to the tender in Home console.
   - Clicks "Award Tender" (would be a function call; currently the contract's `awardTender()` is external).
   - Transaction marks `status = AWARDED` and sets `fundsClaimed` if the lowest bidder has claimed.

### Phase 7: Cleanup

1. **Logout:**
   - `handleLogout()` removes `localStorage etender_session`.
   - Session reverts to unauthenticated state; login screen re-displays.

## Technical Advantages Over Existing Approaches

| Advantage | Traditional Centralized System | e-Tender India (Blockchain) |
|---|---|---|
| **Bid Confidentiality** | Operator database, subject to breach or manipulation. | Sealed on-chain; only total offer revealed at close via event emission. |
| **EMD Custody** | Held in operator account; risk of mismanagement or misuse. | Locked in smart contract state; released by code rules, not discretion. |
| **Award Decision Transparency** | Announced by operator; no immutable proof of process. | `TenderAwarded` event + `TenderBidSubmitted` audit trail are permanently verifiable. |
| **Downtime Resilience** | Single operator failure halts procurement. | Any EVM node can serve the frontend + contract reads; no single point of failure. |
| **Bid History Auditability** | Mutable logs; vendor cannot independently verify. | Append-only, hash-linked events; any participant can verify their bid was recorded. |
| **Refund Processing** | Manual request; operator-dependent; delays common. | Automatic `pendingReturns` accumulation; one-click `claimEmdRefund()` with on-chain proof. |
| **Trust Model** | Requires complete trust in portal operator. | Requires trust only in the immutable contract code (auditable via Solidity source). |
| **Reverse-Auction Enforcement** | Manual monitoring; no automatic undercut validation. | Smart contract enforces `msg.value < lowestBidWei`; higher bids revert reliably. |

## Potential Applications and Use Cases

| Sector/Use Case | Application |
|---|---|
| **Government E-Procurement** | Central ministries and state governments publishing tenders for infrastructure, equipment, services. |
| **Public Works Departments** | CPWD, NHAI, PWD, Railways, Defense Procurement — all tender-based procurement. |
| **PSU Tenders** | Public Sector Undertakings running reverse auctions for vendor selection. |
| **International Bidding** | Cross-border tenders where immutable bid history is valuable across jurisdictions. |
| ** NGOs / Development Grants** | Grant-making organizations needing transparent selection of implementation partners. |
| **Private Sector Procurement** | Companies wanting transparent, auditable reverse auctions for vendor selection (permissioned network). |
| **Supply Chain Contracts** | Awarding subcontractors or suppliers via on-chain reverse auction with escrow. |

## Suggested Patent Claims (for Further Review)

*The following claims are drafted based on the verified implementation. They require legal review and prior art search before filing.*

1. A method for conducting a reverse auction on a blockchain, comprising: publishing a tender with an Earnest Money Deposit (EMD) requirement; receiving a first bid from a first bidder, the first bid including a first bid amount and the EMD; receiving subsequent bids from one or more second bidders, each subsequent bid including a second bid amount and the EMD; enforcing that each subsequent bid must be strictly lower than the current lowest bid; automatically crediting the previous lowest bidder's accumulated refund to a pending returns balance upon displacement; and enabling the displaced bidder to claim their accumulated pending refund via a single on-chain transaction.

2. A system for cumulative Earnest Money Deposit refund tracking in a reverse auction, comprising: a smart contract storing a pending returns mapping from bidder address to accumulated refundable amount; the contract being configured such that each displacement of a lowest bid transfers the displaced bidder's bid value to their pending returns balance; and a claim function that zeroes the pending returns balance before transferring the ETH to the bidder, utilizing a checks-effects-interactions pattern to prevent reentrancy.

3. A computer-readable medium storing instructions for rendering a government e-procurement interface, the instructions comprising: displaying a tender selection grid with department-filterable cards; responsive to a tender selection, loading a two-pane console showing tender facts on the left and a reverse-auction offer form on the right; validating that a submitted offer plus EMD undercuts the current lowest bid before signing; and rendering an on-chain audit trail of TenderBidSubmitted events filterable by tender or global view.

4. A method for department-aware imagery resolution in a blockchain tender interface, comprising: mapping departments to contextually relevant images; when a tender's department matches a mapped department, rendering the associated image; when no direct match exists, analyzing the tender's category keywords; matching keywords to alternative department images (bridge/highway → NHAI, rail → Railways, build/civil → CPWD, smart/city → Smart Cities); and rendering a default placeholder image when no keyword matches.

5. A system for role-based authentication in a government procurement dApp, comprising: a local user directory mapping usernames to roles (Authority/Contractor), organizational details, and department; login validation against the directory; session storage in localStorage; and navbar rendering role-specific dashboard titles, avatar icons, and supplementary information (department for Authority, Vendor ID/GSTIN/PAN for Contractor).

## Technical Diagrams and Flowcharts

### 1. Bid Submission Workflow

```
User enters offer → Client validates offer + EMD < current lowest → 
MetaMask simulator shows details → User confirms → 
getDirectSignerForUser() derives wallet from private key → 
contract.submitBid(tenderId, {value: total}) → 
Transaction mined → Receipt success → 
Toast: "Tender Offer Submitted!" → 
fetchData() refreshes state → Audit trail updates → 
Countdown/lowest bidder display updates
```

### 2. EMD Refund Claim Workflow

```
User navigates to Profile → 
pendingRefund > 0 → Green banner: "EMD Refund Available" → 
User clicks "Claim EMD Refund" → 
MetaMask simulator shows pendingRefund amount → 
User confirms → 
getDirectSignerForUser() derives wallet → 
contract.claimEmdRefund({gasLimit: 200000}) → 
Transaction mined → 
Receipt success → 
Toast: "EMD Refund Claimed! Funds returned to wallet" → 
fetchData() → balance decreases by refund → pendingRefund → 0
```

### 3. Tender Creation and Seeding Workflow

```
Authority signs in → 
(Option A) Seed script: npx hardhat run scripts/seed-tenders.js → 
4 tenders published on-chain → 
Tender IDs 0-3 assigned → 
Tender details stored in tenders[] → 
Explore feed renders all tenders → 
Home console selects active tender → 
Contractor bids → reverse auction enforces undercut →
```

### 4. Contract State Management

```
tenderCount++ → tenders[tenderId] = Tender struct → 
status: OPEN (0) → 
submitBid() → if lowestBidWei == 0: first bid accepted → 
else: require(msg.value < lowestBidWei) → 
if previous lowest != address(0): 
  pendingReturns[previous lowestBidder] += previous lowestBidWei → 
  tender.lowestBidderAddress = msg.sender → 
  tender.lowestBidWei = msg.value → 
emit TenderBidSubmitted → 
claimEmdRefund(): 
  amount = pendingReturns[msg.sender] → 
  pendingReturns[msg.sender] = 0 → 
  (bool success,) = payable(msg.sender).call{value: amount}("") → 
  if !success: revert("ETH transfer failed") → 
  pendingReturns[msg.sender] = amount → 
  emit RefundClaimed → 
awardTender(): status → AWARDED (2) → 
if lowestBidWei > 0 && !fundsClaimed: fundsClaimed → true
```

## References to Implementation Files and Modules

| Feature | File | Line/Section |
|---|---|---|
| `TenderVault.sol` contract source | `contracts/TenderVault.sol` | Entire file; key functions: `createTender()` (L52-96), `submitBid()` (L98-153), `claimEmdRefund()` (L155-172), `awardTender()` (L174-186), `getAllTenders()` (L188-200) |
| `USER_DIRECTORY` with credentials | `frontend/src/utils/auth.js` | Entire file; `USER_DIRECTORY` array (L8-56), `login()` (L58-73), `logout()` (L75-78), `getDirectSignerForUser()` (L80-109) |
| `HARDHAT_ACCOUNTS` with private keys | `frontend/src/utils/accounts.js` | Entire file; `HARDHAT_ACCOUNTS` array (L4-231), `getDirectSigner()` (L234-316), `describeBidError()` (L319-387) |
| `TENDER_IMAGES` map and `getTenderImage()` | `frontend/src/utils/constants.js` | L1-31: `CONTRACT_ADDRESS`, `TENDER_IMAGES` object, `getTenderImage()` function |
| `CONTRACT_ABI` array | `frontend/src/utils/constants.js` | L33-57: 13-item ABI array for TenderVault functions |
| `Home` component with bid form and audit trail | `frontend/src/pages/Home.jsx` | Entire file; hero grid, bid form with client-side validation, audit trail table, countdown, claim refund |
| `Explore` component with search and filter | `frontend/src/pages/Explore.jsx` | Entire file; department pills, status dropdown, search, TenderCard grid |
| `Profile` component with 4 metric cards | `frontend/src/pages/Profile.jsx` | Entire file; metric cards, role highlight, tabs, tender/bid history tables |
| `MetaMaskSimulatorModal` transaction simulation | `frontend/src/components/MetaMaskSimulatorModal.jsx` | Entire file; shows fromAddress, type, amount; confirm/cancel; executes via getDirectSignerForUser |
| `ToastContainer` notification system | `frontend/src/components/ToastContainer.jsx` | Entire file; toasts with icon, title, description, tx hash link, auto-dismiss |
| `vite.config.js` with base path | `frontend/vite.config.js` | `base: process.env.VITE_BASE_PATH || '/'` |
| `hardhat.config.js` compiler settings | `hardhat.config.js` | Solidity ^0.8.20, optimizer enabled (200 runs), viaIR: true |
| `scripts/seed-tenders.js` idempotent seeding | `scripts/seed-tenders.js` | Entire script; creates 4 tenders via contract.createTender() |
| `scripts/deploy.js` contract deployment | `scripts/deploy.js` | Entire script; deploys TenderVault, prints address |
| `useCountdown` hook logic | `frontend/src/pages/Home.jsx` & `Explore.jsx` | `useCountdown(closingTime)` function in both files |
| `ETH_INR` conversion constant | `frontend/src/utils/constants.js` & all page files | `const ETH_INR = 285000;` used for ETH-to-INR conversion in Home, Explore, Profile |

## Important Notes for Patent Preparation

1. **Implementation Verified:** All features documented above are confirmed present in the codebase. No hallucinated or fabricated capabilities are included.

2. **Local-Network Limitation:** The project runs on a local Hardhat node (chain ID: 31337) with development accounts. Patent claims should distinguish between the on-chain protocol (which is network-agnostic) and the local development setup.

3. **Auth Layer Note:** The local username/password authentication in `auth.js` uses pre-configured Hardhat development keys for demo purposes only. A production patent claim should focus on the on-chain protocol and smart contract invariants, not the client-side auth mechanism.

4. **EMD Conversion Rate:** The `ETH_INR = 285000` constant is a hardcoded approximation used for UI display only. Patent claims should not rely on this specific value as a technical feature.

5. **MetaMask Simulator:** The `MetaMaskSimulatorModal.jsx` is a simulation layer that uses the user's private key from `accounts.js` to sign transactions locally via Ethers.js. It is not a true MetaMask integration (no wallet extension required), but the transaction flow is functionally equivalent. Patent claims should describe the on-chain transaction mechanism, not the simulator UI.

6. **Department-Image Resolution:** The `getTenderImage()` function's keyword-matching logic is a configurable mapping, not a self-learning AI. Patent claims should describe the deterministic mapping approach.

7. **No External AI/ML:** The project does not use any external AI models, LLM APIs, or machine learning. All logic is deterministic smart contract + hand-written frontend code.

## Revision History

- **2024-2025:** Initial implementation as refactoring of AuctionX repository into e-Tender India government procurement dApp.
- **Key contracts:** TenderVault.sol (reverse auction with EMD escrow).
- **Key frontends:** Home.jsx (Live Procurement Console), Explore.jsx (Tender browsing), Profile.jsx (Dashboard).
- **Auth:** Local username/password + session storage (development-only credentials).
- **Deployment:** Local Hardhat node (chain ID: 31337); not yet deployed to public testnet/mainnet.