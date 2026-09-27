// One-off E2E validation against a running local Hardhat node.
// Verifies Tasks 1/3/4: signer config, auction-specific bidding, error mapping.
// Not part of the app runtime.
import { ethers } from "ethers";
import fs from "fs";
import {
  HARDHAT_ACCOUNTS,
  getDirectSigner,
  describeBidError,
} from "../frontend/src/utils/accounts.js";

const RPC = "http://127.0.0.1:8545";
const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // frontend constant

const artifact = JSON.parse(
  fs.readFileSync(
    new URL("../artifacts/contracts/Auction.sol/AuctionX.json", import.meta.url),
    "utf8"
  )
);

const provider = new ethers.JsonRpcProvider(RPC);

let fails = 0;
function check(name, cond, extra = "") {
  if (!cond) fails++;
  console.log(`${cond ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
}

const [deployerAcc, bidder1, bidder2] = HARDHAT_ACCOUNTS;

const deployerSigner = getDirectSigner(deployerAcc.address, provider);
const b1Signer = getDirectSigner(bidder1.address, provider);
const b2Signer = getDirectSigner(bidder2.address, provider);

check(
  "Bidder 2 wallet.address matches configured address",
  b2Signer.address.toLowerCase() === bidder2.address.toLowerCase(),
  b2Signer.address
);

const contract = new ethers.Contract(CONTRACT, artifact.abi, deployerSigner);

const code = await provider.getCode(CONTRACT);
check("Contract deployed at frontend constant address", code !== "0x", CONTRACT);

// Auction 0 seeded by constructor
const a0 = await contract.auctions(0);
check("Auction 0 seeded by constructor", a0.auctionEndTime > 0n, a0.title);

// Create a second auction (auction 1) from the deployer
const txCreate = await contract.createAuction(
  "E2E Test Item",
  "second auction",
  "Collectibles",
  "",
  ethers.parseEther("1.0"),
  86400
);
await txCreate.wait();
const a1 = await contract.auctions(1);
check("Auction 1 created independently", a1.id === 1n);

// --- Bidder 2 bids 0.6 ETH on auction 0 ---
const bidTx = await contract
  .connect(b2Signer)
  ["bid(uint256)"](0, { value: ethers.parseEther("0.6") });
const receipt = await bidTx.wait();

check(
  "Hardhat sees Bidder 2 as tx sender (receipt.from)",
  receipt.from.toLowerCase() === bidder2.address.toLowerCase(),
  receipt.from
);

const a0After = await contract.auctions(0);
check(
  "Auction 0 highestBidder is Bidder 2",
  a0After.highestBidder.toLowerCase() === bidder2.address.toLowerCase()
);
check(
  "Auction 0 highestBid = 0.6 ETH",
  a0After.highestBid === ethers.parseEther("0.6")
);

// --- Auction-specificity: Bidder 1 bids on auction 1 only ---
const bidTx2 = await contract
  .connect(b1Signer)
  ["bid(uint256)"](1, { value: ethers.parseEther("1.5") });
await bidTx2.wait();
const a1After = await contract.auctions(1);
const a0Final = await contract.auctions(0);
check(
  "Auction 1 highestBidder is Bidder 1",
  a1After.highestBidder.toLowerCase() === bidder1.address.toLowerCase()
);
check(
  "Auction 0 unaffected by auction 1 bid (no global state)",
  a0Final.highestBidder.toLowerCase() === bidder2.address.toLowerCase() &&
    a0Final.highestBid === ethers.parseEther("0.6")
);

// --- TEST 5: createAuction via the app's exact code path ---
// (ethers.Contract(CONTRACT, ABI, signer-with-provider) + AuctionCreated parse)
const appStyleContract = new ethers.Contract(CONTRACT, artifact.abi, deployerSigner);
const createTx = await appStyleContract.createAuction(
  "App Path Auction",
  "created via getDirectSigner(addr, provider)",
  "Fine Jewelry",
  "",
  ethers.parseEther("0.25"),
  3600,
  { gasLimit: 500000 }
);
const createReceipt = await createTx.wait();
let parsedAuctionId = null;
for (const log of createReceipt.logs) {
  try {
    const parsedLog = appStyleContract.interface.parseLog(log);
    if (parsedLog && parsedLog.name === "AuctionCreated") {
      parsedAuctionId = Number(parsedLog.args.auctionId);
      break;
    }
  } catch {
    /* unrelated log */
  }
}
check(
  "createAuction succeeds with signer provider (no 'missing provider')",
  parsedAuctionId !== null
);
check(
  "REAL numeric auction ID parsed from AuctionCreated event",
  Number.isInteger(parsedAuctionId) && parsedAuctionId >= 0,
  `id=${parsedAuctionId}`
);

// --- TEST 10: second auction gets a different real ID ---
// NOTE: the app builds a FRESH provider per transaction
// (getProvider() in App.jsx), so mirror that here — a
// shared provider can serve a stale cached nonce for
// rapid back-to-back sends.
const freshSigner = getDirectSigner(
  deployerAcc.address,
  new ethers.JsonRpcProvider(RPC)
);
const appStyleContract2 = new ethers.Contract(
  CONTRACT,
  artifact.abi,
  freshSigner
);
const createTx2 = await appStyleContract2.createAuction(
  "Second App Auction",
  "distinct id check",
  "Digital Art",
  "",
  ethers.parseEther("0.1"),
  7200,
  { gasLimit: 500000 }
);
const createReceipt2 = await createTx2.wait();
let secondAuctionId = null;
for (const log of createReceipt2.logs) {
  try {
    const parsedLog = appStyleContract.interface.parseLog(log);
    if (parsedLog && parsedLog.name === "AuctionCreated") {
      secondAuctionId = Number(parsedLog.args.auctionId);
      break;
    }
  } catch {
    /* unrelated log */
  }
}
check(
  "Second auction gets a DIFFERENT real auction ID",
  secondAuctionId !== null && secondAuctionId !== parsedAuctionId,
  `ids ${parsedAuctionId} vs ${secondAuctionId}`
);
const allAuctions = await contract.getAllAuctions();
check(
  "getAllAuctions returns all created auctions",
  allAuctions.length >= 4,
  `count=${allAuctions.length}`
);

// --- Error mapping (Task 4) ---
try {
  const t = await contract
    .connect(b1Signer)
    ["bid(uint256)"](0, { value: ethers.parseEther("0.1") });
  await t.wait();
  check("Low bid rejected on-chain", false);
} catch (err) {
  const msg = describeBidError(err);
  check(
    "Low bid -> helpful message",
    /higher than the current highest bid/i.test(msg),
    msg
  );
}

try {
  const t = await contract
    .connect(deployerSigner)
    ["bid(uint256)"](0, { value: ethers.parseEther("2") });
  await t.wait();
  check("Seller bid rejected on-chain", false);
} catch (err) {
  const msg = describeBidError(err);
  check("Seller bid -> helpful message", /seller cannot bid/i.test(msg), msg);
}

// --- Unknown address must throw, never fall back (Task 1 req 5/6) ---
try {
  getDirectSigner("0x000000000000000000000000000000000000dEaD", provider);
  check("Unknown address throws", false);
} catch (err) {
  check(
    "Unknown address -> clear error",
    /Virtual wallet not found/i.test(err.message),
    err.message
  );
}

// --- Outbid refund tracking + withdraw (Task 6 preservation) ---
const bidTx3 = await contract
  .connect(b2Signer)
  ["bid(uint256)"](1, { value: ethers.parseEther("2") });
await bidTx3.wait();
const refund1 = await contract.pendingReturns(bidder1.address);
check(
  "Outbid refund tracked for Bidder 1",
  refund1 === ethers.parseEther("1.5"),
  ethers.formatEther(refund1) + " ETH"
);

const wTx = await contract.connect(b1Signer).withdraw();
await wTx.wait();
const refundAfter = await contract.pendingReturns(bidder1.address);
check("withdraw() cleared pending refund", refundAfter === 0n);

console.log(
  fails === 0 ? "\nALL E2E CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`
);
process.exit(fails === 0 ? 0 : 1);
