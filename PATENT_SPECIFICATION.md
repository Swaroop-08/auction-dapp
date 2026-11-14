# PATENT SPECIFICATION (DRAFT FOR PROFESSIONAL REVIEW)

**e-Tender India — Blockchain-Based Reverse-Auction Procurement System with Cumulative Displacement Refund Accounting**

> **Status of this document.** This is a corrected drafting base prepared from the actual source code in this repository, not from prior prose. Every statement about implemented behaviour was checked against `contracts/TenderVault.sol`, `frontend/src/App.jsx`, `frontend/src/utils/*` and `frontend/src/pages/*`. Where a feature is described but **not** implemented in the present build, it is explicitly labelled **[PROSPECTIVE]** and is not asserted as built. Section 13 records exactly what was verified and how. A registered Indian patent agent must review this before filing.

---

## 1. Administrative particulars (to be completed by the applicant)

**Applicant(s)** — full name, nationality, address, e-mail, telephone: _to be completed_.

**Inventor(s)** — full name including middle name, nationality, address, e-mail, telephone: _to be completed_.

**Signatures** — clear soft copy of the signature of each inventor, in a table with one row per inventor: _to be completed_.

**Declaration and filing forms** — Form 1 (application), Form 2 (provisional or complete specification), Form 3 (statement and undertaking as to foreign applications, if applicable), Form 5 (declaration of inventorship), and proof of right to apply, are to be executed by the applicant or the authorised agent.

**Priority / related applications** — none claimed at the date of this draft.

---

## 2. Title of the invention

**A Blockchain-Based Reverse-Auction Procurement System with Cumulative Bidder-Keyed Escrow Refund Accounting and Event-Derived Audit State**

*Drafting note on the title.* The earlier working title referred to a "Decentralized Ethereum Auction System". That title was inaccurate in two respects: the implemented subject matter is a **tendering/procurement** system operating a **reverse** auction, not a conventional ascending auction; and naming a single proprietary network narrows the disclosure unnecessarily. The title above corresponds to independent claim 1 and to the abstract. A shorter alternative acceptable to some agents is: *"Blockchain-Based Reverse-Auction Tendering System with Cumulative Escrow Refund Settlement."*

---

## 3. Technical field of the invention

The invention relates to computer-implemented procurement systems and to distributed-ledger (blockchain) data processing. In particular it relates to a reverse-auction tendering system in which tender records, payable bid values, a current lowest bidder, and refund entitlements arising from displacement of a previous lowest bidder are maintained as state of a smart contract deployed on an Ethereum Virtual Machine (EVM) compatible network, and in which a browser-based application derives its tender and audit views from contract events.

The described implementation uses a Solidity smart contract, a Hardhat development network, a React and Vite browser application, the ethers.js library, and React Router. These are the technologies of the demonstrated build and are not limiting on the claimed subject matter, which is directed to the data-processing arrangement irrespective of the particular ledger client, user-interface framework or development network used.

---

## 4. Background of the invention

Electronic tendering portals allow a procuring authority to publish a requirement, receive contractor bids, evaluate them and publish an award. In the conventional arrangement the tender record, the sequence of received bids, and the administration of the earnest money deposit (EMD) are all held in a database operated by the portal operator or the procuring organisation. The operator's database and the operator's administrative discretion are therefore the trust anchor for the process.

That arrangement gives rise to several difficulties. A bidder cannot independently verify that its bid was recorded at the time it was submitted, nor that the recorded bid history was not subsequently altered. Where the portal is unavailable, the procurement can be interrupted. Deposit administration, including the identification and return of amounts held in respect of displaced or unsuccessful bidders, is commonly a manual reconciliation exercise, which extends lead times and imposes administrative load on the parties.

A distributed ledger maintained by multiple participating nodes offers a shared record in which state transitions are ordered and, once finalised, are not modifiable by a single party. A smart contract can hold the comparison rule itself, so that the acceptance or rejection of a bid is determined by pre-programmed conditions rather than by an off-chain operator applying judgement per bid. A reverse auction, in which competing contractors submit progressively lower offers and the lowest valid offer is retained as the current best offer, is a procurement format to which such a rule is well suited.

What the disclosed system addresses is the accounting consequence of that rule. Each acceptance of a lower bid displaces a previously accepted bidder whose funds are already held by the contract. The disclosed arrangement converts each displacement into a credit in a balance keyed by the displaced bidder's address, aggregates such credits across all tenders in which that address has been displaced, and leaves the actual transfer to a separate claim transaction initiated by the bidder. That separation is what allows refunds to be settled without the bid-acceptance path having to make an outbound transfer to a party who may be unavailable, and it allows the claim path to be ordered so that the recorded balance is reduced before value leaves the contract.

Two limitations of the present build are stated at the outset, because they bound what is claimed. First, bids are submitted in cleartext as transaction value and are recorded in emitted events, so the system does **not** provide sealed-bid or confidential bidding. Second, the tender record identifies its authority as the address that created it, and creation is not restricted; role separation between government authorities and contractors is enforced by the application, not by the contract.

---

## 5. Prior art and acknowledged known art

The following categories of known art are acknowledged. No formal prior-art search has yet been carried out; the references named are public specifications and general technical knowledge, not the results of a search, and no conclusion of novelty is drawn from their absence.

**(a) Electronic tendering and e-procurement platforms.** Portal-and-database systems providing online tender publication, bidder registration, bid submission, evaluation support and award management are long established, both as commercial products and as government platforms. Such systems place the record of bids and deposits under operator control.

**(b) Blockchain-based auctions.** Smart contracts that fix auction conditions, hold bidder funds, compare a newly submitted bid against a stored best bid, and update the stored best bid are known. Reverse-auction variants, in which each succeeding valid bid must be lower than the stored lowest bid, are likewise known.

**(c) Smart-contract escrow and pull-payment refunds.** A contract retaining value and maintaining a per-address mapping of amounts claimable by the respective addresses, with the beneficiary initiating a separate withdrawal rather than the contract pushing value to every beneficiary during the triggering transaction, is a known pattern. Reducing a recorded balance before an external transfer, and restoring it if the transfer fails, is the known checks-effects-interactions ordering used to reduce re-entrancy exposure. These principles are not claimed in isolation.

**(d) Event emission and event-driven interfaces.** Contracts emitting events carrying identifiers, addresses, amounts and timestamps, and applications querying historical logs and subscribing to new ones to render an ordered record, are known techniques. The contribution here lies in the specific arrangement of event fields and their use as the audit source, not in event emission as such.

**(e) Wallet-based transaction authorisation.** Browser-resident wallet extensions exposing an injected provider interface, and the associated JSON-RPC methods for requesting accounts and for submitting a transaction for user approval, are public and widely implemented; the relevant provider interface has been standardised as EIP-1193, and chain-identifier replay protection as EIP-155. Any embodiment delegating signing to such a wallet is therefore an application of known art, and is included in this disclosure as an alternative embodiment only (see §9.7 and claims 13–14), not as the demonstrated build.

**(f) Role-based procurement software.** Distinguishing procuring-authority users from bidder users, and restricting the actions available to each, is conventional in procurement software. In the present build this distinction is enforced by the application against a local directory of demonstration accounts. It is **not** a cryptographically verified government identity, not an authentication service, and no security assurance is claimed for it.

**Preliminary technical differentiation (not a conclusion of novelty or inventive step).** The acknowledged art discloses reverse-auction bid comparison, escrow retention, per-address claimable balances, withdrawal-based refunds, event logging and role-based interfaces, each taken alone. What is proposed for examination is the cooperative arrangement in which (i) the escrowed and refunded quantity is the **entire payable bid value**, comprising the contractor's offer and the deposit requirement together, rather than the deposit alone; (ii) each displacement converts the displaced bidder's entire previously accepted payable value into a credit in a balance **keyed by bidder address and therefore cumulative across tenders**, so that a bidder displaced in several concurrent tenders holds one aggregated refund entitlement; (iii) that entitlement is discharged only by a separate claim transaction ordered to reduce the recorded balance before value is transferred and to restore it on failure; and (iv) the tender and audit views of the application are derived from the same events that record the accepted payable values, so that the displayed lowest value and the refund arithmetic trace to a single on-chain record.

---

## 6. Statement of invention

According to one aspect there is provided a blockchain-based reverse-auction procurement system comprising a tender-management smart contract deployed on an EVM-compatible network and a computer-implemented application in data communication with that contract. The contract is configured to store a plurality of tender records each comprising at least a tender identifier, a reference, a closing time, a deposit requirement, a current lowest payable value and a current lowest bidder address; to receive payable bid transactions associated with a tender; to reject a bid originating from the address recorded as that tender's authority; to require the value received to be not less than the deposit requirement; to require, where a current lowest payable value is already stored, that the value received be strictly lower than that stored value; upon acceptance of such a bid, to credit the **entire** previously stored current lowest payable value to a refund balance keyed by the previously stored lowest bidder's address before overwriting the stored lowest payable value and lowest bidder with those of the newly accepted bid; to emit an event recording the tender identifier, the tender reference, the bidder address, the accepted payable value, the deposit requirement and the timestamp; and to provide a claim operation which reads the refund balance for the calling address, sets that balance to zero, transfers the read amount to the calling address, restores the balance and reverts if the transfer does not succeed, and emits a refund event on success.

According to a further aspect there is provided a computer-implemented method of conducting a reverse auction on such a network, comprising the steps of storing a tender record, receiving a payable bid, performing the validation sequence above, crediting a bidder-keyed refund balance on displacement, updating the stored lowest value and bidder, emitting a bid event, and later discharging the accumulated balance through a separate claim transaction.

According to a further aspect there is provided a non-transitory computer-readable medium storing instructions which, when executed by a browser, cause the application to render a tender console, pre-validate a proposed payable value against the stored lowest payable value, transmit a payable bid transaction, and render an audit trail derived from contract events.

---

## 7. Objects of the invention

1. To provide a computer-implemented reverse-auction procurement process in which tender records, received bid values and the identity of the current lowest bidder are maintained as state of a smart contract on an EVM-compatible network.
2. To permit a tender record to be published by a transaction to the contract, the publishing address thereby being recorded as that tender's authority address. *(Note: publication is not restricted by the contract; see §9.2.)*
3. To enforce the reverse-auction rule in the contract, such that any subsequently accepted payable bid is strictly lower than the stored lowest payable bid.
4. To require each bid transaction to carry at least the deposit requirement recorded for that tender, and to retain the value so received in the contract.
5. To record the displacement of a previously accepted lowest bidder as a credit in a refund balance, without any outbound transfer being made during bid processing.
6. To key that refund balance by bidder address, so that credits arising from displacement across a plurality of tenders accumulate into a single entitlement.
7. To permit the bidder to realise that entitlement only by a separate claim transaction.
8. To reduce the recorded balance before any external transfer and to restore it if the transfer fails, so that the same credited amount cannot be paid out twice.
9. To emit tender and bid events carrying the accepted payable value, and to derive the application's tender display and audit history from those events, both by historical log query and by live subscription.
10. To provide a browser interface for tender discovery, filtering, bid submission, participation review and refund claim.
11. To permit the user's transaction approval to be delegated, in an alternative embodiment, to a browser-resident wallet provider, such that the application stores no private key material.

---

## 8. Synopsis

The system comprises a browser-based procurement interface (100), an application and role-handling layer (101), a blockchain communication layer (102), an EVM-compatible ledger (103), and a tender-management smart contract (104).

A user authenticates against the application's directory, which associates the user with a role (authority or contractor), an organisation or department, and a vendor registration, and a wallet address (101). The application reads all tender records from the contract and renders them in a discovery view, with filtering by department and by derived status, and a closing-time countdown (100). A contractor selects a tender and enters an offer amount; the application computes the payable value as the offer plus the tender's stored deposit requirement, pre-validates that value against the stored lowest payable value and against the user's balance, and submits a payable transaction invoking the bid function with the tender identifier (102, 103).

On receipt, the contract (104) verifies that the tender exists, that the closing time has not passed, that the tender is in the open state, that the sender is not the recorded authority address, and that the value received is not less than the deposit requirement. Where a lowest payable value is already stored, it further requires the received value to be strictly lower. On satisfaction, it credits the entire previously stored lowest payable value to the refund balance of the previously stored lowest bidder, sets the stored lowest payable value and lowest bidder to those of the sender, and emits a bid event.

A contractor may subsequently invoke the claim operation. The contract reads and clears the caller's refund balance before transferring, restores the balance and reverts on failure, and emits a refund event on success. Because the balance is keyed by address rather than by tender, a contractor displaced in several tenders claims one aggregated amount.

The demonstrated implementation runs on a local Hardhat network with chain identifier 31337, with the contract compiler configuration targeting Solidity 0.8.20, and a browser application built with React, Vite, ethers.js and React Router. These specifics describe the build and do not limit the claimed subject matter.

---

## 9. Detailed description of the invention

### 9.1 Overall arrangement

The system comprises a browser application and on-chain contract state, with no off-chain server component in the demonstrated build.

The application layer (101) comprises a session store, a router providing navigation between a procurement console view, a tender discovery view and a profile view, form validation, deadline evaluation and a notification component.

The blockchain communication layer (102) uses a JSON-RPC provider configured by environment variables for the endpoint and the contract address, together with a contract interface description used to encode calls and decode results. A transaction signer is obtained per session: in the demonstrated build, by constructing a local signer from a configured development key and verifying that the derived address equals the session's registered address; in the alternative embodiment of §9.7, from the browser-resident wallet provider.

### 9.2 Tender record and publication

A tender record comprises: a numeric identifier; a reference number; a title; a description; a category; a department; a document locator; an authority address; an estimated value; a deposit requirement; a current lowest payable value; a current lowest bidder address; a closing time; a status; and a settlement flag.

A monotonically increasing counter assigns the identifier, the counter value being used as the record's index and then incremented, so that identifiers are never reused.

Publication is effected by a transaction invoking the creation function and supplying the reference, title, description, category, department, document locator, estimated value, deposit requirement and a duration. The function requires the duration to be positive and the deposit requirement to be non-zero; it records the sending address as the authority address, computes the closing time as the current block timestamp plus the duration, and initialises the status to the open state, the lowest payable value to zero, and the lowest bidder to the zero address, and emits a creation event.

Two properties of the demonstrated build follow and are stated for accuracy. First, **publication is not permission-restricted**: the contract declares a deployer-only modifier but does not apply it to the creation function, so any address may publish, and the recording of the sending address as authority is the only access control the creation path applies. Second, in the demonstrated build no browser view is wired to the creation function; the initial record is created during contract construction and the remaining demonstration records were published by an auxiliary script, which is a data-population difference and not a functional limitation of the creation path.

The status variable admits an open state, an evaluation state and an awarded state. In the demonstrated build the evaluation state is declared but never assigned; the award path transitions directly from open to awarded.

### 9.3 Onboarding, role association and tender selection

The user supplies a username and password, which are checked against a directory entry. Each entry associates the username with a role, a display name, an organisation or department, a vendor registration and tax identifiers where applicable, and a wallet address. On success, session data are persisted in the browser's local storage and the role controls which views and actions the interface exposes: an authority session may not submit bids, and a contractor session may not publish.

This mechanism is a demonstration convenience. It does not verify a real-world identity, does not authenticate a government office, and confers no security assurance. Where the alternative embodiment of §9.7 is used, the directory association gains a verifiable element, in that the address returned by the wallet is compared with the address registered for the authenticated role before any tender transaction is transmitted; this comparison is described here for completeness and is **[PROSPECTIVE]** in the present build.

On selection, the application reads the tender record, renders its department, category, estimated value, deposit requirement, closing time and current lowest payable value, and computes a countdown from the closing time against the current time. Tender imagery is selected by a mapping from department to asset with a keyword-based fallback. Discovery filtering operates on department and on a status value derived in the application from the stored status and the closing time.

### 9.4 Reverse-auction bid submission

The contractor enters an offer amount. The application computes the payable value as the offer plus the tender's deposit requirement, since the contract accepts a single value and does not accept the deposit and the offer as separate arguments. The application then pre-validates: that a session exists; that the role is contractor; that the tender is in the open state and not past its closing time; that the session address is not the tender's authority address; that the computed payable value does not exceed the session address's balance; and, where a lowest payable value is already stored, that the computed value is strictly lower. These checks reduce the incidence of reverting transactions; enforcement remains in the contract.

On confirmation, the application submits a payable transaction invoking the bid function with the tender identifier and the computed value, awaits the receipt, and on success emits a success notification carrying the transaction hash, then re-reads the tender record, the tender list, the audit events and the session balance. A revert is mapped to a human-readable message distinguishing an insufficient balance, a non-existent tender, a closed tender, a value not lower than the stored lowest, an attempt to bid by the authority, and a signer configuration fault.

The contract's validation of the bid, in order, is: the tender exists, tested by the stored closing time being non-zero; the current block timestamp does not exceed the stored closing time; the stored status is the open state; the sender is not the stored authority address; the value received is not less than the stored deposit requirement; and, where a stored lowest payable value is non-zero, the value received is strictly less than that stored value. The contract does not compare the received value against the estimated value, and does not evaluate contractor eligibility, capability or legal compliance.

### 9.5 Displacement accounting — the escrow and refund quantity

On acceptance, the contract reads the previously stored lowest payable value and bidder. Where both are non-zero, it adds the previously stored lowest payable value to the refund balance of the previously stored lowest bidder, then overwrites the stored lowest bidder address and lowest payable value with those of the sending address.

**The quantity credited is the displaced bidder's entire previously accepted payable value, comprising that bidder's offer and the tender's deposit requirement together, and not the deposit requirement alone.** This follows from the recorded value being a single amount and from the credit operating on that amount. The consequences are stated plainly, since they define the claim scope:

- the value retained by the contract for each accepted bid is the full payable value;
- a displaced bidder recovers the full payable value, not merely the deposit;
- the last accepted bidder's payable value remains in the contract and is not released by the award path;
- the deposit requirement functions as a floor on the value received and as metadata reported in events, not as an amount separately segregated from the offer.

The refund balance is a mapping from address to amount, keyed by bidder address and not by tender. A bidder displaced in several tenders therefore accumulates one aggregated balance, which the profile view presents as a single claimable figure. This aggregation is a property of the keying choice, not of any per-tender bookkeeping.

### 9.6 Claim ordering

The claim operation reads the caller's refund balance, requires it to be non-zero, sets the balance to zero, and only then transfers the read amount to the caller by an external call. If the external call reports failure, the operation restores the balance to the read amount and reverts; because the revert rolls back the whole transaction, the externally visible outcome is that no transfer occurred and the balance is intact. On success it emits a refund event carrying the caller and the amount.

The ordering is the checks-effects-interactions sequence: validation, then state reduction, then external interaction. It ensures that a recipient contract re-entering the claim during the transfer observes a zero balance and its attempt fails the non-zero requirement, and that a recipient that cannot accept value does not leave the recorded balance extinguished.

A thin alias exists that invokes the claim operation through an external self-call. That alias is **not** relied upon by the application and is not part of the claimed subject matter: because the self-call makes the contract the sender, the alias observes the contract's own (zero) balance and therefore reverts. It is noted here for completeness and is excluded from the claims.

### 9.7 Alternative embodiment — wallet-delegated transaction authorisation **[PROSPECTIVE]**

In an alternative embodiment, the transaction signer of §9.1 is obtained from a browser-resident wallet provider rather than from a configured development key, and the application stores and transmits no private key material.

In that embodiment the application: discovers the injected provider exposed by the browser on the page's global object; requests account access from the provider; receives the selected account address; compares that address with the address recorded in the directory entry for the authenticated role and, on mismatch, refuses the session; reads the provider's reported network identifier and compares it with the identifier expected for the deployment, refusing submission on mismatch; renders, before submission, the contract address, the encoded function, the tender identifier and the payable value, so that the user reviews the same figures in the application and in the wallet's own approval dialogue; and submits the transaction through the provider, where approval occurs under user control in the wallet and the private key never enters the application.

On user rejection, denoted by the provider's rejection response code, the application makes no state change, leaves the entered offer intact, and returns the interface to an editable state. On approval, the application receives a transaction hash, awaits the receipt, and proceeds as in §9.4. Where the wallet reports an unsupported network, the application offers to add or switch to the expected network rather than submitting.

This embodiment is described to a degree sufficient for implementation but is **not present in the demonstrated build**, in which transaction approval is presented by an application-rendered confirmation dialogue and the transaction is signed locally by a development key. It is claimed only in dependent claims 13 and 14, and the applicant is advised to complete the implementation before or promptly after filing so that the embodiment is not open to a sufficiency objection.

### 9.8 Events and audit state

The contract emits a creation event on publication, a bid event on each accepted bid, an award event on transition to the awarded state, and a refund event on a successful claim.

The bid event carries the tender identifier, the tender reference, the bidder address, the accepted payable value, the tender's deposit requirement, and the block timestamp. Because the contract records a single amount, the value field of the bid event carries the **payable value including the deposit requirement**, and the deposit field restates the tender's requirement; the two fields are therefore not additive, and the application must not present their sum as a bid. This is stated explicitly because the field naming admits of the opposite reading.

The application derives its audit view from these events by two routes used together: a historical log query from the deployment block to the latest block, and a live subscription registered on the bid event. Each rendered entry carries the bidder address, the tender reference, the payable value, the deposit requirement, the timestamp and the transaction hash. Entries may be filtered to a single tender or shown in aggregate. Because accepted payable values are recorded in events in cleartext, the system provides no confidentiality of bidding.

### 9.9 Award and settlement

The award operation requires the tender to exist and the closing time to have passed, requires the stored status to be the open state, sets the status to awarded, emits an award event carrying the current lowest bidder and lowest payable value, and sets a settlement flag on the tender record.

In the demonstrated build the award operation performs **no transfer of value**. The winning bidder's payable value remains in the contract, no amount is paid to the authority address, and the settlement flag is written but never read by any function. The award operation is also **not restricted to the tender's authority address**, so any address may trigger it once the tender has closed. Both properties are disclosed for accuracy; neither is claimed, and no settlement of the winning value, release of retention, or validation of contractor eligibility by the contract is asserted.

### 9.10 Development and deployment context

The demonstrated build executes against a local Hardhat node with chain identifier 31337 and pre-funded development accounts, the contract being deployed by a deployment script and demonstration records published by an auxiliary script. The browser application connects to the node using environment-configured endpoint and contract address. The build is not a production deployment.

The development directory, the locally held development keys and the application-rendered approval dialogue are demonstration mechanisms and are unsuitable for real transactions. Production use would require secure authority key custody, verified identity and authorisation, an independent contract audit, network and upgrade governance, privacy assessment, durable document storage, transaction-cost analysis, operational monitoring, and conformity with the applicable procurement rules and law.

### 9.11 Technical effects

The arrangement causes bid comparison, displacement accounting and refund entitlement to be produced by contract state transitions rather than by an operator's reconciliation: acceptance of a lower bid both overwrites the stored lowest state and, in the same transaction, credits the displaced bidder's balance, so the two facts cannot diverge. Keying the balance by address makes the entitlement cumulative across tenders without per-tender bookkeeping. Reducing the recorded balance before transferring, with restoration and revert on failure, ensures that a credited amount is paid at most once and that a failed transfer does not extinguish the credit. Deriving the tender display and audit history from the same events that record accepted payable values gives a single traceable source for the displayed lowest value and the refund arithmetic. These effects are stated qualitatively; no throughput, latency, cost or security level is asserted, and no measurement was performed.

---

## 10. Working methodology

1. Deploy the contract to an EVM-compatible network, obtaining its address and interface.
2. Configure the application's endpoint and contract address.
3. Publish a tender by a creation transaction, supplying reference, title, description, category, department, document locator, estimated value, deposit requirement and duration; the sending address is recorded as authority and the closing time is computed from the block timestamp plus the duration.
4. Authenticate a contractor session against the directory; the session binds a role, an organisation, a vendor registration and an address.
5. Read tender records and render them in the discovery view with department and status filtering and a closing countdown.
6. Select a tender and enter an offer; compute the payable value as the offer plus the stored deposit requirement.
7. Pre-validate: role, tender open, not past closing, sender not the authority, sufficient balance, and strict-lower against any stored lowest payable value.
8. Transmit the payable bid transaction with the tender identifier and the computed value; authorise it as in §9.4 (demonstrated build) or §9.7 (alternative embodiment).
9. On receipt, verify existence, closing time, open status, sender not authority, value not less than the deposit requirement, and strict-lower where applicable.
10. On satisfaction, credit the entire previously stored lowest payable value to the previously stored lowest bidder's refund balance, then store the new lowest bidder and value, and emit the bid event.
11. Update the application's tender display, lowest value, countdown and audit trail from the re-read state and from the emitted event.
12. Repeat steps 6 to 11 from another contractor address to displace the incumbent, observing that the displaced bidder's balance increases by that bidder's entire previous payable value.
13. Invoke the claim operation from the displaced bidder's address; the balance is read, cleared, transferred, and the refund event emitted; on transfer failure the balance is restored and the transaction reverts.
14. Optionally, after the closing time, invoke the award operation to transition the tender to the awarded state; no value is transferred by that operation in the demonstrated build.

---

## 11. Brief description of the drawings

**Figure 1** — Procurement console of the application, showing the selected tender, its department and category, estimated value, deposit requirement, closing countdown, current lowest payable value and the bid form (`screenshots/home-desktop-grid.png`).

**Figure 2** — Tender discovery view, showing tender cards with department tags, reference numbers, counts and filtering controls (`screenshots/explore-4-tenders.png`).

**Figure 3** — Contractor profile view in a populated state, showing participation, bid history and the aggregated claimable refund figure (`screenshots/profile-populated.png`).

**Figure 4** — Contractor profile view in an initial state, showing the metric arrangement with no participation recorded (`screenshots/profile.png`).

**Figure 5** — Refund claim path, showing the confirmation presented before the claim transaction and the resulting state after confirmation. _Screenshot to be captured from the running build._

**Figure 6** — Application-rendered transaction approval dialogue, showing the sender address, transaction type and payable value presented for confirmation before the transaction is signed locally. _Screenshot to be captured from the running build._

**Figure 7** — Reserved for the wallet-delegated authorisation embodiment of §9.7, showing the application's submission view and the wallet's own approval dialogue. To be supplied only after that embodiment is implemented; it must not be filed as depicting the demonstrated build.

*Drafting note.* The earlier figure list titled one figure "MetaMask Wallet Integration" while the corresponding text stated that no wallet integration existed. That inconsistency is removed: Figures 1 to 6 depict the demonstrated build, Figure 6 being the application-rendered dialogue actually used, and any wallet dialogue is confined to Figure 7 after implementation.

---

## 12. Claims

*The claims are numbered. Claim 1 is the independent system claim; claims 2 to 10 depend from it; claim 11 is the independent method claim; claim 12 depends from claim 11; claims 13 and 14 are directed to the alternative embodiment of §9.7 and depend from claims 1 and 11 respectively. Support for each limitation is identified in §13. Scope, clarity and unity require review by a patent agent.*

**1.** A blockchain-based reverse-auction procurement system comprising a tender-management smart contract deployed on an Ethereum Virtual Machine compatible network and a computer-implemented application in data communication with the smart contract, wherein the smart contract is configured to:

store a plurality of tender records, each tender record comprising a tender identifier, a reference, a closing time, a deposit requirement, a current lowest payable value and a current lowest bidder address;

receive a payable bid transaction associated with a tender record;

validate the received payable value against the current lowest payable value stored in that tender record;

maintain the current lowest bidder address;

record, upon displacement of a stored current lowest bidder by a subsequently accepted lower payable bid, a refundable amount in a refund balance associated with the displaced bidder's address, the refundable amount being equal to the entire payable value previously stored as that tender record's current lowest payable value; and

update the stored current lowest payable value and current lowest bidder address to those of the subsequently accepted bid, the recording of the refundable amount and the updating of the stored value and address occurring within the same transaction.

**2.** The system as claimed in claim 1, wherein the smart contract validates that the tender record exists, that the current block timestamp does not exceed the stored closing time, that the stored status is an open status, and that the sending address is not the authority address recorded in that tender record.

**3.** The system as claimed in claim 1, wherein the smart contract requires the value received with the bid transaction to be not less than the deposit requirement stored in that tender record.

**4.** The system as claimed in claim 3, wherein, where a non-zero current lowest payable value is stored in the tender record, the smart contract requires the value received with the bid transaction to be strictly less than that stored current lowest payable value.

**5.** The system as claimed in claim 1, wherein the refund balance is a mapping keyed by bidder address, such that amounts credited to a bidder upon displacement in a plurality of tender records accumulate into a single refund balance associated with that bidder's address.

**6.** The system as claimed in claim 5, wherein the smart contract provides a claim operation which, when invoked by a bidder address, reads the refund balance associated with the invoking address, requires the read amount to be non-zero, sets that refund balance to zero, and thereafter initiates an external transfer of the read amount to the invoking address.

**7.** The system as claimed in claim 6, wherein, where the external transfer reports failure, the claim operation restores the refund balance to the read amount and reverts the transaction, and wherein, where the external transfer succeeds, the claim operation emits a refund event comprising the invoking address and the transferred amount.

**8.** The system as claimed in claim 1, wherein the smart contract emits a bid event comprising the tender identifier, the tender reference, the bidder address, the accepted payable value including the deposit requirement, the deposit requirement stored in the tender record, and the block timestamp.

**9.** The system as claimed in claim 8, wherein the application derives an audit history by performing a historical query of the bid event from a deployment block to a latest block and by registering a live subscription to the bid event, and renders, for each entry, the bidder address, the tender reference, the accepted payable value, the deposit requirement, the timestamp and a transaction hash, the rendered entries being filterable to a single tender record or presented in aggregate.

**10.** The system as claimed in claim 1, wherein the application provides a tender discovery view with filtering by department and by a status derived from the stored status and the closing time, a tender-specific reverse-auction submission view which computes the payable value as a user-entered offer amount plus the stored deposit requirement and pre-validates that computed value against the stored current lowest payable value before transmission, and a profile view presenting tender participation, bid history and the aggregated refund balance of the session address.

**11.** A computer-implemented method of conducting a reverse auction on an Ethereum Virtual Machine compatible network, comprising:

storing, in a smart contract, a tender record comprising a tender identifier, a closing time, a deposit requirement, a current lowest payable value and a current lowest bidder address;

receiving a payable bid transaction from a bidder address;

validating that the tender record exists, that the closing time has not passed, that the tender record is in an open status, and that the bidder address is not the authority address recorded in the tender record;

requiring the received payable value to be not less than the deposit requirement and, where a non-zero current lowest payable value is stored, to be strictly less than that stored value;

upon acceptance of the received bid, crediting the entire payable value previously stored as the current lowest payable value to a refund balance associated with the previously stored current lowest bidder address, then storing the bidder address and the received payable value as the current lowest bidder address and current lowest payable value, and emitting a bid event; and

subsequently discharging the credited refund balance to the displaced bidder address by a separate claim transaction initiated by that address.

**12.** The method as claimed in claim 11, wherein the separate claim transaction reads the refund balance associated with the initiating address, sets that balance to zero before initiating an external transfer of the read amount, restores the balance and reverts if the external transfer reports failure, and emits a refund event if the external transfer succeeds.

**13.** The system as claimed in claim 1, wherein the application is configured to obtain a transaction signer from a browser-resident wallet provider, to request account access from the provider, to compare the account address returned by the provider with an address recorded in a directory entry associated with an authenticated role and to refuse submission on mismatch, to compare a network identifier reported by the provider with an expected network identifier and to refuse submission on mismatch, and to store no private key material, the transaction being authorised by user approval within the wallet provider.

**14.** The method as claimed in claim 11, wherein the payable bid transaction is authorised by a browser-resident wallet provider under user control, the application rendering the contract address, the invoked function, the tender identifier and the computed payable value for review before submission, and wherein a user rejection received from the provider leaves the tender record and the refund balances unchanged and returns the submission view to an editable state.

---

## 13. Verification record — confirmed against source

Each limitation in the claims was traced to code. Paths are repository-relative.

| Claim element | Status | Source |
|---|---|---|
| Tender record fields; identifier counter | Confirmed | `contracts/TenderVault.sol` — `Tender` struct, `tenderCount` |
| Publication records sender as authority; closing time = timestamp + duration; deposit requirement non-zero | Confirmed | `contracts/TenderVault.sol` — `createTender` |
| Publication is **not** permission-restricted; `onlyDeployer` declared but unapplied | Confirmed | `contracts/TenderVault.sol` — modifier definition only |
| Existence, closing-time, open-status and authority-address checks | Confirmed | `contracts/TenderVault.sol` — `submitBid` `require` sequence |
| Deposit floor `msg.value >= emdAmountWei` | Confirmed | `contracts/TenderVault.sol` |
| Strict-lower rule against stored lowest | Confirmed | `contracts/TenderVault.sol` |
| Credit equals the **entire** previous payable value, not the deposit alone | Confirmed | `contracts/TenderVault.sol` — `pendingReturns[...] += tender.lowestBidWei` |
| Same-transaction credit and update | Confirmed | same function, statement order |
| Refund balance keyed by address, cumulative across tenders | Confirmed | `mapping(address => uint256) public pendingReturns` |
| Claim: read, require non-zero, zero, transfer, restore-and-revert on failure, emit event | Confirmed | `contracts/TenderVault.sol` — `claimEmdRefund` |
| Bid event fields; value field carries the payable value including the deposit | Confirmed | `contracts/TenderVault.sol` — `TenderBidSubmitted` |
| Historical log query plus live subscription; audit entries and filtering | Confirmed | `frontend/src/App.jsx` — `queryFilter(..., 0, "latest")`, `contract.on("TenderBidSubmitted", ...)` |
| Payable value computed as offer + deposit; pre-validation; balance check | Confirmed | `frontend/src/App.jsx` — `handleSubmitTenderOffer` |
| Discovery filtering by department and derived status; profile aggregation | Confirmed | `frontend/src/pages/Explore.jsx`, `frontend/src/pages/Profile.jsx` |
| Session directory, roles, local address association | Confirmed | `frontend/src/utils/auth.js` |
| Award: no transfer of value; flag written but never read; callable by any address | Confirmed | `contracts/TenderVault.sol` — `awardTender` |
| Evaluation status declared but never assigned | Confirmed | `contracts/TenderVault.sol` — `TenderStatus` |
| Alias `withdraw()` reverts (self-call observes a zero balance); excluded from claims | Confirmed | `contracts/TenderVault.sol` — `withdraw` |
| Wallet-delegated authorisation, role-to-address binding, network check, rejection handling | **Not implemented — prospective** | none; described at §9.7 |
| Sealed-bid or confidential bidding | **Not implemented — not claimed** | bids recorded in cleartext |
| Settlement of the winning value to the authority | **Not implemented — not claimed** | `awardTender` performs no transfer |

**Testing gap.** The repository contains no automated test suite for the contract. The behaviour above was confirmed by reading the source and by exercising the running application; it is not confirmed by unit or integration tests. A test suite covering the deposit floor, the strict-lower rule, displacement credit, the cumulative balance, and the claim ordering should be added before the specification is relied upon as evidence of verified behaviour.

### Statements corrected relative to the earlier draft

1. The credited refund amount is the whole payable value, not the deposit; the earlier "must be verified / consists of the EMD only" hedge is resolved.
2. Tender publication is unrestricted; "authorised tender issuer" removed from the objects and claims.
3. "An address associated with the tender authority" replaced by exact recorded-authority-address exclusion.
4. `fundsClaimed` described as an unused tender-level settlement flag, not a bidder claim status.
5. The evaluation status is described as declared but unused.
6. "Checks bidder identity" removed from the abstract and the description; the actual check is exclusion of the recorded authority address.
7. No settlement or award transfer is asserted.
8. The bid event's value field is described as the payable value including the deposit, and the two event fields are stated not to be additive.
9. The "MetaMask Wallet Integration" figure is replaced by the application-rendered approval dialogue actually used; wallet authorisation is confined to §9.7, claims 13 and 14, and Figure 7.
10. The claim set is numbered, the bundled EMD/strict-lower limitations are split between claims 3 and 4, and the user-interface claim is limited to concrete validation behaviour rather than presentation alone.
11. Statutory-eligibility material added at §14.

---

## 14. Inventive step and statutory eligibility

**Acknowledged known art.** Electronic tender publication, reverse-auction comparison, smart-contract escrow, per-address pull-payment balances, the checks-effects-interactions ordering, event emission with event-driven interfaces, wallet-based authorisation per EIP-1193 and EIP-155, and role-based interfaces are each known. The inventive-step assessment must therefore rest on the specific cooperative arrangement set out in §5(f) and not on the use of a ledger for procurement as such.

**Proposed technical contribution.** The arrangement in which the quantity escrowed and later restored to a displaced bidder is the entire payable value rather than the deposit alone; in which displacement credits a single bidder-keyed balance that accumulates across concurrent tenders; in which that aggregated entitlement is discharged only by a separately ordered claim path that reduces the recorded balance before value leaves and restores it on failure; and in which the application's lowest-value display and audit history are derived from the same events that record those payable values, such that displayed state and refund arithmetic share one on-chain source.

**Technical effect, stated concretely.** The credit and the overwrite of the stored lowest value occur in one transaction, so a displaced bidder's entitlement cannot be lost by a failure between the two steps. Because the balance is keyed by address, the number of refund transactions a bidder must perform is independent of the number of tenders in which it was displaced. Because the balance is reduced before the transfer and restored with a revert on failure, a credited amount cannot be paid twice through re-entry and cannot be extinguished by a non-accepting recipient. Because the audit view is derived from the same events, a discrepancy between the displayed lowest value and the recorded refund arithmetic is detectable by reconciling the event log.

**Statutory eligibility (India).** An objection under Section 3(k) of the Patents Act 1970, as a computer programme per se or a business method, must be anticipated, since the subject matter includes a procurement rule and a browser interface. The specification is therefore directed to a technical effect in the functioning of the data-processing system — atomic state transition coupling entitlement to displacement, address-keyed aggregation reducing the number of settlement transactions, and ordering that makes double payment structurally impossible — rather than to the procurement policy or to the presentation of information. The applicant should obtain a written opinion on Section 3(k) and on the exclusion of business methods before filing a complete specification, and should be prepared to amend the claims toward the data-processing effect if objection is raised.

**Candour.** Whether the combination is non-obvious over the closest prior art cannot be determined from this repository. A prior-art search directed to reverse-auction escrow contracts, cumulative pull-payment refunds and blockchain tendering platforms is required, and the claims should be re-read against whatever that search identifies. The position stated here is preliminary.

---

## 15. Industrial application

The system is applicable to electronic procurement in which an authority publishes a requirement and contractors compete by submitting progressively lower offers. Application areas include government infrastructure and public works procurement, highway and road projects, railway works, municipal and smart-city projects, equipment and maintenance contracting, and supplier-selection or reverse-auction processes conducted by private organisations.

Potential users include central and state government departments, public works departments, highway authorities, railway procurement units, municipal bodies, public-sector undertakings, procurement technology providers, and private organisations conducting supplier selection. The departments named in the demonstrated build — NHAI, CPWD, Railways and Smart Cities — are demonstration data and are not a limitation.

Before use in a live procurement environment the system would require verified identity and authorisation, secure custody of authority keys, independent contract audit, legal validation of the auction and deposit rules against the applicable procurement framework, privacy assessment, durable document storage, transaction-cost analysis, operational monitoring and integration with the relevant procurement procedure. The demonstrated build is not represented as ready for live government procurement.

---

## 16. Abstract

A blockchain-based reverse-auction procurement system comprises a tender-management smart contract on an Ethereum Virtual Machine compatible network and an application communicating with it. The contract stores tender records, receives payable bid transactions, rejects bids from the address recorded as the tender's authority, requires the received value to be not less than a stored deposit requirement, and, where a current lowest payable value exists, requires the received value to be strictly lower. On displacement, the entire previously accepted payable value — offer and deposit together — is credited, in the same transaction, to a refund balance keyed by the displaced bidder's address and cumulative across tenders, before the stored lowest value and bidder are overwritten. A separate claim operation clears that balance before an external transfer, restoring it and reverting on failure. Bid events carry accepted payable values; the application derives its tender display and audit history from them. Sealed-bid confidentiality is not provided.
