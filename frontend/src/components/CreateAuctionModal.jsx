import React, { useState } from "react";
import { X, PlusCircle, AlertCircle, ArrowUpRight } from "lucide-react";

export default function CreateAuctionModal({ isOpen, onClose, onCreateAuction }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Luxury Watches");
  const [imageUrl, setImageUrl] = useState("");
  const [startingPrice, setStartingPrice] = useState("0.5");
  const [durationHours, setDurationHours] = useState("24");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !startingPrice) return;
    setIsSubmitting(true);
    try {
      await onCreateAuction({
        title,
        description: description || "No description provided.",
        category,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
        startingPrice,
        durationSeconds: Math.floor(parseFloat(durationHours) * 3600)
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PlusCircle size={22} color="#06b6d4" />
            <h3>Create New On-Chain Auction</h3>
          </div>
          <button className="toast-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Item Title</label>
            <input 
              type="text" 
              placeholder="e.g. Vintage Rolex GMT Master II" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Luxury Watches">Luxury Watches</option>
              <option value="Digital Art">Digital Art</option>
              <option value="Collectibles">Collectibles</option>
              <option value="Fine Jewelry">Fine Jewelry</option>
              <option value="Real Estate">Real Estate</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Starting Price (ETH)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.001" 
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Duration (Hours)</label>
              <input 
                type="number" 
                step="1" 
                min="1" 
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Image URL</label>
            <input 
              type="url" 
              placeholder="https://images.unsplash.com/..." 
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              rows={3} 
              placeholder="Describe the asset, authenticity, and provenance..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Creating On-Chain..." : "Publish Auction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
