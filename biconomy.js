/**
 * biconomy.js — Account Abstraction layer (Biconomy v4 compatible)
 * ─────────────────────────────────────────────────────────────────
 * This module replaces the Biconomy v4 npm SDK for vanilla-JS environments.
 * It speaks the same JSON-RPC surface the SDK uses internally:
 *
 *   Paymaster RPC  →  pm_sponsorUserOperation
 *   Bundler  RPC  →  eth_sendUserOperation
 *   Bundler  RPC  →  eth_getUserOperationReceipt  (polling)
 *
 * Usage (called from donate.js):
 *
 *   const receipt = await sendBiconomyDonation({
 *     signer,          // ethers.js Signer (MetaMask / WalletConnect)
 *     chainId,         // number
 *     to,              // DonationManager address
 *     data,            // encoded calldata
 *   });
 *   // receipt.transactionHash is the mined tx hash
 *
 * Environment — set these two constants below (or read from a config object):
 *
 *   BICONOMY_BUNDLER_URL   — from Biconomy dashboard  (chain-specific)
 *   BICONOMY_PAYMASTER_URL — from Biconomy dashboard  (chain-specific)
 *
 * Both URLs already embed your Biconomy API key, so no extra auth header needed.
 */

// ─── ⚠  Configure your Biconomy URLs here ───────────────────────────────────
// Supports Vite env variables, process env, or hardcoded defaults.
const BICONOMY_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BICONOMY_API_KEY)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_BICONOMY_API_KEY)
    || 'YOUR_API_KEY';

let BICONOMY_BUNDLER_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BICONOMY_BUNDLER_URL)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_BICONOMY_BUNDLER_URL)
    || 'https://bundler.biconomy.io/api/v2/11155111/YOUR_API_KEY';

let BICONOMY_PAYMASTER_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BICONOMY_PAYMASTER_URL)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_BICONOMY_PAYMASTER_URL)
    || 'https://paymaster.biconomy.io/api/v1/11155111/YOUR_API_KEY';

// Dynamically inject BICONOMY_API_KEY if the URL has the YOUR_API_KEY placeholder
if (BICONOMY_BUNDLER_URL.includes('YOUR_API_KEY') && BICONOMY_API_KEY !== 'YOUR_API_KEY') {
    BICONOMY_BUNDLER_URL = BICONOMY_BUNDLER_URL.replace('YOUR_API_KEY', BICONOMY_API_KEY);
}
if (BICONOMY_PAYMASTER_URL.includes('YOUR_API_KEY') && BICONOMY_API_KEY !== 'YOUR_API_KEY') {
    BICONOMY_PAYMASTER_URL = BICONOMY_PAYMASTER_URL.replace('YOUR_API_KEY', BICONOMY_API_KEY);
}

// ERC-4337 EntryPoint v0.6 — same address on all EVM chains
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

// Biconomy Simple Account factory v1 — deterministic across EVM chains
const SA_FACTORY   = '0x000000a56Aaca3e9a4C479ea6b6CD0DbcB6634F5';
const SA_INIT_CODE_PREFIX = '0x000000a56Aaca3e9a4C479ea6b6CD0DbcB6634F5';

// ─── ABI fragments needed for on-chain calls ─────────────────────────────────
const ENTRY_POINT_ABI = [
    'function getNonce(address sender, uint192 key) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
];
const SA_FACTORY_ABI = [
    'function getAddressForCounterFactualAccount(address owner, uint256 index) view returns (address)',
    'function deployCounterFactualAccount(address owner, uint256 index) returns (address)',
];

// ─── JSON-RPC helpers ────────────────────────────────────────────────────────

async function rpc(url, method, params) {
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) throw new Error(`RPC HTTP ${resp.status}: ${url}`);
    const body = await resp.json();
    if (body.error) {
        const e = new Error(body.error.message ?? JSON.stringify(body.error));
        e.code = body.error.code;
        throw e;
    }
    return body.result;
}

// ─── Smart Account address (counterfactual) ───────────────────────────────────

/**
 * Returns the deterministic Smart Account address for an EOA owner.
 * The account may or may not be deployed yet — that's fine for ERC-4337.
 */
async function getSmartAccountAddress(provider, ownerAddress) {
    const factory = new ethers.Contract(SA_FACTORY, SA_FACTORY_ABI, provider);
    return factory.getAddressForCounterFactualAccount(ownerAddress, 0);
}

// ─── Calldata encoding ────────────────────────────────────────────────────────

/**
 * Encodes a call through the Smart Account's execute() function.
 * Biconomy Simple Account ABI: execute(address dest, uint256 value, bytes calldata func)
 */
function encodeExecute(to, calldata) {
    const iface = new ethers.Interface([
        'function execute(address dest, uint256 value, bytes calldata func)',
    ]);
    return iface.encodeFunctionData('execute', [to, 0n, calldata]);
}

/**
 * Encodes multiple calls through the Smart Account's executeBatch() function.
 * Biconomy Simple Account ABI: executeBatch(address[] dest, uint256[] value, bytes[] func)
 */
function encodeExecuteBatch(to, calldata) {
    const iface = new ethers.Interface([
        'function executeBatch(address[] dest, uint256[] value, bytes[] func)',
    ]);
    const values = new Array(to.length).fill(0n);
    return iface.encodeFunctionData('executeBatch', [to, values, calldata]);
}

// ─── Init code (deploys the Smart Account on first use) ───────────────────────

function encodeInitCode(ownerAddress) {
    const factoryIface = new ethers.Interface(SA_FACTORY_ABI);
    const initCalldata = factoryIface.encodeFunctionData(
        'deployCounterFactualAccount',
        [ownerAddress, 0]
    );
    return ethers.concat([SA_FACTORY, initCalldata.slice(2)]);
}

// ─── Nonce ────────────────────────────────────────────────────────────────────

async function getAccountNonce(provider, smartAccountAddress) {
    try {
        const ep = new ethers.Contract(ENTRY_POINT, ENTRY_POINT_ABI, provider);
        return await ep.getNonce(smartAccountAddress, 0);
    } catch {
        return 0n;
    }
}

// ─── UserOperation builder ────────────────────────────────────────────────────

/**
 * Builds an unsigned ERC-4337 UserOperation, sponsors it via Biconomy paymaster,
 * then asks the user's EOA signer to sign it (one typed-data sign — no ETH tx).
 *
 * @param {object}  opts
 * @param {ethers.Signer}   opts.signer      EOA signer (MetaMask / WalletConnect)
 * @param {ethers.Provider} opts.provider    Read-only provider
 * @param {number}          opts.chainId
 * @param {string|string[]} opts.to          Target contract address or array of addresses for batch
 * @param {string|string[]} opts.data        Encoded calldata for the target or array of calldata for batch
 * @returns {Promise<string>}                userOpHash (before mining)
 */
async function buildAndSignUserOp({ signer, provider, chainId, to, data }) {
    const ownerAddress    = await signer.getAddress();
    const smartAccAddress = await getSmartAccountAddress(provider, ownerAddress);

    // Check if Smart Account is already deployed
    const code    = await provider.getCode(smartAccAddress);
    const isDeployed = code !== '0x';
    const initCode = isDeployed ? '0x' : encodeInitCode(ownerAddress);

    const nonce       = await getAccountNonce(provider, smartAccAddress);
    const callData    = Array.isArray(to) ? encodeExecuteBatch(to, data) : encodeExecute(to, data);

    // Partial UserOp — gas values are placeholders until paymaster fills them
    const partialUserOp = {
        sender:               smartAccAddress,
        nonce:                ethers.toBeHex(nonce),
        initCode,
        callData,
        callGasLimit:         ethers.toBeHex(300_000),
        verificationGasLimit: ethers.toBeHex(500_000),
        preVerificationGas:   ethers.toBeHex(50_000),
        maxFeePerGas:         ethers.toBeHex(ethers.parseUnits('20', 'gwei')),
        maxPriorityFeePerGas: ethers.toBeHex(ethers.parseUnits('1', 'gwei')),
        paymasterAndData:     '0x',
        signature:            '0x',
    };

    // ── Step 1: Sponsor gas via Biconomy Paymaster ────────────────────────────
    // The paymaster returns paymasterAndData (its signature + gas params).
    const sponsored = await rpc(BICONOMY_PAYMASTER_URL, 'pm_sponsorUserOperation', [
        partialUserOp,
        { mode: 'SPONSORED', calculateGasLimits: true },
    ]);

    const sponsoredOp = {
        ...partialUserOp,
        callGasLimit:         sponsored.callGasLimit         ?? partialUserOp.callGasLimit,
        verificationGasLimit: sponsored.verificationGasLimit ?? partialUserOp.verificationGasLimit,
        preVerificationGas:   sponsored.preVerificationGas   ?? partialUserOp.preVerificationGas,
        maxFeePerGas:         sponsored.maxFeePerGas          ?? partialUserOp.maxFeePerGas,
        maxPriorityFeePerGas: sponsored.maxPriorityFeePerGas ?? partialUserOp.maxPriorityFeePerGas,
        paymasterAndData:     sponsored.paymasterAndData      ?? '0x',
    };

    // ── Step 2: Sign the UserOperation ───────────────────────────────────────
    // ERC-4337 signature: keccak256(abi.encode(userOpHash, entryPoint, chainId))
    // We use eth_sign over the packed hash (same as Biconomy SDK's default).
    const userOpHash = computeUserOpHash(sponsoredOp, chainId);
    const rawSig     = await signer.signMessage(ethers.getBytes(userOpHash));

    return { ...sponsoredOp, signature: rawSig };
}

/**
 * Computes the ERC-4337 UserOperation hash.
 * Matches EntryPoint v0.6 on-chain logic.
 */
function computeUserOpHash(op, chainId) {
    const packed = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address','uint256','bytes32','bytes32','uint256','uint256','uint256','uint256','uint256','bytes32'],
        [
            op.sender,
            BigInt(op.nonce),
            ethers.keccak256(op.initCode),
            ethers.keccak256(op.callData),
            BigInt(op.callGasLimit),
            BigInt(op.verificationGasLimit),
            BigInt(op.preVerificationGas),
            BigInt(op.maxFeePerGas),
            BigInt(op.maxPriorityFeePerGas),
            ethers.keccak256(op.paymasterAndData),
        ]
    );
    const opHash = ethers.keccak256(packed);
    return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes32','address','uint256'],
            [opHash, ENTRY_POINT, chainId]
        )
    );
}

// ─── Send + poll ──────────────────────────────────────────────────────────────

/**
 * Submits a signed UserOperation to the bundler and polls for the receipt.
 *
 * The `onOpSubmitted` callback fires immediately after submission succeeds,
 * before polling begins. This lets the UI display the UserOp hash straight
 * away while the tx is still mining.
 *
 * @param {object}   signedOp       Fully signed ERC-4337 UserOperation
 * @param {string}   opHash         UserOperation hash
 * @param {Function} onOpSubmitted  Called with (opHash) right after submission
 * @returns {Promise<{transactionHash: string}>}
 */
async function sendAndWaitForUserOp(signedOp, opHash, onOpSubmitted) {
    // Submit to bundler
    await rpc(BICONOMY_BUNDLER_URL, 'eth_sendUserOperation', [signedOp, ENTRY_POINT]);

    // Notify the UI immediately — the UserOp is in the mempool
    if (typeof onOpSubmitted === 'function') onOpSubmitted(opHash);

    // Poll for receipt (30 attempts × 3 s = 90 s max)
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
            const receipt = await rpc(
                BICONOMY_BUNDLER_URL,
                'eth_getUserOperationReceipt',
                [opHash]
            );
            if (receipt?.receipt?.transactionHash) {
                return receipt.receipt;
            }
        } catch { /* not mined yet — keep polling */ }
    }
    throw new Error('UserOperation timed out after 90 s. Check the bundler dashboard.');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full AA donation flow — called from donate.js Phase 3.
 *
 * 1. Sponsors gas via Biconomy paymaster (no ETH from user)
 * 2. Asks the user to sign the UserOperation (one wallet popup, no tx)
 * 3. Immediately calls onOpSubmitted(opHash) after bundler accepts the op
 * 4. Polls until mined, then resolves with { transactionHash }
 *
 * @param {object}   opts
 * @param {ethers.Signer}   opts.signer
 * @param {ethers.Provider} opts.provider
 * @param {number}          opts.chainId
 * @param {string}          opts.to             DonationManager address
 * @param {string}          opts.data           Encoded function calldata
 * @param {Function}        opts.onOpSubmitted  (opHash: string) => void
 * @returns {Promise<{transactionHash: string}>}
 */
async function sendBiconomyDonation({ signer, provider, chainId, to, data, onOpSubmitted }) {
    // Guard: if URLs aren't configured, throw a clear developer error
    if (
        BICONOMY_BUNDLER_URL.includes('YOUR_API_KEY') ||
        BICONOMY_PAYMASTER_URL.includes('YOUR_API_KEY')
    ) {
        throw new Error(
            'Biconomy not configured. Set BICONOMY_BUNDLER_URL and BICONOMY_PAYMASTER_URL in biconomy.js.'
        );
    }

    const signedOp = await buildAndSignUserOp({ signer, provider, chainId, to, data });
    const opHash   = computeUserOpHash(signedOp, chainId);
    return sendAndWaitForUserOp(signedOp, opHash, onOpSubmitted);
}
