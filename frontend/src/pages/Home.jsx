import React, { useState } from "react";
import { getAccountLabel, getAccountDetails, HARDHAT_ACCOUNTS } from "../utils/accounts";
import CountdownTimer from "../components/CountdownTimer";
import { 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  ArrowUpRight, 
  History, 
  Wallet, 
  Flame
} from "lucide-react";

export default function Home({ 
  account, 
  balance,
  highestBid, 
  highestBidder, 
  pendingRefund, 
  bidHistory, 
  endTime,
  isLoadingContract,
  handleBid, 
  handleWithdraw, 
  onSwitchAccount,
  deployer
}) {
  const [bidInput, setBidInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericHighest = parseFloat(highestBid || "0");
  const minRequiredBid = numericHighest === 0 ? 0.5 : (numericHighest + 0.1);

  const onSubmitBid = async (e) => {
    e.preventDefault();
    if (!bidInput || parseFloat(bidInput) <= numericHighest) return;
    setIsSubmitting(true);
    try {
      /* Home shows auction #0 (the contract's global
         highestBid/auctionEndTime views read auctions[0]),
         so pass the real auctionId 0 explicitly. */
      await handleBid(0, bidInput);
      setBidInput("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPresetBid = (increment) => {
    const base = numericHighest === 0 ? 0.5 : numericHighest;
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

      <div className="auction-grid">
        {/* Left Column: Asset Details Card */}
        <div className="card asset-card">
          <div className="badge-live">
            <span className="badge-pulse-dot"></span>
            LIVE ON-CHAIN AUCTION
          </div>
          <h2 className="asset-title">Vintage Rolex Submariner (1988)</h2>
          <p className="asset-desc">
            Authenticated luxury timepiece locked in escrow on the local Ethereum blockchain. All bids are verified and held trustlessly in non-custodial pull escrow.
          </p>

          <div className="asset-stats">
            <div className="stat-box">
              <span className="stat-label"><Clock size={13} /> Time Remaining</span>
              {isLoadingContract ? (
                <div className="skeleton skeleton-title" style={{ width: "120px" }} />
              ) : (
                <CountdownTimer endTime={endTime} />
              )}
            </div>
            <div className="stat-box">
              <span className="stat-label">Asset Token ID</span>
              <span className="stat-val">#8802</span>
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
              <RefreshCw size={22} className="feature-icon" />
              <div>
                <strong>Non-Custodial Auto Pull Refunds</strong>
                <p>When outbid, your funds are automatically moved to pending returns for safe withdrawal.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Bid Console */}
        <div className="card console-card">
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
                <span className="metric-value">{highestBid} ETH</span>
              )}
            </div>
            <div className="status-metric">
              <span className="metric-label">TOP BIDDER</span>
              {isLoadingContract ? (
                <div className="skeleton skeleton-text" style={{ width: "120px" }} />
              ) : (
                <span className="metric-value highlight">{getAccountLabel(highestBidder)}</span>
              )}
            </div>
          </div>

          {/* Place Bid Form */}
          <form onSubmit={onSubmitBid} className="bid-form">
            <label className="input-label">
              {"ENTER YOUR BID (Must be > " + highestBid + " ETH)"}
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
              className="btn-primary"
              disabled={isSubmitting || !bidInput || parseFloat(bidInput) <= numericHighest}
            >
              {isSubmitting ? (
                <span>Confirming On-Chain...</span>
              ) : (
                <>Place On-Chain Bid <ArrowUpRight size={17} /></>
              )}
            </button>
          </form>

          {/* Claimable Refund Section */}
          <div className={"refund-box " + (parseFloat(pendingRefund || "0") > 0 ? "has-refund" : "")}>
            <div>
              <span className="refund-label">YOUR CLAIMABLE REFUND</span>
              {isLoadingContract ? (
                <div className="skeleton skeleton-text" />
              ) : (
                <span className="refund-amount">{pendingRefund} ETH</span>
              )}
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
        </div>
      </div>

      {/* Live On-Chain Bid Audit Log */}
      <div className="card audit-card">
        <div className="audit-header">
          <h3>
            <History size={20} color="#06b6d4" />
            Live On-Chain Bid Audit Log
          </h3>
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