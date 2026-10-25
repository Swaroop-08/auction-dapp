import React, { useState, useEffect } from "react";
import { USER_DIRECTORY } from "../utils/auth";
import { getTenderImage } from "../utils/constants";
import {
  Clock,
  ShieldCheck,
  FileText,
  ArrowUpRight,
  History,
  Building,
  Gavel,
  IndianRupee,
  AlertCircle,
} from "lucide-react";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/* Approx conversion used for INR display of ETH-denominated figures */
const ETH_INR = 285000;
const toEth = (v, dp = 4) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};
const toInr = (eth) => {
  const inr = parseFloat(eth || "0") * ETH_INR;
  return "₹" + inr.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};
const vendorLabel = (addr) => {
  if (!addr || addr === ZERO_ADDRESS) return "—";
  const u = USER_DIRECTORY.find(
    (x) => x.address && x.address.toLowerCase() === addr.toLowerCase()
  );
  if (u) return u.vendorId || u.department || u.name;
  return addr.slice(0, 10) + "…" + addr.slice(-6);
};

/*
  Home = LIVE PROCUREMENT CONSOLE.
  Shows the ACTIVE tender (selected via the top selector bar or Explore's
  "Set Active Tender"), its countdown, EMD requirement, current lowest bid
  and lowest bidder, plus an interactive reverse-auction offer form.
  The audit trail renders the TenderBidSubmitted events with Vendor ID,
  Tender Ref, Offer (INR/ETH), EMD, timestamp and tx hash.
*/
export default function Home({
  session,
  balance,
  tendersList = [],
  featuredTender,
  activeTenderId = 0,
  onSelectActiveTender,
  tenderBidHistory = [],
  logContext = "GLOBAL",
  onToggleLogContext,
  isLoadingContract,
  handleSubmitTenderOffer,
  pendingRefund,
  handleClaimEmdRefund,
}) {
  const [offerInput, setOfferInput] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTender =
    (tendersList || []).find((t) => t.id === Number(activeTenderId)) ||
    featuredTender;
  const tender = activeTender;

  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const endSec = Number(tender?.closingTime) || 0;
    if (!endSec) {
      setRemaining(null);
      return;
    }
    const tick = () =>
      setRemaining(Math.max(0, endSec - Math.floor(Date.now() / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tender?.closingTime]);

  const pad = (n) => String(n).padStart(2, "0");
  const countdownDisplay =
    remaining === null
      ? "—"
      : `${pad(Math.floor(remaining / 3600))}h ${pad(
          Math.floor((remaining % 3600) / 60)
        )}m ${pad(remaining % 60)}s`;

  const isOpen = tender?.status === "OPEN" && remaining !== 0 && remaining !== null;
  const isTimeUp = !isOpen;

  const emdAmount = parseFloat(tender?.emdAmount || "0");
  const currentLowest = parseFloat(tender?.lowestBid || "0");
  const hasBids = currentLowest > 0;

  const lowestBidderDisplay =
    tender?.lowestBidderAddress &&
    tender.lowestBidderAddress !== ZERO_ADDRESS
      ? vendorLabel(tender.lowestBidderAddress)
      : "No bids yet";

  const onSubmitOffer = async (e) => {
    e.preventDefault();
    if (!tender) return;

    const offer = parseFloat(offerInput);
    if (!offerInput || !Number.isFinite(offer) || offer <= 0) {
      setFormError("Enter a valid tender offer amount.");
      return;
    }

    const total = offer + emdAmount;
    /* Reverse auction: a new total must undercut the current lowest bid */
    if (hasBids && total >= currentLowest) {
      setFormError(
        `Reverse auction: your total (offer + EMD) must be lower than the current lowest bid of ${toEth(
          currentLowest
        )} ETH.`
      );
      return;
    }

    setFormError("");
    setIsSubmitting(true);
    try {
      await handleSubmitTenderOffer(tender.id, offerInput);
      setOfferInput("");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* The INPUT must stay enabled while empty so the user can type;
     only the BUTTON additionally waits for a non-empty offer. */
  const formLocked =
    isSubmitting ||
    !session ||
    session.role !== "CONTRACTOR" ||
    isTimeUp ||
    !tender;
  const inputDisabled = formLocked;
  const buttonDisabled = formLocked || !offerInput;

  const submitLabel = isSubmitting
    ? "Submitting…"
    : !session || session.role !== "CONTRACTOR"
    ? "Contractors Only"
    : isTimeUp
    ? "Tender Closed"
    : "Submit Tender Offer";

  return (
    <div className="home-container">
      {/* Top selector bar — active tender drives the Live Procurement Console */}
      <div className="demo-account-bar active-auction-bar">
        <div className="demo-title-group">
          <Building size={16} color="#f59e0b" />
          <span className="demo-title">Active Tender Selection:</span>
        </div>
        <div className="demo-buttons">
          {tendersList.length === 0 ? (
            <span className="active-auction-empty">
              No tenders available — publish one as an Authority
            </span>
          ) : (
            tendersList.map((t) => (
              <button
                key={t.id}
                className={
                  "btn-demo-acc " + (Number(activeTenderId) === t.id ? "active" : "")
                }
                onClick={() => onSelectActiveTender && onSelectActiveTender(t.id)}
                title={`Set tender ${t.referenceNo} as active`}
              >
                <span>
                  #{t.id} {t.referenceNo}
                </span>
                <span
                  className={
                    "role-tag-badge " +
                    (t.status === "OPEN" && t.isOpen
                      ? "role-authority"
                      : "role-contractor")
                  }
                >
                  {t.status === "OPEN" && t.isOpen ? "OPEN" : t.status}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="auction-grid">
        {/* LEFT: featured tender hero */}
        <div className="card asset-card glass-card">
          <div className="hero-image-wrap">
            <img
              src={getTenderImage(tender)}
              alt={tender?.title || "Tender"}
            />
            <div className="hero-image-overlay"></div>
            <div className="hero-badge">
              {isOpen ? (
                <>
                  <span className="badge-pulse-dot"></span>
                  LIVE PROCUREMENT
                </>
              ) : (
                <span style={{ color: "var(--rose)" }}>
                  ● {tender?.status || "CLOSED"}
                </span>
              )}
            </div>
          </div>

          <h2 className="asset-title">{tender?.title || "No Tender Selected"}</h2>
          <p className="asset-desc">{tender?.description}</p>

          <div className="asset-stats">
            <div className="stat-box">
              <span className="stat-label">
                <Clock size={13} /> Time Remaining
              </span>
              {isLoadingContract ? (
                <div className="skeleton skeleton-title" style={{ width: "120px" }} />
              ) : isTimeUp ? (
                <span className="stat-val" style={{ color: "var(--rose)" }}>
                  Tender Closed
                </span>
              ) : (
                <span className="stat-val countdown-live">{countdownDisplay}</span>
              )}
            </div>
            <div className="stat-box">
              <span className="stat-label">
                <FileText size={13} /> Tender Ref. No.
              </span>
              <span className="stat-val" style={{ fontSize: "0.9rem" }}>
                {tender?.referenceNo || "N/A"}
              </span>
            </div>
          </div>

          <div className="features-list">
            <div className="feature-item">
              <ShieldCheck size={22} className="feature-icon" />
              <div>
                <strong>Department: {tender?.department || "N/A"}</strong>
                <p>
                  Category: {tender?.category || "N/A"} · Authority:{" "}
                  {tender?.authorityAddress
                    ? tender.authorityAddress.slice(0, 10) + "…"
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="feature-item">
              <IndianRupee size={22} className="feature-icon" />
              <div>
                <strong>
                  Estimated Value: {toEth(tender?.estimatedValue)} ETH
                </strong>
                <p>
                  ≈ {toInr(tender?.estimatedValue)} · EMD Required:{" "}
                  {toEth(tender?.emdAmount)} ETH
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: interactive reverse-auction offer console */}
        <div className="card console-card glass-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ margin: 0 }}>
              <Gavel size={20} color="#f59e0b" />
              Submit Tender Offer
            </h3>
            <span
              className={
                "user-role-pill " +
                (session?.role === "AUTHORITY" ? "role-authority" : "role-contractor")
              }
            >
              {session?.role || "—"}
            </span>
          </div>

          <div className="bid-status-board">
            <div className="status-metric">
              <span className="metric-label">Current Lowest Bid</span>
              {isLoadingContract ? (
                <div className="skeleton skeleton-title" style={{ width: "100px" }} />
              ) : (
                <span className="metric-value">
                  {hasBids ? `${toEth(currentLowest)} ETH` : "—"}
                </span>
              )}
            </div>
            <div className="status-metric">
              <span className="metric-label">Lowest Bidder</span>
              {isLoadingContract ? (
                <div className="skeleton skeleton-text" style={{ width: "120px" }} />
              ) : (
                <span className="metric-value highlight">{lowestBidderDisplay}</span>
              )}
            </div>
            <div className="status-metric">
              <span className="metric-label">EMD Required</span>
              <span className="metric-value">{toEth(tender?.emdAmount)} ETH</span>
            </div>
            <div className="status-metric">
              <span className="metric-label">Your Wallet</span>
              <span className="metric-value">{toEth(balance)} ETH</span>
            </div>
          </div>

          <form onSubmit={onSubmitOffer} className="bid-form">
            <label className="input-label">
              TENDER OFFER AMOUNT (EMD ADDED AUTOMATICALLY)
            </label>
            <div className="input-group">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder={
                  hasBids
                    ? `Below ${toEth(currentLowest)} ETH total`
                    : "Enter offer amount"
                }
                value={offerInput}
                onChange={(e) => {
                  setOfferInput(e.target.value);
                  if (formError) setFormError("");
                }}
                required
                disabled={inputDisabled}
              />
              <span className="unit">ETH</span>
            </div>

            <p className="form-hint">
              EMD: {toEth(tender?.emdAmount)} ETH · Total will be{" "}
              <strong>
                {toEth(parseFloat(offerInput || "0") + emdAmount)} ETH
              </strong>{" "}
              ({toInr(parseFloat(offerInput || "0") + emdAmount)})
            </p>

            {formError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.78rem",
                  color: "var(--rose)",
                  background: "rgba(244,63,94,0.08)",
                  border: "1px solid rgba(244,63,94,0.3)",
                  borderRadius: "8px",
                  padding: "0.5rem 0.7rem",
                }}
              >
                <AlertCircle size={15} />
                {formError}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={buttonDisabled}>
              {submitLabel} {!buttonDisabled && <ArrowUpRight size={17} />}
            </button>
          </form>
        </div>
      </div>

      {/* Claimable EMD refund vault (cumulative across outbid/non-winning tenders) */}
      <div
        className={
          "refund-vault-card glass-card " +
          (parseFloat(pendingRefund || "0") > 0 ? "has-refund" : "")
        }
      >
        <div className="refund-vault-icon">
          <ShieldCheck size={22} />
        </div>
        <div className="refund-vault-info">
          <span className="refund-label">Claimable EMD Refund Vault</span>
          <span className="refund-amount">{toEth(pendingRefund)} ETH</span>
          <span className="refund-hint">
            Cumulative EMD from all outbid / non-winning tenders is held here for
            secure withdrawal.
          </span>
        </div>
        <button
          className="btn-secondary"
          onClick={handleClaimEmdRefund}
          disabled={parseFloat(pendingRefund || "0") <= 0}
        >
          Claim EMD Refund
        </button>
      </div>

      {/* On-chain TenderBidSubmitted audit trail */}
      <div className="card audit-card glass-card">
        <div className="audit-header">
          <h3>
            <History size={20} color="#06b6d4" />
            {logContext === "GLOBAL"
              ? "On-Chain Audit Trail — All Tenders"
              : `Audit Trail — Tender #${activeTenderId}`}
          </h3>
          <div className="log-scope-toggle">
            <button
              className={"log-scope-btn " + (logContext === "GLOBAL" ? "active" : "")}
              onClick={() => onToggleLogContext && onToggleLogContext("GLOBAL")}
            >
              Global
            </button>
            <button
              className={"log-scope-btn " + (logContext === "TENDER" ? "active" : "")}
              onClick={() => onToggleLogContext && onToggleLogContext("TENDER")}
            >
              Tender #{activeTenderId}
            </button>
          </div>
          <span className="audit-meta-count">
            {tenderBidHistory.length} Event{tenderBidHistory.length === 1 ? "" : "s"}
          </span>
        </div>

        {tenderBidHistory.length === 0 ? (
          <div className="empty-log">
            No tender bids recorded yet — submit an offer to register the first
            on-chain audit block.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Vendor ID</th>
                  <th>Tender Ref</th>
                  <th>Offer Amount (ETH / INR)</th>
                  <th>EMD</th>
                  <th>Timestamp</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {tenderBidHistory.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>
                      <span className="bidder-tag">{vendorLabel(item.bidder)}</span>
                    </td>
                    <td className="mono">{item.referenceNo}</td>
                    <td>
                      <span className="bid-badge-highlight">
                        {toEth(item.offerAmount)} ETH
                      </span>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {toInr(item.offerAmount)}
                      </div>
                    </td>
                    <td className="mono">{toEth(item.emdAmount)} ETH</td>
                    <td className="bids-table-time">{item.time}</td>
                    <td>
                      {item.txHash ? (
                        <span className="tx-hash-badge" title={item.txHash}>
                          {item.txHash.slice(0, 10)}…{item.txHash.slice(-6)}
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
    </div>
  );
}
