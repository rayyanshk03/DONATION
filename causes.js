// ─── Causes Data ─────────────────────────────────────────────────────────────
// raisedUgc / goalUgc are in whole UGC units (no decimals shown in the UI).
// loadOnChainStats() overwrites raisedUgc + donorCount live from the contract.
const CAUSES = [
    {
        id: 1,
        name: "Plant Trees",
        description: "Restore forests and fight climate change one tree at a time across six continents.",
        address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        icon: "🌳",
        tag: "Environmental",
        raisedUgc:  12400,
        goalUgc:    50000,
        donorCount: 184,
        featured: false,
    },
    {
        id: 2,
        name: "Clean Water",
        description: "Bring safe drinking water to communities in need — no one should die of thirst.",
        address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
        icon: "💧",
        tag: "Humanitarian",
        raisedUgc:  44100,
        goalUgc:   100000,
        donorCount: 512,
        featured: true,
    },
    {
        id: 3,
        name: "Education Fund",
        description: "Empower the next generation with access to quality education and digital literacy.",
        address: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
        icon: "📚",
        tag: "Education",
        raisedUgc:   8200,
        goalUgc:    30000,
        donorCount: 97,
        featured: false,
    },
];

// ─── State ────────────────────────────────────────────────────────────────────
let selectedCauseId = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncAddr(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function pct(raised, goal) {
    return Math.min(100, Math.round((raised / goal) * 100));
}

/** Format a UGC whole-unit number as "12,400 UGC" */
function formatUgc(amount) {
    return `${Number(amount).toLocaleString('en-US')} UGC`;
}

const COPY_ICON  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 0 2 2v1"></path></svg>`;
const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

// ─── Render ───────────────────────────────────────────────────────────────────
function renderCauses() {
    const grid = document.getElementById('causesGrid');
    if (!grid) return;

    grid.innerHTML = CAUSES.map(cause => {
        const percent  = pct(cause.raisedUgc, cause.goalUgc);
        const selected = cause.id === selectedCauseId;

        return `
        <div class="cause-card${cause.featured ? ' featured' : ''}${selected ? ' selected' : ''}"
             id="cause-card-${cause.id}"
             data-cause-id="${cause.id}"
             role="button"
             tabindex="0"
             aria-pressed="${selected}"
             aria-label="Select ${cause.name}">

            ${cause.featured ? `<div class="cause-badge-tag">🔥 Trending</div>` : ''}

            ${selected ? `
            <div class="cause-checkmark" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>` : ''}

            <div class="cause-top">
                <div class="cause-icon-wrap">
                    <span class="cause-icon">${cause.icon}</span>
                </div>
                <span class="cause-tag-pill">${cause.tag}</span>
            </div>

            <h3 class="cause-name">${cause.name}</h3>
            <p class="cause-desc">${cause.description}</p>

            <div class="cause-address">
                <span class="address-label">Destination wallet</span>
                <div class="address-row">
                    <code class="address-text" title="${cause.address}">${truncAddr(cause.address)}</code>
                    <button class="copy-btn"
                            data-address="${cause.address}"
                            aria-label="Copy wallet address"
                            title="Copy full address">
                        ${COPY_ICON}
                    </button>
                </div>
            </div>

            <div class="cause-progress" id="cause-progress-${cause.id}">
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${percent}%"></div>
                </div>
                <div class="progress-stats">
                    <span><strong class="raised-label">${formatUgc(cause.raisedUgc)}</strong> raised</span>
                    <span class="progress-pct">${percent}%</span>
                </div>
                <div class="progress-meta">
                    <span class="donor-count">👥 <span class="donor-count-val">${cause.donorCount.toLocaleString()}</span> donors</span>
                    <span class="goal-label">Goal: ${formatUgc(cause.goalUgc)}</span>
                </div>
            </div>

            <button class="donate-cause-btn${selected ? ' selected-btn' : ''}"
                    data-cause-id="${cause.id}">
                ${selected
                    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Selected`
                    : `Donate to this Cause →`}
            </button>
        </div>`;
    }).join('');

    attachCauseListeners();

    // Overlay live on-chain stats (non-blocking — falls back to CAUSES defaults)
    loadOnChainStats();
}

// ─── On-chain stats loader ────────────────────────────────────────────────────
/**
 * Reads totalDonated + donorCount for every cause in one eth_call via getCauses().
 * Patches only the progress DOM nodes — no full re-render, no flicker.
 * Silently no-ops when the contract address is still a placeholder or the
 * provider is unavailable.
 */
async function loadOnChainStats() {
    // Need a provider — use WalletContext if connected, else window.ethereum
    let provider;
    if (typeof WalletContext !== 'undefined' && WalletContext.getState().provider) {
        provider = WalletContext.getState().provider;
    } else if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
    } else {
        return; // no provider — keep static defaults
    }

    // Guard: don't attempt if the address is still a placeholder
    if (
        typeof DONATION_CONTRACT_ADDRESS === 'undefined' ||
        DONATION_CONTRACT_ADDRESS.includes('YourDonation')
    ) return;

    try {
        const MANAGER_ABI = [
            'function getCauses(uint256[] causeIds) view returns (address[] wallets, uint256[] donated, uint256[] numDonors)',
            'function decimals() view returns (uint8)',  // not on manager, but token
        ];
        const UGC_DECIMALS_ABI = ['function decimals() view returns (uint8)'];

        const manager   = new ethers.Contract(DONATION_CONTRACT_ADDRESS, MANAGER_ABI, provider);
        const causeIds  = CAUSES.map(c => c.id);

        // Read UGC token decimals (needed to convert wei → whole units)
        let decimals = 18n; // safe default
        try {
            const token = new ethers.Contract(
                typeof UGC_TOKEN_ADDRESS !== 'undefined' ? UGC_TOKEN_ADDRESS : ethers.ZeroAddress,
                UGC_DECIMALS_ABI,
                provider
            );
            decimals = await token.decimals();
        } catch { /* use 18 */ }

        const { donated, numDonors } = await manager.getCauses(causeIds);

        CAUSES.forEach((cause, i) => {
            const rawDonated = donated[i];     // BigInt in token-wei
            const rawDonors  = numDonors[i];   // BigInt

            // Convert from token-wei to whole UGC units (integer for display)
            const raisedUgc = Number(ethers.formatUnits(rawDonated, decimals));
            const donors    = Number(rawDonors);

            // Patch in-memory CAUSES so re-renders stay consistent
            cause.raisedUgc  = raisedUgc;
            cause.donorCount = donors;

            // Patch the DOM directly — much cheaper than re-rendering all cards
            const progressEl = document.getElementById(`cause-progress-${cause.id}`);
            if (!progressEl) return;

            const percent = pct(raisedUgc, cause.goalUgc);

            const fillEl     = progressEl.querySelector('.progress-fill');
            const raisedEl   = progressEl.querySelector('.raised-label');
            const pctEl      = progressEl.querySelector('.progress-pct');
            const donorValEl = progressEl.querySelector('.donor-count-val');

            if (fillEl)     fillEl.style.width    = `${percent}%`;
            if (raisedEl)   raisedEl.textContent   = formatUgc(raisedUgc);
            if (pctEl)      pctEl.textContent       = `${percent}%`;
            if (donorValEl) donorValEl.textContent  = donors.toLocaleString('en-US');
        });

    } catch (err) {
        // Contract not deployed yet or wrong network — static defaults remain
        console.warn('[CauseGrid] loadOnChainStats failed:', err.shortMessage || err.message);
    }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
function attachCauseListeners() {
    // Whole-card click → select
    document.querySelectorAll('.cause-card').forEach(card => {
        card.addEventListener('click', e => {
            if (e.target.closest('.copy-btn')) return; // let copy handle itself
            selectCause(parseInt(card.dataset.causeId));
        });
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectCause(parseInt(card.dataset.causeId));
            }
        });
    });

    // Donate buttons (redundant with card click but explicit)
    document.querySelectorAll('.donate-cause-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            selectCause(parseInt(btn.dataset.causeId));
        });
    });

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            const address = btn.dataset.address;
            try {
                await navigator.clipboard.writeText(address);
                btn.classList.add('copied');
                btn.innerHTML = CHECK_ICON;
                btn.title = 'Copied!';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = COPY_ICON;
                    btn.title = 'Copy full address';
                }, 2000);
            } catch {
                // Fallback for browsers without clipboard API
                const ta = document.createElement('textarea');
                ta.value = address;
                ta.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                showToast('Address copied!', 'success');
            }
        });
    });
}

// ─── Selection ────────────────────────────────────────────────────────────────
function selectCause(causeId) {
    selectedCauseId = causeId;
    renderCauses(); // re-render to apply selected state

    const cause = CAUSES.find(c => c.id === causeId);
    if (!cause) return;

    // Delegate to donate.js
    if (typeof onCauseSelected === 'function') onCauseSelected(cause);

    // Smooth scroll to donate form
    setTimeout(() => {
        document.getElementById('donateSection')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
}

// initDonateForm is now fully handled by donate.js
