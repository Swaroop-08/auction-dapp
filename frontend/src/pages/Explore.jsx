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
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/*
  Explore = the marketplace CATALOG.

  Card order:
    1. REAL on-chain auctions (contract.getAllAuctions()).
       Their ids are real numeric auctionIds, so "Bid Live"
       navigates to /auction/:id and always works.
    2. A demo SHOWCASE catalog (clearly non-navigable) that
       fills out the marketplace look with LIVE / UPCOMING /
       ENDED items across categories. Showcase cards open a
       detail modal — they NEVER navigate to /auction/mock-N,
       so no fake auction id can ever reach the details page.
*/

const AUCTION_TYPE = "SHOWCASE"; // tag prefix for demo cards

const SHOWCASE_CATALOG = [
  {
    id: "showcase-rolex-daytona",
    title: 'Rolex Daytona "Panda" (2023)',
    category: "Luxury Watches",
    status: "ACTIVE",
    currentBid: 4.8,
    startingPrice: 4.5,
    bidsCount: "14 bids",
    endsInHours: 26,
    seller: "AuctionX Gallery",
    description:
      "Full-set stainless steel Daytona with the iconic panda dial. Escrow-verified provenance, insured cold storage until settlement.",
    imageUrl:
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-cyberpunk-nft",
    title: "Cyberpunk Genesis NFT #042",
    category: "Digital Art",
    status: "UPCOMING",
    currentBid: 3.5,
    startingPrice: 3.0,
    bidsCount: "Starts in 2 hours",
    seller: "NeoMint Studio",
    description:
      "1/1 generative piece from the Genesis drop. On-chain royalty split to the artist on every resale.",
    imageUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-gibson-les-paul",
    title: "1967 Gibson Les Paul Custom",
    category: "Rare Collectibles",
    status: "ENDED",
    currentBid: 8.2,
    startingPrice: 6.0,
    bidsCount: "Sold · 31 bids",
    seller: "Heritage Vault",
    description:
      "Original '67 Custom Black Beauty with matching serial hardware. Final sale settled on-chain to the verified winner.",
    imageUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-dubai-penthouse",
    title: "Penthouse Fraction — Dubai Marina",
    category: "Real Estate Escrow",
    status: "ACTIVE",
    currentBid: 12.75,
    startingPrice: 11.0,
    bidsCount: "9 bids",
    endsInHours: 96,
    seller: "Escrow Lands Ltd.",
    description:
      "Fractional deed to a sea-view penthouse, held by smart-contract escrow until the fractional sale concludes.",
    imageUrl:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-patek-nautilus",
    title: "Patek Philippe Nautilus 5711",
    category: "Luxury Watches",
    status: "ENDED",
    currentBid: 9.4,
    startingPrice: 8.0,
    bidsCount: "Sold · 22 bids",
    seller: "AuctionX Gallery",
    description:
      "Discontinued reference with blue dial and full service history. Final sale transferred to the winning bidder.",
    imageUrl:
      "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-ai-renaissance",
    title: "AI Renaissance Portrait #117",
    category: "Digital Art",
    status: "ACTIVE",
    currentBid: 1.9,
    startingPrice: 1.5,
    bidsCount: "6 bids",
    endsInHours: 7,
    seller: "NeoMint Studio",
    description:
      "Algorithmic portrait series blending classical technique with neural style transfer. Minted with on-chain signature.",
    imageUrl:
      "https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "showcase-charizard",
    title: "1st-Edition Charizard (PSA 9)",
    category: "Rare Collectibles",
    status: "UPCOMING",
    currentBid: 6.0,
    startingPrice: 5.5,
    bidsCount: "Starts in 26 hours",
    seller: "Heritage Vault",
    description:
      "Graded gem-mint shadowless base set holo. Vault storage with insured on-chain custody transfer at settlement.",
    imageUrl:
      "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&auto=format&fit=crop&q=80",
  },
];

export default function Explore({
  auctionsList = [],
  isDeployer,
  onOpenCreateModal,
  isLoadingContract,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("DEFAULT");
  const [showcaseItem, setShowcaseItem] = useState(null);

  // Real on-chain auctions FIRST, then the demo showcase catalog
  const allAuctions = useMemo(() => {
    const nowSec = Date.now() / 1000;
    const showcase = SHOWCASE_CATALOG.map((item) => ({
      ...item,
      isShowcase: true,
      // Synthetic (client-side) countdown so LIVE demo cards tick
      auctionEndTime:
        item.status === "ACTIVE" && item.endsInHours
          ? Math.floor(nowSec + item.endsInHours * 3600)
          : null,
    }));
    return [...auctionsList, ...showcase];
  }, [auctionsList]);

  const filteredAuctions = useMemo(() => {
    return [...allAuctions]
      .filter((item) => {
        const matchesQuery =
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === "ALL" || item.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        const bidA = parseFloat(a.highestBid || a.currentBid || a.startingPrice || 0);
        const bidB = parseFloat(b.highestBid || b.currentBid || b.startingPrice || 0);
        if (sortBy === "BID_HIGH_TO_LOW") return bidB - bidA;
        if (sortBy === "BID_LOW_TO_HIGH") return bidA - bidB;
        if (sortBy === "ENDING_SOON") {
          const endA = Number(a.auctionEndTime) || Infinity;
          const endB = Number(b.auctionEndTime) || Infinity;
          return endA - endB;
        }
        return (
          (a.isShowcase ? 1 : 0) - (b.isShowcase ? 1 : 0) ||
          String(a.id).localeCompare(String(b.id), undefined, {
            numeric: true,
          })
        );
      });
  }, [allAuctions, searchQuery, statusFilter, sortBy]);

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

      {auctionsList.length === 0 && !isLoadingContract && (
        <div className="explore-info-strip">
          <Sparkles size={15} />
          <span>
            Live blockchain auctions will appear at the top of this catalog —
            start your Hardhat node and create one. Showcase items below are for
            demo browsing.
          </span>
        </div>
      )}

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
            No auctions match your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="explore-grid">
          {filteredAuctions.map((item) => {
            const isShowcase = !!item.isShowcase;
            const isLive = !isShowcase
              ? item.isLive && item.status !== "ENDED"
              : item.status === "ACTIVE";
            const isUpcoming = item.status === "UPCOMING";
            const currentBidVal =
              parseFloat(item.highestBid || "0") > 0
                ? item.highestBid
                : item.currentBid || item.startingPrice;

            const cardBody = (
              <>
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
                  {isShowcase && (
                    <span className="showcase-tag">{AUCTION_TYPE}</span>
                  )}
                </div>

                <div className="card-body">
                  <div className="card-meta">
                    <span className="category">{item.category}</span>
                    <span className="bids">
                      {isShowcase ? item.bidsCount : `#${item.id}`}
                    </span>
                  </div>
                  <h3 className="card-title">{item.title}</h3>

                  <div className="card-meta" style={{ marginBottom: "0.75rem" }}>
                    <span className="bids">
                      Seller: {isShowcase ? item.seller : getAccountLabel(item.seller)}
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

                    {isShowcase ? (
                      <button
                        className="btn-view-live"
                        onClick={() => setShowcaseItem(item)}
                      >
                        View Details <Eye size={15} />
                      </button>
                    ) : isLive ? (
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
              </>
            );

            return isShowcase ? (
              <div
                key={item.id}
                className={"explore-card showcase-card " + (isLive ? "live-border" : "")}
              >
                {cardBody}
              </div>
            ) : (
              <div
                key={item.id}
                className={"explore-card " + (isLive ? "live-border" : "")}
              >
                {cardBody}
              </div>
            );
          })}
        </div>
      )}

      {/* Showcase detail modal — demo items NEVER navigate */}
      {showcaseItem && (
        <div
          className="modal-backdrop"
          onClick={() => setShowcaseItem(null)}
        >
          <div
            className="modal-card showcase-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={20} color="#06b6d4" />
                <h3>Showcase Item</h3>
              </div>
              <button className="toast-close" onClick={() => setShowcaseItem(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="showcase-modal-body">
              <div className="showcase-modal-image-wrap">
                <img src={showcaseItem.imageUrl} alt={showcaseItem.title} />
                <span
                  className={
                    "status-tag " +
                    (showcaseItem.status === "ACTIVE"
                      ? "tag-live"
                      : showcaseItem.status === "UPCOMING"
                      ? "tag-upcoming"
                      : "tag-ended")
                  }
                >
                  {showcaseItem.status === "ACTIVE" ? "● LIVE" : showcaseItem.status}
                </span>
              </div>

              <span className="category" style={{ alignSelf: "flex-start" }}>
                {showcaseItem.category}
              </span>
              <h3 className="showcase-modal-title">{showcaseItem.title}</h3>
              <p className="showcase-modal-desc">{showcaseItem.description}</p>

              <div className="showcase-modal-stats">
                <div>
                  <span className="stat-label">SELLER</span>
                  <span className="stat-val" style={{ fontSize: "0.95rem" }}>
                    {showcaseItem.seller}
                  </span>
                </div>
                <div>
                  <span className="stat-label">STARTING PRICE</span>
                  <span className="stat-val" style={{ fontSize: "0.95rem" }}>
                    {showcaseItem.startingPrice} ETH
                  </span>
                </div>
                <div>
                  <span className="stat-label">
                    {showcaseItem.status === "ENDED" ? "FINAL SALE" : "CURRENT BID"}
                  </span>
                  <span className="stat-val" style={{ fontSize: "0.95rem", color: "var(--cyan)" }}>
                    {showcaseItem.currentBid} ETH
                  </span>
                </div>
              </div>

              <div className="showcase-modal-note">
                <ShieldCheck size={16} />
                <span>
                  This is a demo showcase item with simulated market data. Switch
                  to a live on-chain auction above to place real bids through the
                  local contract.
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowcaseItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
