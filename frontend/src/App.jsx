import React, { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { ethers } from "ethers";

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./utils/constants";
import { login, logout, getCurrentSession, getDirectSignerForUser } from "./utils/auth";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";

import ToastContainer from "./components/ToastContainer";
import MetaMaskSimulatorModal from "./components/MetaMaskSimulatorModal";

import { FileText, Compass, User, LogOut, Building, Shield } from "lucide-react";

import "./App.css";

const RPC_URL = "http://127.0.0.1:8545";

export default function App() {
  const [session, setSession] = useState(getCurrentSession());
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [balance, setBalance] = useState("0");
  const [deployer, setDeployer] = useState("");
  const [pendingRefund, setPendingRefund] = useState("0");
  const [tenderBidHistory, setTenderBidHistory] = useState([]);
  const [tendersList, setTendersList] = useState([]);
  const [featuredTender, setFeaturedTender] = useState(null);
  const [activeTenderId, setActiveTenderId] = useState(0);
  const [logContext, setLogContext] = useState("GLOBAL");
  const [toasts, setToasts] = useState([]);
  const [isLoadingContract, setIsLoadingContract] = useState(false);

  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simTxDetails, setSimTxDetails] = useState(null);
  const [simConfirmAction, setSimConfirmAction] = useState(null);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const activeTenderIdRef = useRef(0);
  useEffect(() => {
    activeTenderIdRef.current = activeTenderId;
  }, [activeTenderId]);

  const setActiveTender = useCallback((tenderId) => {
    const id = Number(tenderId);
    if (!Number.isFinite(id) || id < 0) return;
    activeTenderIdRef.current = id;
    setActiveTenderId(id);
  }, []);

  const logContextRef = useRef("GLOBAL");
  useEffect(() => {
    logContextRef.current = logContext;
  }, [logContext]);

  const globalHistoryRef = useRef([]);

  const toggleLogContext = useCallback((scope) => {
    const next = scope || (logContextRef.current === "GLOBAL" ? "TENDER" : "GLOBAL");
    logContextRef.current = next;
    setLogContext(next);
    setTenderBidHistory(() =>
      next === "GLOBAL"
        ? globalHistoryRef.current
        : globalHistoryRef.current.filter((h) => h.tenderId === activeTenderIdRef.current)
    );
  }, []);

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

  const getProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  const updateBalance = useCallback(async (userAddress) => {
    if (!userAddress) return;
    try {
      const provider = getProvider();
      const bal = await provider.getBalance(userAddress);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch (err) {
      console.warn("Balance fetch error:", err);
    }
  }, [getProvider]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingContract(true);
      const provider = getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const code = await provider.getCode(CONTRACT_ADDRESS).catch(() => "0x");
      if (code === "0x") {
        console.warn("No contract found at:", CONTRACT_ADDRESS);
        return;
      }

      const bDeployer = await contract.deployer().catch(() => "");
      if (bDeployer) setDeployer(bDeployer);

      const currentUser = sessionRef.current?.address;
      if (currentUser) {
        await updateBalance(currentUser);
        const refund = await contract.pendingReturns(currentUser).catch(() => 0n);
        setPendingRefund(parseFloat(ethers.formatEther(refund)).toFixed(4));
      }

      const all = await contract.getAllTenders().catch(() => []);
      let formatted = [];

      if (all && all.length > 0) {
        formatted = all.map((t) => {
          const statusNum = Number(t.status);
          const status = statusNum === 2 ? "AWARDED" : statusNum === 1 ? "EVALUATING" : "OPEN";
          const isOpen = status === "OPEN" && Date.now() / 1000 <= Number(t.closingTime);
          return {
            id: Number(t.id),
            referenceNo: t.referenceNo,
            title: t.title,
            description: t.description,
            category: t.category,
            department: t.department,
            documentUrl: t.documentUrl,
            authorityAddress: t.authorityAddress,
            estimatedValueWei: t.estimatedValueWei.toString(),
            emdAmountWei: t.emdAmountWei.toString(),
            estimatedValue: ethers.formatEther(t.estimatedValueWei),
            emdAmount: ethers.formatEther(t.emdAmountWei),
            lowestBidWei: t.lowestBidWei.toString(),
            lowestBid: ethers.formatEther(t.lowestBidWei),
            lowestBidderAddress: t.lowestBidderAddress,
            closingTime: Number(t.closingTime),
            status,
            isOpen,
            fundsClaimed: t.fundsClaimed
          };
        });
        setTendersList(formatted);
      } else {
        setTendersList([]);
      }

      const openTenders = formatted.filter((t) => t.status === "OPEN" && t.isOpen);
      const featured = openTenders.length > 0 ? openTenders[0] : formatted[0] || null;
      setFeaturedTender(featured);

      let activeTender = formatted.find((t) => t.id === activeTenderIdRef.current);
      if (!activeTender && formatted.length > 0) {
        activeTender = formatted[0];
        activeTenderIdRef.current = activeTender.id;
        setActiveTenderId(activeTender.id);
      }

      let globalHistory = [];
      try {
        const filter = contract.filters.TenderBidSubmitted();
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
            const tenderIdVal = e.args ? Number(e.args[0]) : 0;
            const refNo = e.args ? e.args[1] : "";
            const bidderAddr = e.args ? e.args[2] : "";
            const offerAmount = e.args ? e.args[3] : 0n;
            const emdAmount = e.args ? e.args[4] : 0n;
            const ts = blockTimes[e.blockNumber];
            return {
              id: e.transactionHash + "_" + e.index,
              tenderId: tenderIdVal,
              referenceNo: refNo,
              tenderTitle: formatted.find((ft) => ft.id === tenderIdVal)?.title || null,
              bidder: bidderAddr,
              offerAmount: ethers.formatEther(offerAmount),
              emdAmount: ethers.formatEther(emdAmount),
              time: ts ? new Date(ts * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
              txHash: e.transactionHash,
            };
          });
          globalHistory = parsed.reverse();
        }
      } catch (logErr) {
        console.warn("Audit Log sync warning:", logErr);
      }

      globalHistoryRef.current = globalHistory;
      setTenderBidHistory(() =>
        logContextRef.current === "GLOBAL"
          ? globalHistory
          : globalHistory.filter((h) => h.tenderId === activeTenderIdRef.current)
      );
    } catch (err) {
      console.error("Data sync error:", err);
    } finally {
      setIsLoadingContract(false);
    }
  }, [getProvider, updateBalance]);

  const refreshTenderState = useCallback(async (tenderId) => {
    try {
      const id = Number(tenderId);
      if (!Number.isFinite(id) || id < 0) return;
      const provider = getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const t = await contract.tenders(id);
      const nowSec = Date.now() / 1000;
      const endSec = Number(t.closingTime);
      const statusNum = Number(t.status);
      const status = statusNum === 2 ? "AWARDED" : statusNum === 1 ? "EVALUATING" : "OPEN";
      const patch = {
        lowestBid: ethers.formatEther(t.lowestBidWei),
        lowestBidderAddress: t.lowestBidderAddress,
        closingTime: endSec,
        status,
        isOpen: status === "OPEN" && nowSec <= endSec
      };
      setTendersList((prev) =>
        prev.some((x) => x.id === id) ? prev.map((x) => (x.id === id ? { ...x, ...patch } : x)) : prev
      );
    } catch (err) {
      console.warn("Tender state refresh warning:", err);
    }
  }, [getProvider]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const userSession = login(loginForm.username, loginForm.password);
      setSession(userSession);
      addToast({ type: "success", title: "Login Successful", message: `Welcome, ${userSession.name}` });
    } catch (err) {
      setLoginError(err.message || "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logout();
    setSession(null);
    addToast({ type: "info", title: "Logged Out", message: "Session terminated" });
  };

  const promptMetaMaskSim = (details, confirmCallback) => {
    const activeUser = sessionRef.current?.address;
    setSimTxDetails({ fromAddress: activeUser, type: details?.type || "Contract Interaction", amount: details?.amount || "0" });
    setSimConfirmAction(() => confirmCallback);
    setSimModalOpen(true);
  };

  const handleSubmitTenderOffer = async (tenderId, offerAmount) => {
    const numericOffer = parseFloat(offerAmount);
    const tender = (tendersList || []).find((t) => t.id === Number(tenderId));
    const currentUser = sessionRef.current;
    if (!currentUser) {
      addToast({ type: "error", title: "Authentication Required", message: "Please login to submit tender offer" });
      return;
    }
    if (currentUser.role !== "CONTRACTOR") {
      addToast({ type: "error", title: "Access Denied", message: "Only registered contractors can submit bids" });
      return;
    }
    if (!tender) return;
    if (tender.status !== "OPEN" || !tender.isOpen) {
      addToast({ type: "error", title: "Tender Closed", message: "This tender is no longer accepting bids" });
      return;
    }
    if (tender.authorityAddress && tender.authorityAddress.toLowerCase() === currentUser.address.toLowerCase()) {
      addToast({ type: "error", title: "Rejected", message: "Authority cannot bid on their own tender" });
      return;
    }
    const emdAmount = parseFloat(tender.emdAmount || "0");
    const totalAmount = numericOffer + emdAmount;
    const numericBalance = parseFloat(balance || "0");
    if (numericBalance < totalAmount) {
      addToast({ type: "error", title: "Insufficient Balance", message: `Insufficient ETH balance. Need ${totalAmount.toFixed(4)} ETH (Offer + EMD)` });
      return;
    }
    promptMetaMaskSim({ type: "Submit Tender Offer", amount: totalAmount.toFixed(4) }, async () => {
      try {
        const provider = getProvider();
        const signer = getDirectSignerForUser(sessionRef.current, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const bidValue = ethers.parseEther(totalAmount.toString());
        const tx = await contract["submitBid(uint256)"](BigInt(Number(tenderId)), { value: bidValue, gasLimit: 500000 });
        const receipt = await tx.wait();
        addToast({ type: "success", title: "Tender Offer Submitted!", message: `Offer submitted for tender #${tenderId}`, txHash: receipt.hash });
        await refreshTenderState(tenderId);
        await fetchData();
        await updateBalance(sessionRef.current.address);
      } catch (err) {
        console.error("Tender bid error:", err);
        addToast({ type: "error", title: "Submission Failed", message: extractErrorMessage(err) });
      }
    });
  };

  const handleClaimEmdRefund = async () => {
    const currentUser = sessionRef.current;
    if (!currentUser) return;
    promptMetaMaskSim({ type: "Claim EMD Refund", amount: pendingRefund }, async () => {
      try {
        const provider = getProvider();
        const signer = getDirectSignerForUser(sessionRef.current, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const tx = await contract.claimEmdRefund({ gasLimit: 200000 });
        const receipt = await tx.wait();
        addToast({ type: "success", title: "EMD Refund Claimed!", message: "Funds returned to wallet", txHash: receipt.hash });
        await fetchData();
        await updateBalance(sessionRef.current.address);
      } catch (err) {
        console.error("Refund error:", err);
        addToast({ type: "error", title: "Claim Failed", message: extractErrorMessage(err) });
      }
    });
  };

  useEffect(() => {
    if (session) {
      fetchData();
      const provider = getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const onBidSubmitted = (...args) => {
        const tenderId = args[0];
        if (tenderId !== undefined) refreshTenderState(Number(tenderId));
        fetchData();
      };
      contract.on("TenderBidSubmitted", onBidSubmitted);
      return () => { contract.off("TenderBidSubmitted", onBidSubmitted); };
    }
  }, [fetchData, getProvider, refreshTenderState, session]);

  if (!session) {
    return (
      <div className="login-container">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="login-card">
          <div className="login-header">
            <Building size={48} color="#f59e0b" />
            <h1>e-Tender India</h1>
            <p>Official Government e-Procurement & e-Tendering Portal</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} required />
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="btn-primary" disabled={isLoggingIn}>
              {isLoggingIn ? "Authenticating..." : "Login"}
            </button>
          </form>
          <div className="login-demo">
            <p><strong>Demo Credentials:</strong></p>
            <small>Authority: cpwd.nodal / govt123 or nhai.officer / nhai456</small><br/>
            <small>Contractor: sharma.contractors / vendor123 or gupta.builders / build456</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <MetaMaskSimulatorModal isOpen={simModalOpen} onClose={() => setSimModalOpen(false)} onConfirm={simConfirmAction} txDetails={simTxDetails} />
      <header className="navbar-wrapper">
        <nav className="navbar">
          <NavLink to="/" className="brand">
            <Building size={26} color="#f59e0b" />
            <span>e-Tender India <small className="brand-badge">Govt. Portal</small></span>
          </NavLink>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}><FileText size={16} /> Live Procurement Console</NavLink>
            <NavLink to="/explore" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}><Compass size={16} /> Active Tenders</NavLink>
            <NavLink to="/profile" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}><User size={16} /> {session.role === "AUTHORITY" ? "Authority Dashboard" : "Contractor Dashboard"}</NavLink>
          </div>
          <div className="navbar-right">
            <div className="wallet-badge-group">
              <span className={"user-role-pill " + (session.role === "AUTHORITY" ? "role-authority" : "role-contractor")}>
                {session.role === "AUTHORITY" ? <Shield size={12} /> : <User size={12} />}
                {session.role}
              </span>
              <span className="wallet-balance">{parseFloat(balance || "0").toFixed(4)} ETH</span>
            </div>
            <button className="btn-wallet connected" title={session.name}>
              {session.role === "AUTHORITY" ? session.department : session.vendorId}
            </button>
            <button className="btn-logout" onClick={handleLogout} title="Logout"><LogOut size={16} /></button>
          </div>
        </nav>
      </header>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home session={session} balance={balance} tendersList={tendersList} featuredTender={featuredTender} activeTenderId={activeTenderId} onSelectActiveTender={setActiveTender} tenderBidHistory={tenderBidHistory} logContext={logContext} onToggleLogContext={toggleLogContext} isLoadingContract={isLoadingContract} handleSubmitTenderOffer={handleSubmitTenderOffer} pendingRefund={pendingRefund} handleClaimEmdRefund={handleClaimEmdRefund} />} />
          <Route path="/explore" element={<Explore session={session} tendersList={tendersList} activeTenderId={activeTenderId} onSelectActiveTender={setActiveTender} />} />
          <Route path="/profile" element={<Profile session={session} tendersList={tendersList} tenderBidHistory={tenderBidHistory} pendingRefund={pendingRefund} handleClaimEmdRefund={handleClaimEmdRefund} balance={balance} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}
