import React, { useState } from "react";
import { X } from "lucide-react";

export default function MetaMaskSimulatorModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  txDetails 
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !txDetails) return null;

  const addr = txDetails.fromAddress || "0x0000000000000000000000000000000000000000";
  const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      if (typeof onConfirm === "function") {
        await onConfirm();
      }
    } catch (e) {
      console.error("Modal confirmation error:", e);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        backgroundColor: "#1e1e2d",
        border: "1px solid #383854",
        borderRadius: "16px",
        width: "360px",
        padding: "20px",
        color: "#fff",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        fontFamily: "sans-serif"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2d2d42", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
            <span style={{ fontSize: "18px" }}>🦊</span> MetaMask Simulator
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ backgroundColor: "#151521", borderRadius: "8px", padding: "10px", margin: "14px 0", fontSize: "13px" }}>
          <div style={{ color: "#a1a1aa", marginBottom: "4px" }}>Active Wallet Address:</div>
          <div style={{ fontSize: "12px", color: "#6366f1", fontFamily: "monospace", fontWeight: "bold" }}>
            {shortAddr}
          </div>
        </div>

        <div style={{ margin: "16px 0", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px" }}>
            {txDetails.type || "Contract Interaction"}
          </div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#38bdf8", margin: "8px 0" }}>
            {txDetails.amount ? `${txDetails.amount} ETH` : "0 ETH"}
          </div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
            Contract: <span style={{ fontFamily: "monospace", color: "#e2e8f0" }}>AuctionX</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af", borderTop: "1px solid #2d2d42", paddingTop: "12px", marginBottom: "20px" }}>
          <span>Estimated Gas Fee:</span>
          <span style={{ color: "#10b981", fontWeight: "bold" }}>0.00042 ETH</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #3f3f5a",
              backgroundColor: "transparent",
              color: "#ccc",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Reject
          </button>

          <button 
            onClick={handleApprove}
            disabled={isProcessing}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#6366f1",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {isProcessing ? "Confirming..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}