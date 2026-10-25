import hre from "hardhat";

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const SEED = [
  {
    referenceNo: "CPWD/2026/STR-12/002",
    title: "Seismic Retrofitting of Government Office Buildings",
    description:
      "Seismic zone-IV retrofitting of four government office blocks including structural strengthening, RCC jacketing and finishing as per IS 13920 specifications.",
    category: "Construction",
    department: "CPWD",
    documentUrl: "https://cpwd.gov.in/tender-documents/STR-12-002.pdf",
    estimatedValue: "2500000",
    emdAmount: "0.5",
    durationSec: 72 * 3600,
  },
  {
    referenceNo: "Railway/2026/TRK-88/014",
    title: "Doubling of Track Between Kishanganj and Barsoi",
    description:
      "Doubling and electrification of 42 km of railway track including earthwork, ballasting, sleepers, signaling and overhead equipment.",
    category: "Infrastructure",
    department: "Railways",
    documentUrl: "https://indianrailways.gov.in/tenders/TRK-88-014.pdf",
    estimatedValue: "3000000",
    emdAmount: "0.4",
    durationSec: 36 * 3600,
  },
  {
    referenceNo: "SMART/2026/SC-07/009",
    title: "Integrated Command & Control Centre Setup",
    description:
      "Design, supply, installation and commissioning of an Integrated Command and Control Centre with video surveillance, traffic analytics and disaster management modules.",
    category: "IT Systems",
    department: "Smart Cities",
    documentUrl: "https://smartcities.gov.in/tenders/SC-07-009.pdf",
    estimatedValue: "1200000",
    emdAmount: "0.25",
    durationSec: 24 * 3600,
  },
];

async function main() {
  const contract = await hre.ethers.getContractAt("TenderVault", CONTRACT_ADDRESS);

  const existing = await contract.getAllTenders();
  const existingRefs = new Set(existing.map((t) => t.referenceNo));

  for (const t of SEED) {
    if (existingRefs.has(t.referenceNo)) {
      console.log(`Skip (exists): ${t.referenceNo}`);
      continue;
    }
    const tx = await contract.createTender(
      t.referenceNo,
      t.title,
      t.description,
      t.category,
      t.department,
      t.documentUrl,
      hre.ethers.parseEther(t.estimatedValue),
      hre.ethers.parseEther(t.emdAmount),
      BigInt(t.durationSec),
      { gasLimit: 600000 }
    );
    await tx.wait();
    console.log(`Seeded: ${t.referenceNo} (${t.department}, EMD ${t.emdAmount} ETH)`);
  }

  const after = await contract.getAllTenders();
  console.log(`-----------------------------------------------`);
  console.log(`Total tenders on-chain: ${after.length}`);
  console.log(`-----------------------------------------------`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
