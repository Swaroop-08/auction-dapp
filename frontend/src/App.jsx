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

  /* -------------------------------------------------------
     DEFAULT ACCOUNT
     ------------------------------------------------------- */

  const defaultBidder =
    HARDHAT_ACCOUNTS[1]?.address ||
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";


  /* -------------------------------------------------------
     STATE
     ------------------------------------------------------- */

  const [account, setAccount] =
    useState(defaultBidder);

  const [balance, setBalance] =
    useState("0");

  const [highestBid, setHighestBid] =
    useState("0");

  const [highestBidder, setHighestBidder] =
    useState("No bids yet");

  const [deployer, setDeployer] =
    useState(
      HARDHAT_ACCOUNTS[0]?.address ||
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );

  const [endTime, setEndTime] =
    useState(null);

  const [pendingRefund, setPendingRefund] =
    useState("0");

  const [bidHistory, setBidHistory] =
    useState([]);

  const [auctionsList, setAuctionsList] =
    useState([]);

  const [toasts, setToasts] =
    useState([]);

  const [isLoadingContract, setIsLoadingContract] =
    useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  /* Virtual Wallet / Transaction Confirmation UI */

  const [simModalOpen, setSimModalOpen] =
    useState(false);

  const [simTxDetails, setSimTxDetails] =
    useState(null);

  const [simConfirmAction, setSimConfirmAction] =
    useState(null);


  /* -------------------------------------------------------
     ACCOUNT REF

     Keeps the latest selected virtual wallet available
     inside callbacks and async functions.
     ------------------------------------------------------- */

  const accountRef =
    useRef(account);

  useEffect(() => {
    accountRef.current = account;
  }, [account]);


  /* =========================================================
     TOAST FUNCTIONS
     ========================================================= */

  const addToast = useCallback((toast) => {

    const id =
      Date.now() +
      Math.random().toString();

    const newToast = {
      id,
      ...toast,
    };

    setToasts((prev) => [
      newToast,
      ...prev,
    ]);

    if (toast.type !== "pending") {

      setTimeout(() => {

        setToasts((prev) =>
          prev.filter(
            (t) => t.id !== id
          )
        );

      }, 5500);
    }

    return id;

  }, []);


  const removeToast = useCallback(
    (id) => {

      setToasts((prev) =>
        prev.filter(
          (t) => t.id !== id
        )
      );

    },
    []
  );


  /* =========================================================
     ERROR MESSAGE HELPER
     ========================================================= */

  const extractErrorMessage = (err) => {

    if (!err) {
      return "Transaction failed.";
    }

    if (typeof err === "string") {
      return err;
    }

    if (err.info?.error?.message) {
      return err.info.error.message;
    }

    if (err.error?.message) {
      return err.error.message;
    }

    if (err.reason) {
      return err.reason;
    }

    if (err.shortMessage) {
      return err.shortMessage;
    }

    if (err.message) {
      return err.message;
    }

    return "Transaction reverted on-chain.";
  };


  /* =========================================================
     PROVIDER
     ========================================================= */

  const getProvider = useCallback(() => {

    return new ethers.JsonRpcProvider(
      RPC_URL
    );

  }, []);


  /* =========================================================
     VIRTUAL WALLET SIGNER
     =========================================================

     We are NOT using MetaMask.

     getDirectSigner() now lives in utils/accounts.js
     (single source of truth: HARDHAT_ACCOUNTS).
     It builds an ethers.Wallet from the selected
     virtual account's private key and verifies that
     the derived address matches the configured one.
     ========================================================= */

  /* -------------------------------------------------------
     PRE-SEND SIGNER SANITY CHECK (Phase 1)

     Before ANY transaction we verify:
       1. signer exists
       2. signer.provider exists (http://127.0.0.1:8545)
       3. signer.getAddress() matches the selected
          virtual wallet from HARDHAT_ACCOUNTS
     ------------------------------------------------------- */

  const assertSignerReady = async (signer) => {

    if (!signer) {

      throw new Error(
        "No virtual wallet signer available. Select an account first."
      );
    }

    if (!signer.provider) {

      throw new Error(
        "Virtual wallet signer has no RPC provider (expected http://127.0.0.1:8545)."
      );
    }

    const signerAddress =
      await signer.getAddress();

    const expected =
      (accountRef.current || "").toLowerCase();

    if (
      !expected ||
      signerAddress.toLowerCase() !==
        expected
    ) {

      throw new Error(
        `Signer address ${signerAddress} does not match the selected virtual wallet ${expected || "(none)"}.`
      );
    }

    return signerAddress;
  };


  /* =========================================================
     UPDATE BALANCE
     ========================================================= */

  const updateBalance =
    useCallback(
      async (userAddress) => {

        if (!userAddress) {
          return;
        }

        try {

          const provider =
            getProvider();

          const bal =
            await provider.getBalance(
              userAddress
            );

          setBalance(
            ethers.formatEther(bal)
          );

        } catch (err) {

          console.warn(
            "Balance fetch error:",
            err
          );
        }
      },
      [getProvider]
    );


  /* =========================================================
     FETCH CONTRACT DATA
     ========================================================= */

  const fetchData =
    useCallback(
      async () => {

        try {

          setIsLoadingContract(true);

          const provider =
            getProvider();

          const contract =
            new ethers.Contract(
              CONTRACT_ADDRESS,
              CONTRACT_ABI,
              provider
            );


          /* -------------------------------------------------
             Check contract exists
             ------------------------------------------------- */

          const code =
            await provider
              .getCode(
                CONTRACT_ADDRESS
              )
              .catch(() => "0x");


          if (code === "0x") {

            console.warn(
              "No contract found at:",
              CONTRACT_ADDRESS
            );

            return;
          }


          /* -------------------------------------------------
             Read main auction information
             ------------------------------------------------- */

          const [
            topBidder,
            topBid,
            bEnd,
            bDeployer,
          ] =
            await Promise.all([

              contract
                .highestBidder()
                .catch(
                  () =>
                    ethers.ZeroAddress
                ),

              contract
                .highestBid()
                .catch(
                  () => 0n
                ),

              contract
                .auctionEndTime()
                .catch(
                  () => null
                ),

              contract
                .deployer()
                .catch(
                  () =>
                    HARDHAT_ACCOUNTS[0]
                      ?.address
                ),
            ]);


          /* -------------------------------------------------
             Highest Bid
             ------------------------------------------------- */

          if (
            topBidder &&
            topBidder !==
              ethers.ZeroAddress
          ) {

            setHighestBidder(
              topBidder
            );

            setHighestBid(
              ethers.formatEther(
                topBid
              )
            );

          } else {

            setHighestBidder(
              "No bids yet"
            );

            setHighestBid("0");
          }


          /* -------------------------------------------------
             Auction End Time
             ------------------------------------------------- */

          if (bEnd) {

            setEndTime(
              Number(bEnd)
            );
          }


          /* -------------------------------------------------
             Deployer
             ------------------------------------------------- */

          if (bDeployer) {

            setDeployer(
              bDeployer
            );
          }


          /* -------------------------------------------------
             Current Virtual Wallet
             ------------------------------------------------- */

          const currentUser =
            accountRef.current;

          if (currentUser) {

            await updateBalance(
              currentUser
            );


            const refund =
              await contract
                .pendingReturns(
                  currentUser
                )
                .catch(
                  () => 0n
                );


            setPendingRefund(
              ethers.formatEther(
                refund
              )
            );
          }


          /* -------------------------------------------------
             ALL AUCTIONS
             ------------------------------------------------- */

          const all =
            await contract
              .getAllAuctions()
              .catch(
                () => []
              );


          /* -------------------------------------------------
             ALL AUCTIONS — the ONLY source for Explore
             and AuctionDetails. If the chain returns none
             (fresh node), the list is cleared so no stale
             or mock auctions can ever be rendered.
             ------------------------------------------------- */

          /* Hoisted so the bid-audit mapping below can
             resolve auction titles for every event
             (previously block-scoped => ReferenceError
             swallowed => bid history never updated) */

          let formatted = [];

          if (
            all &&
            all.length > 0
          ) {

            formatted =
              all.map((a) => ({

                id:
                  Number(a.id),

                title:
                  a.title,

                description:
                  a.description,

                category:
                  a.category,

                imageUrl:
                  a.imageUrl,

                seller:
                  a.seller,

                startingPrice:
                  ethers.formatEther(
                    a.startingPrice
                  ),

                highestBid:
                  ethers.formatEther(
                    a.highestBid
                  ),

                highestBidder:
                  a.highestBidder,

                auctionEndTime:
                  Number(
                    a.auctionEndTime
                  ),

                ended:
                  a.ended,

                status:
                  a.ended
                    ? "ENDED"
                    : Date.now() /
                        1000 >
                      Number(
                        a.auctionEndTime
                      )
                    ? "ENDED"
                    : "ACTIVE",

                isLive:
                  !a.ended &&
                  Date.now() /
                    1000 <=
                    Number(
                      a.auctionEndTime
                    ),
              }));

            setAuctionsList(formatted);

          } else {

            setAuctionsList([]);
          }


          /* -------------------------------------------------
             BID AUDIT HISTORY
             ------------------------------------------------- */

          try {

            const filter =
              contract.filters.HighestBidIncreased();

            const events =
              await contract.queryFilter(
                filter,
                0,
                "latest"
              );


            if (
              events &&
              events.length > 0
            ) {

              /* Resolve REAL block timestamps for each
                 bid event (no client-clock guessing) */

              const blockTimes = {};

              for (const e of events) {

                if (
                  blockTimes[e.blockNumber] ===
                  undefined
                ) {

                  const block =
                    await provider
                      .getBlock(
                        e.blockNumber
                      )
                      .catch(() => null);

                  blockTimes[
                    e.blockNumber
                  ] = block
                    ? block.timestamp
                    : null;
                }
              }

              const parsed =
                events.map((e) => {

                  const bidderAddr =
                    e.args[1] ||
                    e.args.bidder;

                  const amountWei =
                    e.args[2] ||
                    e.args.amount;

                  const ts =
                    blockTimes[
                      e.blockNumber
                    ];

                  return {

                    id:
                      e.transactionHash +
                      e.index,

                    /* auctionId is topic[0] of
                       HighestBidIncreased — used to
                       filter per-auction history */

                    auctionId:
                      Number(
                        e.args[0]
                      ),

                    /* Resolve the auction title for
                       Profile / Auction pages */

                    auctionTitle:
                      (formatted || []).find(
                        (fa) =>
                          fa.id ===
                          Number(e.args[0])
                      )?.title ||
                      null,

                    bidder:
                      bidderAddr,

                    amount:
                      ethers.formatEther(
                        amountWei
                      ),

                    time:
                      ts
                        ? new Date(
                            ts * 1000
                          ).toLocaleTimeString(
                            [],
                            {
                              hour:
                                "2-digit",
                              minute:
                                "2-digit",
                              second:
                                "2-digit",
                            }
                          )
                        : "—",

                    txHash:
                      e.transactionHash,
                  };
                });


              setBidHistory(
                parsed.reverse()
              );

            } else {

              setBidHistory([]);
            }

          } catch (logErr) {

            console.warn(
              "Audit Log sync warning:",
              logErr
            );
          }

        } catch (err) {

          console.error(
            "Data sync error:",
            err
          );

        } finally {

          setIsLoadingContract(false);
        }

      },
      [
        getProvider,
        updateBalance,
      ]
    );


  /* =========================================================
     SWITCH VIRTUAL WALLET
     ========================================================= */

  const handleSwitchAccount =
    async (targetAddress) => {

      try {

        /* Make sure selected address exists */

        const selectedAccount =
          HARDHAT_ACCOUNTS.find(
            (acc) =>
              acc.address.toLowerCase() ===
              targetAddress.toLowerCase()
          );


        if (!selectedAccount) {

          addToast({
            type: "error",
            title: "Wallet Error",
            message:
              "Virtual wallet account not found.",
          });

          return;
        }


        /* Update selected account */

        setAccount(
          targetAddress
        );

        accountRef.current =
          targetAddress;


        /* Update ETH balance */

        await updateBalance(
          targetAddress
        );


        /* Update pending refund */

        const provider =
          getProvider();

        const contract =
          new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            provider
          );


        const refund =
          await contract
            .pendingReturns(
              targetAddress
            )
            .catch(
              () => 0n
            );


        setPendingRefund(
          ethers.formatEther(
            refund
          )
        );

      } catch (err) {

        console.error(
          "Switch account error:",
          err
        );

        addToast({
          type: "error",
          title: "Wallet Switch Failed",
          message:
            extractErrorMessage(err),
        });
      }
    };


  /* =========================================================
     OPEN VIRTUAL WALLET CONFIRMATION
     ========================================================= */

  const promptMetaMaskSim = (
    details,
    confirmCallback
  ) => {

    const activeUser =
      accountRef.current ||
      account ||
      defaultBidder;


    setSimTxDetails({

      fromAddress:
        activeUser,

      type:
        details?.type ||
        "Contract Interaction",

      amount:
        details?.amount ||
        "0",
    });


    setSimConfirmAction(
      () => confirmCallback
    );


    setSimModalOpen(true);
  };


  /* =========================================================
     PLACE BID
     =========================================================

     handleBid(auctionId, amount) bids on a SPECIFIC
     auction via contract.bid(uint256). The single-
     auction contract["bid()"] fallback is no longer
     used, so Explore auctions open on the right item.
     ========================================================= */

  const handleBid =
    async (auctionId, amount) => {

      const numericAmount =
        parseFloat(amount);

      const auction =
        (auctionsList || []).find(
          (a) => a.id === Number(auctionId)
        );

      const currentHigh =
        auction
          ? parseFloat(
              auction.highestBid || "0"
            )
          : 0;

      const seller =
        auction
          ? auction.seller
          : deployer;

      const activeAccount =
        accountRef.current ||
        account;


      /* -------------------------------------------------
         Validate amount
         ------------------------------------------------- */

      if (
        isNaN(numericAmount) ||
        numericAmount <= 0
      ) {

        addToast({
          type: "error",
          title: "Invalid Amount",
          message:
            "Enter a valid ETH amount.",
        });

        return;
      }


      /* -------------------------------------------------
         Auction must exist and still be live
         ------------------------------------------------- */

      if (
        auction &&
        (auction.ended ||
          !auction.isLive)
      ) {

        addToast({
          type: "error",
          title: "Auction Ended",
          message:
            "Bid Failed: This auction has already ended.",
        });

        return;
      }


      /* -------------------------------------------------
         Seller cannot bid
         ------------------------------------------------- */

      if (
        activeAccount &&
        seller &&
        activeAccount.toLowerCase() ===
          seller.toLowerCase()
      ) {

        addToast({
          type: "error",
          title: "Rejected",
          message:
            "Seller cannot bid on their own auction!",
        });

        return;
      }


      /* -------------------------------------------------
         Bid must be higher
         ------------------------------------------------- */

      if (
        currentHigh > 0 &&
        numericAmount <=
          currentHigh
      ) {

        addToast({
          type: "error",
          title: "Bid Too Low",
          message:
            "Bid Failed: Your bid must be higher than the current highest bid.",
        });

        return;
      }


      /* -------------------------------------------------
         Insufficient balance check
         ------------------------------------------------- */

      const numericBalance =
        parseFloat(balance || "0");

      if (
        numericBalance <
        numericAmount
      ) {

        addToast({
          type: "error",
          title: "Insufficient Balance",
          message:
            "Bid Failed: Insufficient ETH balance.",
        });

        return;
      }


      /* -------------------------------------------------
         Open Virtual Wallet confirmation
         ------------------------------------------------- */

      promptMetaMaskSim(
        {
          type:
            "Submit Auction Bid",

          amount:
            amount,
        },

        async () => {

          try {

            /* Get selected virtual wallet */

            const signer =
              getDirectSigner(
                accountRef.current,
                getProvider()
              );

            /* Pre-send sanity checks: signer exists,
               has an RPC provider, and its address
               matches the selected virtual wallet */

            await assertSignerReady(
              signer
            );


            console.log(
              "Bid signer:",
              signer.address
            );


            /* Create contract instance */

            const contract =
              new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                signer
              );


            /* Convert ETH to Wei (validated) */

            let bidValue;

            try {

              bidValue =
                ethers.parseEther(
                  amount.toString()
                );

            } catch (formatErr) {

              addToast({
                type: "error",
                title: "Invalid Amount",
                message:
                  "Enter a valid ETH amount (e.g. 0.75).",
              });

              return;
            }


            /* Send transaction to the
               SPECIFIC auction */

            const tx =
              await contract["bid(uint256)"]( 
                BigInt(
                  Number(auctionId)
                ),
                {
                  value:
                    bidValue,

                  gasLimit:
                    300000,
                }
              );


            console.log(
              "Bid transaction:",
              tx.hash
            );


            /* Wait for mining */

            const receipt =
              await tx.wait();


            /* Success */

            addToast({
              type: "success",

              title:
                "Confirmed!",

              message:
                `Bid of ${amount} ETH placed on auction #${auctionId}!`,

              txHash:
                receipt.hash,
            });


            /* Refresh data */

            await fetchData();
            await updateBalance(
              accountRef.current
            );

          } catch (err) {

            console.error(
              "Bid transaction error:",
              err
            );


            addToast({
              type: "error",

              title:
                "Bid Failed",

              message:
                describeBidError(
                  err,
                  accountRef.current
                ),
            });
          }
        }
      );
    };


  /* =========================================================
     WITHDRAW REFUND
     ========================================================= */

  const handleWithdraw =
    async () => {

      promptMetaMaskSim(
        {
          type:
            "Claim Refund",

          amount:
            pendingRefund,
        },

        async () => {

          try {

            const signer =
              getDirectSigner(
                accountRef.current,
                getProvider()
              );

            /* Pre-send sanity checks: signer exists,
               has an RPC provider, and its address
               matches the selected virtual wallet */

            await assertSignerReady(
              signer
            );


            console.log(
              "Withdraw signer:",
              signer.address
            );


            const contract =
              new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                signer
              );


            const tx =
              await contract.withdraw({
                gasLimit:
                  200000,
              });


            const receipt =
              await tx.wait();


            addToast({
              type: "success",

              title:
                "Refund Claimed!",

              message:
                "ETH returned to wallet!",

              txHash:
                receipt.hash,
            });


            await fetchData();

            await updateBalance(
              accountRef.current
            );

          } catch (err) {

            console.error(
              "Withdraw transaction error:",
              err
            );


            addToast({
              type: "error",

              title:
                "Claim Failed",

              message:
                extractErrorMessage(
                  err
                ),
            });
          }
        }
      );
    };


  /* =========================================================
     CREATE AUCTION
     ========================================================= */

  const handleCreateAuction =
    async (newAuctionData) => {

      promptMetaMaskSim(
        {
          type:
            "Publish Auction",

          amount:
            newAuctionData.startingPrice ||
            "0.1",
        },

        async () => {

          try {

            /* Get virtual wallet signer */

            const signer =
              getDirectSigner(
                accountRef.current,
                getProvider()
              );

            /* Pre-send sanity checks: signer exists,
               has an RPC provider, and its address
               matches the selected virtual wallet */

            await assertSignerReady(
              signer
            );


            console.log(
              "Create auction signer:",
              signer.address
            );


            /* Contract */

            const contract =
              new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                signer
              );


            /* Create auction */

            const tx =
              await contract.createAuction(

                String(
                  newAuctionData.title ||
                    "Untitled"
                ),

                String(
                  newAuctionData.description ||
                    ""
                ),

                String(
                  newAuctionData.category ||
                    "General"
                ),

                String(
                  newAuctionData.imageUrl ||
                    ""
                ),

                ethers.parseEther(
                  (
                    newAuctionData.startingPrice ||
                    "0.1"
                  ).toString()
                ),

                BigInt(
                  Math.floor(
                    Number(
                      newAuctionData.durationSeconds ||
                        86400
                    )
                  )
                ),

                {
                  gasLimit:
                    500000,
                }
              );


            const receipt =
              await tx.wait();


            /* Resolve the REAL on-chain auction ID
               from the AuctionCreated event emitted
               in this transaction's receipt */

            let newAuctionId = null;

            for (const log of receipt.logs) {

              try {

                const parsedLog =
                  contract.interface.parseLog(
                    log
                  );

                if (
                  parsedLog &&
                  parsedLog.name ===
                    "AuctionCreated"
                ) {

                  newAuctionId =
                    Number(
                      parsedLog.args.auctionId
                    );

                  break;
                }

              } catch {

                /* unrelated log entry */
              }
            }


            addToast({
              type: "success",

              title:
                "Auction Created!",

              message:
                newAuctionId !== null
                  ? `Auction #${newAuctionId} is now live in Explore.`
                  : "Transaction confirmed.",

              txHash:
                receipt.hash,
            });


            setIsCreateModalOpen(
              false
            );


            await fetchData();

          } catch (err) {

            console.error(
              "Create auction error:",
              err
            );


            addToast({
              type: "error",

              title:
                "Creation Failed",

              message:
                extractErrorMessage(
                  err
                ),
            });
          }
        }
      );
    };


  /* =========================================================
     INITIAL LOAD + EVENT LISTENER
     ========================================================= */

  useEffect(() => {

    fetchData();


    const provider =
      getProvider();


    const contract =
      new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );


    const onBidIncreased =
      () => {

        fetchData();
      };


    contract.on(
      "HighestBidIncreased",
      onBidIncreased
    );


    return () => {

      contract.off(
        "HighestBidIncreased",
        onBidIncreased
      );

    };

  }, [
    fetchData,
    getProvider,
  ]);


  /* =========================================================
     CURRENT VIRTUAL ACCOUNT DETAILS
     ========================================================= */

  const currentAccountDetails =
    getAccountDetails(
      account,
      deployer
    );


  /* =========================================================
     UI
     ========================================================= */

  return (
    <Router>

      {/* -----------------------------------------------------
          TOASTS
          ----------------------------------------------------- */}

      <ToastContainer
        toasts={toasts}
        removeToast={removeToast}
      />


      {/* -----------------------------------------------------
          VIRTUAL WALLET CONFIRMATION MODAL

          Despite the old component name
          "MetaMaskSimulatorModal", this is only
          a simulated confirmation UI.

          It does NOT connect to MetaMask.
          ----------------------------------------------------- */}

      <MetaMaskSimulatorModal

        isOpen={
          simModalOpen
        }

        onClose={() =>
          setSimModalOpen(false)
        }

        onConfirm={
          simConfirmAction
        }

        txDetails={
          simTxDetails
        }
      />


      {/* -----------------------------------------------------
          CREATE AUCTION MODAL
          ----------------------------------------------------- */}

      <CreateAuctionModal

        isOpen={
          isCreateModalOpen
        }

        onClose={() =>
          setIsCreateModalOpen(
            false
          )
        }

        onCreateAuction={
          handleCreateAuction
        }
      />


      {/* =====================================================
          NAVBAR
          ===================================================== */}

      <header className="navbar-wrapper">

        <nav className="navbar">

          {/* Brand */}

          <NavLink
            to="/"
            className="brand"
          >

            <Layers
              size={26}
              color="#6366f1"
            />

            <span>

              AuctionX{" "}

              <small className="brand-badge">
                Simulated
              </small>

            </span>

          </NavLink>


          {/* Navigation */}

          <div className="nav-links">

            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              Live Auction
            </NavLink>


            <NavLink
              to="/explore"
              className={({ isActive }) =>
                isActive
                  ? "nav-link active"
                  : "nav-link"
              }
            >

              <Compass size={16} />

              Explore

            </NavLink>


            <NavLink
              to="/profile"
              className={({ isActive }) =>
                isActive
                  ? "nav-link active"
                  : "nav-link"
              }
            >

              <User size={16} />

              Portfolio

            </NavLink>

          </div>


          {/* Right side */}

          <div className="navbar-right">

            {/* Create Auction */}

            {currentAccountDetails.isDeployer && (

              <button
                className="btn-primary"

                style={{
                  padding:
                    "0.45rem 0.85rem",

                  fontSize:
                    "0.82rem",
                }}

                onClick={() =>
                  setIsCreateModalOpen(
                    true
                  )
                }
              >

                <PlusCircle
                  size={15}
                />

                + Add Auction

              </button>

            )}


            {/* Wallet Balance */}

            <div className="wallet-badge-group">

              <span
                className={
                  "user-role-pill " +
                  (
                    currentAccountDetails.isDeployer
                      ? "role-deployer"
                      : "role-bidder"
                  )
                }
              >

                {
                  currentAccountDetails.badge
                }

              </span>


              <span className="wallet-balance">

                {
                  parseFloat(
                    balance
                  ).toFixed(3)
                }{" "}

                ETH

              </span>

            </div>


            {/* Virtual Wallet */}

            <button
              className="btn-wallet connected"
              title="Virtual Local Wallet"
            >

              <Wallet
                size={16}
              />

              {
                currentAccountDetails.short
              }

            </button>

          </div>

        </nav>

      </header>


      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main className="main-content">

        <Routes>

          {/* -------------------------------------------------
              HOME
              ------------------------------------------------- */}

          <Route
            path="/"

            element={

              <Home

                account={
                  account
                }

                balance={
                  balance
                }

                highestBid={
                  highestBid
                }

                highestBidder={
                  highestBidder
                }

                pendingRefund={
                  pendingRefund
                }

                bidHistory={
                  bidHistory
                }

                endTime={
                  endTime
                }

                isLoadingContract={
                  isLoadingContract
                }

                handleBid={
                  handleBid
                }

                handleWithdraw={
                  handleWithdraw
                }

                onSwitchAccount={
                  handleSwitchAccount
                }

                deployer={
                  deployer
                }

              />

            }
          />


          {/* -------------------------------------------------
              EXPLORE
              ------------------------------------------------- */}

          <Route
            path="/explore"

            element={

              <Explore

                highestBid={
                  highestBid
                }

                endTime={
                  endTime
                }

                auctionsList={
                  auctionsList
                }

                isDeployer={
                  currentAccountDetails.isDeployer
                }

                onOpenCreateModal={() =>
                  setIsCreateModalOpen(
                    true
                  )
                }

              />

            }
          />


          {/* -------------------------------------------------
              AUCTION DETAILS  /auction/:auctionId
              ------------------------------------------------- */}

          <Route
            path="/auction/:auctionId"

            element={

              <AuctionDetails

                account={
                  account
                }

                balance={
                  balance
                }

                auctionsList={
                  auctionsList
                }

                bidHistory={
                  bidHistory
                }

                pendingRefund={
                  pendingRefund
                }

                deployer={
                  deployer
                }

                isLoadingContract={
                  isLoadingContract
                }

                handleBid={
                  handleBid
                }

                handleWithdraw={
                  handleWithdraw
                }

                onSwitchAccount={
                  handleSwitchAccount
                }

              />

            }
          />


          {/* -------------------------------------------------
              PROFILE
              ------------------------------------------------- */}

          <Route
            path="/profile"

            element={

              <Profile

                account={
                  account
                }

                balance={
                  balance
                }

                pendingRefund={
                  pendingRefund
                }

                bidHistory={
                  bidHistory
                }

                handleWithdraw={
                  handleWithdraw
                }

                deployer={
                  deployer
                }

                auctionsList={
                  auctionsList
                }

                onOpenCreateModal={() =>
                  setIsCreateModalOpen(
                    true
                  )
                }

              />

            }
          />

        </Routes>

      </main>

    </Router>
  );
}