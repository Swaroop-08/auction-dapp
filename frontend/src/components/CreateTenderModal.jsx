import React, { useState } from "react";
import { X, Plus, AlertCircle } from "lucide-react";

const DEPARTMENTS = ["NHAI", "CPWD", "Railways", "Smart Cities"];
const CATEGORIES = ["Infrastructure", "Construction", "IT Systems", "Goods", "Services"];

const EMPTY = {
  referenceNo: "",
  title: "",
  description: "",
  category: "Infrastructure",
  department: "NHAI",
  documentUrl: "",
  estimatedValue: "",
  emdAmount: "",
  durationDays: "30",
  durationHours: "0",
  publishMode: "live",
  startAt: "",
};

/*
  Authority-only form for publishing a new tender on-chain.
  Field order matches TenderVault.createTender exactly; the two money
  fields are entered in ETH and converted with parseEther by the caller.
*/
export default function CreateTenderModal({ isOpen, onClose, onSubmit, session }) {
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const set = (key) => (e) => {
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const estimated = parseFloat(draft.estimatedValue);
    const emd = parseFloat(draft.emdAmount);
    const days = parseInt(draft.durationDays || "0", 10);
    const hours = parseInt(draft.durationHours || "0", 10);

    if (!draft.referenceNo.trim()) return setError("Tender reference number is required.");
    if (!draft.title.trim()) return setError("Tender title is required.");
    if (!draft.description.trim()) return setError("A short description is required.");
    if (!Number.isFinite(estimated) || estimated <= 0)
      return setError("Estimated value must be greater than 0 ETH.");
    if (!Number.isFinite(emd) || emd <= 0)
      return setError("EMD must be greater than 0 ETH.");
    if (emd > estimated)
      return setError("EMD cannot exceed the estimated value — keep the deposit a small fraction of it.");
    if (!Number.isFinite(days) || !Number.isFinite(hours) || days * 24 + hours <= 0)
      return setError("Bidding window must be at least 1 hour.");

    const startMs = draft.publishMode === "upcoming" ? new Date(draft.startAt).getTime() : 0;
    if (draft.publishMode === "upcoming") {
      if (!draft.startAt || !Number.isFinite(startMs) || startMs <= Date.now())
        return setError("An upcoming tender needs a start date and time in the future.");
    }
    const startTimeSec = startMs ? Math.floor(startMs / 1000) : 0;

    const published = onSubmit({
      referenceNo: draft.referenceNo.trim(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      department: draft.department,
      documentUrl: draft.documentUrl.trim(),
      estimatedValue: estimated,
      emdAmount: emd,
      durationSec: days * 24 * 3600 + hours * 3600,
      startTimeSec,
    });

    if (published !== false) {
      setDraft(EMPTY);
      setError("");
      onClose();
    }
  };

  const field = {
    width: "100%",
    padding: "0.55rem 0.7rem",
    borderRadius: "8px",
    border: "1px solid #3f3f5a",
    backgroundColor: "#151521",
    color: "#fff",
    fontSize: "0.85rem",
    fontFamily: "inherit",
  };
  const label = {
    display: "block",
    fontSize: "0.7rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#a1a1aa",
    marginBottom: "0.3rem",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: "#1e1e2d",
          border: "1px solid #383854",
          borderRadius: "16px",
          width: "560px",
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "20px",
          color: "#fff",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #2d2d42",
            paddingBottom: "12px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
            <Plus size={18} color="#f59e0b" /> Publish New Tender
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: "0.75rem", color: "#a1a1aa", margin: "0 0 14px" }}>
          Published as <strong style={{ color: "#f59e0b" }}>{session?.department || "Authority"}</strong>{" "}
          — {session?.address ? session.address.slice(0, 10) + "…" : "no address"}. This account becomes the
          tender authority and cannot bid on it.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          <div>
            <label style={label}>Tender Ref. No.</label>
            <input
              style={field}
              value={draft.referenceNo}
              onChange={set("referenceNo")}
              placeholder="NHAI/2026/HP-46/002"
            />
          </div>
          <div>
            <label style={label}>Department</label>
            <select style={field} value={draft.department} onChange={set("department")}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={label}>Title</label>
          <input
            style={field}
            value={draft.title}
            onChange={set("title")}
            placeholder="Four-laning of NH-45 stretch"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={label}>Description</label>
          <textarea
            style={{ ...field, minHeight: "60px", resize: "vertical" }}
            value={draft.description}
            onChange={set("description")}
            placeholder="Scope of work, specifications and completion conditions."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          <div>
            <label style={label}>Category</label>
            <select style={field} value={draft.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Document URL</label>
            <input
              style={field}
              value={draft.documentUrl}
              onChange={set("documentUrl")}
              placeholder="https://…/tender.pdf"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          <div>
            <label style={label}>Estimated Value (ETH)</label>
            <input
              style={field}
              type="number"
              step="0.0001"
              min="0.0001"
              value={draft.estimatedValue}
              onChange={set("estimatedValue")}
              placeholder="250"
            />
          </div>
          <div>
            <label style={label}>EMD Required (ETH)</label>
            <input
              style={field}
              type="number"
              step="0.0001"
              min="0.0001"
              value={draft.emdAmount}
              onChange={set("emdAmount")}
              placeholder="0.5"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
          <div>
            <label style={label}>Bidding Window (days)</label>
            <input
              style={field}
              type="number"
              min="0"
              step="1"
              value={draft.durationDays}
              onChange={set("durationDays")}
            />
          </div>
          <div>
            <label style={label}>Window (hours)</label>
            <input
              style={field}
              type="number"
              min="0"
              max="23"
              step="1"
              value={draft.durationHours}
              onChange={set("durationHours")}
            />
          </div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={label}>Publish As</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {[
              { key: "live", title: "Live now", note: "bidding opens immediately" },
              { key: "upcoming", title: "Upcoming", note: "schedule the opening" },
            ].map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, publishMode: mode.key }))}
                style={{
                  flex: 1,
                  textAlign: "left",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "#fff",
                  background:
                    draft.publishMode === mode.key ? "rgba(245,158,11,0.12)" : "#151521",
                  border:
                    draft.publishMode === mode.key ? "1px solid #f59e0b" : "1px solid #3f3f5a",
                }}
              >
                <strong>{mode.title}</strong>
                <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{mode.note}</div>
              </button>
            ))}
          </div>
        </div>

        {draft.publishMode === "upcoming" && (
          <div style={{ marginBottom: "14px" }}>
            <label style={label}>Bidding Opens At</label>
            <input
              style={field}
              type="datetime-local"
              value={draft.startAt}
              onChange={set("startAt")}
            />
            <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.3rem" }}>
              The bidding window of {draft.durationDays || 0} day(s) and {draft.durationHours || 0}
              hour(s) runs from this time.
            </div>
          </div>
        )}

        <p style={{ fontSize: "0.72rem", color: "#9ca3af", margin: "0 0 14px" }}>
          Every bid is compared as the contractor&apos;s <strong>offer + EMD</strong> and a higher total
          leads, so the deposit must stay small relative to the estimate — every bidder needs that
          much balance.
        </p>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.78rem",
              color: "#f43f5e",
              background: "rgba(244,63,94,0.08)",
              border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: "8px",
              padding: "0.5rem 0.7rem",
              marginBottom: "14px",
            }}
          >
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #3f3f5a",
              backgroundColor: "transparent",
              color: "#ccc",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#f59e0b",
              color: "#000",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Publish Tender
          </button>
        </div>
      </form>
    </div>
  );
}
