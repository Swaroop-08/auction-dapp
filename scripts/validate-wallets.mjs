// One-off validation: all HARDHAT_ACCOUNTS must build ethers.Wallet instances
// whose derived address matches the configured address. Not part of the app.
import { ethers } from "ethers";
import { HARDHAT_ACCOUNTS } from "../frontend/src/utils/accounts.js";

let allOk = true;
for (const acc of HARDHAT_ACCOUNTS) {
  try {
    const wallet = new ethers.Wallet(acc.privateKey);
    const match =
      wallet.address.toLowerCase() === acc.address.toLowerCase();
    console.log(
      `${match ? "OK " : "FAIL"} ${acc.name} -> ${wallet.address}` +
        (match ? "" : ` (expected ${acc.address})`)
    );
    if (!match) allOk = false;
  } catch (e) {
    console.log(`FAIL ${acc.name} -> ${e.message}`);
    allOk = false;
  }
}
console.log(allOk ? "ALL WALLETS VALID" : "WALLET VALIDATION FAILED");
process.exit(allOk ? 0 : 1);
