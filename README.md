# ⚡ AuctionX | Decentralized Web3 Auction Platform

AuctionX is a production-grade, full-stack decentralized auction platform engineered on Ethereum using **Solidity, Hardhat, Ethers.js v6, and React (Vite)**.

Built with real-time state management, an isolated local private-key wallet provider, and custom smart contract security mechanisms, AuctionX enables **multi-account live bidding without requiring external browser extensions**.

---

## 📸 System Overview & Live Preview

| Live Bidding Interface | MetaMask Simulator Modal |
|---|---|
| Real-time auction timer, top bidder tracking, and bid inputs | Raw transaction payload inspection, gas estimation, and account validation |

| Portfolio & Refund Vault | Multi-Auction Explorer |
|---|---|
| Pending ETH returns via `withdraw()` pull pattern | Categorized view of active and concluded auctions |

---

## ✨ Key Features & Highlights

### 🔨 Real-Time Decentralized Bidding Engine

- **Event-Driven State Updates:** UI listens directly to on-chain `HighestBidIncreased` smart contract events and instantly updates state across active browser tabs.

- **Dynamic Countdown Timer:** Real-time local block synchronization tracks auction expiry with automated `ENDED` state locking.

- **Live Audit Log:** Every bid emits a structured EVM event containing bidder address, ETH amount, block timestamp, and transaction hash.

### 🔄 Simulated Multi-Account Environment

- **Pre-Funded Hardhat Keyring:** Toggle instantly between Deployer/Seller and three distinct Bidders, each backed by standard pre-funded Hardhat development accounts.

- **Local Private Key Signer:** Bypasses external browser-extension prompts by using direct `ethers.Wallet` instances connected to the local JSON-RPC provider.

- **Case-Insensitive Address Mapping:** Normalizes Ethereum addresses to eliminate key lookup mismatches during transaction signing.

### 🛡️ Smart Contract Security & Architecture

- **Pull-over-Push Refund Vault:** Uses the `withdraw()` design pattern. Outbid funds are safely held in the `pendingReturns` mapping, reducing the risk of denial-of-service through reverting recipients.

- **Seller Self-Bidding Prevention:** On-chain `require()` checks prevent the auction creator/deployer from bidding on their own auction.

- **Explicit Gas Limit Safeguards:** Fixed gas limits are applied to contract transactions to improve execution reliability against local RPC gas-estimation quirks.

### 🦊 Interactive MetaMask Simulator Modal

- **Transaction Payload Inspection:** Pre-flight modal displaying `from`, transaction type, amount, and contract method details before broadcasting to the local node.

- **Toast Notification System:** Instant feedback for transaction broadcasts, confirmation receipts, and revert errors with clickable transaction hashes.

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Smart Contracts** | Solidity `^0.8.28` | Auction logic, state management, and security |
| **Development Network** | Hardhat | Local Ethereum network and deployment |
| **Frontend** | React 18 + Vite | UI and application state |
| **Web3** | Ethers.js v6 | Blockchain interaction and wallet signing |
| **Routing** | React Router v6 | Application navigation |
| **Icons** | Lucide React | UI icon system |
| **Styling** | Custom CSS3 | Dark glassmorphism design |

---

## 📁 Repository Structure

```text
auction-dapp/
├── contracts/
│   └── Auction.sol
│
├── scripts/
│   ├── deploy.js
│   ├── test-bidder2.mjs
│   └── validate-wallets.mjs
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CreateAuctionModal.jsx
│   │   │   ├── MetaMaskSimulatorModal.jsx
│   │   │   ├── ToastContainer.jsx
│   │   │   └── CountdownTimer.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Explore.jsx
│   │   │   └── Profile.jsx
│   │   │
│   │   ├── utils/
│   │   │   ├── accounts.js
│   │   │   └── constants.js
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── hardhat.config.js
├── package.json
└── README.md
