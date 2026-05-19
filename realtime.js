const API_BASE = (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_BACKEND_URL)
    || 'http://localhost:4000';

const WS_URL = (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_WS_URL)
    || API_BASE.replace(/^http/, 'ws') + '/ws';

let ws;
let wsRetry = 0;
let wsTimer;

function setFeedStatus(text, isLive = false) {
    const el = document.getElementById('feedStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('live', isLive);
}

async function apiGet(path, timeout = 8000) {
    const resp = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(timeout) });
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    return resp.json();
}

function formatUsd(amount) {
    return `$${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function shortAddr(addr) {
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
}

function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'just now';
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    return `${hours}h ago`;
}

function renderFeed(donations) {
    const list = document.getElementById('liveFeedList');
    const empty = document.getElementById('liveFeedEmpty');
    if (!list) return;
    list.innerHTML = '';
    if (!donations || donations.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    donations.forEach(d => {
        const li = document.createElement('li');
        li.className = 'feed-item';
        li.innerHTML = `
            <div class="feed-main">
                <span class="feed-amount">${formatUsd(d.amount)}</span>
                <span class="feed-cause">${d.causeName || 'Unknown Cause'}</span>
            </div>
            <div class="feed-sub">
                <span class="feed-donor">${shortAddr(d.donor)}</span>
                <span class="feed-time">${relativeTime(d.timestamp)}</span>
            </div>`;
        list.appendChild(li);
    });
}

function prependDonation(donation) {
    const list = document.getElementById('liveFeedList');
    const empty = document.getElementById('liveFeedEmpty');
    if (!list) return;
    if (empty) empty.style.display = 'none';
    const li = document.createElement('li');
    li.className = 'feed-item feed-item--highlight';
    li.innerHTML = `
        <div class="feed-main">
            <span class="feed-amount">${formatUsd(donation.amount)}</span>
            <span class="feed-cause">${donation.causeName || 'Unknown Cause'}</span>
        </div>
        <div class="feed-sub">
            <span class="feed-donor">${shortAddr(donation.donor)}</span>
            <span class="feed-time">just now</span>
        </div>`;
    list.prepend(li);
    while (list.children.length > 20) {
        list.removeChild(list.lastChild);
    }
    setTimeout(() => li.classList.remove('feed-item--highlight'), 1200);
}

function renderLeaderboard(entries) {
    const list = document.getElementById('leaderboardList');
    const empty = document.getElementById('leaderboardEmpty');
    if (!list) return;
    list.innerHTML = '';
    if (!entries || entries.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    entries.forEach((entry, idx) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-item';
        li.innerHTML = `
            <span class="lb-rank">#${idx + 1}</span>
            <span class="lb-wallet">${shortAddr(entry.wallet)}</span>
            <span class="lb-amount">${formatUsd(entry.totalDonated)}</span>`;
        list.appendChild(li);
    });
}

function renderAnalytics(stats) {
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    set('statTotalDonated', formatUsd(stats.totalDonated));
    set('statTotalDonations', Number(stats.totalDonations).toLocaleString('en-US'));
    set('statUniqueDonors', Number(stats.uniqueDonors).toLocaleString('en-US'));
    set('statAvgDonation', formatUsd(stats.avgDonation));
    set('statActiveCauses', Number(stats.activeCauses).toLocaleString('en-US'));
    set('stat24hVolume', formatUsd(stats.last24hVolume));
}

async function loadFeed() {
    try {
        const data = await apiGet('/api/donations/feed');
        renderFeed(data.donations || []);
    } catch {
        renderFeed([]);
    }
}

async function loadLeaderboard() {
    try {
        const data = await apiGet('/api/leaderboard');
        renderLeaderboard(data.leaderboard || []);
    } catch {
        renderLeaderboard([]);
    }
}

async function loadAnalytics() {
    try {
        const data = await apiGet('/api/analytics/overview');
        renderAnalytics(data);
    } catch {
        // Keep placeholders
    }
}

function handleSocketMessage(message) {
    if (message.type === 'new_donation') {
        prependDonation(message);
        if (typeof showToast === 'function') {
            showToast(`New donation: ${formatUsd(message.amount)} to ${message.causeName}`, 'info');
        }
        loadAnalytics();
    }

    if (message.type === 'cause_update' && typeof applyCauseUpdate === 'function') {
        applyCauseUpdate(message);
    }

    if (message.type === 'leaderboard_invalidate') {
        loadLeaderboard();
    }
}

function connectWebsocket() {
    if (ws) {
        ws.close();
        ws = null;
    }

    setFeedStatus('Connecting…', false);
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        wsRetry = 0;
        setFeedStatus('Live', true);
    };

    ws.onmessage = (evt) => {
        try {
            const payload = JSON.parse(evt.data);
            handleSocketMessage(payload);
        } catch {}
    };

    ws.onclose = () => {
        setFeedStatus('Reconnecting…', false);
        const delay = Math.min(1000 * 2 ** wsRetry, 10000);
        wsRetry = Math.min(wsRetry + 1, 5);
        clearTimeout(wsTimer);
        wsTimer = setTimeout(connectWebsocket, delay);
    };

    ws.onerror = () => {
        ws?.close();
    };
}

function initRealtime() {
    if (typeof refreshCausesFromBackend === 'function') {
        refreshCausesFromBackend();
    }
    loadFeed();
    loadLeaderboard();
    loadAnalytics();
    connectWebsocket();
}

window.initRealtime = initRealtime;
