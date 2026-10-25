import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTenderImage } from "../utils/constants";
import {
  Compass,
  Filter,
  Search,
  Clock,
  ArrowRight,
  IndianRupee,
  ShieldCheck,
  FileText,
} from "lucide-react";

const ETH_INR = 285000;
const toEth = (v, dp = 4) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};
const toInr = (eth) => {
  const inr = parseFloat(eth || "0") * ETH_INR;
  return "₹" + inr.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const DEPARTMENTS = ["ALL", "NHAI", "CPWD", "Railways", "Smart Cities"];

/* Live closing countdown for a single tender */
function useCountdown(closingTime) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    const end = Number(closingTime) || 0;
    if (!end) {
      setRemaining(null);
      return;
    }
    const tick = () => setRemaining(Math.max(0, end - Math.floor(Date.now() / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [closingTime]);

  if (remaining === null) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  if (remaining <= 0) return "Closed";
  return `${pad(Math.floor(remaining / 3600))}h ${pad(
    Math.floor((remaining % 3600) / 60)
  )}m ${pad(remaining % 60)}s`;
}

function TenderCard({ tender, isActive, onSelect }) {
  const countdown = useCountdown(tender.closingTime);
  const isOpen = tender.status === "OPEN" && tender.isOpen;

  return (
    <div className={"explore-card " + (isOpen ? "live-border" : "")}>
      <div className="card-image-wrap">
        <img
          src={getTenderImage(tender)}
          alt={tender.title}
        />
        <span
          className={
            "status-tag " +
            (isOpen ? "tag-live" : tender.status === "AWARDED" ? "tag-ended" : "tag-upcoming")
          }
        >
          {isOpen ? "OPEN" : tender.status}
        </span>
      </div>

      <div className="card-body">
        <div className="card-meta">
          <span className="dept-tag">{tender.department}</span>
          <span className="ref-no">{tender.referenceNo}</span>
        </div>

        <h3 className="card-title">{tender.title}</h3>

        <div className="tender-detail-rows">
          <div className="tender-detail-row">
            <span className="label">
              <FileText size={13} /> Category
            </span>
            <span className="value">{tender.category}</span>
          </div>
          <div className="tender-detail-row">
            <span className="label">
              <IndianRupee size={13} /> Estimated Value
            </span>
            <span className="value saffron">
              {toEth(tender.estimatedValue)} ETH
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {toInr(tender.estimatedValue)}
              </div>
            </span>
          </div>
          <div className="tender-detail-row">
            <span className="label">
              <ShieldCheck size={13} /> EMD Required
            </span>
            <span className="value cyan">{toEth(tender.emdAmount)} ETH</span>
          </div>
          <div className="tender-detail-row">
            <span className="label">Lowest Bid</span>
            <span className="value emerald">
              {parseFloat(tender.lowestBid) > 0 ? `${toEth(tender.lowestBid)} ETH` : "None"}
            </span>
          </div>
          <div className="tender-detail-row">
            <span className="label">
              <Clock size={13} /> Closing In
            </span>
            <span className={"value " + (isOpen ? "cyan" : "")}>{countdown}</span>
          </div>
        </div>

        <div className="card-footer">
          <button
            className="btn-primary"
            onClick={() => onSelect(tender.id)}
            title="Route this tender into the Live Procurement Console"
          >
            {isActive ? "Active — Open Console" : "Set Active Tender"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Explore({ session, tendersList = [], activeTenderId, onSelectActiveTender }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const filteredTenders = (tendersList || []).filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(q) || t.referenceNo.toLowerCase().includes(q);
    const matchesDept = filterDept === "ALL" || t.department === filterDept;
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleSelect = (tenderId) => {
    if (onSelectActiveTender) onSelectActiveTender(tenderId);
    navigate("/");
  };

  return (
    <div className="explore-container">
      <div className="explore-header">
        <h1>
          <Compass size={32} /> Active Tenders Feed
        </h1>
        <p>
          Browse and participate in government procurement opportunities across
          departments. Select a tender to route it into the Live Procurement
          Console.
        </p>
      </div>

      <div className="explore-toolbar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by title or reference number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <div className="filter-pills">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                className={"filter-pill " + (filterDept === dept ? "active" : "")}
                onClick={() => setFilterDept(dept)}
              >
                {dept}
              </button>
            ))}
          </div>
          <select
            className="sort-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="EVALUATING">Evaluating</option>
            <option value="AWARDED">Awarded</option>
          </select>
        </div>
      </div>

      <div className="explore-info-strip">
        <Filter size={16} />
        <span>
          Showing {filteredTenders.length} tender
          {filteredTenders.length === 1 ? "" : "s"} · Department-wise filtering
          enabled
        </span>
      </div>

      <div className="explore-grid">
        {filteredTenders.length === 0 ? (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "3rem",
              color: "var(--text-muted)",
            }}
          >
            No tenders found matching your criteria
          </div>
        ) : (
          filteredTenders.map((tender) => (
            <TenderCard
              key={tender.id}
              tender={tender}
              isActive={Number(activeTenderId) === tender.id}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
