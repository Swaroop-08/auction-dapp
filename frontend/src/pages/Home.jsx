import React, { useState, useEffect } from "react";
import { getAccountLabel, getAccountDetails, HARDHAT_ACCOUNTS } from "../utils/accounts";
import { 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  ArrowUpRight, 
  History, 
  Wallet, 
  Flame,
  Gavel,
  Landmark
} from "lucide-react";

/*
  Home = FEATURED LIVE AUCTION SHOWCASE.

  The hero card spotlights the DYNAMIC ACTIVE auction
  (switchable via the selector or Explore "Set Active"),
  while the bidding console stays the main interactive
  demo playground. The audit log supports BOTH a GLOBAL
  feed and a per-auction slice via the scope toggle.
*/

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const DEFAULT_FEATURED = {
  id: 0,
  title: "Vintage Rolex Submariner (1988)",
  description:
    "Authenticated luxury timepiece locked in escrow on the local Ethereum blockchain. All bids are verified and held trustlessly in non-custodial pull escrow.",
  imageUrl:
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&auto=format&fit=crop&q=80",
  highestBid: null,
  startingPrice: "0.5",
  auctionEndTime: null,
};

export default function Home({ 
  account, 
  balance,
  highestBid, 
  highestBidder, 
  pendingRefund, 
  bidHistory, 
  endTime,
  featuredAuction,
  auctionsList = [],
  activeAuctionId = 0,
  logContext = "GLOBAL",
  onToggleLogContext,
  onSelectActiveAuction,
  isLoadingContract,
  handleBid, 
  handleWithdraw, 
  onSwitchAccount,
  deployer
}) {
  const [bidInput, setBidInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* DYNAMIC ACTIVE AUCTION: resolved from the fresh
     on-chain list + activeAuctionId; falls back to the
     featured spotlight, then the classic demo asset. */
  const activeAuction =
    (auctionsList || []).find((a) => a.id === Number(activeAuctionId)) ||
    featuredAuction ||
    DEFAULT_FEATURED;

  const featured = activeAuction;
  const isFeaturedLive = featuredAuction ? featuredAuction.isLive : true;

  const numericHighest = parseFloat(
    (featured.highestBid !== null ? featured.highestBid : highestBid) || "0"
  );
  const numericStarting = parseFloat(featured.startingPrice || "0");
  const minRequiredBid =
    numericHighest > 0 ? numericHighest + 0.01 : numericStarting || 0.5;

  const rawTopBidder =
    featured.highestBidder &&
    featured.highestBidder !== ZERO_ADDRESS
      ? featured.highestBidder
      : highestBidder;

  /* Requirement 1: the console reads the LIVE auction
     object's highestBid / highestBidder. A fallback is
     used only when there is NO on-chain auction at all
     (and "No bids yet" strings never reach the label). */

  const hasRealBidder =
    typeof rawTopBidder === "string" &&
    rawTopBidder.startsWith("0x") &&
    rawTopBidder !== ZERO_ADDRESS;

  const topBidderDisplay =
    numericHighest > 0 && hasRealBidder
      ? getAccountLabel(rawTopBidder)
      : "No bids yet";

  /* -------------------------------------------------------
     Requirement 2: COUNTDOWN REPAIR

     remaining = Math.max(0, auction.endTime - nowSec)
     formatted continuously as XXh YYm ZZs.

     remaining === null  -> no on-chain end time yet
     remaining === 0     -> auction ended (bidding UI off)
     ------------------------------------------------------- */

  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const endSec =
      Number(featured.auctionEndTime) ||
      Number(endTime) ||
      0;

    if (!endSec) {
      setRemaining(null);
      return;
    }

    const tick = () => {
      setRemaining(
        Math.max(
          0,
          endSec -
            Math.floor(Date.now() / 1000)
        )
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [featured.auctionEndTime, endTime]);

  const pad = (n) => String(n).padStart(2, "0");

  const countdownDisplay =
    remaining === null
      ? "—"
      : `${pad(Math.floor(remaining / 3600))}h ${pad(
          Math.floor((remaining % 3600) / 60)
        )}m ${pad(remaining % 60)}s`;

  const isTimeUp = remaining === 0;

  const heroIsLive = isFeaturedLive && !isTimeUp;

  const onSubmitBid = async (e) => {
    e.preventDefault();
    if (!bidInput || parseFloat(bidInput) <= numericHighest) return;
    setIsSubmitting(true);
    try {
      // Bid on the FEATURED auction specifically
      await handleBid(featured.id, bidInput);
      setBidInput("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPresetBid = (increment) => {
    const base = numericHighest > 0 ? numericHighest : numericStarting || 0.5;
    const nextVal = (base + increment).toFixed(2);
    setBidInput(nextVal);
  };

  const accountDetails = getAccountDetails(account, deployer);

  return (
    <div className="home-container">
      {/* Dynamic Account Switcher Bar for Local Hardhat Node */}
      <div className="demo-account-bar">
        <div className="demo-title-group">
          <Wallet size={16} color="#06b6d4" />
          <span className="demo-title">Simulate Local Accounts:</span>
        </div>
        <div className="demo-buttons">
          {HARDHAT_ACCOUNTS.map((acc) => {
            const isActive = account && account.toLowerCase() === acc.address.toLowerCase();
            const isDeployerAcc = acc.address.toLowerCase() === (deployer || "").toLowerCase();

            return (
              <button 
                key={acc.address}
                className={"btn-demo-acc " + (isActive ? "active" : "")}
                onClick={() => onSwitchAccount(acc.address)}
                title={`Switch to ${acc.name} (${acc.address})`}
              >
                <span>{acc.name}</span>
                <span className={"role-tag-badge " + (isDeployerAcc ? "role-deployer" : "role-bidder")}>
                  {isDeployerAcc ? "Deployer" : "Bidder"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Active Auction Selector (Requirement 1) */}
      <div className="demo-account-bar active-auction-bar">
        <div className="demo-title-group">
          <Gavel size={16} color="#f59e0b" />
          <span className="demo-title">Active Auction:</span>
        </div>
        <div className="demo-buttons">
          {auctionsList.length === 0 ? (
            <span className="active-auction-empty">
              No auctions on-chain yet — create one as Deployer
            </span>
          ) : (
            auctionsList.map((a) => (
              <button
                key={a.id}
                className={
                  "btn-demo-acc " +
                  (Number(activeAuctionId) === a.id ? "active" : "")
                }
                onClick={() => onSelectActiveAuction && onSelectActiveAuction(a.id)}
                title={`Set Auction #${a.id} as active`}
              >
                <span>
                  #{a.id} {a.title.length > 22 ? a.title.slice(0, 22) + "…" : a.title}
                </span>
                <span
                  className={
                    "role-tag-badge " +
                    (a.status === "ACTIVE" ? "role-deployer" : "role-bidder")
                  }
                >
                  {a.status === "ACTIVE" ? "LIVE" : a.status}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="auction-grid">
        {/* Left Column: Featured Asset Hero Card */}
        <div className="card asset-card glass-card">
          <div className="hero-image-wrap">
            <img
              src={
                featured.imageUrl ||
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&auto=format&fit=crop&q=80"
              }
              alt={featured.title}
            />
            <div className="hero-image-overlay"></div>
            <div className="hero-badge">
              {heroIsLive ? (
                <>
                  <span className="badge-pulse-dot"></span>
                  LIVE ON-CHAIN AUCTION
                </>
              ) : (
                <span style={{ color: "var(--rose)" }}>● AUCTION ENDED</span>
              )}
            </div>
          </div>

          <h2 className="asset-title">{featured.title}</h2>
          <p className="asset-desc">{featured.description}</p>

          <div className="asset-stats">
            <div className="stat-box">
              <span className="stat-label"><Clock size={13} /> Time Remaining</span>
              {isLoadingContract ? (
                <div className="skeleton skeleton-title" style={{ width: "120px" }} />
              ) : isTimeUp ? (
                <span className="stat-val" style={{ color: "var(--rose)" }}>
                  Auction Ended
                </span>
              ) : (
                /* Requirement 2: continuous XXh YYm ZZs format
                   via Math.max(0, end - now) ticking every second */
                <span className="stat-val countdown-live">
                  {countdownDisplay}
                </span>
              )}
            </div>
            <div className="stat-box">
              <span className="stat-label"><Gavel size={13} /> Auction ID</span>
              <span className="stat-val">#{featured.id}</span>
            </div>
          </div>

          <div className="features-list">
            <div className="feature-item">
              <ShieldCheck size={22} className="feature-icon" />
              <div>
                <strong>Trustless Escrow Security</strong>
                <p>Funds are held directly by the smart contract. No central party can alter bids.</p>
              </div>
            </div>
            <div className="feature-item">
              <Landmark size={22} className="feature-icon" />
              <div>
                <strong>On-Chain Provenance</strong>
                <p>Every bid is a signed transaction — verifiable in the Hardhat node audit trail below.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Bid Console */}
        <div className="card console-card glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: 0 }}>
              <Flame size={20} color="#f59e0b" />
              Live Bidding Console
            </h3>
            <span className={"user-role-pill " + (accountDetails.isDeployer ? "role-deployer" : "role-bidder")}>
              Role: {accountDetails.badge}
            </span>
          </div>

          <div className="bid-status-board">
            <div className="status-metric">
              <span className="metric-label">CURRENT HIGHEST BID</span>
              {isLoadingContract ? (
                <div className="skeleton skeleton-title" style={{ width: "100px" }} />
              ) : (
                <span className="metric-value">{numericHighest > 0 ? numericHighest.toFixed(2) : numericStarting.toFixed(2)} ETH</span>
              )}
            </div>
            <div className="status-metric">
              <span className="metric-label">TOP BIDDER</span>
              {isLoadingContract ? (
                <div className="skeleton skeleton-text" style={{ width: "120px" }} />
              ) : (
                <span className="metric-value highlight">{topBidderDisplay}</span>
              )}
            </div>
          </div>

          {/* Place Bid Form */}
          <form onSubmit={onSubmitBid} className="bid-form">
            <label className="input-label">
              {"ENTER YOUR BID (Must be > " + (numericHighest > 0 ? numericHighest.toFixed(2) : numericStarting.toFixed(2)) + " ETH)"}
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

            {/* Quick Bid Preset Buttons */}
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

            <button 
              type="submit" 
              className="btn-bid-glow"
              disabled={
                isSubmitting ||
                isTimeUp ||
                !bidInput ||
                parseFloat(bidInput) <= numericHighest
              }
            >
              {isSubmitting ? (
                <span>Confirming On-Chain...</span>
              ) : (
                <>Place On-Chain Bid <ArrowUpRight size={17} /></>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Claimable Refund Vault — separate card, off the bid column */}
      <div className={"refund-vault-card glass-card " + (parseFloat(pendingRefund || "0") > 0 ? "has-refund" : "")}>
        <div className="refund-vault-icon">
          <RefreshCw size={22} />
        </div>
        <div className="refund-vault-info">
          <span className="refund-label">YOUR CLAIMABLE REFUND VAULT</span>
          {isLoadingContract ? (
            <div className="skeleton skeleton-text" />
          ) : (
            <span className="refund-amount">{pendingRefund} ETH</span>
          )}
          <span className="refund-hint">
            When you are outbid, 100% of your ETH moves here for safe withdrawal.
          </span>
        </div>
        <button 
          className="btn-secondary" 
          onClick={handleWithdraw}
          disabled={parseFloat(pendingRefund || "0") <= 0}
        >
          <RefreshCw size={15} />
          Withdraw Refund
        </button>
      </div>

      {/* Live On-Chain Bid Audit Log */}
      <div className="card audit-card glass-card">
        <div className="audit-header">
          <h3>
            <History size={20} color="#06b6d4" />
            {logContext === "GLOBAL"
              ? "Global Bid Audit Log — All Auctions"
              : `Bid Audit Log — Auction #${activeAuctionId}`}
          </h3>

          {/* GLOBAL / PER-AUCTION scope toggle (Requirement 3) */}
          <div className="log-scope-toggle">
            <button
              className={
                "log-scope-btn " + (logContext === "GLOBAL" ? "active" : "")
              }
              onClick={() => onToggleLogContext && onToggleLogContext("GLOBAL")}
            >
              Global
            </button>
            <button
              className={
                "log-scope-btn " + (logContext === "AUCTION" ? "active" : "")
              }
              onClick={() => onToggleLogContext && onToggleLogContext("AUCTION")}
            >
              Auction #{activeAuctionId}
            </button>
          </div>

          <span className="audit-meta-count">
            {bidHistory.length} Event{bidHistory.length === 1 ? "" : "s"} Logged
          </span>
        </div>

        {bidHistory.length === 0 ? (
          <div className="empty-log">
            No bids recorded in this contract session yet. Submit a bid above to register the first on-chain audit block!
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
                {bidHistory.map((item, idx) => {
                  const isCurrentWallet = account && item.bidder && account.toLowerCase() === item.bidder.toLowerCase();
                  return (
                    <tr key={item.id || idx}>
                      <td>
                        <span className="bidder-tag">
                          {getAccountLabel(item.bidder)}
                          {isCurrentWallet && (
                            <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: "bold", marginLeft: "4px" }}>
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
