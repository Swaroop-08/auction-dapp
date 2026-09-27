import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAccountLabel, getAccountDetails, HARDHAT_ACCOUNTS } from "../utils/accounts";
import CountdownTimer from "../components/CountdownTimer";
import {
  ArrowLeft,
  Clock,
  Gavel,
  Flame,
  History,
  Wallet,
  ShieldCheck,
} from "lucide-react";

export default function AuctionDetails({
  account,
  balance,
  auctionsList = [],
  bidHistory = [],
  pendingRefund,
  deployer,
  isLoadingContract,
  handleBid,
  handleWithdraw,
  onSwitchAccount,
}) {
  const { auctionId } = useParams();
  const numericId = Number(auctionId);

  const [bidInput, setBidInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Flips to true when the live countdown reaches zero
     so the status/form update without a manual refresh */
  const [timerEnded, setTimerEnded] = useState(false);

  const auction = (auctionsList || []).find((a) => a.id === numericId);

  const accountDetails = getAccountDetails(account, deployer);
  const isSeller =
    auction &&
    account &&
    auction.seller &&
    auction.seller.toLowerCase() === account.toLowerCase();

  // Per-auction bid history from HighestBidIncreased events (auctionId-tagged)
  const auctionBids = (bidHistory || [])
    .filter((b) => Number(b.auctionId) === numericId)
    .slice()
    .reverse();

  const numericHighest = auction ? parseFloat(auction.highestBid || "0") : 0;
  const numericStarting = auction ? parseFloat(auction.startingPrice || "0") : 0;
  const minRequiredBid =
    numericHighest > 0 ? numericHighest + 0.01 : numericStarting;

  if (!auction) {
    return (
      <div className="auction-details-container">
        <Link to="/explore" className="back-to-explore">
          <ArrowLeft size={16} /> Back to Explore
        </Link>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="empty-log">
            {isLoadingContract
              ? "Loading auction from the local chain..."
              : `Auction #${auctionId} was not found on the local chain. It may not exist yet.`}
          </p>
          <Link to="/explore" className="btn-primary" style={{ display: "inline-flex", marginTop: "1rem" }}>
            Browse All Auctions
          </Link>
        </div>
      </div>
    );
  }

  const isLive = auction.isLive && !auction.ended && !timerEnded;

  const onSubmitBid = async (e) => {
    e.preventDefault();
    if (!bidInput) return;
    setIsSubmitting(true);
    try {
      await handleBid(auction.id, bidInput);
      setBidInput("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPresetBid = (increment) => {
    const base = numericHighest > 0 ? numericHighest : numericStarting;
    setBidInput((base + increment).toFixed(2));
  };

  return (
    <div className="auction-details-container">
      {/* Breadcrumb */}
      <Link to="/explore" className="back-to-explore">
        <ArrowLeft size={16} /> Back to Explore
      </Link>

      {/* Virtual account switcher (same bar as Home) */}
      <div className="demo-account-bar">
        <div className="demo-title-group">
          <Wallet size={16} color="#06b6d4" />
          <span className="demo-title">Simulate Local Accounts:</span>
        </div>
        <div className="demo-buttons">
          {HARDHAT_ACCOUNTS.map((acc) => {
            const isActive =
              account &&
              account.toLowerCase() === acc.address.toLowerCase();
            const isDeployerAcc =
              acc.address.toLowerCase() === (deployer || "").toLowerCase();

            return (
              <button
                key={acc.address}
                className={"btn-demo-acc " + (isActive ? "active" : "")}
                onClick={() => onSwitchAccount(acc.address)}
                title={`Switch to ${acc.name} (${acc.address})`}
              >
                <span>{acc.name}</span>
                <span
                  className={
                    "role-tag-badge " +
                    (isDeployerAcc ? "role-deployer" : "role-bidder")
                  }
                >
                  {isDeployerAcc ? "Deployer" : "Bidder"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main layout: asset + bidding console */}
      <div className="auction-details-grid">
        {/* Asset card */}
        <div className="card asset-card">
          {isLive ? (
            <div className="badge-live">
              <span className="badge-pulse-dot"></span>
              LIVE ON-CHAIN AUCTION
            </div>
          ) : (
            <div className="badge-live" style={{ background: "rgba(244, 63, 94, 0.12)", borderColor: "rgba(244, 63, 94, 0.3)" }}>
              <span style={{ color: "var(--rose)" }}>●</span>
              <span style={{ color: "var(--rose)" }}>AUCTION ENDED</span>
            </div>
          )}

          <h2 className="asset-title">{auction.title}</h2>

          {auction.imageUrl ? (
            <img
              src={auction.imageUrl}
              alt={auction.title}
              style={{
                width: "100%",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-card)",
                marginBottom: "1.25rem",
                maxHeight: "340px",
                objectFit: "cover",
              }}
            />
          ) : null}

          <div className="asset-stats">
            <div className="stat-box">
              <span className="stat-label">
                <Clock size={13} /> {isLive ? "Time Remaining" : "Closed"}
              </span>
              {isLive ? (
                <CountdownTimer
                  endTime={auction.auctionEndTime}
                  onEnded={() => setTimerEnded(true)}
                />
              ) : (
                <span className="stat-val" style={{ color: "var(--rose)" }}>
                  Auction Ended
                </span>
              )}
            </div>
            <div className="stat-box">
              <span className="stat-label">Auction ID</span>
              <span className="stat-val">#{auction.id}</span>
            </div>
          </div>

          <div className="details-meta-row">
            <span className="category">{auction.category}</span>
            <span className="seller-inline">
              Seller: <strong>{getAccountLabel(auction.seller)}</strong>
            </span>
          </div>

          <p className="asset-desc">{auction.description}</p>

          <div className="features-list">
            <div className="feature-item">
              <ShieldCheck size={22} className="feature-icon" />
              <div>
                <strong>Trustless Escrow Security</strong>
                <p>
                  Funds are held directly by the smart contract. When outbid,
                  the previous amount moves to pending returns for withdrawal.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bidding console */}
        <div className="card console-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <h3 style={{ margin: 0 }}>
              <Flame size={20} color="#f59e0b" />
              Live Bidding Console
            </h3>
            <span
              className={
                "user-role-pill " +
                (accountDetails.isDeployer ? "role-deployer" : "role-bidder")
              }
            >
              Role: {accountDetails.badge}
            </span>
          </div>

          <div className="bid-status-board">
            <div className="status-metric">
              <span className="metric-label">CURRENT HIGHEST BID</span>
              <span className="metric-value">
                {numericHighest > 0 ? auction.highestBid : auction.startingPrice} ETH
                {numericHighest === 0 && (
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", display: "block" }}>
                    (no bids yet — starting price)
                  </span>
                )}
              </span>
            </div>
            <div className="status-metric">
              <span className="metric-label">TOP BIDDER</span>
              <span className="metric-value highlight">
                {numericHighest > 0 ? getAccountLabel(auction.highestBidder) : "No bids yet"}
              </span>
            </div>
          </div>

          {isLive && !isSeller ? (
            <form onSubmit={onSubmitBid} className="bid-form">
              <label className="input-label">
                {numericHighest > 0
                  ? `ENTER YOUR BID (Must be > ${auction.highestBid} ETH)`
                  : `ENTER YOUR BID (Min: ${auction.startingPrice} ETH)`}
              </label>
              <div className="input-group">
                <input
                  type="number"
                  step="0.01"
                  min={minRequiredBid}
                  placeholder={"Min required: " + minRequiredBid.toFixed(2)}
                  value={bidInput}
                  onChange={(e) => setBidInput(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <span className="unit">ETH</span>
              </div>

              <div className="bid-presets">
                <button type="button" className="btn-preset" onClick={() => setPresetBid(0.5)}>
                  +0.5 ETH
                </button>
                <button type="button" className="btn-preset" onClick={() => setPresetBid(1.0)}>
                  +1.0 ETH
                </button>
                <button type="button" className="btn-preset" onClick={() => setPresetBid(2.0)}>
                  +2.0 ETH
                </button>
              </div>

              <button type="submit" className="btn-primary" disabled={isSubmitting || !bidInput}>
                {isSubmitting ? (
                  <span>Confirming On-Chain...</span>
                ) : (
                  <>
                    <Gavel size={17} /> Place Bid on Auction #{auction.id}
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="empty-log">
              {isSeller
                ? "You are the seller of this auction and cannot bid on it."
                : "This auction is no longer accepting bids."}
            </div>
          )}

          {/* Claimable refund (same behavior as Home) */}
          <div className={"refund-box " + (parseFloat(pendingRefund || "0") > 0 ? "has-refund" : "")}>
            <div>
              <span className="refund-label">YOUR CLAIMABLE REFUND</span>
              <span className="refund-amount">{pendingRefund || "0"} ETH</span>
            </div>
            <button
              className="btn-secondary"
              onClick={handleWithdraw}
              disabled={parseFloat(pendingRefund || "0") <= 0}
            >
              Withdraw Refund
            </button>
          </div>
        </div>
      </div>

      {/* Per-auction bid history */}
      <div className="card audit-card">
        <div className="audit-header">
          <h3>
            <History size={20} color="#06b6d4" />
            Bid History — Auction #{auction.id}
          </h3>
          <span className="audit-meta-count">
            {auctionBids.length} Bid{auctionBids.length === 1 ? "" : "s"}
          </span>
        </div>

        {auctionBids.length === 0 ? (
          <div className="empty-log">
            No bids recorded on this auction yet. Be the first to bid!
          </div>
        ) : (
          <div className="table-responsive">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Bidder / Wallet</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                  <th>Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {auctionBids.map((item, idx) => {
                  const isCurrentWallet =
                    account &&
                    item.bidder &&
                    account.toLowerCase() === item.bidder.toLowerCase();
                  return (
                    <tr key={item.id || idx}>
                      <td>
                        <span className="bidder-tag">
                          {getAccountLabel(item.bidder)}
                          {isCurrentWallet && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "#10b981",
                                fontWeight: "bold",
                                marginLeft: "4px",
                              }}
                            >
                              (You)
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="bid-badge-highlight">{item.amount} ETH</span>
                      </td>
                      <td>{item.time}</td>
                      <td>
                        {item.txHash ? (
                          <span className="tx-hash-badge" title={item.txHash}>
                            {item.txHash.slice(0, 10)}...{item.txHash.slice(-6)}
                          </span>
                        ) : (
                          <span className="tx-hash-badge">On-Chain Event</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
