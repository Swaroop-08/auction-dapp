import React, { useState } from "react";
import { getAccountLabel, getAccountDetails, HARDHAT_ACCOUNTS } from "../utils/accounts";
import { 
  ShieldCheck, 
  Wallet, 
  RefreshCw, 
  Server, 
  ArrowUpRight, 
  Package, 
  History,
  CheckCircle2,
  PlusCircle,
  Award,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Profile({ 
  account, 
  balance, 
  pendingRefund, 
  bidHistory, 
  handleWithdraw, 
  deployer,
  auctionsList = [],
  onOpenCreateModal,
  onSwitchAccount
}) {
  const [activeTab, setActiveTab] = useState("BIDS");
  const [isClaiming, setIsClaiming] = useState(false);

  const isClaimable = parseFloat(pendingRefund || "0") > 0;
  const accountDetails = getAccountDetails(account, deployer);

  const myBids = (bidHistory || []).filter(
    (b) => account && b.bidder && b.bidder.toLowerCase() === account.toLowerCase()
  );

  const myListings = (auctionsList || []).filter(
    (a) => account && a.seller && a.seller.toLowerCase() === account.toLowerCase()
  );

  const onClaim = async () => {
    setIsClaiming(true);
    try {
      await handleWithdraw();
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1>User Portfolio & Identity</h1>
            <p>Role-aware dashboard for managing bids, escrow claims, and seller listings.</p>
          </div>
          {accountDetails.isDeployer && (
            <button className="btn-primary" onClick={onOpenCreateModal}>
              <PlusCircle size={16} /> Create New Auction
            </button>
          )}
        </div>
      </div>

      {/* Role Banner & Identity Card */}
      {/* Account switcher — consistent with Home (Requirement 4) */}
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
                onClick={() => onSwitchAccount && onSwitchAccount(acc.address)}
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

      <div className={"card role-highlight-card " + (accountDetails.isDeployer ? "deployer-theme" : "bidder-theme")}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="role-avatar-icon">
            {accountDetails.isDeployer ? <Sparkles size={28} color="#06b6d4" /> : <Award size={28} color="#6366f1" />}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800 }}>{accountDetails.name}</h2>
              <span className={"user-role-pill " + (accountDetails.isDeployer ? "role-deployer" : "role-bidder")}>
                {accountDetails.role}
              </span>
            </div>
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              {account || "No wallet connected"}
            </code>
          </div>
        </div>

        <div className="role-capabilities-box">
          <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-dim)" }}>
            Assigned Capabilities:
          </span>
          <p style={{ fontSize: "0.85rem", color: "var(--text-main)", marginTop: "0.25rem" }}>
            {accountDetails.isDeployer 
              ? "● Deployer Permissions: Create new asset auctions, manage active listings, and claim settled winning auction proceeds."
              : "● Participant Bidder Permissions: Place bids on active contracts, track outbid status, and withdraw 100% of escrow refunds anytime."
            }
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="profile-stats-grid">
        <div className="portfolio-stat-card">
          <div className="portfolio-stat-icon">
            <Wallet size={24} />
          </div>
          <div className="portfolio-stat-info">
            <span className="portfolio-stat-label">Live ETH Balance</span>
            <span className="portfolio-stat-val">{balance ? parseFloat(balance).toFixed(4) : "0.0000"} ETH</span>
          </div>
        </div>

        <div className="portfolio-stat-card">
          <div className="portfolio-stat-icon emerald">
            <ShieldCheck size={24} />
          </div>
          <div className="portfolio-stat-info">
            <span className="portfolio-stat-label">Escrow Refund Balance</span>
            <span className="portfolio-stat-val">
            {parseFloat(pendingRefund || "0").toFixed(4)} ETH
          </span>
          </div>
        </div>

        <div className="portfolio-stat-card">
          <div className="portfolio-stat-icon cyan">
            <History size={24} />
          </div>
          <div className="portfolio-stat-info">
            <span className="portfolio-stat-label">My Active Bids</span>
            <span className="portfolio-stat-val">{myBids.length} Placed</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-nav">
        <button 
          className={"tab-btn " + (activeTab === "BIDS" ? "active" : "")}
          onClick={() => setActiveTab("BIDS")}
        >
          <History size={16} />
          My Active Bids
          <span className="tab-badge">{myBids.length}</span>
        </button>

        <button 
          className={"tab-btn " + (activeTab === "REFUNDS" ? "active" : "")}
          onClick={() => setActiveTab("REFUNDS")}
        >
          <RefreshCw size={16} />
          Claimable Refunds
          {isClaimable && <span className="tab-badge" style={{ background: "#10b981", color: "#fff" }}>Owed</span>}
        </button>

        <button 
          className={"tab-btn " + (activeTab === "LISTINGS" ? "active" : "")}
          onClick={() => setActiveTab("LISTINGS")}
        >
          <Package size={16} />
          My Created Auctions {accountDetails.isDeployer && "(Seller Panel)"}
          <span className="tab-badge">{myListings.length}</span>
        </button>
      </div>

      {/* Tab 1: My Bids */}
      {activeTab === "BIDS" && (
        <div className="tab-pane">
          {myBids.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <p className="empty-log">No bids have been placed with this wallet yet.</p>
              <Link to="/" className="btn-primary" style={{ display: "inline-flex", marginTop: "1rem" }}>
                Browse Live Auction <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-responsive">
                <table className="audit-table bids-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Bid Amount</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                      <th>Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBids.map((b, idx) => {
                      // Real on-chain status: is this bid still the
                      // current highest bid on its auction?
                      const auction = (auctionsList || []).find(
                        (a) => a.id === b.auctionId
                      );
                      const isTopBid =
                        auction &&
                        auction.highestBidder &&
                        auction.highestBidder.toLowerCase() ===
                          (b.bidder || "").toLowerCase() &&
                        parseFloat(auction.highestBid || "0") ===
                          parseFloat(b.amount || "0");
                      const statusLabel = isTopBid
                        ? "TOP BID"
                        : auction && auction.ended
                        ? "LOST"
                        : "OUTBID";
                      const statusClass = isTopBid
                        ? "bid-status-top"
                        : auction && auction.ended
                        ? "bid-status-lost"
                        : "bid-status-outbid";

                      return (
                        <tr key={b.id || idx}>
                          <td>
                            <Link
                              to={`/auction/${b.auctionId}`}
                              className="bids-table-asset"
                            >
                              {b.auctionTitle || `Auction #${b.auctionId ?? "?"}`}
                            </Link>
                          </td>
                          <td><span className="bid-badge-highlight">{b.amount} ETH</span></td>
                          <td>
                            <span className={"bid-status-badge " + statusClass}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="bids-table-time">{b.time}</td>
                          <td>
                            <span className="tx-hash-badge">
                              {b.txHash ? b.txHash.slice(0, 12) + "..." : "Confirmed"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Claimable Refunds */}
      {activeTab === "REFUNDS" && (
        <div className="tab-pane">
          <div className="escrow-claim-banner">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <ShieldCheck size={24} color="#10b981" />
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Contract Escrow Balance Owed to You</h3>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "540px", lineHeight: 1.5 }}>
                When another user outbids you, 100% of your ETH is transferred to this pull-escrow balance. Click the button to safely transfer it back to your wallet.
              </p>
              <div style={{ marginTop: "1rem", fontSize: "1.85rem", fontWeight: 800, color: isClaimable ? "#34d399" : "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                {parseFloat(pendingRefund || "0").toFixed(4)} ETH
              </div>
            </div>

            <div>
              <button 
                className="claim-huge-btn"
                onClick={onClaim}
                disabled={!isClaimable || isClaiming}
              >
                <RefreshCw size={18} className={isClaiming ? "animate-spin" : ""} />
                {isClaiming ? "Processing Withdrawal..." : "Withdraw Escrow Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: My Listings */}
      {activeTab === "LISTINGS" && (
        <div className="tab-pane">
          {myListings.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <p className="empty-log">
                {accountDetails.isDeployer 
                  ? "No custom auctions created yet. Click Create New Auction to list an item on-chain!"
                  : "You are connected as a Bidder. Only the Deployer / Seller role can create and list auctions."
                }
              </p>
              {accountDetails.isDeployer && (
                <button className="btn-primary" onClick={onOpenCreateModal} style={{ display: "inline-flex", marginTop: "1rem" }}>
                  <PlusCircle size={16} /> Create First Auction
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
              {myListings.map((item) => (
                <div key={item.id} className="explore-card">
                  <div className="card-image-wrap">
                    <img src={item.imageUrl} alt={item.title} />
                    <span className="status-tag tag-live">● SELLER LISTING</span>
                  </div>
                  <div className="card-body">
                    <span className="category">{item.category}</span>
                    <h3 className="card-title">{item.title}</h3>
                    <div className="card-footer">
                      <div>
                        <span className="bid-label">TOP BID</span>
                        <span className="bid-val">{item.highestBid || item.startingPrice} ETH</span>
                      </div>
                      <Link to={`/auction/${item.id}`} className="btn-view-live">
                        View <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diagnostics — compact footer bar */}
      <div className="diagnostics-footer">
        <span className="diag-item">
          <Server size={14} color="#06b6d4" />
          CHAIN ID <strong>31337 (Localhost)</strong>
        </span>
        <span className="diag-item">
          RPC <strong>http://127.0.0.1:8545</strong>
        </span>
        <span className="diag-item">
          DEPLOYER <strong className="diag-mono">
            {deployer ? deployer.slice(0, 8) + "..." + deployer.slice(-6) : "Fetching..."}
          </strong>
        </span>
      </div>
    </div>
  );
}
