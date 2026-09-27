import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import CountdownTimer from "../components/CountdownTimer";
import { getAccountLabel } from "../utils/accounts";
import {
  Flame,
  Search,
  ArrowUpRight,
  PlusCircle,
  Clock,
  Eye,
  Gavel,
} from "lucide-react";

/*
  Explore is driven ONLY by real on-chain auctions
  (contract.getAllAuctions() passed in as auctionsList).
  No mock / demo / fallback auctions exist here:
  every card's id is a real numeric auctionId from the
  Solidity contract, so /auction/:auctionId always works.
*/

export default function Explore({
  auctionsList = [],
  isDeployer,
  onOpenCreateModal,
  isLoadingContract,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("DEFAULT");

  const filteredAuctions = useMemo(() => {
    return [...auctionsList]
      .filter((item) => {
        const matchesQuery =
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === "ALL" || item.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        const bidA = parseFloat(a.highestBid || a.startingPrice || 0);
        const bidB = parseFloat(b.highestBid || b.startingPrice || 0);
        if (sortBy === "BID_HIGH_TO_LOW") return bidB - bidA;
        if (sortBy === "BID_LOW_TO_HIGH") return bidA - bidB;
        if (sortBy === "ENDING_SOON") {
          const endA = Number(a.auctionEndTime) || Infinity;
          const endB = Number(b.auctionEndTime) || Infinity;
          return endA - endB;
        }
        return a.id - b.id;
      });
  }, [auctionsList, searchQuery, statusFilter, sortBy]);

  return (
    <div className="explore-container">
      <div className="explore-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1>
              <Flame size={32} color="#06b6d4" />
              Explore On-Chain Auctions
            </h1>
            <p>
              Discover and bid on smart contract-verified assets with guaranteed
              escrow safety.
            </p>
          </div>
          {isDeployer && (
            <button className="btn-primary" onClick={onOpenCreateModal}>
              <PlusCircle size={16} /> + Add Auction
            </button>
          )}
        </div>
      </div>

      <div className="explore-toolbar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search auctions by item title or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <div className="filter-pills">
            {["ALL", "ACTIVE", "UPCOMING", "ENDED"].map((tab) => (
              <button
                key={tab}
                className={"filter-pill " + (statusFilter === tab ? "active" : "")}
                onClick={() => setStatusFilter(tab)}
              >
                {tab === "ALL" ? "All Auctions" : tab}
              </button>
            ))}
          </div>

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="DEFAULT">Sort: Default</option>
            <option value="BID_HIGH_TO_LOW">Highest Bid First</option>
            <option value="BID_LOW_TO_HIGH">Lowest Bid First</option>
            <option value="ENDING_SOON">Ending Soonest</option>
          </select>
        </div>
      </div>

      {filteredAuctions.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p className="empty-log">
            {auctionsList.length === 0
              ? isLoadingContract
                ? "Loading auctions from the local chain..."
                : "No auctions found on the local chain."
              : "No auctions match your search or filter criteria."}
          </p>
        </div>
      ) : (
        <div className="explore-grid">
          {filteredAuctions.map((item) => {
            const isLive = item.isLive && item.status !== "ENDED";
            const isUpcoming = item.status === "UPCOMING";
            const currentBidVal =
              parseFloat(item.highestBid || "0") > 0
                ? item.highestBid
                : item.startingPrice;

            return (
              <div
                key={item.id}
                className={"explore-card " + (isLive ? "live-border" : "")}
              >
                <div className="card-image-wrap">
                  <img
                    src={
                      item.imageUrl ||
                      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"
                    }
                    alt={item.title}
                    loading="lazy"
                  />
                  <span
                    className={
                      "status-tag " +
                      (item.status === "ACTIVE"
                        ? "tag-live"
                        : item.status === "UPCOMING"
                        ? "tag-upcoming"
                        : "tag-ended")
                    }
                  >
                    {item.status === "ACTIVE" ? "● LIVE" : item.status}
                  </span>
                </div>

                <div className="card-body">
                  <div className="card-meta">
                    <span className="category">{item.category}</span>
                    <span className="bids">#{item.id}</span>
                  </div>
                  <h3 className="card-title">{item.title}</h3>

                  <div className="card-meta" style={{ marginBottom: "0.75rem" }}>
                    <span className="bids">
                      Seller: {getAccountLabel(item.seller)}
                    </span>
                    {isLive && item.auctionEndTime ? (
                      <span className="bids countdown-chip">
                        <Clock size={12} />{" "}
                        <CountdownTimer endTime={item.auctionEndTime} />
                      </span>
                    ) : null}
                  </div>

                  <div className="card-footer">
                    <div>
                      <span className="bid-label">
                        {item.status === "ENDED" ? "FINAL SALE" : "CURRENT BID"}
                      </span>
                      <span className="bid-val">{currentBidVal} ETH</span>
                    </div>

                    {isLive ? (
                      <Link to={`/auction/${item.id}`} className="btn-view-live">
                        Bid Live <ArrowUpRight size={16} />
                      </Link>
                    ) : (
                      <Link
                        to={`/auction/${item.id}`}
                        className="btn-view-disabled"
                        style={{ textDecoration: "none", display: "inline-flex" }}
                      >
                        {isUpcoming ? (
                          <>
                            View Auction <Eye size={15} />
                          </>
                        ) : (
                          <>
                            View Result <Gavel size={15} />
                          </>
                        )}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
