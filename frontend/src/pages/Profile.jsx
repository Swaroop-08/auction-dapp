import React, { useState } from "react";
import { USER_DIRECTORY } from "../utils/auth";
import {
  User,
  Building,
  Shield,
  FileText,
  RefreshCw,
  DollarSign,
  Award,
  Gavel,
} from "lucide-react";

const ETH_INR = 285000;
const vendorLabel = (addr) => {
  if (!addr) return "—";
  const u = USER_DIRECTORY.find(
    (x) => x.address && x.address.toLowerCase() === addr.toLowerCase()
  );
  if (u) return u.vendorId || u.department || u.name;
  return addr.slice(0, 12) + "…";
};
const toEth = (v, dp = 4) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};
const toInr = (eth) => {
  const inr = parseFloat(eth || "0") * ETH_INR;
  return "₹" + inr.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const statusClass = (status) =>
  status === "OPEN"
    ? "bid-status-top"
    : status === "EVALUATING"
    ? "bid-status-outbid"
    : "bid-status-lost";

export default function Profile({
  session,
  tendersList = [],
  tenderBidHistory = [],
  pendingRefund = "0",
  handleClaimEmdRefund,
  balance = "0",
}) {
  const [activeTab, setActiveTab] = useState("tenders");

  const isContractor = session?.role === "CONTRACTOR";
  const isAuthority = session?.role === "AUTHORITY";
  const addr = session?.address?.toLowerCase();

  /* All bids placed by the logged-in contractor (across every tender) */
  const myBids = tenderBidHistory.filter(
    (h) => h.bidder && addr && h.bidder.toLowerCase() === addr
  );

  /* Latest offer per tender for this contractor */
  const latestOfferByTender = {};
  myBids.forEach((b) => {
    latestOfferByTender[b.tenderId] = b;
  });

  const myTenderIds = [...new Set(myBids.map((b) => b.tenderId))];
  const myTenders = (tendersList || []).filter((t) => myTenderIds.includes(t.id));

  const publishedTenders = (tendersList || []).filter(
    (t) => t.authorityAddress && addr && t.authorityAddress.toLowerCase() === addr
  );

  const tendersShown = isContractor ? myTenders : publishedTenders;
  const bidsShown = isContractor ? myBids : tenderBidHistory;

  /* Tenders where this contractor is currently the lowest (winning) bidder */
  const currentlyWinning = (tendersList || []).filter(
    (t) =>
      isContractor &&
      t.lowestBidderAddress &&
      addr &&
      t.lowestBidderAddress.toLowerCase() === addr
  ).length;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>{isAuthority ? "Authority Dashboard" : "Contractor Dashboard"}</h1>
        <p>
          {session?.name}
          {session?.organization && session.organization !== session.name
            ? ` · ${session.organization}`
            : ""}
        </p>
      </div>

      {/* 4 distinct metric cards */}
      <div className="profile-stats-grid">
        <div className="portfolio-stat-card">
          <div className="portfolio-stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="portfolio-stat-info">
            <span className="portfolio-stat-label">Wallet Balance</span>
            <span className="portfolio-stat-val">{toEth(balance)} ETH</span>
          </div>
        </div>

        <div className="portfolio-stat-card">
          <div className="portfolio-stat-icon emerald">
            <RefreshCw size={24} />
          </div>
          <div className="portfolio-stat-info">
            <span className="portfolio-stat-label">Claimable EMD Vault</span>
            <span className="portfolio-stat-val">{toEth(pendingRefund)} ETH</span>
          </div>
        </div>

        <div className="portfolio-stat-card">
          <div className="portfolio-stat-icon cyan">
            <FileText size={24} />
          </div>
          <div className="portfolio-stat-info">
            <span className="portfolio-stat-label">
              {isContractor ? "Tenders Participated" : "Tenders Published"}
            </span>
            <span className="portfolio-stat-val">{tendersShown.length}</span>
          </div>
        </div>

        <div className="portfolio-stat-card">
          <div className="portfolio-stat-icon">
            <Award size={24} />
          </div>
          <div className="portfolio-stat-info">
            <span className="portfolio-stat-label">
              {isContractor ? "Total Bids Submitted" : "Total Bids Received"}
            </span>
            <span className="portfolio-stat-val">{bidsShown.length}</span>
          </div>
        </div>
      </div>

      {/* Claimable EMD refund banner */}
      {parseFloat(pendingRefund) > 0 && (
        <div className="escrow-claim-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <RefreshCw size={32} color="#10b981" />
            <div>
              <h3 style={{ marginBottom: "0.25rem" }}>EMD Refund Available</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                {toEth(pendingRefund)} ETH held across all outbid / non-winning
                tenders
              </p>
            </div>
          </div>
          <button className="claim-huge-btn" onClick={handleClaimEmdRefund}>
            <RefreshCw size={18} /> Claim EMD Refund
          </button>
        </div>
      )}

      {/* Role highlight */}
      <div className={"role-highlight-card " + (isAuthority ? "deployer-theme" : "bidder-theme")}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="role-avatar-icon">
            {isAuthority ? (
              <Shield size={28} color="#f59e0b" />
            ) : (
              <Building size={28} color="#10b981" />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>
              {session?.name}
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              {isAuthority
                ? `${session?.department} · Nodal Officer`
                : `Vendor ID: ${session?.vendorId} · GSTIN: ${session?.gstin} · PAN: ${session?.pan}`}
            </p>
          </div>
          {isContractor && (
            <span
              className="user-role-pill role-contractor"
              style={{ marginLeft: "auto" }}
            >
              <Gavel size={12} /> Leading {currentlyWinning} tender
              {currentlyWinning === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="role-capabilities-box">
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            {isAuthority
              ? "Authorized to publish tenders, evaluate bids, and award contracts on behalf of the Government of India."
              : "Vetted contractor registered for e-Procurement. Can participate in multiple open tenders concurrently with a valid EMD."}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={"tab-btn " + (activeTab === "tenders" ? "active" : "")}
          onClick={() => setActiveTab("tenders")}
        >
          <FileText size={16} />
          {isContractor ? "My Participated Tenders" : "Published Tenders"}
          <span className="tab-badge">{tendersShown.length}</span>
        </button>
        <button
          className={"tab-btn " + (activeTab === "bids" ? "active" : "")}
          onClick={() => setActiveTab("bids")}
        >
          <DollarSign size={16} />
          {isContractor ? "My Bid History" : "Received Bids"}
          <span className="tab-badge">{bidsShown.length}</span>
        </button>
      </div>

      {activeTab === "tenders" && (
        <div className="card glass-card">
          {tendersShown.length === 0 ? (
            <div className="empty-log">
              {isContractor
                ? "You have not participated in any tender yet. Head to Active Tenders to place an offer."
                : "You have not published any tender yet."}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Tender Ref</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>My Offer</th>
                    <th>EMD</th>
                    <th>Status</th>
                    <th>Closing Time</th>
                  </tr>
                </thead>
                <tbody>
                  {tendersShown.map((tender) => {
                    const offer = latestOfferByTender[tender.id];
                    return (
                      <tr key={tender.id}>
                        <td className="mono">{tender.referenceNo}</td>
                        <td>
                          {tender.title.length > 40
                            ? tender.title.slice(0, 40) + "…"
                            : tender.title}
                        </td>
                        <td>{tender.department}</td>
                        <td>
                          {offer ? (
                            <>
                              <span className="bid-badge-highlight">
                                {toEth(offer.offerAmount)} ETH
                              </span>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {toInr(offer.offerAmount)}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: "var(--text-dim)" }}>—</span>
                          )}
                        </td>
                        <td className="mono">{toEth(tender.emdAmount)} ETH</td>
                        <td>
                          <span className={"bid-status-badge " + statusClass(tender.status)}>
                            {tender.status}
                          </span>
                        </td>
                        <td className="bids-table-time">
                          {new Date(tender.closingTime * 1000).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "bids" && (
        <div className="card glass-card">
          {bidsShown.length === 0 ? (
            <div className="empty-log">No bids recorded yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Tender Ref</th>
                    <th>Vendor</th>
                    <th>Offer Amount (ETH / INR)</th>
                    <th>EMD</th>
                    <th>Timestamp</th>
                    <th>Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {bidsShown.map((bid, idx) => (
                    <tr key={bid.id || idx}>
                      <td className="mono">{bid.referenceNo}</td>
                      <td>
                        <span className="bidder-tag">
                          {vendorLabel(bid.bidder)}
                        </span>
                      </td>
                      <td>
                        <span className="bid-badge-highlight">
                          {toEth(bid.offerAmount)} ETH
                        </span>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {toInr(bid.offerAmount)}
                        </div>
                      </td>
                      <td className="mono">{toEth(bid.emdAmount)} ETH</td>
                      <td className="bids-table-time">{bid.time}</td>
                      <td>
                        {bid.txHash ? (
                          <span className="tx-hash-badge" title={bid.txHash}>
                            {bid.txHash.slice(0, 10)}…{bid.txHash.slice(-6)}
                          </span>
                        ) : (
                          <span className="tx-hash-badge">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
