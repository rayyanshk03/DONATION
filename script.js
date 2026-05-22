/**
 * script.js — Main entry point.
 * Wires up UI events and delegates to WalletContext / wallet.js.
 */
function initApp() {
    // Render dynamic causes grid
    renderCauses();
    // Wire donate form preset buttons & submit
    initDonateForm();
    if (typeof initRealtime === 'function') {
        initRealtime();
    }


    // ── Elements ──────────────────────────────────────────────────────────────
    const connectWalletBtn    = document.getElementById('connectWalletBtn');
    const closeModalBtn       = document.getElementById('closeModalBtn');
    const walletModal         = document.getElementById('walletModal');
    const connectMetaMaskBtn  = document.getElementById('connectMetaMask');
    const connectWCBtn        = document.getElementById('connectWalletConnect');
    const connectCBBtn        = document.getElementById('connectCoinbase');

    // ── Hero CTA ──────────────────────────────────────────────────────────────
    connectWalletBtn.addEventListener('click', () => {
        const { isConnected } = WalletContext.getState();

        if (isConnected) {
            // Already connected → scroll straight to causes
            document.getElementById('causesSection')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            openWalletModal();
        }
    });

    // ── Modal close ───────────────────────────────────────────────────────────
    closeModalBtn.addEventListener('click', closeWalletModal);

    walletModal.addEventListener('click', (e) => {
        if (e.target === walletModal) closeWalletModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeWalletModal();
    });

    // ── Wallet option buttons ─────────────────────────────────────────────────
    async function handleWalletClick(btn, connectFn) {
        // Show loading spinner on the clicked option
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('loading');
        btn.querySelector('.wallet-arrow').innerHTML = `
            <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>`;

        const success = await connectFn();

        // Restore button state (modal will close automatically if connected)
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.innerHTML = originalHTML;
    }

    connectMetaMaskBtn.addEventListener('click', () =>
        handleWalletClick(connectMetaMaskBtn, connectMetaMask));

    connectWCBtn.addEventListener('click', () =>
        handleWalletClick(connectWCBtn, connectWalletConnect));

    connectCBBtn.addEventListener('click', () =>
        handleWalletClick(connectCBBtn, connectCoinbase));

    // ── Restore connection from sessionStorage (optional UX) ─────────────────
    // If the user had previously connected MetaMask and still has permission,
    // silently re-connect without prompting.
    (async () => {
        try {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer   = await provider.getSigner();
                    const network  = await provider.getNetwork();
                    const address  = await signer.getAddress();

                    WalletContext.setState({
                        provider,
                        signer,
                        address,
                        chainId: Number(network.chainId),
                        isConnected: true,
                        walletType: 'metamask',
                    });

                    window.listenForAccountChanges(window.ethereum);
                    // Don't show toast or scroll — silent reconnect
                }
            }
        } catch (e) {
            // Silent fail — user will connect manually
        }
    })();

}
initApp();
