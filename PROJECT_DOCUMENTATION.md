# PROJECT_DOCUMENTATION.md

**e-Tender India — On-Chain Ascending-Bid Tendering with Address-Keyed Displacement Refund Accounting**

Reference implementation of a blockchain-based ascending-bid procurement system: `TenderVault.sol` + a React browser client.

---

## 0. How to read this document

This is the **single source of truth** for the project. `PATENT_DOCUMENTATION.md` and `PATENT_SPECIFICATION.md` both contain statements that this document corrects or contradicts; neither should be used while drafting until reconciled with this file.

**Basis of every statement.** Every technical statement below was obtained by reading the source files in this repository on 2 November 2026:

- `contracts/TenderVault.sol` (full file)
- `frontend/src/App.jsx`, `pages/Home.jsx`, `pages/Explore.jsx`, `pages/Profile.jsx`
- `frontend/src/components/TransactionConfirmModal.jsx`, `components/ToastContainer.jsx`
- `frontend/src/utils/auth.js`, `utils/constants.js`, `utils/accounts.js`
- `scripts/deploy.js`, `scripts/seed-tenders.js`
- `hardhat.config.js`, `frontend/vite.config.js`, `package.json`, `frontend/package.json`

Two rules govern this document:

1. **No capability is asserted unless it exists in the code.** Where something is designed but not built, it is labelled **NOT IMPLEMENTED**.
2. **No performance, security or novelty claim is asserted without a measurement or a search.** Where neither exists, the document says so plainly.

**Verification status of this document.** Static reading of the source only. No automated tests exist in the repository (§11.1), so no behaviour below is confirmed by a test suite. Statements marked *(observed)* describe what the code is written to do; statements marked *(unverified at runtime)* would require execution to confirm.

---

## 1. Project identity and status

| Item | Detail |
|---|---|
| Working name | e-Tender India |
| Artifact | Ascending-bid tendering dApp (contract + browser client) |
| Network | Local Hardhat node, chain ID `31337` |
| Contract name | `TenderVault` |
| Deployment status | Local development only. No public testnet or mainnet deployment exists in the repository. |
| Test suite | **None.** No `test/` or `tests/` directory; no `describe(` block anywhere in the repository. |
| Production readiness | **Not production-ready.** See §11. |
| Prior code base | The repository retains unused artifacts of an earlier auction dApp named *AuctionX* (`contracts/Auction.sol`, `pages/AuctionDetails.jsx`, `components/CountdownTimer.jsx`, `components/CreateAuctionModal.jsx`, `utils/accounts.js`). None of these are reachable from the running application. |

### 1.1 What the system actually is

A single Solidity contract holds tender records. Authorities publish tenders to it. Contractors submit a **payable** transaction carrying a value equal to their offer **plus** the tender's earnest money deposit. The contract accepts the bid only if the value is strictly higher than the currently stored best value. When a bid is accepted, the **entire previously stored value** of the displaced bidder is credited to a refund balance keyed by that bidder's address. The displaced bidder later withdraws that balance through a separate claim transaction. A React client reads tender state and event history from the chain and writes bids and claims through locally-held development keys.

### 1.2 What the system is not

These are stated first because they are the claims most likely to be made in error:

| Not present | Evidence |
|---|---|
| Sealed, blind or confidential bidding | `submitBid` is `payable` and emits `TenderBidSubmitted` with `msg.value` in the same transaction. Values are public on inclusion. |
| Contract-enforced roles or permissions | `createTender` and `awardTender` are unrestricted `public`/`external` functions. `onlyDeployer` is declared and **never applied**. |
| Settlement or payout of the winning bid | `awardTender` performs no transfer of value. |
| Refund of the deposit as a separately tracked quantity | Only one value is recorded per bid; the refund quantity is the whole payable value. |
| Wallet (MetaMask) integration | No `window.ethereum`, no EIP-1193 provider access. The confirmation dialog (`TransactionConfirmModal.jsx`) is a plain React modal that calls a callback, and it no longer references MetaMask at all. |
| Any AI/ML component | None. All logic is deterministic contract code and hand-written React. |
| Gas, latency or throughput measurement | No benchmark, script or recorded figure exists. |
| External audit | None. |

---

## 2. Technology stack (verified)

### 2.1 Application (`frontend/`)

Declared in `frontend/package.json`; installed versions read from `frontend/node_modules`.

| Package | Declared | Installed |
|---|---|---|
| react | `^19.2.8` | 19.3.0 |
| react-dom | `^19.2.8` | 19.3.0 |
| react-router-dom | `^7.18.4` | 7.18.4 |
| ethers | `^6.17.0` | 6.17.0 |
| lucide-react | `^1.48.0` | 1.48.0 |
| vite | `^8.3.0` | 8.3.1 |
| oxlint (dev) | `^1.81.0` | — |
| @vitejs/plugin-react (dev) | `^6.1.1` | — |

Router: `BrowserRouter` (path-based, not hash-based). Base path from `VITE_BASE_PATH`, default `/`.

### 2.2 Contract toolchain (repository root)

`package.json` at the root is named `frontend` and carries the Hardhat toolchain:

| Package | Declared / installed |
|---|---|
| hardhat | `^2.29.1` → 2.29.1 |
| @nomicfoundation/hardhat-toolbox | `^5.0.0` |
| ethers | `^6.11.1` → 6.17.0 |
| @typechain/hardhat, typechain | `^9.1.0`, `^8.3.2` |
| solidity-coverage | `^0.8.17` |

> **Note on the two manifests.** The root `package.json` is misnamed `frontend` and also lists React 18-era packages that the app does not use. Only `frontend/package.json` describes the shipped client. Any statement of the form "the project uses React 19 and Hardhat 2" should name the directory, because the root manifest suggests otherwise.

### 2.3 Solidity configuration

`hardhat.config.js`:

- Solidity version: `0.8.20` (exact, not a range)
- Optimizer: enabled, `runs: 200`
- `viaIR: true`
- Network: `hardhat`, `chainId: 31337`
- No verification keys, no external network entries, no forking configuration.

---

## 3. Repository layout

```
auction-dapp/
├── contracts/
│   ├── TenderVault.sol           ← the deployed contract (active)
│   └── Auction.sol               ← legacy AuctionX contract (inactive)
├── scripts/
│   ├── deploy.js                 ← deploys TenderVault
│   ├── seed-tenders.js           ← publishes 3 demo tenders (idempotent by referenceNo)
│   ├── test-bidder2.mjs          ← manual helper script
│   └── validate-wallets.mjs      ← manual helper script
├── frontend/
│   ├── package.json              ← the shipped client's manifest
│   └── src/
│       ├── main.jsx, App.jsx, App.css
│       ├── pages/{Home,Explore,Profile}.jsx           ← active
│       ├── pages/AuctionDetails.jsx                   ← legacy, unreachable
│       ├── components/TransactionConfirmModal.jsx     ← active (UI confirmation only)
│       ├── components/CreateTenderModal.jsx           ← active (authority publish form)
│       ├── components/ToastContainer.jsx              ← active
│       ├── components/{CountdownTimer,CreateAuctionModal}.jsx  ← legacy, unreachable
│       └── utils/{auth,constants,accounts}.js         ← auth+constants active; accounts.js legacy
├── screenshots/                  ← 6 application screenshots (see §13.2)
├── hardhat.config.js
├── package.json                  ← Hardhat toolchain (misnamed "frontend")
├── PATENT_DOCUMENTATION.md       ← superseded by this file
└── PATENT_SPECIFICATION.md       ← corrected drafting base; reconcile with this file
```

---

## 4. Smart contract specification — `TenderVault.sol`

### 4.1 State

| Declaration | Meaning |
|---|---|
| `address public deployer` | Set to `msg.sender` in the constructor. Read by the client for display only. |
| `enum TenderStatus { OPEN, EVALUATING, AWARDED }` | Numeric values 0, 1, 2. **`EVALUATING` is never assigned anywhere.** |
| `uint256 public tenderCount` | Next identifier to assign. Incremented after assignment, so identifiers are never reused. |
| `mapping(uint256 => Tender) public tenders` | Tender records by identifier. The public getter returns the struct field by field. |
| `mapping(address => uint256) public pendingReturns` | Refund balance **keyed by bidder address**, not by tender. Holds wei. |

There is **no** `receive()` and **no** `fallback()`. A bare ETH transfer to the contract reverts. The only value-accepting function is `submitBid`.

There is no upgrade proxy, no pause switch, no owner-withdrawal function, and no reentrancy guard other than the ordering described in §4.4.

### 4.2 The `Tender` record

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
    uint256 startTime;
    uint256 closingTime;
    TenderStatus status;
    bool fundsClaimed;
}
```

All text fields are stored on-chain as `string` (no hashing, no IPFS pointer). `documentUrl` is an arbitrary string holding an https URL. There is **no integrity binding between `estimatedValueWei`/`emdAmountWei` and the document at `documentUrl`** — the contract never reads or verifies it.

`fundsClaimed` is written only by `awardTender` and **read by no function** in the contract. The client reads it into its formatted tender object but never displays it.

### 4.3 Constructor

Sets `deployer = msg.sender`, then calls `createTender` to publish the first record:

| Field | Value |
|---|---|
| referenceNo | `NHAI/2026/HP-45/001` |
| title | Construction of Highway Bridge over River Beas |
| category | Infrastructure |
| department | NHAI |
| estimatedValue | `250 ether` (= 250 ETH) |
| emdAmount | `0.5 ether` (= 0.5 ETH) |
| duration | `48 hours` |
| startTime | `0` — treated as "now", so the seeded tender is live at deployment |

Consequence: a freshly deployed contract already contains tender id `0`, and its `authorityAddress` is the deployer. Tender id `0` also exists on the chain whether or not any script has run.

### 4.4 Functions — exact behaviour

#### `createTender(...) → uint256` — `public`

Parameters: `referenceNo, title, description, category, department, documentUrl, estimatedValueWei, emdAmountWei, duration, startTime`.

Validation, in order:
1. `duration > 0` → else revert `"Duration must be > 0"`.
2. `emdAmountWei > 0` → else revert `"EMD amount must be > 0"`.

Effects:
- `tenderId = tenderCount`, then `tenderCount++`.
- `authorityAddress = msg.sender` (the caller becomes the recorded authority).
- `effectiveStart = startTime > block.timestamp ? startTime : block.timestamp`. A `startTime` of `0`, or any past value, therefore publishes **live immediately**; a future value **schedules** the tender. There is no upper bound on how far ahead a start may be set.
- `startTime = effectiveStart` and `closingTime = effectiveStart + duration` — the window is measured from the start, not from publication.
- `status = OPEN`, `lowestBidWei = 0`, `lowestBidderAddress = 0x0`, `fundsClaimed = false`.
- Emits `TenderCreated(tenderId, referenceNo, title, msg.sender, estimatedValueWei, emdAmountWei, effectiveStart, effectiveStart + duration)`.
- Returns `tenderId`.

**Access control: none.** The `onlyDeployer` modifier is declared but applied to nothing. Any address may publish. There is no validation of `referenceNo` uniqueness, of the department, or of `estimatedValueWei > emdAmountWei`.

#### `submitBid(uint256 tenderId)` — `public payable`

Validation, in order, with the exact revert strings:

1. `tender.closingTime > 0` → `"Tender does not exist"`. (Existence is inferred from the timestamp being set; there is no boolean `exists` flag.)
2. `block.timestamp >= tender.startTime` → `"Tender has not opened yet"`. A scheduled tender accepts no bids before its start time.
3. `block.timestamp <= tender.closingTime` → `"Tender closed"`. (Bidding is permitted **at** the closing second.)
4. `tender.status == OPEN` → `"Tender not open for bidding"`.
5. `msg.sender != tender.authorityAddress` → `"Authority cannot bid on their own tender"`.
6. `msg.value >= tender.emdAmountWei` → `"Must pay at least EMD amount"`.
7. If `tender.lowestBidWei != 0`: `msg.value > tender.lowestBidWei` → `"New bid must be higher than the current highest bid"`. Equality is rejected, so the leading total strictly increases with each acceptance.

Effects, in this order:
1. If `tender.lowestBidWei != 0 && tender.lowestBidderAddress != address(0)`: `pendingReturns[lowestBidderAddress] += tender.lowestBidWei`.
2. `tender.lowestBidderAddress = msg.sender`.
3. `tender.lowestBidWei = msg.value`.
4. Emits `TenderBidSubmitted(tenderId, tender.referenceNo, msg.sender, msg.value, tender.emdAmountWei, block.timestamp)`.
5. The `msg.value` remains in the contract. No transfer is made.

The credit (step 1) and the overwrite (steps 2–3) occur in the same transaction and in that order. No external call occurs at any point, so `submitBid` is not reentrant.

#### `submitBid()` — `external payable`

Overload that calls `submitBid(0)`. It targets **tender id 0 specifically**, not "the newest tender". The client never calls it; it calls `submitBid(uint256)` explicitly.

#### `claimEmdRefund()` — `external returns (bool)`

1. `amount = pendingReturns[msg.sender]`.
2. `amount > 0` → else revert `"No pending refund to withdraw"`.
3. `pendingReturns[msg.sender] = 0` — **state is reduced before the external call**.
4. `(bool success, ) = payable(msg.sender).call{value: amount}("")`.
5. If `!success`: `pendingReturns[msg.sender] = amount;` then `revert("ETH transfer failed")`. The restoration is redundant because the revert rolls back the state anyway, but it is harmless and makes the intent explicit.
6. Emits `RefundClaimed(msg.sender, amount)`; returns `true`.

This is the checks-effects-interactions sequence. A recipient contract that re-enters `claimEmdRefund` during step 4 observes a zero balance and fails the `amount > 0` requirement; because that failure reverts the inner call, the attacker's own outer claim also reverts. No other account's balance is touched by the attempt.

#### `withdraw()` — `external returns (bool)`

`return this.claimEmdRefund();`

This performs an **external self-call**, so inside `claimEmdRefund` the sender is the contract itself and `pendingReturns[address(this)]` is `0`. **It therefore always reverts with `"No pending refund to withdraw"`.** It is dead code. It appears in the ABI (`utils/constants.js`) but no client code path calls it. It must not appear in any specification, claim or paper as a working refund path.

#### `awardTender(uint256 tenderId)` — `external`

1. `closingTime > 0` → `"Tender does not exist"`.
2. `block.timestamp >= closingTime` → `"Tender not yet closed"`.
3. `status == OPEN` → `"Tender already awarded/evaluated"`.
4. `status = AWARDED`; emits `TenderAwarded(tenderId, lowestBidderAddress, lowestBidWei)`.
5. If `lowestBidWei > 0 && !fundsClaimed`: `fundsClaimed = true`.

**No value is transferred. No caller restriction exists** — any address may award any closed tender. A tender with no bids can be awarded; the event then reports `address(0)` and `0`. Because the status leaves `OPEN`, awarding also terminates bidding (it can only be called after `closingTime`, so this is not exploitable).

The client contains **no UI path that calls `awardTender`**. The entry exists only in the ABI.

#### `getAllTenders()` — `external view returns (Tender[] memory)`

Copies every record into a new array. Unbounded loop over `tenderCount`; there is no pagination. The client calls this on every refresh and on every bid event.

### 4.5 Events

```solidity
event TenderCreated(uint256 indexed tenderId, string referenceNo, string title,
                    address indexed authorityAddress, uint256 estimatedValueWei,
                    uint256 emdAmountWei, uint256 startTime, uint256 closingTime);

event TenderBidSubmitted(uint256 indexed tenderId, string referenceNo,
                         address indexed bidder, uint256 offerAmount,
                         uint256 emdAmount, uint256 timestamp);

event TenderAwarded(uint256 indexed tenderId, address winner, uint256 lowestBid);

event RefundClaimed(address indexed bidder, uint256 amount);
```

**Critical semantic warning about `TenderBidSubmitted.offerAmount`.** The parameter is **named** `offerAmount` but is populated with `msg.value`, which is the **total payable value including the EMD**. The `emdAmount` parameter restates the tender's `emdAmountWei`. Therefore:

> `offerAmount` (event) = contractor's offer + EMD. It is **not** the contractor's offer, and `offerAmount + emdAmount` is **not** the bid — adding them double-counts the deposit.

Any specification, claim, paper table or figure that treats these two fields as additive is wrong. The client itself mislabels the field (§6.5).

---

## 5. The accounting model (the core of the invention)

### 5.1 One value, one quantity

The contract has exactly one monetary quantity per bid: `msg.value`. The client computes it as `offer + emdAmount`; the contract receives it as a single number and never decomposes it.

Therefore:

- The **escrowed** amount per accepted bid is the full payable value.
- The **refunded** amount on displacement is the full payable value.
- The **deposit** is a *floor* on `msg.value` (`msg.value >= emdAmountWei`) and a *reported field* in events. It is never held as a separate, segregated balance.

The NatSpec-adjacent comment in the contract (`// Tracks claimable EMD refunds per user`) and every UI label ("EMD Refund", "Claimable EMD Vault") describe the balance as EMD-only. **That description is inaccurate.** The mapping holds the whole displaced payable value.

### 5.2 Worked example (correct arithmetic)

Tender: `estimatedValue = 120 ETH`, `emdAmount = 0.25 ETH`.

| Step | Actor | Offer | Payable (`msg.value`) | Result |
|---|---|---|---|---|
| 1 | A | 80.00 | **80.25** | accepted (first bid); best = 80.25, leader A |
| 2 | B | 90.00 | **90.25** | 90.25 > 80.25 ✓; `pendingReturns[A] += 80.25`; best = 90.25, leader B |
| 3 | C | 90.25 | **90.50** | 90.50 > 90.25 ✓; `pendingReturns[B] += 90.25`; best = 90.50, leader C |
| 4 | D | 90.00 | **90.50** | 90.50 is not higher than 90.50 ✗ revert `"New bid must be higher than the current highest bid"` |
| 5 | D | 95.00 | **95.25** | ✓; `pendingReturns[C] += 90.50`; best = 95.25, leader D |
| 6 | A claims | — | — | receives **80.25 ETH**, balance → 0 |
| 7 | B claims | — | — | receives **90.25 ETH**, balance → 0 |
| 8 | C claims | — | — | receives **90.50 ETH**, balance → 0 |

A is credited and later paid **80.25**, i.e. offer **and** deposit — **not** 80.00 and **not** 0.25. The earlier draft documentation stated "0.3 ETH moves to `pendingReturns`" for a 0.8 ETH bid; that was wrong by the value of the deposit plus the offer.

D's 95.25 ETH remains in the contract permanently. There is no function that pays it out (§11.3).

### 5.3 Conservation identity

At any time:

```
contract ETH balance
  = Σ (all accepted payable values, over all tenders)
  − Σ (all claimed refunds)
  = Σ_t (current best (highest) lowestBidWei of tender t)
  + Σ_a (pendingReturns[a])
```

The right-hand form holds because every accepted bid adds its value to exactly one of two places: it either becomes a tender's current best value or is credited to a bidder's refund balance when displaced.

This identity is the mechanism the system's technical effect rests on, and it is checkable on-chain by any observer. It is also a useful invariant for a future test suite and for the evaluation section of a paper.

### 5.4 Why the balance is keyed by address

`pendingReturns` is `mapping(address => uint256)`. A contractor displaced in five concurrent tenders holds **one** balance equal to the sum of the five displaced payable values, and discharges all of it with **one** claim transaction. This is a property of the keying choice, not of any per-tender bookkeeping; the contract contains no per-tender refund record.

---

## 6. Browser client

### 6.1 Data flow

`App.jsx` is the single stateful root. It holds the session, balance, tender list, event history, pending refund, active tender id, audit-log scope and toast queue, and passes them down as props. There is no Redux/Zustand, no React Query, no server component.

Refresh procedure (`fetchData`, called after login, after every transaction, and on every bid event):

1. `new ethers.JsonRpcProvider(RPC_URL)` (a fresh provider object per call).
2. `provider.getCode(CONTRACT_ADDRESS)`; if `"0x"`, abort with a console warning.
3. `contract.deployer()`.
4. If a session exists: `provider.getBalance(address)` → formatted to 4 dp; `contract.pendingReturns(address)` → formatted to 4 dp.
5. `contract.getAllTenders()` → mapped into plain objects, each with `status` derived as `2 → "AWARDED"`, `1 → "EVALUATING"`, else `"OPEN"`, and `isOpen = status === "OPEN" && Date.now()/1000 <= closingTime`.
6. `contract.queryFilter(contract.filters.TenderBidSubmitted(), 0, "latest")`; for each distinct block number, `provider.getBlock(n)` to obtain a timestamp; events are parsed and **reversed** so the newest appears first.
7. Audit log is set to global, or filtered to the active tender id, according to the current scope toggle.

Live updates: `contract.on("TenderBidSubmitted", handler)` registered in an effect, removed with `contract.off(...)` on cleanup. The handler calls `refreshTenderState(tenderId)` and `fetchData()`.

`refreshTenderState(id)` reads `contract.tenders(id)` directly and patches `lowestBid`, `lowestBidderAddress`, `closingTime`, `status`, `isOpen` for that row without a full refresh.

### 6.2 Configuration

| Setting | Source | Default |
|---|---|---|
| RPC endpoint | `VITE_RPC_URL` | `http://127.0.0.1:8545` |
| Contract address | `VITE_CONTRACT_ADDRESS` (frontend/.env, present in this workspace) | env file `0x5FbDB2315678afecb367f032d93F642f64180aa3`, which is the **first** deployment from account 0. If the variable is absent, `utils/constants.js` falls back to `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`. |
| Base path | `VITE_BASE_PATH` | `/` |
| ETH→INR rate | hardcoded `const ETH_INR = 285000` in `Home.jsx`, `Explore.jsx`, `Profile.jsx` (three separate copies) | 285000 |

No `.env` file is present in the repository; the defaults are in force. **The address default is the address Hardhat assigns to the second contract deployed from account 0**, so it is only valid immediately after `deploy.js` on a fresh node.

### 6.3 Transaction signing (implemented path)

`getDirectSignerForUser(user, provider)` in `utils/auth.js`:

1. Requires `user.privateKey` and `provider`.
2. `new ethers.Wallet(user.privateKey, provider)`.
3. Requires `wallet.address.toLowerCase() === user.address.toLowerCase()` → else `"Private key does not match configured address"`.

All writes go through this signer:

| Action | Call | Gas limit |
|---|---|---|
| Bid | `contract["submitBid(uint256)"](id, { value: parseEther(total), gasLimit: 500000 })` | 500,000 |
| Claim refund | `contract.claimEmdRefund({ gasLimit: 200000 })` | 200,000 |

Both await `tx.wait()` and then refetch state and balance.

**There is no wallet-extension interaction anywhere in the codebase.** The dialog described in §6.6 is presented *before* signing; it does not obtain a signature.

### 6.4 Authentication and role handling

`utils/auth.js` exports `USER_DIRECTORY`, an array of five demonstration accounts:

| id | username | password | role | address (Hardhat account) | department / vendor |
|---|---|---|---|---|---|
| AUTH-CPWD-001 | `cpwd.nodal` | `govt123` | AUTHORITY | `0xf39F…2266` (account 0, the deployer) | CPWD |
| AUTH-NHAI-001 | `nhai.officer` | `nhai456` | AUTHORITY | `0x7099…79C8` (account 1) | NHAI |
| VEND-001 | `sharma.contractors` | `vendor123` | CONTRACTOR | `0x3C44…93BC` (account 2) | VEND-2026-001 |
| VEND-002 | `gupta.builders` | `build456` | CONTRACTOR | `0x90F7…b906` (account 3) | VEND-2026-002 |
| VEND-003 | `singh.engineers` | `eng789` | CONTRACTOR | `0x15d3…6A65` (account 4) | VEND-2026-003 |

`login(username, password)` matches on both fields, builds `session = { ...user, loginTime }` and calls `localStorage.setItem("etender_session", JSON.stringify(session))`. **The session object therefore contains the account's `privateKey` and its `password`, both persisted in browser localStorage in cleartext.** This is acceptable only for a disposable local demo; it is a critical defect in any other setting, and it must be disclosed as a limitation in a paper.

Role enforcement is **entirely client-side**:
- `handleSubmitTenderOffer` refuses when `role !== "CONTRACTOR"` and when the session address equals the tender's `authorityAddress`.
- The UI disables the bid form for authority sessions.

Nothing in the contract enforces this beyond the authority-address exclusion in `submitBid`. Anyone with the contract address and a funded account can call `createTender` and `awardTender` regardless of the application.

`getUserRoleBadge` maps `AUTHORITY` → "Government Authority", otherwise → "Vetted Contractor".

The legacy `utils/accounts.js` (`HARDHAT_ACCOUNTS`, `getDirectSigner`, `describeBidError`) is imported only by the unreachable `pages/AuctionDetails.jsx`. The running application does not use it.

### 6.5 Pages

#### `Home.jsx` — Live Procurement Console

- Top bar: one button per tender to set the active tender, plus a **Publish New Tender** button rendered only when `session.role === "AUTHORITY"`.
- Left card: department image, title, description, countdown (`HH:mm:ss`, ticking each second from `closingTime`), reference number, department/category/authority (truncated address), estimated value in ETH and INR, EMD required. For a tender whose `startTime` is still in the future the countdown instead reads **Opens in HH:mm:ss**, the badge reads **UPCOMING**, and the submit button is locked with the label *Bidding Opens Soon*.
- Right card: highest total (offer + EMD), leading bidder label, EMD required, wallet balance, offer input, live total (`offer + EMD` in ETH and INR), a hint naming the lowest offer that still beats the standing total, inline error, submit button.
- Below: "Claimable EMD Refund Vault" card with the address-keyed balance and a claim button (disabled at zero).
- Below: audit trail table with columns **Vendor ID, Tender Ref, Offer Amount (ETH / INR), EMD, Timestamp, Tx Hash**, plus a Global / Tender-# toggle and an event count.

Validation before submission (`onSubmitOffer`):
1. Offer parses to a finite number `> 0` → else `"Enter a valid tender offer amount."`
2. If a bid exists and `offer + EMD <= lowestBid`, the error names the threshold rather than restating the rule: the standing total, the lowest acceptable offer (`lowestBid − EMD`) and the rejected total. Equality is rejected, so the message says "not higher than" rather than "too high".

Then `handleSubmitTenderOffer` re-checks: session present, role `CONTRACTOR`, tender exists, `status === "OPEN" && isOpen`, session address ≠ authority, and `balance >= total` (compared as `parseFloat` of a 4-dp string).

**Two labelling defects visible in this page:**
- The audit column headed *Offer Amount* renders `TenderBidSubmitted.offerAmount`, i.e. the **total payable value including the EMD**.
- The card headed *Claimable EMD Refund Vault* renders `pendingReturns`, i.e. the **whole displaced payable value**.

The UI is internally consistent with the contract, but its wording overstates the deposit's role. Figures reproduced for a patent must be captioned with the correct quantity.

#### `Explore.jsx` — tender feed

- Search: substring match on `title` or `referenceNo`, case-insensitive.
- Department pills: `ALL, NHAI, CPWD, Railways, Smart Cities` — exact string equality on `tender.department`.
- Status select: `ALL, OPEN, EVALUATING, AWARDED` — exact equality on the derived status. Because a tender past its closing time keeps contract status `OPEN`, selecting **OPEN** also lists tenders whose countdown has expired.
- Each card: image, status tag (`UPCOMING` while a scheduled tender has not opened, `OPEN` once it has), department tag, reference, title, category, estimated value (ETH + INR), EMD, highest bid ("None" if zero), countdown ("Opens In" instead of "Closing In" for a scheduled tender), and a "Set Active Tender" button that sets the active tender and navigates to `/`.
- Empty state: "No tenders found matching your criteria".

**Card status inconsistency:** a tender past closing but not awarded displays the tag **`OPEN`** (because `isOpen` is false, the fallback renders the raw status) while its countdown simultaneously reads "Closed". This is a display defect, not a contract defect.

#### `Profile.jsx` — dashboard

- Four metric cards: Wallet Balance, "Claimable EMD Vault", Tenders Participated/Published, Total Bids Submitted/Received.
- Green "EMD Refund Available" banner when `pendingRefund > 0`, with a claim button.
- Role highlight card: authority shows department and "Nodal Officer"; contractor shows Vendor ID, GSTIN and PAN, plus a "Leading N tender(s)" pill computed from `lowestBidderAddress`.
- Tabs: participated/published tenders, and bid history/received bids.

Derivation caveats:
- A contractor's participation is derived from **event history**, not contract state — if logs are unavailable, the lists are empty.
- A contractor's "My Offer" per tender is the event's `offerAmount`, i.e. the total payable.
- An authority's "Total Bids Received" uses the **global** bid history (`bidsShown = tenderBidHistory`), not bids restricted to tenders that authority published. It is therefore not a per-authority figure.
- Neither table is paginated.

### 6.6 `TransactionConfirmModal.jsx` — the confirmation dialog

#### 6.6.1 What it is

A single React component (`frontend/src/components/TransactionConfirmModal.jsx`, ~150 lines, no dependencies beyond React and two `lucide-react` icons) that renders a plain confirmation dialog — no wallet styling, no MetaMask wording — before a transaction is signed. It is mounted **once** in `App.jsx` and driven entirely by props. Its purpose is to give the bid, claim and publish flows an explicit human confirmation step without requiring a wallet extension to be installed.

It holds **no key, no provider, no chain connection and no transaction**. It cannot sign, broadcast, simulate gas, estimate fees or read balances.

#### 6.6.2 Interface

| Prop | Type | Meaning |
|---|---|---|
| `isOpen` | boolean | Render nothing unless `true` |
| `txDetails` | object \| null | `{ fromAddress, type, amount }` |
| `onConfirm` | function | The async action to run when the user confirms |
| `onClose` | function | Dismissal handler |

Internal state: one boolean, `isProcessing`. The component returns `null` when `isOpen` is false **or** `txDetails` is null, so it cannot render in a half-populated state.

Both `txDetails` fields are defaulted **at the call site**, in `App.promptTxConfirm(details, confirmCallback)`:

- `type` falls back to `"Contract Interaction"`;
- `amount` falls back to `"0"`;
- `fromAddress` is taken from `sessionRef.current?.address`;
- if `fromAddress` is missing, the component itself substitutes `0x0000000000000000000000000000000000000000`.

The two call sites are:

| Flow | `type` | `amount` | `onConfirm` runs |
|---|---|---|---|
| Submit a bid | `"Submit Tender Offer"` | `totalAmount.toFixed(4)` — the **payable value** (offer + EMD), 4 dp, as a string | `submitBid(uint256)` with `value: parseEther(totalAmount)`, `gasLimit: 500000` |
| Claim a refund | `"Claim EMD Refund"` | `pendingRefund` — the already-4-dp address-keyed balance | `claimEmdRefund({ gasLimit: 200000 })` |

#### 6.6.3 What it displays

Full-screen backdrop `rgba(0,0,0,0.75)` with a 4 px backdrop blur and `zIndex: 9999`, centred on a 360 px panel (`#1e1e2d`, 1 px `#383854` border, 16 px radius, 20 px padding).

| Region | Content |
|---|---|
| Header | a `ShieldCheck` icon, the literal text **`Transaction Confirmation`**, and an `X` close button |
| Address block | label `Active Wallet Address:` and the session address as `` `${addr.slice(0,6)}...${addr.slice(-4)}` `` in monospace amber — note **three literal dots**, not a single ellipsis character |
| Centre | the `type` string in uppercase, letter-spaced 1 px; the amount in 28 px bold `#38bdf8` suffixed `" ETH"` (renders `0 ETH` when the amount is falsy); and `Contract: TenderVault` in monospace |
| Fee row | label `Estimated Gas Fee:` and the **hardcoded, never-computed** value `0.00042 ETH` in green |
| Actions | `Reject` (transparent, bordered) and `Confirm` (solid `#f59e0b`), in a two-column grid |

`TenderVault` is a **literal string**, not read from the deployed contract's name; the fee is likewise a constant. Neither is derived from the transaction, the network or the gas limit passed by the caller.

#### 6.6.4 Behaviour on confirm

```
setIsProcessing(true)
  → await onConfirm()          // only if typeof onConfirm === "function"
  → catch (e) console.error("Modal confirmation error:", e)
  → finally: setIsProcessing(false); onClose()
```

- While processing, both buttons are `disabled` and the confirm label changes to **`Confirming...`**, which prevents a double submission from the dialog.
- The dialog **closes in `finally`**, so it dismisses whether the transaction succeeded or failed. The error is swallowed here and only logged; the user-facing failure toast comes from the caller's own `catch` (`"Submission Failed"` or `"Claim Failed"`, with `extractErrorMessage(err)`).
- `Reject` and the `X` both call `onClose` and leave `onConfirm` untouched, so rejecting sends nothing.

The signing and broadcast happen **after** the dialog resolves, inside `onConfirm`, via `getDirectSignerForUser` and a local `ethers.Contract` (§6.3). The dialog is therefore a *gate*, not an actor.

#### 6.6.5 What it deliberately does not do

No `window.ethereum` or other EIP-1193 provider access; no `eth_requestAccounts`; no `eth_sendTransaction`; no chain-ID check; no account switch; no signature request; no gas estimation, fee market lookup or balance read; no transaction preview from decoded calldata; no error surface of its own; no retry. It also has no focus trap, no `Escape`-key handler, no `role="dialog"`/`aria-modal`, no portal and no background scroll lock — it is rendered inline in the React tree with fixed positioning.

#### 6.6.6 How to describe it (for the patent and the paper)

Permitted, accurate description:

> "Transactions are gated by an in-application confirmation dialog that presents the initiating address, the operation type, the payable amount and the target contract before the action is signed by a locally-held key and broadcast."

Forbidden, because unsupported by the code:

| Do not write | Why it is false |
|---|---|
| "MetaMask integration" | No provider, no extension, no injected API |
| "wallet approval" / "user approves in wallet" | The dialog is part of this application, not a wallet |
| "signing prompt" | It obtains no signature; signing follows it |
| "gas is estimated" / "fee shown to the user" | `0.00042 ETH` is a constant |
| "self-custodial" / "user-controlled keys" | Keys ship in the bundle (§11.5) |
| "simulated transaction preview" | Nothing is decoded or simulated |

**Caption to use with any screenshot of it:** *"In-application confirmation dialog shown before a bid is signed. It performs no wallet operation; the figure 0.00042 ETH is a fixed label, not an estimate."*

If a genuine wallet flow is ever wanted, the honest framing changes: an EIP-1193 `eth_requestAccounts` handshake, an `eth_sendTransaction` approval and a chain-ID guard would each have to be implemented, and the dialog would then be the application's pre-flight summary rather than a substitute for the wallet.

### 6.7 `CreateTenderModal.jsx` — publishing a tender (authority only)

Opened from the console's active-tender bar by an `AUTHORITY` session. A 560 px scrollable panel with a two-column grid, styled inline (no CSS file changes) to match the confirmation dialog.

| Field | Control | Default |
|---|---|---|
| Tender Ref. No. | text | empty, placeholder `NHAI/2026/HP-46/002` |
| Department | select: NHAI, CPWD, Railways, Smart Cities | `NHAI` |
| Title | text | empty |
| Description | textarea | empty |
| Category | select: Infrastructure, Construction, IT Systems, Goods, Services | `Infrastructure` |
| Document URL | text | empty |
| Estimated Value (ETH) | number, step 0.0001 | empty |
| EMD Required (ETH) | number, step 0.0001 | empty |
| Bidding Window | two number inputs, days and hours | 30 days, 0 hours |
| Publish As | two toggle buttons: **Live now** / **Upcoming** | `Live now` |
| Bidding Opens At | `datetime-local`, shown only for *Upcoming* | empty |

Validation runs before anything is signed: reference, title and description must be non-empty; value and deposit must be greater than zero; the deposit may not exceed the estimate (this is the guard that would have caught the original 50,000 ETH seed); the window must total at least one hour; and an *Upcoming* tender needs a start date and time in the future. Failures render inline and the form stays open.

On submit the component calls `onSubmit(draft)` with the numbers converted to `Number` and `durationSec = days × 86400 + hours × 3600` and `startTimeSec = 0` (live) or the chosen timestamp, then closes. `App.handleCreateTender` re-checks the role, opens the confirmation dialog, and calls `createTender(referenceNo, title, description, category, department, documentUrl, parseEther(value), parseEther(deposit), durationSec, startTimeSec, { gasLimit: 1500000 })`. The new id is read back as `tenderCount() - 1` and made active.

The departments offered are deliberately limited to the four strings `Explore.jsx` filters on, so a published tender is discoverable rather than orphaned by the filter. A free-text department would break that.

*Measured once on the local node with the sample payload above (four strings of the lengths shown, plus the URL): 425,596 gas, well inside the 1,500,000 limit.*

### 6.8 `ToastContainer.jsx`

Stacked notifications with icon, title, optional message and optional transaction hash. Non-`pending` toasts auto-dismiss after **5500 ms**. Pending toasts persist until removed.

### 6.9 Behavioural quirks worth knowing

- `Home.jsx` and `Explore.jsx` each implement their own countdown; there is no shared hook despite a `useCountdown` name existing inside `Explore.jsx`.
- `getProvider()` returns a **new** provider on every call, so every refresh constructs a new JSON-RPC client.
- `parseFloat` is used for balance comparison and for composing the transaction value (`parseEther(totalAmount.toString())`), so a value that is awkward in binary floating point can differ from the pure decimal arithmetic shown in the UI by a fraction of a wei.
- If the RPC endpoint is unreachable, pages render their empty states rather than an error, because most reads are wrapped in `.catch(() => …)`.

---

## 7. Events, audit trail, and the audit model

The audit trail is a **query of `TenderBidSubmitted` logs**, built by `queryFilter(filter, 0, "latest")` on every refresh and kept live by a subscription to the same event. For each entry the client renders: bidder (resolved to a vendor ID via `USER_DIRECTORY`, else a truncated address), tender reference, the event's `offerAmount` (total payable) in ETH and INR, `emdAmount`, a timestamp obtained from the **block** (not from the event's own `timestamp` field — the client reads block timestamps, so the event's `timestamp` parameter is unused by the UI), and the transaction hash truncated to `10…6`.

Properties, stated precisely:

- Logs are **append-only**: no contract function deletes or rewrites a past event. This is a property of the network, not of any code in this repository.
- Each log is bound to its transaction and block; the block header chain provides ordering and tamper-evidence. **The events themselves are not hash-linked to one another** — "hash-linked events" is an inaccurate description.
- The client filters a tender's history by comparing the event's `tenderId` to the active tender, not by a log topic filter.
- Because the value is in the event in cleartext, the audit trail is also a **complete public record of every bid**, which is exactly why the system cannot offer bid confidentiality or resistance to mempool observation (§11.4).

---

## 8. Deployment, configuration and seed data

### 8.1 Procedure

```bash
npm install
npx hardhat node                                    # 127.0.0.1:8545, chain 31337, 10 funded accounts
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/seed-tenders.js --network localhost
cd frontend && npm install && npm run dev           # Vite dev server, default port 5173
```

`deploy.js` deploys `TenderVault` with the first signer and prints the address and the deployer address. It writes nothing to disk. A single deployment from account 0 lands at `0x5FbD…0aa3`, which is what `frontend/.env` and the seed script default to; if you deploy differently, update `VITE_CONTRACT_ADDRESS` in `frontend/.env` before starting the client, because the env value overrides the fallback in `utils/constants.js`.

`seed-tenders.js` reads `process.env.CONTRACT_ADDRESS`, falling back to `0x5FbDB2315678afecb367f032d93F642f64180aa3` — the same address the committed `frontend/.env` uses, so a single deployment plus a seed run is consistent with the client. It reads `getAllTenders()` and skips any record whose `referenceNo` already exists, so it is safe to re-run. It uses the **default signer** (account 0) with `gasLimit: 600000`.

### 8.2 Seed records

| id | referenceNo | Department | Category | Estimated value | EMD | Duration | Authority |
|---|---|---|---|---|---|---|---|
| 0 | NHAI/2026/HP-45/001 | NHAI | Infrastructure | 250 ETH | 0.5 ETH | 48 h | deployer (account 0) — created in the constructor |
| 1 | CPWD/2026/STR-12/002 | CPWD | Construction | 300 ETH | 0.5 ETH | 72 h | account 0 (default signer) |
| 2 | Railway/2026/TRK-88/014 | Railways | Infrastructure | 220 ETH | 0.4 ETH | 36 h | account 0 |
| 3 | SMART/2026/SC-07/009 | Smart Cities | IT Systems | 120 ETH | 0.25 ETH | 24 h | account 0 |

### 8.3 Data notes on the seed set

The magnitudes were corrected after the verification pass. The constructor originally seeded tender 0 with a 50,000 ETH deposit, which exceeded the 10,000 ETH balance of every local account and made the default tender impossible to bid on. The values are now:

1. **Coherent magnitudes.** Estimated values are 120–300 ETH, i.e. roughly ₹3.4 crore to ₹8.6 crore at the hardcoded ₹285,000/ETH, and every deposit is affordable from a default account.
2. **Deposit ratios** are 0.13%–0.2% of the estimate. This is well below the 2–5% typical of real earnest money, so the figures remain demonstration values, not representative ones.
3. **Department/authority mismatch.** All four seeded tenders are owned by the **same** address (account 0), which the directory labels *CPWD Nodal Officer*. Tender 0 is therefore an NHAI tender whose recorded authority is the CPWD officer, and `nhai.officer` (account 1) is not the authority of any tender.

Any figure or table reproduced in a paper must either use regenerated data or state these as demonstration placeholders. Do not describe them as realistic values.

---

## 9. End-to-end walkthroughs (as implemented)

### 9.1 Submit a bid

1. Login with `gupta.builders / build456` → session persisted, balance fetched, tenders and log loaded.
2. `/explore` → choose a tender → "Set Active Tender" → routed to `/`.
3. Enter an offer, e.g. `90` on a tender with EMD `0.25`. The page shows total `90.25`.
4. Client validation compares `90.25` with the stored `lowestBidWei`.
5. "Submit Tender Offer" opens the confirmation dialog showing type `Submit Tender Offer` and amount `90.2500`.
6. Confirm → `getDirectSignerForUser` builds a wallet from the directory key → `submitBid(id, { value: 90.25 ETH, gasLimit: 500000 })`.
7. Contract validates and, on success, credits the displaced bidder, overwrites the best bid, emits the event.
8. Toast with the hash; `refreshTenderState` + `fetchData`; the audit row appears with `90.25` under "Offer Amount" (see §6.5).

### 9.2 Displacement

Same as above with a higher total from a different account. The displaced bidder's `pendingReturns` increases by **that bidder's previous total payable**, visible on the displacing user's dashboard only if they own the displaced address.

### 9.3 Claim a refund

1. Login as the displaced contractor → `pendingReturns(address)` > 0 → the banner appears.
2. "Claim EMD Refund" → dialog with the amount → Confirm → `claimEmdRefund({ gasLimit: 200000 })`.
3. Contract zeroes, transfers, emits `RefundClaimed`; balance rises, vault returns to `0.0000`.

### 9.4 Publish a tender

1. Login as an authority, e.g. `nhai.officer / nhai456`. The console's active-tender bar shows a **Publish New Tender** button (authority role only; contractors never see it).
2. Fill reference number, department, title, description, category, document URL, estimated value, EMD and the bidding window in days/hours, then choose **Live now** or **Upcoming** (with a start date and time). Department defaults are restricted to the four values the Explore filter understands.
3. Client validation rejects empty reference/title/description, non-positive value or deposit, a deposit larger than the estimate, and a window below one hour.
4. Publish → the confirmation dialog (`type: "Publish Tender"`, amount `0`) → `createTender(...)` with `gasLimit: 1500000`.
5. On success the toast reports the new id with its transaction hash, the id becomes the active tender, and `fetchData()` reloads the list.

The same call can still be made from `scripts/seed-tenders.js` or any contract client, and the contract still permits any address to publish — the restriction is in the application, not on-chain (§11.6).

### 9.5 Award

**No UI path exists.** `awardTender` is in the ABI but is never called by any component. It can only be invoked by a script or console call. Even then it transfers no funds.

---

## 10. Verified fact table

| # | Statement | Status | Evidence |
|---|---|---|---|
| 1 | Tender created by `msg.sender`; authority = caller | Confirmed | `createTender` |
| 2 | `createTender` is unrestricted; `onlyDeployer` unused | Confirmed | modifier declared, never applied |
| 3 | Window runs from `effectiveStart` (future `startTime` or now) to `effectiveStart + duration` | Confirmed | `createTender` |
| 4 | Existence test is `closingTime > 0` | Confirmed | `submitBid` require 1 |
| 5 | Bidding allowed at `block.timestamp == closingTime` | Confirmed | `<=` comparison |
| 6 | Authority address may not bid on its own tender | Confirmed | `submitBid` require 4 |
| 7 | `msg.value >= emdAmountWei` enforced | Confirmed | `submitBid` require 5 |
| 8 | Strict-higher rule applied only when `lowestBidWei != 0` | Confirmed | `if/else` in `submitBid` |
| 9 | Displaced credit equals `tender.lowestBidWei`, i.e. the whole payable value | Confirmed | `pendingReturns[...] += tender.lowestBidWei` |
| 10 | Credit precedes overwrite, same transaction | Confirmed | statement order |
| 11 | Refund balance keyed by address, cumulative across tenders | Confirmed | `mapping(address => uint256)` |
| 12 | Claim zeroes before transfer, restores + reverts on failure, emits on success | Confirmed | `claimEmdRefund` |
| 13 | `withdraw()` always reverts (self-call, zero balance) | Confirmed | `return this.claimEmdRefund();` |
| 14 | `awardTender` transfers nothing | Confirmed | body contains no call |
| 15 | `awardTender` unrestricted by caller | Confirmed | no modifier, no address check |
| 16 | `fundsClaimed` written, never read | Confirmed | struct + `awardTender` only |
| 17 | `EVALUATING` never assigned | Confirmed | no assignment in file |
| 18 | Event `offerAmount` carries the total payable value | Confirmed | `emit … msg.value …` |
| 19 | No `receive`/`fallback`; bare ETH transfer reverts | Confirmed | absence in file |
| 20 | Client pre-validates total against the stored best bid | Confirmed | `Home.onSubmitOffer` |
| 21 | Client computes payable as offer + EMD | Confirmed | `handleSubmitTenderOffer` |
| 22 | Signing is local, from a private key in `auth.js` | Confirmed | `getDirectSignerForUser` |
| 23 | No wallet extension interaction | Confirmed | absence of any provider access |
| 24 | Session (including private key and password) in localStorage | Confirmed | `login()` |
| 25 | Historical log query + live subscription both used | Confirmed | `queryFilter(…, 0, "latest")`, `contract.on` |
| 26 | Audit timestamps come from blocks, not the event field | Confirmed | `provider.getBlock(...)` |
| 27 | No browser path to `awardTender` | Confirmed | no component calls it |
| 27a | Authorities can publish tenders from the browser | Confirmed | `CreateTenderModal.jsx` + `handleCreateTender` in `App.jsx` |
| 27b | A scheduled tender rejects bids before its start time | Confirmed | `submitBid` require + end-to-end `staticCall` revert `"Tender has not opened yet"` |
| 27c | A live tender's window starts at publication | Confirmed | `effectiveStart` clamp; published start equals block time |
| 28 | `React 19.3.0`, `ethers 6.17.0`, `vite 8.3.1`, `hardhat 2.29.1` | Confirmed | installed manifests |
| 29 | No automated tests | Confirmed | no test directory, no `describe(` |
| 30 | No runtime gas/latency measurement | Confirmed | none exists |

---

## 11. Defects, limitations and threats to validity

This is the section that keeps both downstream documents honest. Each item is a verified property of the code, not a matter of opinion.

### 11.1 No tests

There is no test file in the repository. Every behavioural statement anywhere in this project rests on reading source, not on a passing suite. For a paper, this is a methodological gap that must be disclosed; for a patent, it weakens any assertion that behaviour was verified.

### 11.2 First-bid-equals-deposit is no longer a dead end

While the contract enforced a strictly *lower* total, a first bid equal to the deposit made every later bid impossible (`>= EMD` and `< EMD` simultaneously). Under the ascending rule that trap disappears: a later bid only has to exceed the deposit. The earlier dead-end is recorded here because it constrained the test plan and the prior draft documentation.

### 11.3 No settlement path for the winning bid

The winner's payable value stays in the contract forever. `awardTender` transfers nothing, there is no `releaseFunds`, no `withdrawToAuthority`, and the contract has no `receive`/`fallback`. The identity in §5.3 therefore has a permanent sink. This must be described as a limitation, never as escrow settlement.

### 11.4 No bid confidentiality and exposure to mempool observation

Bids are plain `payable` calls; the value is visible in the pending transaction and in the event once mined. A competitor can observe a pending bid and submit a higher one first. The system provides **auditability**, not confidentiality. Any claim of sealed or blind bidding is false.

### 11.5 Credentials and keys in the client bundle

`USER_DIRECTORY` contains passwords and private keys in shipped source, and `login()` persists them to `localStorage`. Anyone can read the bundle and impersonate any account. Client-side role checks are advisory.

### 11.6 No on-chain role model

`createTender` and `awardTender` are open to any address. "Role-based access control" describes the application's UI only. The contract's single identity check is "sender is not this tender's authority address".

### 11.7 Numeric handling

Balances and totals pass through `parseFloat`. Comparison against the stored best bid and composition of the transaction value are therefore subject to binary floating-point representation. The contract remains authoritative, so the practical effect is a possible revert, not an incorrect transfer.

### 11.8 Data-quality defects in the demo set

See §8.3: unrepresentative magnitudes, inconsistent deposit ratios, and a single authority address owning all seeded tenders.

### 11.9 UI wording that overstates the deposit

"Offer Amount" (audit and profile columns) shows the total payable including the deposit; "EMD Refund"/"Claimable EMD Vault" show the whole displaced payable value. Consistent with the contract, inconsistent with the labels.

### 11.10 Closed-tender status display

A tender past closing shows the tag `OPEN` while the countdown reads "Closed", because the derived status ignores the deadline while the card tag falls back to the raw status.

### 11.11 Unbounded reads

`getAllTenders()` copies every record, and the client re-queries all logs from block 0 on each refresh and each bid event. This is acceptable on a local node with a handful of records and unsuitable for a public network without pagination and topic-filtered incremental log reads.

### 11.12 Reproducibility of the demo

`seed-tenders.js` hardcodes the contract address and uses whichever signer is default. A different deployment address or signer produces different authority assignments. Reproducing a figure requires recording both.

### 11.13 Prior disclosure risk

The repository retains an earlier *AuctionX* auction dApp (`contracts/Auction.sol`, `AuctionDetails.jsx`, `accounts.js`, `CountdownTimer.jsx`, `CreateAuctionModal.jsx`). If that code or this repository was ever published publicly (a public GitHub repository, a blog, a submission) before a patent filing date, the publication may be citable against novelty in jurisdictions without a broad grace period. **Establish the earliest public disclosure date before filing.**

### 11.14 Scheduling is a timestamp, not a status

`TenderStatus` still has only `OPEN`, `EVALUATING` and `AWARDED`; there is no `SCHEDULED` value. An upcoming tender is `OPEN` on-chain with a future `startTime`, and "upcoming" is derived in the client. Consequences: the Explore status filter labelled **OPEN** includes scheduled tenders, and any external client that ignores `startTime` will display them as open even though `submitBid` rejects bids. The contract prevents the bid; it does not prevent a misleading label elsewhere.

---

## 12. Novelty-relevant technical arrangement (hedged)

What follows is a description of the arrangement, **not** a novelty or inventive-step conclusion. No prior-art search has been performed, so nothing here asserts that a feature is new.

The combination is:

1. **A single payable value couples the comparison and the escrow.** The ascending-bid rule is applied to the same quantity that is escrowed, so an accepted bid neither compares one figure nor locks another. The deposit requirement survives only as a floor and as a reported field.
2. **Displacement produces a credit rather than a transfer.** Acceptance overwrites the stored best state and credits the displaced bidder's balance in one transaction, so the entitlement cannot diverge from the recorded state.
3. **The credit is keyed by address and aggregates across tenders.** One balance, one claim, regardless of how many concurrent tenders displaced the bidder.
4. **Claim ordering makes double payment structurally impossible.** The balance is reduced before the external call and restored with a revert on failure, so a re-entrant recipient meets a zero balance and a failed transfer cannot extinguish the credit.
5. **The displayed record and the refund arithmetic share one source.** Tender display and audit history are derived from the same events that record accepted payable values.

Known-art cautions, stated so no draft overclaims:

- ascending-bid (English) auctions, outbidding and best-bid storage are established;
- escrow retention, per-address claimable balances, pull-payment withdrawal and the checks-effects-interactions ordering are established;
- event emission with event-driven interfaces is established;
- browser wallet authorisation (EIP-1193/EIP-155) is established and **is not implemented here**;
- the deposit-plus-offer composition of a bid is a conventional procurement practice, not by itself an inventive contribution;
- aggregating a refund balance by address is a straightforward consequence of choosing an address-keyed mapping.

The candidate contribution, if any, lies in the cooperation of items 1–5 above and in the technical effect that follows from it (§14), not in any one element.

---

## 13. Material for the patent specification

### 13.1 Status

`PATENT_SPECIFICATION.md` already contains numbered claims and an abstract. It must be reconciled with this document on these points, where this document is authoritative:

- the credit is the **whole payable value** (its §9.5 is correct; it offers no worked numeric example, so the §5.2 example above should be inserted there);
- `withdraw()` is excluded (already correct there);
- `awardTender` performs no transfer and has no caller restriction (already correct there);
- `fundsClaimed` is written and never read (already correct there);
- no wallet claim may be asserted as implemented.

`PATENT_DOCUMENTATION.md` should not be used as a drafting source: it claims sealed bidding, gets the displacement arithmetic wrong by the deposit, describes on-chain role control, and states two unverifiable "no known system" absolutes.

### 13.2 Figures that genuinely exist

Exactly six screenshots exist in `screenshots/`, and only these may be filed as depicting the implementation:

| File | Depicts |
|---|---|
| `home-desktop-grid.png` | Procurement console, full desktop view: hero tender and bid console |
| `home-hero.png` | Hero section of the active tender: title, description, department badge, value/EMD/countdown |
| `explore.png` | Tender feed with department tags, reference numbers and status filters |
| `explore-4-tenders.png` | Tender feed showing all four seeded records |
| `profile.png` | Contractor dashboard, initial state |
| `profile-populated.png` | Contractor dashboard with participation, bid history and refund banner |

A refund-claim figure and a confirmation-dialog figure must be captured from a running build before filing; a wallet-approval figure cannot be captured at all until a wallet integration exists.

### 13.3 Claim skeleton (drafting input only)

To be reviewed by a registered patent agent for clarity, support, unity and §3(k) eligibility.

1. A system comprising a tender-management smart contract on an EVM-compatible network and an application in data communication with it, the contract configured to: store tender records each comprising an identifier, a reference, a closing time, a deposit requirement, a current best payable value and a current leading bidder address; receive payable bid transactions; validate a received payable value against the stored current best payable value; and, upon displacement of a stored leader by an accepted higher bid, credit a refundable amount equal to the **entire** previously stored current best payable value to a refund balance associated with the displaced bidder's address, and update the stored value and bidder, both within the same transaction.
2. Dependent on 1: existence, closing-time, open-status and exact authority-address exclusion.
3. Dependent on 1: the received value must be not less than the stored deposit requirement.
4. Dependent on 3: where a non-zero best value is stored, the received value must be strictly higher.
5. Dependent on 1: the refund balance is a mapping keyed by bidder address, so credits from a plurality of tender records accumulate into a single balance.
6. Dependent on 5: a claim operation reads the balance, requires it non-zero, sets it to zero, then transfers; restores and reverts on failure; emits a refund event on success.
7. Dependent on 1: the contract emits a bid event comprising tender identifier, reference, bidder address, the accepted payable value **including the deposit**, the deposit requirement, and the block timestamp.
8. Dependent on 7: the application derives audit state by a historical log query from the deployment block and by a live subscription to the same event, rendering value, deposit, timestamp and transaction hash, filterable per tender or in aggregate.
9. Independent method claim mirroring 1, with the claim step of 6 as a dependent claim.
10. Dependent on 1 or 9: the application computes the payable value as a user-entered offer plus the stored deposit requirement and pre-validates it against the stored best value before transmission.

Deliberately **not** claimed: sealed bidding, on-chain role enforcement, award settlement, wallet signing, department imagery, and localStorage session handling.

### 13.4 Disclosure items a specification must state rather than omit

- No bid confidentiality; values are public on submission.
- The winning value is not settled by the contract.
- Publication and award are unrestricted.
- `withdraw()` is inoperative and is not relied upon.
- The demonstration runs on a local network with pre-funded keys.

Stating these is not optional. An examiner's objection is survivable; a specification contradicted by the code is not.

---

## 14. Technical effects (as far as they can be stated without measurement)

Each effect below follows from the code and can be argued without a benchmark:

1. **Atomic coupling.** The credit and the overwrite occur in one transaction, so no execution path leaves a bidder's entitlement unrecorded while its state has advanced.
2. **Bounded claim count.** Because the balance is address-keyed, the number of claim transactions per bidder is independent of the number of tenders in which that bidder was displaced.
3. **At-most-once payment.** Zeroing before the external call, with restore-and-revert on failure, makes double payment through re-entry impossible and prevents a non-accepting recipient from extinguishing the credit.
4. **Single-source audit.** The displayed best value and the refund arithmetic derive from the same on-chain events, so a discrepancy is detectable by reconciling the log.
5. **No operator custody of the refund path.** The refund is discharged by the bidder's own transaction under a rule fixed in code, not by an operator's discretionary action.

Explicitly **not** claimed: any throughput, latency, gas cost, availability or security-level improvement. None was measured.

---

## 15. Material for the research paper

### 15.1 What can honestly be claimed as contribution

- A working, end-to-end implementation of an ascending-bid tender with address-keyed cumulative displacement refunds and event-derived audit state, described precisely enough to be reproduced.
- A clear accounting formalisation: the conservation identity of §5.3, and the observation that coupling comparison to the escrowed quantity makes the deposit a floor rather than a segregated balance.
- An explicit characterisation of the trust boundary: what the contract guarantees (ordering, strict-higher acceptance, at-most-once refund) and what it does not (identity, confidentiality, settlement, eligibility).

### 15.2 What must be stated as limitations

Everything in §11, in particular: no tests, no measurements, no confidentiality, credentials in the bundle, no on-chain roles, no settlement, unrepresentative demo data, and the prior-disclosure question.

### 15.3 Claim statements to avoid

| Do not write | Why |
|---|---|
| "sealed", "blind", "confidential" bidding | Values are public on submission |
| "hash-linked events" | Events are ordered by blocks; they are not hash-linked to each other |
| "role-based access control" (unqualified) | Roles exist only in the UI |
| "escrow is released to the winner" | No transfer path exists |
| "EMD is refunded" | The whole payable value is refunded |
| "automatic refund" | The refund is a bidder-initiated transaction; only the credit is automatic |
| "no known system does X" | No search was performed |
| "trustless" | Trust in the operator is replaced by trust in the contract, the client, and the key holder |
| "MetaMask integration" / "wallet approval" | The dialog is a local modal |
| "deployed on Ethereum" | Local Hardhat node only |

### 15.4 Evaluation plan that would make the paper publishable

1. **Test suite** covering: deposit floor, strict-higher rule, equality rejection, displacement credit amount, cumulative balance across two tenders, claim ordering, double-claim rejection, award with no bids, and `withdraw()` reverting.
2. **Gas measurement** per operation (create, first bid, displacing bid, claim) at the pinned compiler settings, reported as measured rather than estimated.
3. **Invariant checking** of the §5.3 identity across a scripted sequence of bids and claims.
4. **Comparison table** against a conventional portal workflow (number of transactions, number of operator actions, time to refund), stated as an analytical comparison unless measured.
5. **Threat discussion**: mempool front-running, key custody, credential exposure, log availability, and the absence of eligibility checks.

### 15.5 Suggested paper structure

Abstract (≤200 words, using §16) · Introduction and motivation · Background: ascending auctions and on-chain escrow · Related work (be explicit that a search is required before submission) · System design: contract state, bid path, displacement accounting, claim path · Implementation: client, event-derived audit, signing · Security and trust analysis · Limitations · Evaluation (fill from §15.4 or drop the section) · Conclusion and future work.

---

## 16. Reusable abstract (calibrated to the implementation)

> A blockchain-based ascending-bid procurement system comprises a tender-management smart contract on an Ethereum Virtual Machine compatible network and an application communicating with it. The contract stores tender records, receives payable bid transactions, rejects bids from the address recorded as the tender's authority, requires the received value to be not less than a stored deposit requirement, and, where a current best payable value exists, requires the received value to be strictly higher. On displacement, the entire previously accepted payable value — offer and deposit together — is credited, in the same transaction, to a refund balance keyed by the displaced bidder's address and cumulative across tenders, before the stored best value and bidder are overwritten. A separate claim operation clears that balance before an external transfer, restoring it and reverting on failure. Bid events carry accepted payable values; the application derives its tender display and audit history from them. Sealed-bid confidentiality is not provided.

153 words. Safe to reuse in both documents, with the final sentence retained.

---

## 17. Glossary

| Term | Meaning in this project |
|---|---|
| **Offer** | The amount a contractor types into the form. Not stored by the contract. |
| **Deposit requirement (EMD)** | `emdAmountWei`. A floor on `msg.value` and a reported field. Not a segregated balance. |
| **Payable value** | `msg.value` = offer + deposit requirement. The only monetary quantity the contract knows. |
| **Current best payable value** | `lowestBidWei`. The stored best (highest) bid. The field name is historical. |
| **Displacement** | Acceptance of a higher payable value that supersedes the stored leading bidder. |
| **Refund balance** | `pendingReturns[address]`. Cumulative credited payable values awaiting claim. |
| **Claim** | `claimEmdRefund()`, a bidder-initiated withdrawal. |
| **Settlement** | Payment of the winning value to anyone. **Not implemented.** |
| **Confirmation dialog** | The in-application modal that gates signing. Not a wallet. |
| **Audit trail** | The query of `TenderBidSubmitted` logs rendered by the client. |

---

## 18. Outstanding work before filing or submission

| # | Task | Blocking for |
|---|---|---|
| 1 | Reconcile `PATENT_SPECIFICATION.md` with §4–§5 and §11 of this file | Patent |
| 2 | Retire or correct `PATENT_DOCUMENTATION.md` | Patent, paper |
| 3 | Add a contract test suite (§15.4 item 1) | Both |
| 4 | Capture refund-claim and confirmation-dialog figures | Patent |
| 5 | Fill applicant/inventor/signature/Form blocks | Patent |
| 6 | Commission a prior-art search; obtain a §3(k) opinion | Patent |
| 7 | Establish the earliest public-disclosure date of the repository and of AuctionX | Both |
| 8 | Measure gas per operation if a quantitative section is wanted | Paper |
| 9 | Give each department its own authority account in the seed set (magnitudes are done) | Both |
| 10 | Fix the `Offer Amount` and `EMD Refund` labels if figures are to be filed | Patent |

---

*End of document. Every factual statement above is traceable to the source files listed in §0. Where the source does not support a claim, the claim is absent.*
