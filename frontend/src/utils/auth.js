import { ethers } from "ethers";

// Pre-configured user directory mapping credentials to Hardhat private keys
// Roles: AUTHORITY (Ministry / CPWD / NHAI Nodal Officers) vs CONTRACTOR (Vetted Vendors / Bidders)
export const USER_DIRECTORY = [
  {
    id: "AUTH-CPWD-001",
    username: "cpwd.nodal",
    password: "govt123",
    role: "AUTHORITY",
    name: "CPWD Nodal Officer",
    organization: "Central Public Works Department",
    department: "CPWD",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    vendorId: null,
    gstin: null,
    pan: "ABCDE1234F"
  },
  {
    id: "AUTH-NHAI-001",
    username: "nhai.officer",
    password: "nhai456",
    role: "AUTHORITY",
    name: "NHAI Project Director",
    organization: "National Highways Authority of India",
    department: "NHAI",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    vendorId: null,
    gstin: null,
    pan: "FGHIJ5678K"
  },
  {
    id: "VEND-001",
    username: "sharma.contractors",
    password: "vendor123",
    role: "CONTRACTOR",
    name: "Sharma Infrastructure Pvt Ltd",
    organization: "Sharma Infrastructure Pvt Ltd",
    department: null,
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    vendorId: "VEND-2026-001",
    gstin: "07AABCS1234F1Z5",
    pan: "AABCS1234F"
  },
  {
    id: "VEND-002",
    username: "gupta.builders",
    password: "build456",
    role: "CONTRACTOR",
    name: "Gupta Builders & Associates",
    organization: "Gupta Builders & Associates",
    department: null,
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    vendorId: "VEND-2026-002",
    gstin: "09AABCG5678G2Z6",
    pan: "AABCG5678G"
  },
  {
    id: "VEND-003",
    username: "singh.engineers",
    password: "eng789",
    role: "CONTRACTOR",
    name: "Singh Engineering Works",
    organization: "Singh Engineering Works",
    department: null,
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a349857",
    vendorId: "VEND-2026-003",
    gstin: "03AABCS9012H3Z7",
    pan: "AABCS9012H"
  }
];

export function login(username, password) {
  const user = USER_DIRECTORY.find(
    u => u.username === username && u.password === password
  );
  
  if (!user) {
    throw new Error("Invalid credentials");
  }
  
  const session = {
    ...user,
    loginTime: new Date().toISOString()
  };
  
  localStorage.setItem("etender_session", JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem("etender_session");
}

export function getCurrentSession() {
  try {
    const sessionData = localStorage.getItem("etender_session");
    if (!sessionData) return null;
    return JSON.parse(sessionData);
  } catch {
    return null;
  }
}

export function getDirectSignerForUser(user, provider) {
  if (!user || !user.privateKey) {
    throw new Error("Invalid user or missing private key");
  }
  if (!provider) {
    throw new Error("No RPC provider supplied");
  }
  
  const wallet = new ethers.Wallet(user.privateKey, provider);
  
  if (wallet.address.toLowerCase() !== user.address.toLowerCase()) {
    throw new Error("Private key does not match configured address");
  }
  
  return wallet;
}

export function getUserLabel(user) {
  if (!user) return "Guest";
  return user.name;
}

export function getUserRoleBadge(user) {
  if (!user) return null;
  return user.role === "AUTHORITY" ? "Government Authority" : "Vetted Contractor";
}
