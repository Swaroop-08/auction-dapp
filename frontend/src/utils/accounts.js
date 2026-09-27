import { ethers } from "ethers";

export const HARDHAT_ACCOUNTS = [
  {
    name: "Deployer / Seller",
    role: "Deployer",
    address:
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },

  {
    name: "Bidder 1",
    role: "User",
    address:
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },

  {
    name: "Bidder 2",
    role: "User",
    address:
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },

  {
    name: "Bidder 3",
    role: "User",
    address:
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey:
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
];

export function getAccountLabel(address) {
  if (!address) return "Unknown";

  const acc = HARDHAT_ACCOUNTS.find(
    (a) =>
      a.address.toLowerCase() === address.toLowerCase()
  );

  return acc
    ? acc.name
    : `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getAccountDetails(
  address,
  deployerAddress
) {
  const addr = address || "";

  const isDeployer =
    deployerAddress &&
    addr.toLowerCase() ===
      deployerAddress.toLowerCase();

  const accMatch = HARDHAT_ACCOUNTS.find(
    (a) =>
      a.address.toLowerCase() ===
      addr.toLowerCase()
  );

  return {
    address: addr,

    name: accMatch
      ? accMatch.name
      : isDeployer
      ? "Deployer"
      : "Bidder",

    short: addr
      ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
      : "Not Connected",

    badge: isDeployer
      ? "Deployer"
      : "Bidder",

    isDeployer,
  };
}

/* =========================================================
   VIRTUAL WALLET SIGNER FACTORY
   =========================================================

   HARDHAT_ACCOUNTS (this file) is the SINGLE source of
   truth for name / role / address / privateKey.

   No other file may keep its own private-key mapping.

   We are NOT using MetaMask: ethers.Wallet signs
   transactions locally and Hardhat receives them via
   the local JSON-RPC endpoint.
   ========================================================= */

export function getDirectSigner(
  userAddress,
  provider
) {
  const activeAddr = userAddress || "";

  /* Look up the selected virtual account */

  const accountData = HARDHAT_ACCOUNTS.find(
    (acc) =>
      acc.address.toLowerCase() ===
      activeAddr.toLowerCase()
  );

  if (!accountData) {

    /* NEVER silently fall back to another
       wallet's key: unknown address = hard error */

    throw new Error(
      `Virtual wallet not found in HARDHAT_ACCOUNTS: ${activeAddr}`
    );
  }

  if (!accountData.privateKey) {

    throw new Error(
      `No private key configured for ${accountData.name} in accounts.js`
    );
  }

  /* A signer without an RPC provider cannot send
     transactions (this caused "missing provider") */

  if (!provider) {

    throw new Error(
      "No RPC provider supplied to getDirectSigner (expected http://127.0.0.1:8545)."
    );
  }

  /* Local ethers wallet (no MetaMask involved) */

  const wallet = new ethers.Wallet(
    accountData.privateKey,
    provider
  );

  /* Safety check: derived address must match the
     configured one exactly (case-insensitive) */

  if (
    wallet.address.toLowerCase() !==
    accountData.address.toLowerCase()
  ) {

    throw new Error(
      `CONFIGURATION ERROR: private key for ${accountData.name} does not match its configured address ${accountData.address} (derived ${wallet.address}). Fix accounts.js.`
    );
  }

  return wallet;
}

/* =========================================================
   USER-FACING BID ERROR MESSAGES
   =========================================================

   Maps raw ethers/revert errors to helpful messages.
   Private keys are never included in these strings.
   ========================================================= */

export function describeBidError(err) {

  const raw = String(
    (err &&
      (err.reason ||
        err.revert?.args?.[0] ||
        err.shortMessage ||
        err.message)) ||
    ""
  );

  if (
    /invalid private key|invalid PrivateKey|INVALID_PRIVATE_KEY/i.test(
      raw
    )
  ) {
    return "Virtual wallet private key configuration error. Check accounts.js.";
  }

  if (/insufficient funds/i.test(raw)) {
    return "Insufficient ETH balance for this bid (plus gas).";
  }

  if (/auction does not exist/i.test(raw)) {
    return "This auction does not exist on-chain.";
  }

  if (/auction ended|already settled/i.test(raw)) {
    return "This auction has already ended.";
  }

  if (/not high enough|less than starting price/i.test(raw)) {
    return "Your bid must be higher than the current highest bid (or at least the starting price).";
  }

  if (/seller cannot bid/i.test(raw)) {
    return "The seller cannot bid on their own auction.";
  }

  return (
    raw.slice(0, 200) || "Transaction reverted on-chain."
  );
}