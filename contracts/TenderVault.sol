// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TenderVault {
    address public deployer;

    enum TenderStatus { OPEN, EVALUATING, AWARDED }

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
        TenderStatus status;
        bool fundsClaimed;
    }

    uint256 public tenderCount;
    mapping(uint256 => Tender) public tenders;
    
    // Tracks claimable EMD refunds per user: bidder address => pending refund in wei
    mapping(address => uint256) public pendingReturns;

    event TenderCreated(
        uint256 indexed tenderId,
        string referenceNo,
        string title,
        address indexed authorityAddress,
        uint256 estimatedValueWei,
        uint256 emdAmountWei,
        uint256 closingTime
    );

    event TenderBidSubmitted(
        uint256 indexed tenderId,
        string referenceNo,
        address indexed bidder,
        uint256 offerAmount,
        uint256 emdAmount,
        uint256 timestamp
    );

    event TenderAwarded(
        uint256 indexed tenderId,
        address winner,
        uint256 lowestBid
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

        // Seed default initial tender
        createTender(
            "NHAI/2026/HP-45/001",
            "Construction of Highway Bridge over River Beas",
            "Construction of a 4-lane bridge with approach roads including earthwork, pavement, drainage and allied structures as per IRC specifications.",
            "Infrastructure",
            "NHAI",
            "https://nhai.gov.in/tender-documents/HP-45-001.pdf",
            5000000 ether,
            50000 ether,
            48 hours
        );
    }

    function createTender(
        string memory referenceNo,
        string memory title,
        string memory description,
        string memory category,
        string memory department,
        string memory documentUrl,
        uint256 estimatedValueWei,
        uint256 emdAmountWei,
        uint256 duration
    ) public returns (uint256) {
        require(duration > 0, "Duration must be > 0");
        require(emdAmountWei > 0, "EMD amount must be > 0");

        uint256 tenderId = tenderCount;
        tenderCount++;

        tenders[tenderId] = Tender({
            id: tenderId,
            referenceNo: referenceNo,
            title: title,
            description: description,
            category: category,
            department: department,
            documentUrl: documentUrl,
            authorityAddress: payable(msg.sender),
            estimatedValueWei: estimatedValueWei,
            emdAmountWei: emdAmountWei,
            lowestBidWei: 0,
            lowestBidderAddress: address(0),
            closingTime: block.timestamp + duration,
            status: TenderStatus.OPEN,
            fundsClaimed: false
        });

        emit TenderCreated(
            tenderId,
            referenceNo,
            title,
            msg.sender,
            estimatedValueWei,
            emdAmountWei,
            block.timestamp + duration
        );

        return tenderId;
    }

    function submitBid(uint256 tenderId) public payable {
        Tender storage tender = tenders[tenderId];
        
        require(tender.closingTime > 0, "Tender does not exist");
        require(block.timestamp <= tender.closingTime, "Tender closed");
        require(tender.status == TenderStatus.OPEN, "Tender not open for bidding");
        require(msg.sender != tender.authorityAddress, "Authority cannot bid on their own tender");
        require(msg.value >= tender.emdAmountWei, "Must pay at least EMD amount");

        if (tender.lowestBidWei == 0) {
            // First bid accepted
        } else {
            require(msg.value < tender.lowestBidWei, "New bid must be lower than current lowest bid");
        }

        if (tender.lowestBidWei != 0 && tender.lowestBidderAddress != address(0)) {
            pendingReturns[tender.lowestBidderAddress] += tender.lowestBidWei;
        }

        tender.lowestBidderAddress = msg.sender;
        tender.lowestBidWei = msg.value;

        emit TenderBidSubmitted(
            tenderId,
            tender.referenceNo,
            msg.sender,
            msg.value,
            tender.emdAmountWei,
            block.timestamp
        );
    }

    function submitBid() external payable {
        submitBid(0);
    }

    function claimEmdRefund() external returns (bool) {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No pending refund to withdraw");

        pendingReturns[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            pendingReturns[msg.sender] = amount;
            revert("ETH transfer failed");
        }

        emit RefundClaimed(msg.sender, amount);
        return true;
    }

    function withdraw() external returns (bool) {
        return this.claimEmdRefund();
    }

    function awardTender(uint256 tenderId) external {
        Tender storage tender = tenders[tenderId];
        require(tender.closingTime > 0, "Tender does not exist");
        require(block.timestamp >= tender.closingTime, "Tender not yet closed");
        require(tender.status == TenderStatus.OPEN, "Tender already awarded/evaluated");

        tender.status = TenderStatus.AWARDED;
        emit TenderAwarded(tenderId, tender.lowestBidderAddress, tender.lowestBidWei);

        if (tender.lowestBidWei > 0 && !tender.fundsClaimed) {
            tender.fundsClaimed = true;
        }
    }

    function getAllTenders() external view returns (Tender[] memory) {
        Tender[] memory list = new Tender[](tenderCount);
        for (uint256 i = 0; i < tenderCount; i++) {
            list[i] = tenders[i];
        }
        return list;
    }
}
