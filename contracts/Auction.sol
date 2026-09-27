// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuctionX {
    address public deployer;

    struct ItemAuction {
        uint256 id;
        string title;
        string description;
        string category;
        string imageUrl;
        address payable seller;
        uint256 startingPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 auctionEndTime;
        bool ended;
        bool fundsClaimed;
    }

    uint256 public auctionCount;
    mapping(uint256 => ItemAuction) public auctions;
    
    // Tracks claimable outbid refunds per user: bidder address => pending refund in wei
    mapping(address => uint256) public pendingReturns;

    event AuctionCreated(
        uint256 indexed auctionId,
        string title,
        address indexed seller,
        uint256 startingPrice,
        uint256 auctionEndTime
    );

    event HighestBidIncreased(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        address winner,
        uint256 amount
    );

    event RefundClaimed(
        address indexed bidder,
        uint256 amount
    );

    modifier onlyDeployer() {
        require(msg.sender == deployer, "Only deployer can perform this action");
        _;
    }

    constructor() {
        deployer = msg.sender;

        // Seed default initial luxury timepiece auction
        createAuction(
            "Vintage Rolex Submariner (1988)",
            "Authenticated luxury timepiece backed by non-custodial smart contract escrow on local Ethereum blockchain.",
            "Luxury Watches",
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
            0.5 ether,
            24 hours
        );
    }

    function createAuction(
        string memory title,
        string memory description,
        string memory category,
        string memory imageUrl,
        uint256 startingPrice,
        uint256 duration
    ) public returns (uint256) {
        require(duration > 0, "Duration must be > 0");

        uint256 auctionId = auctionCount;
        auctionCount++;

        auctions[auctionId] = ItemAuction({
            id: auctionId,
            title: title,
            description: description,
            category: category,
            imageUrl: imageUrl,
            seller: payable(msg.sender),
            startingPrice: startingPrice,
            highestBid: 0,
            highestBidder: address(0),
            auctionEndTime: block.timestamp + duration,
            ended: false,
            fundsClaimed: false
        });

        emit AuctionCreated(
            auctionId,
            title,
            msg.sender,
            startingPrice,
            block.timestamp + duration
        );

        return auctionId;
    }

    // Core bidding logic for a specific auction ID
    function bid(uint256 auctionId) public payable {
        ItemAuction storage item = auctions[auctionId];
        
        require(item.auctionEndTime > 0, "Auction does not exist");
        require(block.timestamp <= item.auctionEndTime, "Auction ended");
        require(!item.ended, "Auction already settled");
        require(msg.sender != item.seller, "Seller cannot bid on their own auction");

        if (item.highestBid == 0) {
            require(msg.value >= item.startingPrice, "Bid less than starting price");
        } else {
            require(msg.value > item.highestBid, "Bid not high enough");
        }

        // Lock previous top bidder's funds into pendingReturns (outbid refund)
        if (item.highestBid != 0 && item.highestBidder != address(0)) {
            pendingReturns[item.highestBidder] += item.highestBid;
        }

        // Set current caller as TOP BIDDER
        item.highestBidder = msg.sender;
        item.highestBid = msg.value;

        emit HighestBidIncreased(auctionId, msg.sender, msg.value);
    }

    // Default bid fallback for single-auction interface calls: bid()
    function bid() external payable {
        bid(0);
    }

    // Allows outbid bidders to claim and withdraw their locked ETH refunds
    function withdraw() external returns (bool) {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No pending refund to withdraw");

        // Zero out state first to prevent reentrancy attacks
        pendingReturns[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            pendingReturns[msg.sender] = amount;
            revert("ETH transfer failed");
        }

        emit RefundClaimed(msg.sender, amount);
        return true;
    }

    // End/settle auction after duration expires
    function endAuction(uint256 auctionId) external {
        ItemAuction storage item = auctions[auctionId];
        require(item.auctionEndTime > 0, "Auction does not exist");
        require(block.timestamp >= item.auctionEndTime, "Auction not yet ended");
        require(!item.ended, "Auction already ended");

        item.ended = true;
        emit AuctionEnded(auctionId, item.highestBidder, item.highestBid);

        // Transfer final winning bid amount to the seller
        if (item.highestBid > 0 && !item.fundsClaimed) {
            item.fundsClaimed = true;
            (bool success, ) = item.seller.call{value: item.highestBid}("");
            require(success, "Seller transfer failed");
        }
    }

    // Frontend read helper functions
    function beneficiary() external view returns (address payable) {
        return auctions[0].seller;
    }

    function auctionEndTime() external view returns (uint256) {
        return auctions[0].auctionEndTime;
    }

    function highestBidder() external view returns (address) {
        return auctions[0].highestBidder;
    }

    function highestBid() external view returns (uint256) {
        return auctions[0].highestBid;
    }

    function getAllAuctions() external view returns (ItemAuction[] memory) {
        ItemAuction[] memory list = new ItemAuction[](auctionCount);
        for (uint256 i = 0; i < auctionCount; i++) {
            list[i] = auctions[i];
        }
        return list;
    }
}