export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const CONTRACT_ABI = [
  "function deployer() view returns (address)",
  "function auctionCount() view returns (uint256)",
  "function beneficiary() view returns (address)",
  "function auctionEndTime() view returns (uint256)",
  "function highestBidder() view returns (address)",
  "function highestBid() view returns (uint256)",
  "function pendingReturns(address) view returns (uint256)",
  "function auctions(uint256) view returns (uint256 id, string title, string description, string category, string imageUrl, address seller, uint256 startingPrice, uint256 highestBid, address highestBidder, uint256 auctionEndTime, bool ended, bool fundsClaimed)",
  "function getAllAuctions() view returns (tuple(uint256 id, string title, string description, string category, string imageUrl, address seller, uint256 startingPrice, uint256 highestBid, address highestBidder, uint256 auctionEndTime, bool ended, bool fundsClaimed)[])",
  "function createAuction(string title, string description, string category, string imageUrl, uint256 startingPrice, uint256 duration) returns (uint256)",
  "function bid() payable",
  "function bid(uint256 auctionId) payable",
  "function withdraw() returns (bool)",
  "function endAuction(uint256 auctionId)",
  "event AuctionCreated(uint256 indexed auctionId, string title, address indexed seller, uint256 startingPrice, uint256 auctionEndTime)",
  "event HighestBidIncreased(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount)",
  "event RefundClaimed(address indexed bidder, uint256 amount)"
];
