import React, { useState, useEffect, useRef } from "react";

/*
  Reusable countdown driven ONLY by a real on-chain
  auctionEndTime (unix seconds). Shows compact format
  ("2d 04h 32m" / "01h 12m 45s"); when it reaches zero
  it fires the optional onEnded callback once so parent
  pages can disable bidding and refresh status.
*/
export default function CountdownTimer({ endTime, onEnded }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: false,
  });

  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    if (!endTime) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const target = Number(endTime);
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true });
        if (typeof onEndedRef.current === "function") {
          onEndedRef.current();
        }
        return;
      }

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimeLeft({ days, hours, minutes, seconds, isEnded: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const pad = (n) => String(n).padStart(2, "0");

  if (timeLeft.isEnded) {
    return (
      <span className="stat-val" style={{ color: "var(--rose)" }}>
        Auction Ended
      </span>
    );
  }

  return (
    <span className="stat-val countdown-live">
      {timeLeft.days > 0 ? `${timeLeft.days}d ${pad(timeLeft.hours)}h ` : ""}
      {timeLeft.days > 0
        ? `${pad(timeLeft.minutes)}m`
        : `${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s`}
    </span>
  );
}
