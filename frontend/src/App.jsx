import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";

import { ethers } from "ethers";

import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
} from "./utils/constants";

import {
  getAccountLabel,
  getAccountDetails,
  HARDHAT_ACCOUNTS,
  getDirectSigner,
  describeBidError,
} from "./utils/accounts";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import AuctionDetails from "./pages/AuctionDetails";

import ToastContainer from "./components/ToastContainer";
import CreateAuctionModal from "./components/CreateAuctionModal";
import MetaMaskSimulatorModal from "./components/MetaMaskSimulatorModal";

import {
  Layers,
  Compass,
  User,
  Wallet,
  PlusCircle,
} from "lucide-react";

import "./App.css";

/* =========================================================
   LOCAL HARDHAT RPC
   ========================================================= */

const RPC_URL = "http://127.0.0.1:8545";

/* =========================================================
   APP
   ========================================================= */

export default function App() {

  const defaultBidder =
    HARDHAT_ACCOUNTS[1]?.address ||
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const [account, setAccount] = useState(defaultBidder);
  const [balance, setBalance] = useState("0");
  const [highestBid, setHighestBid] = useState("0");
  const [highestBidder, setHighestBidder] = useState("No bids yet");
  const [deployer, setDeployer] = useState(
    HARDHAT_ACCOUNTS[0]?.address ||
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
  const [endTime, setEndTime] = useState(null);
  const [pendingRefund, setPendingRefund] = useState("0");
  const [bidHistory, setBidHistory] = useState([]);
  const [auctionsList, setAuctionsList] = useState([]);
  const [featuredAuction, setFeaturedAuction] = useState(null);
  const [activeAuctionId, setActiveAuctionId] = useState(0);
  const [logContext, setLogContext] = useState("GLOBAL");
  const [toasts, setToasts] = useState([]);
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  /* Virtual Wallet / Transaction Confirmation UI */
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simTxDetails, setSimTxDetails] = useState(null);
  const [simConfirmAction, setSimConfirmAction] = useState(null);

  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  const activeAuctionIdRef = useRef(0);
  useEffect(() => {
    activeAuctionIdRef.current = activeAuctionId;
  }, [activeAuctionId]);

  const setActiveAuction = useCallback((auctionId) => {
    const id = Number(auctionId);
    if (!Number.isFinite(id) || id < 0) return;
    activeAuctionIdRef.current = id;
    setActiveAuctionId(id);
  }, []);

  const logContextRef = useRef("GLOBAL");
  useEffect(() => {
    logContextRef.current = logContext;
  }, [logContext]);

  const globalHistoryRef = useRef([]);

  const toggleLogContext = useCallback((scope) => {
    const next = scope ||
      (logContextRef.current === "GLOBAL"
        ? "AUCTION"
        : "GLOBAL");

    logContextRef.current = next;
    setLogContext(next);

    setBidHistory(() =>
      next === "GLOBAL"
        ? globalHistoryRef.current
        : globalHistoryRef.current.filter(
            (h) => h.auctionId === activeAuctionIdRef.current
          )
    );
  }, []);

  /* =========================================================
     TOAST FUNCTIONS
     ========================================================= */

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString();
    const newToast = { id, ...toast };
    setToasts((prev) => [newToast, ...prev]);

    if (toast.type !== "pending") {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5500);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* =========================================================
     ERROR MESSAGE HELPER
     ========================================================= */

  const extractErrorMessage = (err) => {
    if (!err) return "Transaction failed.";
    if (typeof err === "string") return err;
    if (err.info?.error?.message) return err.info.error.message;
    if (err.error?.message) return err.error.message;
    if (err.reason) return err.reason;
    if (err.shortMessage) return err.shortMessage;
    if (err.message) return err.message;
    return "Transaction reverted on-chain.";
  };

  /* =========================================================
     PROVIDER
     ========================================================= */

  const getProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  const assertSignerReady = async (signer) => {
    if (!signer) {
      throw new Error("No virtual wallet signer available. Select an account first.");
    }
    if (!signer.provider) {
      throw new Error("Virtual wallet signer has no RPC provider (expected http://127.0.0.1:8545).");
    }

    const signerAddress = await signer.getAddress();
    const expected = (accountRef.current || "").toLowerCase();

    if (!expected || signerAddress.toLowerCase() !== expected) {
      throw new Error(
        `Signer address ${signerAddress} does not match the selected virtual wallet ${expected || "(none)"}.`
      );
    }
    return signerAddress;
  };

  /* =========================================================
     UPDATE BALANCE
     ========================================================= */

  const updateBalance = useCallback(
    async (userAddress) => {
      if (!userAddress) return;
      try {
        const provider = getProvider();
        const bal = await provider.getBalance(userAddress);
        setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
      } catch (err) {
        console.warn("Balance fetch error:", err);
      }
    },
    [getProvider]
  );

  /* =========================================================
     FETCH CONTRACT DATA
     ========================================================= */

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingContract(true);
      const provider = getProvider();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const code = await provider.getCode(CONTRACT_ADDRESS).catch(() => "0x");
      if (code === "0x") {
        console.warn("No contract found at:", CONTRACT_ADDRESS);
        return;
      }

      const bDeployer = await contract.deployer().catch(() => HARDHAT_ACCOUNTS[0]?.address);
      if (bDeployer) setDeployer(bDeployer);

      const currentUser = accountRef.current;
      if (currentUser) {
        await updateBalance(currentUser);
        const refund = await contract.pendingReturns(currentUser).catch(() => 0n);
        setPendingRefund(parseFloat(ethers.formatEther(refund)).toFixed(4));
      }

      /* Read All Auctions */
      const all = await contract.getAllAuctions().catch(() => []);
      let formatted = [];

      if (all && all.length > 0) {
        formatted = all.map((a) => ({
          id: Number(a.id),
          title: a.title,
          description: a.description,
          category: a.category,
          imageUrl: a.imageUrl,
          seller: a.seller,
          startingPrice: ethers.formatEther(a.startingPrice),
          highestBid: ethers.formatEther(a.highestBid),
          highestBidder: a.highestBidder,
          auctionEndTime: Number(a.auctionEndTime),
          ended: a.ended,
          status: a.ended
            ? "ENDED"
            : Date.now() / 1000 > Number(a.auctionEndTime)
            ? "ENDED"
            : "ACTIVE",
          isLive: !a.ended && Date.now() / 1000 <= Number(a.auctionEndTime),
        }));
        setAuctionsList(formatted);
      } else {
        setAuctionsList([]);
      }

      /* Featured Auction Setup */
      const liveOnes = formatted.filter((a) => a.status === "ACTIVE");
      const featured =
        liveOnes.length > 0
          ? liveOnes.reduce((best, a) =>
              parseFloat(a.highestBid || "0") > parseFloat(best.highestBid || "0")
                ? a
                : best
            )
          : formatted[0] || null;

      setFeaturedAuction(featured);

      /* Active Auction State Update */
      let activeAuction = formatted.find((a) => a.id === activeAuctionIdRef.current);
      if (!activeAuction) {
        activeAuction = formatted.find((a) => a.id === 0) || formatted[0] || null;
        if (activeAuction) {
          activeAuctionIdRef.current = activeAuction.id;
          setActiveAuctionId(activeAuction.id);
        }
      }

      if (activeAuction) {
        setHighestBid(activeAuction.highestBid);
        setHighestBidder(activeAuction.highestBidder);
        setEndTime(activeAuction.auctionEndTime);
      }

      /* BID AUDIT HISTORY LOGS */
      let globalHistory = [];
      try {
        const filter = contract.filters.HighestBidIncreased();
        const events = await contract.queryFilter(filter, 0, "latest");

        if (events && events.length > 0) {
          const blockTimes = {};
          for (const e of events) {
            if (blockTimes[e.blockNumber] === undefined) {
              const block = await provider.getBlock(e.blockNumber).catch(() => null);
              blockTimes[e.blockNumber] = block ? block.timestamp : null;
            }
          }

          const parsed = events.map((e) => {
            const bidderAddr = e.args ? (e.args[1] || e.args.bidder) : e.data;
            const amountWei = e.args ? (e.args[2] || e.args.amount) : 0n;
            const auctionIdVal = e.args ? Number(e.args[0]) : 0;
            const ts = blockTimes[e.blockNumber];

            return {
              id: e.transactionHash + "_" + e.index,
              auctionId: auctionIdVal,
              auctionTitle:
                formatted.find((fa) => fa.id === auctionIdVal)?.title || null,
              logScope: "GLOBAL",
              bidder: bidderAddr,
              amount: ethers.formatEther(amountWei),
              time: ts
                ? new Date(ts * 1000).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—",
              txHash: e.transactionHash,
            };
          });

          globalHistory = parsed.reverse();
        }
      } catch (logErr) {
        console.warn("Audit Log sync warning:", logErr);
      }

      globalHistoryRef.current = globalHistory;
      setBidHistory(() =>
        logContextRef.current === "GLOBAL"
          ? globalHistory
          : globalHistory.filter((h) => h.auctionId === activeAuctionIdRef.current)
      );

    } catch (err) {
      console.error("Data sync error:", err);
    } finally {
      setIsLoadingContract(false);
    }
  }, [getProvider, updateBalance]);

  const refreshAuctionState = useCallback(
    async (auctionId) => {
      try {
        const id = Number(auctionId);
        if (!Number.isFinite(id) || id < 0) return;

        const provider = getProvider();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const item = await contract.auctions(id);

        const nowSec = Date.now() / 1000;
        const endSec = Number(item.auctionEndTime);

        const patch = {
          highestBid: ethers.formatEther(item.highestBid),
          highestBidder: item.highestBidder,
          auctionEndTime: endSec,
          ended: item.ended,
          status: item.ended ? "ENDED" : nowSec > endSec ? "ENDED" : "ACTIVE",
          isLive: !item.ended && nowSec <= endSec,
        };

        setAuctionsList((prev) =>
          prev.some((a) => a.id === id)
            ? prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
            : prev
        );

        if (id === activeAuctionIdRef.current) {
          setHighestBid(patch.highestBid);
          setHighestBidder(
            item.highestBidder === ethers.ZeroAddress
              ? "No bids yet"
              : item.highestBidder
          );
          setEndTime(endSec);
        }
      } catch (err) {
        console.warn("Auction state refresh warning:", err);
      }
    },
    [getProvider]
  );

  const handleSwitchAccount = async (targetAddress) => {
    try {
      const selectedAccount = HARDHAT_ACCOUNTS.find(
        (acc) => acc.address.toLowerCase() === targetAddress.toLowerCase()
      );

      if (!selectedAccount) {
        addToast({
          type: "error",
          title: "Wallet Error",
          message: "Virtual wallet account not found.",
        });
        return;
      }

      setAccount(targetAddress);
      accountRef.current = targetAddress;
      await updateBalance(targetAddress);

      const provider = getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const refund = await contract.pendingReturns(targetAddress).catch(() => 0n);
      setPendingRefund(parseFloat(ethers.formatEther(refund)).toFixed(4));
    } catch (err) {
      console.error("Switch account error:", err);
      addToast({
        type: "error",
        title: "Wallet Switch Failed",
        message: extractErrorMessage(err),
      });
    }
  };

  const promptMetaMaskSim = (details, confirmCallback) => {
    const activeUser = accountRef.current || account || defaultBidder;
    setSimTxDetails({
      fromAddress: activeUser,
      type: details?.type || "Contract Interaction",
      amount: details?.amount || "0",
    });
    setSimConfirmAction(() => confirmCallback);
    setSimModalOpen(true);
  };

  const handleBid = async (auctionId, amount) => {
    const numericAmount = parseFloat(amount);
    const auction = (auctionsList || []).find((a) => a.id === Number(auctionId));
    const currentHigh = auction ? parseFloat(auction.highestBid || "0") : 0;
    const seller = auction ? auction.seller : deployer;
    const activeAccount = accountRef.current || account;

    if (isNaN(numericAmount) || numericAmount <= 0) {
      addToast({
        type: "error",
        title: "Invalid Amount",
        message: "Enter a valid ETH amount.",
      });
      return;
    }

    if (auction && (auction.ended || !auction.isLive)) {
      addToast({
        type: "error",
        title: "Auction Ended",
        message: "Bid Failed: This auction has already ended.",
      });
      return;
    }

    if (activeAccount && seller && activeAccount.toLowerCase() === seller.toLowerCase()) {
      addToast({
        type: "error",
        title: "Rejected",
        message: "Seller cannot bid on their own auction!",
      });
      return;
    }

    if (currentHigh > 0 && numericAmount <= currentHigh) {
      addToast({
        type: "error",
        title: "Bid Too Low",
        message: "Bid Failed: Your bid must be higher than the current highest bid.",
      });
      return;
    }

    const numericBalance = parseFloat(balance || "0");
    if (numericBalance < numericAmount) {
      addToast({
        type: "error",
        title: "Insufficient Balance",
        message: "Bid Failed: Insufficient ETH balance.",
      });
      return;
    }

    promptMetaMaskSim(
      { type: "Submit Auction Bid", amount: amount },
      async () => {
        try {
          const signer = getDirectSigner(accountRef.current, getProvider());
          await assertSignerReady(signer);

          const contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
          );

          let bidValue = ethers.parseEther(amount.toString());
          const tx = await contract["bid(uint256)"](BigInt(Number(auctionId)), {
            value: bidValue,
            gasLimit: 300000,
          });

          const receipt = await tx.wait();

          addToast({
            type: "success",
            title: "Confirmed!",
            message: `Bid of ${amount} ETH placed on auction #${auctionId}!`,
            txHash: receipt.hash,
          });

          await refreshAuctionState(auctionId);
          await fetchData();
          await updateBalance(accountRef.current);
        } catch (err) {
          console.error("Bid transaction error:", err);
          addToast({
            type: "error",
            title: "Bid Failed",
            message: describeBidError(err, accountRef.current),
          });
        }
      }
    );
  };

  const handleWithdraw = async () => {
    promptMetaMaskSim(
      { type: "Claim Refund", amount: pendingRefund },
      async () => {
        try {
          const signer = getDirectSigner(accountRef.current, getProvider());
          await assertSignerReady(signer);

          const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
          const tx = await contract.withdraw({ gasLimit: 200000 });
          const receipt = await tx.wait();

          addToast({
            type: "success",
            title: "Refund Claimed!",
            message: "ETH returned to wallet!",
            txHash: receipt.hash,
          });

          await fetchData();
          await updateBalance(accountRef.current);
        } catch (err) {
          console.error("Withdraw transaction error:", err);
          addToast({
            type: "error",
            title: "Claim Failed",
            message: extractErrorMessage(err),
          });
        }
      }
    );
  };

  const handleCreateAuction = async (newAuctionData) => {
    promptMetaMaskSim(
      { type: "Publish Auction", amount: newAuctionData.startingPrice || "0.1" },
      async () => {
        const pendingToastId = addToast({
          type: "pending",
          title: "Creating Auction…",
          message: "Waiting for block confirmation on the local chain.",
        });

        try {
          const signer = getDirectSigner(accountRef.current, getProvider());
          await assertSignerReady(signer);

          const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

          const tx = await contract.createAuction(
            String(newAuctionData.title || "Untitled"),
            String(newAuctionData.description || ""),
            String(newAuctionData.category || "General"),
            String(newAuctionData.imageUrl || ""),
            ethers.parseEther((newAuctionData.startingPrice || "0.1").toString()),
            BigInt(Math.floor(Number(newAuctionData.durationSeconds || 86400))),
            { gasLimit: 500000 }
          );

          const receipt = await tx.wait();
          let newAuctionId = null;

          for (const log of receipt.logs) {
            try {
              const parsedLog = contract.interface.parseLog(log);
              if (parsedLog && parsedLog.name === "AuctionCreated") {
                newAuctionId = Number(parsedLog.args.auctionId);
                break;
              }
            } catch {}
          }

          removeToast(pendingToastId);

          addToast({
            type: "success",
            title: "Auction Created!",
            message:
              newAuctionId !== null
                ? `Auction #${newAuctionId} is live!`
                : "Transaction confirmed.",
            txHash: receipt.hash,
          });

          setIsCreateModalOpen(false);

          if (newAuctionId !== null) {
            setActiveAuction(newAuctionId);
          }

          await fetchData();
        } catch (err) {
          console.error("Create auction error:", err);
          removeToast(pendingToastId);
          addToast({
            type: "error",
            title: "Creation Failed",
            message: extractErrorMessage(err),
          });
        }
      }
    );
  };

  /* EVENT LISTENERS */
  useEffect(() => {
    fetchData();

    const provider = getProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const onBidIncreased = (...args) => {
      const auctionId = args[0];
      if (auctionId !== undefined) {
        refreshAuctionState(Number(auctionId));
      }
      fetchData();
    };

    contract.on("HighestBidIncreased", onBidIncreased);

    return () => {
      contract.off("HighestBidIncreased", onBidIncreased);
    };
  }, [fetchData, getProvider, refreshAuctionState]);

  const currentAccountDetails = getAccountDetails(account, deployer);

  return (
    <Router>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <MetaMaskSimulatorModal
        isOpen={simModalOpen}
        onClose={() => setSimModalOpen(false)}
        onConfirm={simConfirmAction}
        txDetails={simTxDetails}
      />
      <CreateAuctionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateAuction={handleCreateAuction}
      />

      <header className="navbar-wrapper">
        <nav className="navbar">
          <NavLink to="/" className="brand">
            <Layers size={26} color="#6366f1" />
            <span>
              AuctionX <small className="brand-badge">Simulated</small>
            </span>
          </NavLink>

          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Live Auction
            </NavLink>
            <NavLink to="/explore" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              <Compass size={16} /> Explore
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              <User size={16} /> Portfolio
            </NavLink>
          </div>

          <div className="navbar-right">
            {currentAccountDetails.isDeployer && (
              <button
                className="btn-primary"
                style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusCircle size={15} /> + Add Auction
              </button>
            )}

            <div className="wallet-badge-group">
              <span className={"user-role-pill " + (currentAccountDetails.isDeployer ? "role-deployer" : "role-bidder")}>
                {currentAccountDetails.badge}
              </span>
              <span className="wallet-balance">
                {parseFloat(balance || "0").toFixed(4)} ETH
              </span>
            </div>

            <button className="btn-wallet connected" title="Virtual Local Wallet">
              <Wallet size={16} />
              {currentAccountDetails.short}
            </button>
          </div>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <Home
                account={account}
                balance={balance}
                highestBid={highestBid}
                highestBidder={highestBidder}
                pendingRefund={pendingRefund}
                bidHistory={bidHistory}
                endTime={endTime}
                featuredAuction={featuredAuction}
                auctionsList={auctionsList}
                activeAuctionId={activeAuctionId}
                logContext={logContext}
                onToggleLogContext={toggleLogContext}
                onSelectActiveAuction={setActiveAuction}
                isLoadingContract={isLoadingContract}
                handleBid={handleBid}
                handleWithdraw={handleWithdraw}
                onSwitchAccount={handleSwitchAccount}
                deployer={deployer}
              />
            }
          />
          <Route
            path="/explore"
            element={
              <Explore
                highestBid={highestBid}
                endTime={endTime}
                auctionsList={auctionsList}
                activeAuctionId={activeAuctionId}
                onSelectActiveAuction={setActiveAuction}
                isDeployer={currentAccountDetails.isDeployer}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
              />
            }
          />
          <Route
            path="/auction/:auctionId"
            element={
              <AuctionDetails
                account={account}
                balance={balance}
                auctionsList={auctionsList}
                bidHistory={bidHistory}
                pendingRefund={pendingRefund}
                deployer={deployer}
                isLoadingContract={isLoadingContract}
                handleBid={handleBid}
                handleWithdraw={handleWithdraw}
                onSwitchAccount={handleSwitchAccount}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <Profile
                account={account}
                balance={balance}
                pendingRefund={pendingRefund}
                bidHistory={bidHistory}
                handleWithdraw={handleWithdraw}
                deployer={deployer}
                auctionsList={auctionsList}
                onSwitchAccount={handleSwitchAccount}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
              />
            }
          />
        </Routes>
      </main>
    </Router>
  );
}