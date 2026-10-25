export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export const TENDER_IMAGES = {
  NHAI: "https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=1200&auto=format&fit=crop&q=80",
  CPWD: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
  Railways: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1200&auto=format&fit=crop&q=80",
  "Smart Cities": "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1200&auto=format&fit=crop&q=80",
  DEFAULT: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop&q=80"
};

export const getTenderImage = (tender) => {
  if (!tender) return TENDER_IMAGES.DEFAULT;
  const dept = tender.department || "";
  if (TENDER_IMAGES[dept]) return TENDER_IMAGES[dept];
  const cat = (tender.category || "").toLowerCase();
  if (cat.includes("bridge") || cat.includes("highway") || cat.includes("road")) return TENDER_IMAGES.NHAI;
  if (cat.includes("rail")) return TENDER_IMAGES.Railways;
  if (cat.includes("build") || cat.includes("civil")) return TENDER_IMAGES.CPWD;
  if (cat.includes("smart") || cat.includes("city")) return TENDER_IMAGES["Smart Cities"];
  return TENDER_IMAGES.DEFAULT;
};

export const CONTRACT_ABI = [
  "function deployer() view returns (address)",
  "function tenderCount() view returns (uint256)",
  "function pendingReturns(address) view returns (uint256)",
  "function tenders(uint256) view returns (uint256 id, string referenceNo, string title, string description, string category, string department, string documentUrl, address authorityAddress, uint256 estimatedValueWei, uint256 emdAmountWei, uint256 lowestBidWei, address lowestBidderAddress, uint256 closingTime, uint8 status, bool fundsClaimed)",
  "function getAllTenders() view returns (tuple(uint256 id, string referenceNo, string title, string description, string category, string department, string documentUrl, address authorityAddress, uint256 estimatedValueWei, uint256 emdAmountWei, uint256 lowestBidWei, address lowestBidderAddress, uint256 closingTime, uint8 status, bool fundsClaimed)[])",
  "function createTender(string referenceNo, string title, string description, string category, string department, string documentUrl, uint256 estimatedValueWei, uint256 emdAmountWei, uint256 duration) returns (uint256)",
  "function submitBid(uint256 tenderId) payable",
  "function submitBid() payable",
  "function claimEmdRefund() returns (bool)",
  "function withdraw() returns (bool)",
  "function awardTender(uint256 tenderId)",
  "event TenderCreated(uint256 indexed tenderId, string referenceNo, string title, address indexed authorityAddress, uint256 estimatedValueWei, uint256 emdAmountWei, uint256 closingTime)",
  "event TenderBidSubmitted(uint256 indexed tenderId, string referenceNo, address indexed bidder, uint256 offerAmount, uint256 emdAmount, uint256 timestamp)",
  "event TenderAwarded(uint256 indexed tenderId, address winner, uint256 lowestBid)",
  "event RefundClaimed(address indexed bidder, uint256 amount)"
];
