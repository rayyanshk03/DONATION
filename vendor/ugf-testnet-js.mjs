// src/types.ts
var UGFError = class extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "UGFError";
  }
};
var UGFAuthError = class extends UGFError {
  constructor(message) {
    super(message, "AUTH_ERROR", 401);
    this.name = "UGFAuthError";
  }
};
var UGFTimeoutError = class extends UGFError {
  constructor(message) {
    super(message, "TIMEOUT");
    this.name = "UGFTimeoutError";
  }
};
var UGFSignatureError = class extends UGFError {
  constructor(message) {
    super(message, "SIGNATURE_ERROR");
    this.name = "UGFSignatureError";
  }
};

// src/auth.ts
var Auth = class {
  constructor(http) {
    this.http = http;
  }
  async getNonce(address) {
    const res = await this.http.get(
      `/auth/nonce?address=${address}`
    );
    return res.nonce;
  }
  /** EIP-191 login with ethers signer. Stores JWT automatically. */
  async login(signer) {
    const address = await signer.getAddress();
    const nonce = await this.getNonce(address);
    const signature = await signer.signMessage(
      `Sign in to UGF
Nonce: ${nonce}`
    );
    const res = await this.http.post("/auth/wallet-login", {
      address,
      signature,
      nonce
    });
    if (!res.token) throw new UGFAuthError("Login failed \u2014 no token returned");
    this.http.setToken(res.token);
    return res.token;
  }
  /** If you handle signing externally. */
  async loginRaw(address, nonce, signature) {
    const res = await this.http.post("/auth/wallet-login", {
      address,
      signature,
      nonce
    });
    if (!res.token) throw new UGFAuthError("Login failed \u2014 no token returned");
    this.http.setToken(res.token);
    return res.token;
  }
  setToken(token) {
    this.http.setToken(token);
  }
  getToken() {
    return this.http.getToken();
  }
};

// src/constants.ts
var BASE_SEPOLIA_CHAIN_ID = "84532";
var BASE_SEPOLIA_CHAIN_TYPE = "evm";
var TYI_USD_PAYMENT_COIN = "TYI_MOCK_USD";

// src/status.ts
var Status = class {
  constructor(http) {
    this.http = http;
  }
  async get(digest) {
    return this.http.get(`/status?digest=${digest}`);
  }
  async poll(digest, opts = {}) {
    const { maxAttempts = 35, intervalMs = 3e3, onTick } = opts;
    for (let i = 0; i < maxAttempts; i++) {
      await sleep(intervalMs);
      const status = await this.get(digest);
      onTick?.(status, i + 1);
      if (status.status === "failed") {
        throw new UGFError(`Transaction failed: ${status.error ?? "unknown"}`, "TX_FAILED");
      }
      if (status.status === "expired") {
        throw new UGFError("Transaction expired", "TX_EXPIRED");
      }
      if (status.status === "completed") {
        return status;
      }
    }
    throw new UGFTimeoutError(`Polling timed out after ${maxAttempts} attempts for digest: ${digest}`);
  }
};
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// src/chains/evm.ts
var EvmChain = class {
  status;
  http;
  constructor(http) {
    this.http = http;
    this.status = new Status(http);
  }
  async waitForCompletion(digest, opts) {
    return this.status.poll(digest, opts);
  }
  /**
   * Poll until UGF sponsorship completes, then send the user tx with gas
   * automatically fitted to the sponsored ETH balance.
   *
   * @param buildTx - Return a TransactionRequest (no gas fields needed).
   *                  SDK estimates gas, caps gasPrice to sponsored budget, sends as legacy tx.
   */
  async sponsorAndExecute(digest, signer, buildTx, opts) {
    const provider = await assertBaseSepoliaSigner(signer);
    await this.status.poll(digest, opts);
    const signerAddress = await signer.getAddress();
    let sponsoredBalance = await provider.getBalance(signerAddress);
    for (let i = 0; sponsoredBalance === 0n && i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1e3));
      sponsoredBalance = await provider.getBalance(signerAddress);
    }
    if (sponsoredBalance === 0n) {
      throw new UGFError("No sponsored ETH received after polling", "NO_SPONSORED_ETH");
    }
    const txRequest = await buildTx(signer);
    const estimatedGas = await provider.estimateGas({
      from: signerAddress,
      ...txRequest
    });
    const gasLimit = estimatedGas * 105n / 100n;
    const maxAffordableGasPrice = sponsoredBalance / gasLimit;
    const suggestedGasPrice = (await provider.getFeeData()).gasPrice ?? maxAffordableGasPrice;
    const gasPrice = suggestedGasPrice <= maxAffordableGasPrice ? suggestedGasPrice : maxAffordableGasPrice;
    if (gasPrice === 0n) {
      throw new UGFError(
        "Sponsored ETH too small for estimated gas",
        "INSUFFICIENT_SPONSORED_ETH"
      );
    }
    const userTx = await signer.sendTransaction({
      ...txRequest,
      gasLimit,
      gasPrice,
      type: 0
    });
    await this.http.post("/evm/confirm", {
      digest,
      tx_hash: userTx.hash
    });
    return { userTxHash: userTx.hash };
  }
};
async function assertBaseSepoliaSigner(signer) {
  const provider = signer.provider;
  if (!provider) {
    throw new UGFError("Signer must have provider", "NO_PROVIDER");
  }
  const network = await provider.getNetwork();
  if (String(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) {
    throw new UGFError(
      `UGF testnet SDK only supports Base Sepolia (${BASE_SEPOLIA_CHAIN_ID})`,
      "UNSUPPORTED_CHAIN"
    );
  }
  return provider;
}

// src/http.ts
var HttpClient = class {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  token = null;
  setToken(token) {
    this.token = token;
  }
  getToken() {
    return this.token;
  }
  clearToken() {
    this.token = null;
  }
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }
  async get(path) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.headers()
    });
    return this.handleResponse(res);
  }
  async post(path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }
  async handleResponse(res) {
    if (res.status === 401) {
      this.clearToken();
      throw new UGFAuthError("Unauthorized \u2014 token expired or invalid");
    }
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        message = body.error ?? body.message ?? message;
      } catch {
      }
      throw new UGFError(message, "HTTP_ERROR", res.status);
    }
    return res.json();
  }
};

// src/payment/x402.ts
const ethers = window.ethers;
var ERC3009_ABI = [
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)"
];
var TRANSFER_WITH_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
};
var X402Payment = class {
  constructor(http, registry) {
    this.http = http;
    this.registry = registry;
  }
  async sign(quote, signer, provider, opts = {}) {
    const { validForSeconds = 3600 } = opts;
    const network = await provider.getNetwork();
    const chainId = String(network.chainId);
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      throw new UGFError(
        `UGF testnet SDK only supports Base Sepolia (${BASE_SEPOLIA_CHAIN_ID})`,
        "UNSUPPORTED_CHAIN"
      );
    }
    const registry = await this.registry.get();
    const option = registry.payment_options.find(
      (o) => o.type === "x402" && o.token === TYI_USD_PAYMENT_COIN && o.chains.some((c) => c.chain_id === chainId) && o.receiver_address?.toLowerCase() === quote.payment_to.toLowerCase()
    );
    if (!option) {
      throw new UGFError(
        `No x402 token found for chain ${chainId} with receiver ${quote.payment_to}`,
        "TOKEN_NOT_FOUND"
      );
    }
    const chainEntry = option.chains.find(
      (c) => c.chain_id === chainId
    );
    if (!chainEntry) {
      throw new UGFError(
        `Token ${option.token} not supported on chain ${chainId}`,
        "CHAIN_NOT_SUPPORTED"
      );
    }
    const tokenAddress = chainEntry.address;
    const contract = new ethers.Contract(tokenAddress, ERC3009_ABI, provider);
    const [onchainDS, version] = await Promise.all([
      contract.DOMAIN_SEPARATOR(),
      resolveTokenVersion(contract)
    ]);
    const name = TYI_USD_PAYMENT_COIN;
    const domain = {
      name,
      version,
      chainId: Number(chainId),
      verifyingContract: tokenAddress
    };
    const localDS = ethers.TypedDataEncoder.hashDomain(domain);
    if (localDS.toLowerCase() !== onchainDS.toLowerCase()) {
      throw new UGFSignatureError(
        `DOMAIN_SEPARATOR mismatch for ${tokenAddress}. Local: ${localDS}, Onchain: ${onchainDS}`
      );
    }
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const validAfter = 0n;
    const validBefore = BigInt(Math.floor(Date.now() / 1e3) + validForSeconds);
    const signerAddress = await signer.getAddress();
    const message = {
      from: signerAddress,
      to: quote.payment_to,
      value: BigInt(quote.payment_amount),
      validAfter,
      validBefore,
      nonce
    };
    const signature = await signer.signTypedData(
      domain,
      TRANSFER_WITH_AUTH_TYPES,
      message
    );
    const evmDigest = ethers.TypedDataEncoder.hash(
      domain,
      TRANSFER_WITH_AUTH_TYPES,
      message
    );
    const recovered = ethers.recoverAddress(evmDigest, signature);
    if (recovered.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new UGFSignatureError("Signature recovery mismatch");
    }
    const sig = ethers.Signature.from(signature);
    return {
      digest: quote.digest,
      payment_mode: "x402",
      v: sig.v,
      r: sig.r,
      s: sig.s,
      nonce,
      valid_after: Number(validAfter),
      valid_before: Number(validBefore)
    };
  }
  async submit(payload) {
    return this.http.post("/payment/submit", payload);
  }
  async signAndSubmit(quote, signer, provider, opts) {
    const payload = await this.sign(quote, signer, provider, opts);
    return this.submit(payload);
  }
  async execute(params) {
    const { quote, signer, opts } = params;
    const provider = signer.provider;
    if (!provider) {
      throw new UGFError("Signer must have provider", "NO_PROVIDER");
    }
    return this.signAndSubmit(quote, signer, provider, opts);
  }
};
async function resolveTokenVersion(contract) {
  try {
    return await contract.version();
  } catch {
    return "1";
  }
}

// src/payment/vault.ts
const ethers2 = window.ethers;
var VaultPayment = class {
  constructor(http, registry) {
    this.http = http;
    this.registry = registry;
  }
  async pay(quote, signer, chainId, token) {
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      throw new UGFError(
        `UGF testnet SDK only supports Base Sepolia (${BASE_SEPOLIA_CHAIN_ID})`,
        "UNSUPPORTED_CHAIN"
      );
    }
    const entry = await this.registry.getChainEntry(token, chainId);
    if (!entry.vault_address) {
      throw new UGFError(
        `No vault address for token ${token} on chain ${chainId}`,
        "VAULT_NOT_FOUND"
      );
    }
    const vaultAbi = await this.registry.getVaultAbi();
    const vault = new ethers2.Contract(entry.vault_address, vaultAbi, signer);
    const tx = await vault.payForFuel(quote.digest, {
      value: BigInt(quote.payment_amount)
    });
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new UGFError(`Vault tx failed. Hash: ${tx.hash}`, "VAULT_TX_FAILED");
    }
    return {
      digest: quote.digest,
      payment_mode: "vault",
      tx_hash: receipt.hash
    };
  }
  async submit(payload) {
    return this.http.post("/payment/submit", payload);
  }
  async payAndSubmit(quote, signer, chainId, token) {
    const payload = await this.pay(quote, signer, chainId, token);
    return this.submit(payload);
  }
};

// src/quote.ts
var Quote = class {
  constructor(http) {
    this.http = http;
  }
  async get(req) {
    const body = normalizeQuoteRequest(req);
    assertBaseSepoliaOnly(body);
    const res = await this.http.post("/quote", body);
    if (!res.digest) throw new UGFError("Quote response missing digest", "QUOTE_ERROR");
    return res;
  }
};
function normalizeQuoteRequest(req) {
  return {
    ...req,
    payment_coin: req.payment_coin ?? TYI_USD_PAYMENT_COIN,
    payment_chain: req.payment_chain ?? BASE_SEPOLIA_CHAIN_ID,
    payment_chain_type: req.payment_chain_type ?? BASE_SEPOLIA_CHAIN_TYPE,
    dest_chain_id: req.dest_chain_id ?? BASE_SEPOLIA_CHAIN_ID,
    dest_chain_type: req.dest_chain_type ?? BASE_SEPOLIA_CHAIN_TYPE
  };
}
function assertBaseSepoliaOnly(req) {
  if (req.payment_coin !== TYI_USD_PAYMENT_COIN || req.payment_chain !== BASE_SEPOLIA_CHAIN_ID || req.dest_chain_id !== BASE_SEPOLIA_CHAIN_ID || req.payment_chain_type !== BASE_SEPOLIA_CHAIN_TYPE || req.dest_chain_type !== BASE_SEPOLIA_CHAIN_TYPE) {
    throw new UGFError(
      `UGF testnet SDK only supports ${TYI_USD_PAYMENT_COIN} on Base Sepolia (${BASE_SEPOLIA_CHAIN_ID})`,
      "UNSUPPORTED_TESTNET_ROUTE"
    );
  }
}

// src/registry.ts
var Registry = class {
  constructor(http) {
    this.http = http;
  }
  cache = null;
  async get() {
    if (this.cache) return this.cache;
    this.cache = await this.http.get("/tokens/registry");
    return this.cache;
  }
  invalidate() {
    this.cache = null;
  }
  /** Find a payment option by token symbol e.g. "TYI_MOCK_USD" */
  async getOption(token) {
    const registry = await this.get();
    const option = registry.payment_options.find((o) => o.token === token);
    if (!option) throw new Error(`Token not supported: ${token}`);
    return option;
  }
  /** Get chain entry for a token on a specific chain_id */
  async getChainEntry(token, chainId) {
    const option = await this.getOption(token);
    const entry = option.chains.find((c) => c.chain_id === chainId);
    if (!entry)
      throw new Error(`Token ${token} not supported on chain ${chainId}`);
    return entry;
  }
  /** Get vault ABI parsed */
  async getVaultAbi() {
    const registry = await this.get();
    return JSON.parse(registry.vault_abi);
  }
};

// src/client.ts
var DEFAULT_BASE_URL = "https://gateway.universalgasframework.com";
var UGFClient = class {
  http;
  auth;
  quote;
  status;
  registry;
  payment;
  chains;
  constructor(config = {}) {
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.http = new HttpClient(baseUrl);
    if (config.token) this.http.setToken(config.token);
    this.auth = new Auth(this.http);
    this.quote = new Quote(this.http);
    this.status = new Status(this.http);
    this.registry = new Registry(this.http);
    this.payment = {
      x402: new X402Payment(this.http, this.registry),
      vault: new VaultPayment(this.http, this.registry)
    };
    this.chains = {
      evm: new EvmChain(this.http)
    };
  }
};
export {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_TYPE,
  TYI_USD_PAYMENT_COIN,
  UGFAuthError,
  UGFClient,
  UGFError,
  UGFSignatureError,
  UGFTimeoutError
};
