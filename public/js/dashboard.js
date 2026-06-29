document.addEventListener('DOMContentLoaded', () => {
  // 1. Session check
  const savedUsername = localStorage.getItem('username');
  if (!savedUsername) {
    window.location.href = '/login';
    return;
  }

  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  const urlUsername = urlParams.get('username');
  if (urlUsername !== savedUsername) {
    window.location.href = `/dashboard?username=${savedUsername}`;
    return;
  }

  // 2. Element references
  const accessDeniedScreen = document.getElementById('accessDeniedScreen');
  const unregisteredUsername = document.getElementById('unregisteredUsername');
  const authorizedPanel = document.getElementById('authorizedPanel');
  
  // Header / API Status
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const apiStatusDot = document.getElementById('apiStatusDot');
  const apiStatusText = document.getElementById('apiStatusText');

  // Profile fields
  const profileLetter = document.getElementById('profileLetter');
  const profileUsername = document.getElementById('profileUsername');
  const profileRole = document.getElementById('profileRole');
  const profileExpiry = document.getElementById('profileExpiry');
  
  const profileLetterBig = document.getElementById('profileLetterBig');
  const profileUsernameBig = document.getElementById('profileUsernameBig');
  const profileRoleBig = document.getElementById('profileRoleBig');
  const profileDetailsList = document.getElementById('profileDetailsList');

  // Stats
  const privateSendersCount = document.getElementById('privateSendersCount');
  const privateStatusPulse = document.getElementById('privateStatusPulse');
  const publicSendersCount = document.getElementById('publicSendersCount');
  const publicStatusPulse = document.getElementById('publicStatusPulse');
  const statCardPrivate = document.getElementById('statCardPrivate');
  const statCardPublic = document.getElementById('statCardPublic');

  // Senders List Manager
  const addSenderButton = document.getElementById('addSenderButton');
  const privateSendersListWrapper = document.getElementById('privateSendersListWrapper');
  const publicSendersListWrapper = document.getElementById('publicSendersListWrapper');

  // Execution Selector elements
  const senderCardsContainer = document.getElementById('senderCardsContainer');
  const btnSenderGlobal = document.getElementById('btnSenderGlobal');
  const btnSenderPrivate = document.getElementById('btnSenderPrivate');
  const globalSenderSubtext = document.getElementById('globalSenderSubtext');
  const privateSenderSubtext = document.getElementById('privateSenderSubtext');
  const senderSummaryTitle = document.getElementById('senderSummaryTitle');
  const senderSummaryCount = document.getElementById('senderSummaryCount');

  // Execution
  const execForm = document.getElementById('execForm');
  const targetPhoneInput = document.getElementById('targetPhoneInput');
  const protocolDropdownTrigger = document.getElementById('protocolDropdownTrigger');
  const selectedProtocolText = document.getElementById('selectedProtocolText');
  const dropdownArrow = document.getElementById('dropdownArrow');
  const protocolDropdownMenu = document.getElementById('protocolDropdownMenu');
  const executeButton = document.getElementById('executeButton');
  const offlineWarningText = document.getElementById('offlineWarningText');

  // Logs
  const logsCountText = document.getElementById('logsCountText');
  const logsWrapper = document.getElementById('logsWrapper');

  // Nav Buttons
  const navButtons = document.querySelectorAll('.nav-tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Modal Senders Pairing
  const pairingModal = document.getElementById('pairingModal');
  const pairingModalBackdrop = document.getElementById('pairingModalBackdrop');
  const pairingStepPhone = document.getElementById('pairingStepPhone');
  const pairingPhoneForm = document.getElementById('pairingPhoneForm');
  const pairingPhoneInput = document.getElementById('pairingPhoneInput');
  const pairingOfflineText = document.getElementById('pairingOfflineText');

  const pairingStepCode = document.getElementById('pairingStepCode');
  const pairingCodeDisplay = document.getElementById('pairingCodeDisplay');
  const pairingTargetDisplay = document.getElementById('pairingTargetDisplay');
  const countdownTimer = document.getElementById('countdownTimer');
  const pairingBackButton = document.getElementById('pairingBackButton');
  const pairingConfirmButton = document.getElementById('pairingConfirmButton');

  const pairingStepSuccess = document.getElementById('pairingStepSuccess');

  // Sidebar
  const openSidebarButton = document.getElementById('openSidebarButton');
  const closeSidebarButton = document.getElementById('closeSidebarButton');
  const sidebarDrawer = document.getElementById('sidebarDrawer');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const adminPanelLinkWrapper = document.getElementById('adminPanelLinkWrapper');
  const logoutButton = document.getElementById('logoutButton');

  // Toast
  const toastContainer = document.getElementById('toastContainer');

  // 3. Global states
  let activeTab = 'dashboard';
  let senders = [];
  let isServerOnline = true;
  let selectedProtocol = 'A';
  let selectedSender = null;
  let selectedSenderType = 'global';
  let countdownSeconds = 0;
  let countdownInterval = null;
  let lastLogsJson = '';
  let lastDetailsJson = '';

  // Initialize
  initDashboard();

  async function initDashboard() {
    try {
      // Credit integrity check
      try {
        const verifyRes = await fetch('/api/system/verify');
        const verifyData = await verifyRes.json();
        if (!verifyData.valid) {
          localStorage.clear();
          window.location.href = '/login';
          return;
        }
      } catch (e) {
        console.error('Credit verification failed:', e);
      }

      const res = await fetch(`/api/dashboard/init?username=${savedUsername}`);
      const data = await res.json();
      
      if (!res.ok || !data.user) {
        // Clear invalid session and redirect to login page
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      const user = data.user;
      const today = new Date().toISOString().substring(0, 10);
      const isExpired = user.activeUntil && today > user.activeUntil;

      if (isExpired && user.status !== 'Owner') {
        const expiredScreen = document.getElementById('expiredScreen');
        const expiredUsername = document.getElementById('expiredUsername');
        const expiredDateText = document.getElementById('expiredDateText');
        if (expiredUsername) expiredUsername.innerText = user.username;
        if (expiredDateText) expiredDateText.innerText = user.activeUntil;

        accessDeniedScreen.classList.add('hidden');
        authorizedPanel.classList.add('hidden');
        if (expiredScreen) expiredScreen.classList.remove('hidden');
        return;
      }

      // Render elements
      accessDeniedScreen.classList.add('hidden');
      authorizedPanel.classList.remove('hidden');

      // Populate data initially
      syncDashboardDataWithPayload(data);

      // Render Senders initial
      updateSendersView();

      // Populate dynamic payloads dropdown
      await loadPayloadsDropdown();

      // Start Polling WhatsApp status & dashboard stats in background
      pollSendersStatus();
      setInterval(pollSendersStatus, 5000);
      
      // Start Realtime Background Sync (sync every 3 seconds)
      setInterval(syncDashboardData, 3000);

      // Show Home Tab initially
      switchTab('dashboard');

    } catch (err) {
      console.error(err);
      triggerToast('FAILED TO INITIALIZE DASHBOARD', 'info');
    }
  }

  // Realtime dynamic sync without page refresh
  async function syncDashboardData() {
    try {
      const res = await fetch(`/api/dashboard/init?username=${savedUsername}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.user) return;

      const user = data.user;
      const today = new Date().toISOString().substring(0, 10);
      const isExpired = user.activeUntil && today > user.activeUntil;

      if (isExpired && user.status !== 'Owner') {
        const expiredScreen = document.getElementById('expiredScreen');
        const expiredUsername = document.getElementById('expiredUsername');
        const expiredDateText = document.getElementById('expiredDateText');
        if (expiredUsername) expiredUsername.innerText = user.username;
        if (expiredDateText) expiredDateText.innerText = user.activeUntil;

        accessDeniedScreen.classList.add('hidden');
        authorizedPanel.classList.add('hidden');
        if (expiredScreen) expiredScreen.classList.remove('hidden');
        return;
      }
      
      syncDashboardDataWithPayload(data);
    } catch (err) {
      console.error('Failed to sync dashboard:', err);
    }
  }

  function syncDashboardDataWithPayload(data) {
    const user = data.user;
    const history = data.history || [];
    senders = user.whatsappSenders || [];

    // Render developer credits dynamically
    if (data.credits && Array.isArray(data.credits)) {
      const devEl = document.getElementById('developerCredits');
      if (devEl) {
        const creditsHtml = data.credits.join('<br>');
        if (devEl.innerHTML !== creditsHtml) {
          devEl.innerHTML = creditsHtml;
        }
      }
    }

    // Render profile header fields
    const initial = (user.username || 'U')[0].toUpperCase();
    if (profileLetter && profileLetter.innerText !== initial) profileLetter.innerText = initial;
    if (profileLetterBig && profileLetterBig.innerText !== initial) profileLetterBig.innerText = initial;
    if (profileUsername && profileUsername.innerText !== user.username) profileUsername.innerText = user.username || 'GUEST';
    if (profileUsernameBig && profileUsernameBig.innerText !== user.username) profileUsernameBig.innerText = user.username || 'GUEST';
    
    const statusVal = user.status || 'USER';
    if (profileRole && profileRole.innerText !== statusVal) profileRole.innerText = statusVal;
    if (profileRoleBig && profileRoleBig.innerText !== statusVal) profileRoleBig.innerText = statusVal;
    
    const expiryText = `EXP ${user.activeUntil || 'N/A'}`;
    if (profileExpiry && profileExpiry.innerText !== expiryText) profileExpiry.innerText = expiryText;

    // Sidebar admin access menu check
    const hasAdminAccess = (user.status === 'Owner' || user.status === 'Reseller');
    const hasExistingAdminBtn = adminPanelLinkWrapper && adminPanelLinkWrapper.querySelector('a') !== null;
    if (hasAdminAccess && !hasExistingAdminBtn && adminPanelLinkWrapper) {
      adminPanelLinkWrapper.innerHTML = `
        <a href="/admin" class="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/30 transition-all group">
          <div class="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
          <div class="flex-1 min-w-0 text-left">
            <p class="text-[10px] font-bold tracking-[0.15em] text-red-300">ADMIN PANEL</p>
            <p class="text-[8px] tracking-[0.1em] text-zinc-500 font-semibold mt-0.5 uppercase">MANAGE USERS</p>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-red-400/60 group-hover:translate-x-0.5 transition-transform">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </a>
      `;
    } else if (!hasAdminAccess && adminPanelLinkWrapper) {
      adminPanelLinkWrapper.innerHTML = '';
    }

    // Profile details list block
    const details = [
      { label: 'USERNAME', value: user.username || 'Guest', icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>', color: 'text-red-400' },
      { label: 'ROLE', value: user.status || 'User', icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>', color: 'text-red-400' },
      { label: 'EXEC LIMIT', value: user.limit || 0, icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>', color: 'text-amber-400' },
      { label: 'EXPIRES', value: user.activeUntil || 'N/A', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', color: 'text-emerald-400' }
    ];

    const detailsJson = JSON.stringify(details);
    if (profileDetailsList && detailsJson !== lastDetailsJson) {
      lastDetailsJson = detailsJson;
      profileDetailsList.innerHTML = details.map((item, idx) => `
        <div class="flex items-center gap-3.5 py-4 ${idx === 0 ? 'pt-0' : ''} ${idx === details.length - 1 ? 'pb-0' : ''}">
          <div class="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${item.color}">${item.icon}</svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[9px] tracking-[0.15em] text-zinc-500 font-bold">${item.label}</p>
            <p class="text-[13px] font-bold text-zinc-200 tracking-wider truncate mt-0.5">${item.value}</p>
          </div>
        </div>
      `).join('');
    }

    // Render Logs (internally optimized in renderLogs to prevent redraw if identical)
    renderLogs(history);
  }

  // 4. Tab Switcher
  function switchTab(tabId) {
    activeTab = tabId;
    tabPanes.forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });

    navButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabId;
      const indicator = btn.querySelector('.active-indicator');
      const bg = btn.querySelector('.active-bg');
      const label = btn.querySelector('span');

      if (isTarget) {
        btn.classList.add('text-white');
        btn.classList.remove('text-zinc-600', 'hover:text-zinc-400', 'active:scale-95');
        indicator.classList.remove('opacity-0');
        indicator.classList.add('opacity-100');
        bg.classList.remove('opacity-0');
        bg.classList.add('opacity-100');
        label.classList.add('text-red-400');
      } else {
        btn.classList.remove('text-white');
        btn.classList.add('text-zinc-600', 'hover:text-zinc-400', 'active:scale-95');
        indicator.classList.add('opacity-0');
        indicator.classList.remove('opacity-100');
        bg.classList.add('opacity-0');
        bg.classList.remove('opacity-100');
        label.classList.remove('text-red-400');
      }
    });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // 5. Polling WhatsApp senders status
  async function pollSendersStatus() {
    try {
      const res = await fetch(`/api/senders?username=${savedUsername}`);
      if (res.ok) {
        const data = await res.json();
        if (data.whatsappSenders) {
          senders = data.whatsappSenders;
          updateSendersView();
        }
        setServerOnlineState(true);
      } else {
        setServerOnlineState(false);
      }
    } catch (err) {
      setServerOnlineState(false);
    }
  }

  function setServerOnlineState(online) {
    isServerOnline = online;
    if (online) {
      apiStatusBadge.className = "inline-flex items-center gap-1 text-[8px] font-bold tracking-wider text-emerald-400";
      apiStatusDot.className = "w-1 h-1 rounded-full bg-emerald-400 glow-dot";
      apiStatusText.innerText = "API ONLINE";
      
      executeButton.disabled = false;
      executeButton.classList.remove('opacity-50', 'cursor-not-allowed');
      offlineWarningText.classList.add('hidden');
      pairingOfflineText.classList.add('hidden');
    } else {
      apiStatusBadge.className = "inline-flex items-center gap-1 text-[8px] font-bold tracking-wider text-red-400 animate-pulse";
      apiStatusDot.className = "w-1 h-1 rounded-full bg-red-400";
      apiStatusText.innerText = "API OFFLINE";
      
      executeButton.disabled = true;
      executeButton.classList.add('opacity-50', 'cursor-not-allowed');
      offlineWarningText.classList.remove('hidden');
      pairingOfflineText.classList.remove('hidden');
    }
  }

  // 6. Update Senders List UI
  function updateSendersView() {
    // Split senders into Private and Public
    const privateSenders = senders.filter(s => (!s.owner || s.owner === savedUsername) && !s.isPublic);
    const publicSenders = senders.filter(s => s.isPublic);

    // Count online status for Private Senders
    const onlinePrivateList = privateSenders.filter(s => s.linked);
    privateSendersCount.innerText = onlinePrivateList.length;
    if (onlinePrivateList.length > 0) {
      privateStatusPulse.classList.remove('hidden');
    } else {
      privateStatusPulse.classList.add('hidden');
    }

    // Count online status for Public Senders
    const onlinePublicList = publicSenders.filter(s => s.linked);
    publicSendersCount.innerText = onlinePublicList.length;
    if (onlinePublicList.length > 0) {
      publicStatusPulse.classList.remove('hidden');
    } else {
      publicStatusPulse.classList.add('hidden');
    }

    // Render Private Senders list
    if (privateSenders.length === 0) {
      privateSendersListWrapper.innerHTML = `
        <div class="glass-subtle p-6 text-center border border-dashed border-zinc-805 rounded-xl">
          <p class="text-[10px] text-zinc-500 tracking-[0.15em] font-bold uppercase mb-1">No Private Senders Connected</p>
          <p class="text-[9px] text-zinc-600 leading-relaxed max-w-[280px] mx-auto">Link your first WhatsApp account using the Pairing Code method to start sending messages.</p>
        </div>
      `;
    } else {
      privateSendersListWrapper.innerHTML = privateSenders.map(sender => renderSenderCardHtml(sender, true)).join('');
    }

    // Render Public Senders list
    if (publicSenders.length === 0) {
      publicSendersListWrapper.innerHTML = `
        <div class="glass-subtle p-6 text-center border border-dashed border-zinc-805 rounded-xl">
          <p class="text-[10px] text-zinc-500 tracking-[0.15em] font-bold uppercase mb-1">No Public Senders Available</p>
          <p class="text-[9px] text-zinc-600 leading-relaxed max-w-[280px] mx-auto">No shared online public senders from other operators are currently available.</p>
        </div>
      `;
    } else {
      publicSendersListWrapper.innerHTML = publicSenders.map(sender => renderSenderCardHtml(sender, !sender.owner || sender.owner === savedUsername)).join('');
    }

    // Render selectable Cards in Execution Tab
    updateExecutionSenderCards();
  }

  function renderSenderCardHtml(sender, isOwn) {
    let actionButtonsHtml = '';
    if (isOwn) {
      actionButtonsHtml = `
        <button onclick="togglePublicSender('${sender.number}')" class="w-8 h-8 rounded-lg border ${sender.isPublic ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-zinc-800 text-zinc-500'} flex items-center justify-center hover:border-red-500/20 active:scale-95 transition-all" title="${sender.isPublic ? 'Make Private' : 'Make Public'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        </button>
        <button onclick="requestDisconnect('${sender.number}')" class="w-8 h-8 rounded-lg bg-zinc-950/40 border border-zinc-800/80 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-500/20 active:scale-95 transition-all" title="Disconnect">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;
    } else {
      actionButtonsHtml = `
        <span class="text-[8px] px-2 py-1 rounded border border-red-500/20 text-red-400 bg-red-500/5 tracking-wider font-extrabold uppercase">
          PUBLIC
        </span>
      `;
    }

    return `
      <div data-number="${sender.number}" class="sender-item-card glass-subtle p-3.5 rounded-xl border border-white/5 flex items-center justify-between transition-all hover:border-zinc-800">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-[#0e0e14] border border-zinc-800 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="${sender.linked ? 'text-emerald-400' : 'text-zinc-500'}">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.327 0-4.47-.781-6.191-2.093l-.367-.291-2.694.903.903-2.694-.291-.367A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-zinc-200 font-mono tracking-wider truncate">${sender.isPublic ? 'GLOBAL SENDER' : sender.number}</p>
            <p class="text-[8px] text-zinc-500 font-semibold tracking-wider uppercase mt-0.5">
              ${sender.isPublic ? `Public Sender (Owner: ${sender.owner})` : (sender.connectedAt ? `Linked: ${sender.connectedAt}` : 'Linked status unknown')}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[8px] px-2 py-0.5 rounded border tracking-[0.15em] font-semibold ${sender.linked
            ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5'
            : 'border-zinc-800 text-zinc-500 bg-zinc-900/50'
          }">
            ${sender.linked ? 'ONLINE' : 'OFFLINE'}
          </span>
          ${actionButtonsHtml}
        </div>
      </div>
    `;
  }

  // Sender type card click handlers
  if (btnSenderGlobal) {
    btnSenderGlobal.addEventListener('click', () => {
      selectedSenderType = 'global';
      selectedSender = null;
      updateExecutionSenderCards();
    });
  }
  if (btnSenderPrivate) {
    btnSenderPrivate.addEventListener('click', () => {
      selectedSenderType = 'private';
      selectedSender = null;
      updateExecutionSenderCards();
    });
  }

  function updateExecutionSenderCards() {
    const onlineSenders = senders.filter(s => s.linked);
    const onlinePrivate = onlineSenders.filter(s => (!s.owner || s.owner === savedUsername) && !s.isPublic);
    const onlinePublic = onlineSenders.filter(s => s.isPublic);

    // Update subtext counts on both cards
    if (globalSenderSubtext) globalSenderSubtext.innerText = `${onlinePublic.length} sender aktif`;
    if (privateSenderSubtext) privateSenderSubtext.innerText = `${onlinePrivate.length} sender aktif`;

    // Update card active styles
    if (btnSenderGlobal) {
      if (selectedSenderType === 'global') {
        btnSenderGlobal.className = 'sender-type-card p-3.5 rounded-xl border-2 border-red-500/40 bg-red-500/10 text-left transition-all duration-300 cursor-pointer active:scale-[0.97]';
        btnSenderGlobal.querySelector('svg').setAttribute('class', 'text-red-400');
        btnSenderGlobal.querySelector('span').className = 'text-[11px] font-bold tracking-[0.15em] text-red-300';
      } else {
        btnSenderGlobal.className = 'sender-type-card p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 text-left transition-all duration-300 cursor-pointer hover:border-zinc-700 active:scale-[0.97]';
        btnSenderGlobal.querySelector('svg').setAttribute('class', 'text-zinc-500');
        btnSenderGlobal.querySelector('span').className = 'text-[11px] font-bold tracking-[0.15em] text-zinc-400';
      }
    }
    if (btnSenderPrivate) {
      if (selectedSenderType === 'private') {
        btnSenderPrivate.className = 'sender-type-card p-3.5 rounded-xl border-2 border-red-500/40 bg-red-500/10 text-left transition-all duration-300 cursor-pointer active:scale-[0.97]';
        btnSenderPrivate.querySelector('svg').setAttribute('class', 'text-red-400');
        btnSenderPrivate.querySelector('span').className = 'text-[11px] font-bold tracking-[0.15em] text-red-300';
      } else {
        btnSenderPrivate.className = 'sender-type-card p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 text-left transition-all duration-300 cursor-pointer hover:border-zinc-700 active:scale-[0.97]';
        btnSenderPrivate.querySelector('svg').setAttribute('class', 'text-zinc-500');
        btnSenderPrivate.querySelector('span').className = 'text-[11px] font-bold tracking-[0.15em] text-zinc-400';
      }
    }

    // Determine filtered list based on selected type
    const filteredSenders = selectedSenderType === 'global' ? onlinePublic : onlinePrivate;
    const typeLabel = selectedSenderType === 'global' ? 'Global' : 'Private';

    // Update summary bar
    if (senderSummaryTitle) senderSummaryTitle.innerText = `Total Sender ${typeLabel} Aktif`;
    if (senderSummaryCount) senderSummaryCount.innerText = `${filteredSenders.length} nomor tersedia`;

    // No senders at all
    if (onlineSenders.length === 0) {
      selectedSender = null;
      senderCardsContainer.innerHTML = `
        <div class="p-3 text-center border border-dashed border-zinc-800/60 rounded-xl">
          <p class="text-[9px] text-zinc-600 tracking-wider">Tidak ada sender online</p>
        </div>
      `;
      executeButton.disabled = true;
      executeButton.classList.add('opacity-50', 'cursor-not-allowed');
      return;
    }

    // Reset if selected sender went offline or not in filtered list
    if (selectedSenderType === 'global') {
      selectedSender = 'global';
    } else {
      if (selectedSender && !filteredSenders.some(s => s.number === selectedSender)) {
        selectedSender = null;
      }
      // Auto-select first in filtered list
      if (!selectedSender && filteredSenders.length > 0) {
        selectedSender = filteredSenders[0].number;
      }
    }

    if (filteredSenders.length === 0) {
      senderCardsContainer.innerHTML = `
        <div class="p-3 text-center border border-dashed border-zinc-800/60 rounded-xl">
          <p class="text-[9px] text-zinc-600 tracking-wider">Tidak ada sender ${typeLabel.toLowerCase()} online</p>
        </div>
      `;
      // Still allow execute if there are senders in the other category
      if (onlineSenders.length > 0) {
        executeButton.disabled = false;
        executeButton.classList.remove('opacity-50', 'cursor-not-allowed');
      }
      return;
    }

    executeButton.disabled = false;
    executeButton.classList.remove('opacity-50', 'cursor-not-allowed');

    if (selectedSenderType === 'global') {
      senderCardsContainer.innerHTML = `
        <div data-sender="global" class="sender-card-option p-3 rounded-xl border border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-center justify-between cursor-pointer transition-all duration-300">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-[#0e0e14] border border-zinc-800 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-emerald-400">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.327 0-4.47-.781-6.191-2.093l-.367-.291-2.694.903.903-2.694-.291-.367A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-bold text-zinc-200 font-mono tracking-wider truncate">GLOBAL SENDER</p>
              <p class="text-[8px] text-zinc-500 font-semibold tracking-wider uppercase mt-0.5">Sistem otomatis menggunakan sender publik yang tersedia</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[8px] px-2 py-0.5 rounded border tracking-[0.15em] font-semibold border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
              ONLINE
            </span>
            <div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">✓</div>
          </div>
        </div>
      `;
    } else {
      let html = filteredSenders.map(s => {
        const isSelected = s.number === selectedSender;
        const borderClass = isSelected
          ? "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          : "border-white/5 bg-zinc-950/40 hover:border-zinc-800 hover:bg-zinc-950/60";

        return `
          <div data-sender="${s.number}" class="sender-card-option p-3 rounded-xl border ${borderClass} flex items-center justify-between cursor-pointer transition-all duration-300">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-[#0e0e14] border border-zinc-800 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-emerald-400">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.327 0-4.47-.781-6.191-2.093l-.367-.291-2.694.903.903-2.694-.291-.367A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-[11px] font-bold text-zinc-200 font-mono tracking-wider truncate">${s.number}</p>
                <p class="text-[8px] text-zinc-500 font-semibold tracking-wider uppercase mt-0.5">Private Sender</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[8px] px-2 py-0.5 rounded border tracking-[0.15em] font-semibold border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
                ONLINE
              </span>
              ${isSelected
                ? '<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">✓</div>'
                : '<div class="w-5 h-5 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 text-[10px] font-bold"></div>'
              }
            </div>
          </div>
        `;
      }).join('');

      senderCardsContainer.innerHTML = html;

      // Attach click listeners for private cards
      const cards = senderCardsContainer.querySelectorAll('.sender-card-option');
      cards.forEach(c => {
        c.addEventListener('click', () => {
          selectedSender = c.getAttribute('data-sender');
          updateExecutionSenderCards();
        });
      });
    }
  }

  // 7. Disconnect session confirm state trigger
  window.requestDisconnect = function (num) {
    const card = document.querySelector(`.sender-item-card[data-number="${num}"]`);
    if (!card) return;

    card.innerHTML = `
      <div class="flex items-center justify-between w-full">
        <span class="text-[9px] tracking-[0.15em] text-red-400 font-bold uppercase">Disconnect Sender?</span>
        <div class="flex gap-2">
          <button onclick="confirmDisconnect('${num}')" class="px-2.5 py-1 rounded bg-red-500/20 border border-red-500/30 text-red-300 text-[9px] tracking-[0.12em] font-bold hover:bg-red-500/35 active:scale-95">
            DISCONNECT
          </button>
          <button onclick="cancelDisconnect()" class="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] tracking-[0.12em] font-bold hover:bg-zinc-700 active:scale-95">
            CANCEL
          </button>
        </div>
      </div>
    `;
  };

  window.cancelDisconnect = function () {
    updateSendersView();
  };

  window.confirmDisconnect = async function (num) {
    try {
      triggerToast("DISCONNECTING...", "info");
      const res = await fetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: savedUsername, number: num })
      });
      if (res.ok) {
        senders = senders.filter(s => s.number !== num);
        updateSendersView();
        triggerToast("SENDER DISCONNECTED", "info");
      } else {
        triggerToast("FAILED TO DISCONNECT", "info");
      }
    } catch (err) {
      triggerToast("SERVER UNREACHABLE", "info");
    }
  };

  // 8. Render logs list
  function renderLogs(logs) {
    const logsJson = JSON.stringify(logs);
    if (logsJson === lastLogsJson) return;
    lastLogsJson = logsJson;

    logsCountText.innerText = `${logs.length} RECORDS`;
    if (logs.length === 0) {
      logsWrapper.innerHTML = `
        <div class="text-center py-12">
          <div class="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <p class="label text-zinc-600">NO RECORDS FOUND</p>
        </div>
      `;
    } else {
      logsWrapper.innerHTML = logs.map((h, idx) => `
        <div class="glass-subtle p-4 hover:border-white/10 transition-all duration-300 anim-slide-up anim-stagger-${Math.min(idx + 2, 4)}">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-zinc-600 font-mono">#${String(h.id).padStart(3, '0')}</span>
              <div class="w-1.5 h-1.5 rounded-full ${h.status === 'Success' ? 'bg-emerald-400' : 'bg-zinc-500'}"></div>
            </div>
            <span class="text-[10px] px-3 py-1.5 rounded-lg border tracking-[0.15em] font-semibold ${
              h.status === 'Success' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-zinc-700 text-zinc-400 bg-zinc-800/50'
            }">${h.status}</span>
          </div>
          <p class="text-[15px] text-zinc-200 tracking-wider font-bold mb-2 font-mono">${h.target}</p>
          <div class="flex justify-between items-center">
            <span class="label text-zinc-600">${h.payload}</span>
            <span class="text-[10px] text-zinc-700 tracking-wide">${h.date}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // 9. Toast notification trigger
  function triggerToast(message, type = 'success') {
    const icon = type === 'success' 
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' 
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
    
    toastContainer.innerHTML = `
      <div class="glass px-6 py-3.5 flex items-center gap-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${
        type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 glow-green' : 'bg-red-500/10 border-red-500/30 glow-red'
      }">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center ${type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}">
          <div class="${type === 'success' ? 'text-emerald-400' : 'text-red-400'}">${icon}</div>
        </div>
        <span class="text-xs font-bold tracking-[0.15em] ${type === 'success' ? 'text-emerald-300' : 'text-red-300'}">${message}</span>
      </div>
    `;
    
    toastContainer.classList.remove('hidden');
    setTimeout(() => {
      toastContainer.classList.add('hidden');
    }, 2500);
  }

  // 10. Execution Tab - Custom Dropdown
  protocolDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    protocolDropdownMenu.classList.toggle('hidden');
    dropdownArrow.classList.toggle('rotate-180');
  });

  document.addEventListener('click', () => {
    protocolDropdownMenu.classList.add('hidden');
    dropdownArrow.classList.remove('rotate-180');
  });

  async function loadPayloadsDropdown() {
    try {
      const res = await fetch('/api/payloads');
      if (!res.ok) return;
      const data = await res.json();
      const payloads = data.payloads || [];

      protocolDropdownMenu.innerHTML = '';
      
      payloads.forEach(p => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-protocol', p.id);
        
        if (p.id === selectedProtocol) {
          btn.className = "protocol-option w-full text-left p-3 rounded-xl transition-all duration-200 flex flex-col gap-0.5 bg-red-500/10 border border-red-500/20 text-red-300";
          selectedProtocolText.innerText = p.name;
        } else {
          btn.className = "protocol-option w-full text-left p-3 rounded-xl transition-all duration-200 flex flex-col gap-0.5 border border-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200";
        }
        
        btn.innerHTML = `
          <span class="text-[10px] tracking-widest font-bold font-orbitron">${p.name}</span>
          <span class="text-[9px] text-zinc-500 leading-tight">${p.desc || ''}</span>
        `;
        
        btn.addEventListener('click', () => {
          selectedProtocol = p.id;
          selectedProtocolText.innerText = p.name;
          
          const allOptions = protocolDropdownMenu.querySelectorAll('.protocol-option');
          allOptions.forEach(o => {
            o.className = "w-full text-left p-3 rounded-xl transition-all duration-200 flex flex-col gap-0.5 border border-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200";
          });
          btn.className = "w-full text-left p-3 rounded-xl transition-all duration-200 flex flex-col gap-0.5 bg-red-500/10 border border-red-500/20 text-red-300";
        });
        
        protocolDropdownMenu.appendChild(btn);
      });
    } catch (err) {
      console.error('Failed to load payloads dropdown:', err);
    }
  }

  execForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = targetPhoneInput.value.trim();
    if (!target) return;

    if (!selectedSender) {
      triggerToast("CHOOSE A SENDER FIRST", "error");
      return;
    }

    triggerToast("SENDING PAYLOAD...", "info");

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: savedUsername,
          senderNumber: selectedSender,
          targetNumber: target,
          protocol: selectedProtocol
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast("EXECUTION INITIATED", "success");
        targetPhoneInput.value = '';
        
        // Refresh logs list after sending
        const dataInit = await (await fetch(`/api/dashboard/init?username=${savedUsername}`)).json();
        if (dataInit.history) renderLogs(dataInit.history);
      } else {
        triggerToast(data.error || "FAILED TO SEND PAYLOAD", "info");
      }
    } catch (err) {
      console.error(err);
      triggerToast("SERVER UNREACHABLE", "info");
    }
  });

  // Stats card click handlers to smooth scroll to section
  if (statCardPrivate) {
    statCardPrivate.addEventListener('click', () => {
      privateSendersListWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  if (statCardPublic) {
    statCardPublic.addEventListener('click', () => {
      publicSendersListWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // 11. Modal Link Senders
  addSenderButton.addEventListener('click', () => {
    pairingStepPhone.classList.remove('hidden');
    pairingStepCode.classList.add('hidden');
    pairingStepSuccess.classList.add('hidden');
    pairingPhoneInput.value = '';
    pairingModal.classList.remove('hidden');
  });

  pairingModalBackdrop.addEventListener('click', () => {
    closePairingModal();
  });

  function closePairingModal() {
    pairingModal.classList.add('hidden');
    clearInterval(countdownInterval);
  }

  pairingBackButton.addEventListener('click', () => {
    pairingStepCode.classList.add('hidden');
    pairingStepPhone.classList.remove('hidden');
    clearInterval(countdownInterval);
  });

  pairingConfirmButton.addEventListener('click', () => {
    closePairingModal();
    triggerToast("WAITING FOR WHATSAPP TO SYNC...", "info");
  });

  pairingPhoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = pairingPhoneInput.value.trim();
    if (!phone) return;

    triggerToast("GENERATING CODE...", "info");

    try {
      const res = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: savedUsername, number: phone })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.alreadyLinked) {
          triggerToast("SENDER ALREADY LINKED", "success");
          closePairingModal();
          pollSendersStatus();
        } else {
          pairingCodeDisplay.innerText = `${data.pairingCode.substring(0, 4)}-${data.pairingCode.substring(4)}`;
          pairingTargetDisplay.innerText = phone;
          
          pairingStepPhone.classList.add('hidden');
          pairingStepCode.classList.remove('hidden');
          triggerToast("PAIRING CODE GENERATED", "info");
          
          // Start timer
          startCountdown(120);
        }
      } else {
        triggerToast(data.error || "FAILED TO GENERATE CODE", "info");
      }
    } catch (err) {
      console.error(err);
      triggerToast("SERVER UNREACHABLE", "info");
    }
  });

  function startCountdown(seconds) {
    countdownSeconds = seconds;
    clearInterval(countdownInterval);
    
    updateTimerText();
    countdownInterval = setInterval(() => {
      countdownSeconds--;
      updateTimerText();
      if (countdownSeconds <= 0) {
        clearInterval(countdownInterval);
        countdownTimer.innerHTML = '<span class="text-red-400 font-bold">EXPIRED</span>';
      }
    }, 1000);
  }

  function updateTimerText() {
    const mins = Math.floor(countdownSeconds / 60);
    const secs = String(countdownSeconds % 60).padStart(2, '0');
    countdownTimer.innerText = `${mins}:${secs}`;
    if (countdownSeconds < 30) {
      countdownTimer.className = "font-bold text-red-400";
    } else {
      countdownTimer.className = "font-bold text-red-300";
    }
  }

  // 12. Sidebar
  openSidebarButton.addEventListener('click', () => {
    sidebarDrawer.classList.remove('hidden');
  });

  closeSidebarButton.addEventListener('click', () => {
    sidebarDrawer.classList.add('hidden');
  });

  sidebarBackdrop.addEventListener('click', () => {
    sidebarDrawer.classList.add('hidden');
  });

  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('username');
    window.location.href = '/login';
  });

  const expiredLogoutBtn = document.getElementById('expiredLogoutBtn');
  if (expiredLogoutBtn) {
    expiredLogoutBtn.addEventListener('click', () => {
      localStorage.removeItem('username');
      window.location.href = '/login';
    });
  }


  // 15. SSH VPS Installer Actions
  const sshInstallForm = document.getElementById('sshInstallForm');
  const sshIp = document.getElementById('sshIp');
  const sshPort = document.getElementById('sshPort');
  const sshUsername = document.getElementById('sshUsername');
  const sshPassword = document.getElementById('sshPassword');
  const sshScriptSelect = document.getElementById('sshScriptSelect');
  const sshCustomCommandWrapper = document.getElementById('sshCustomCommandWrapper');
  const sshCustomCommand = document.getElementById('sshCustomCommand');
  const btnExecuteSsh = document.getElementById('btnExecuteSsh');
  const sshConsoleWrapper = document.getElementById('sshConsoleWrapper');
  const sshConsole = document.getElementById('sshConsole');
  const btnClearConsole = document.getElementById('btnClearConsole');

  if (sshScriptSelect) {
    sshScriptSelect.addEventListener('change', () => {
      if (sshScriptSelect.value === 'custom') {
        sshCustomCommandWrapper.classList.remove('hidden');
        if (sshCustomCommand) sshCustomCommand.setAttribute('required', 'true');
      } else {
        sshCustomCommandWrapper.classList.add('hidden');
        if (sshCustomCommand) sshCustomCommand.removeAttribute('required');
      }
    });
  }

  if (btnClearConsole) {
    btnClearConsole.addEventListener('click', () => {
      if (sshConsole) {
        sshConsole.innerHTML = '<div>Console cleared.</div>';
      }
    });
  }

  const appendToConsole = (text) => {
    if (!sshConsole) return;
    
    // Create element to preserve line endings & spaces
    const line = document.createElement('div');
    line.className = 'whitespace-pre-wrap font-mono py-0.5 break-all';
    line.innerText = text;
    sshConsole.appendChild(line);
    
    // Scroll to bottom
    sshConsole.scrollTop = sshConsole.scrollHeight;
  };

  if (sshInstallForm) {
    sshInstallForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const ip = sshIp.value.trim();
      const port = sshPort.value || 22;
      const username = sshUsername.value.trim() || 'root';
      const password = sshPassword.value;
      const scriptOption = sshScriptSelect.value;
      
      let command = '';
      if (scriptOption === 'ptero-panel') {
        command = 'bash <(curl -s https://pterodactyl-installer.se)';
      } else if (scriptOption === 'ptero-theme') {
        command = 'bash <(curl -sL https://raw.githubusercontent.com/pterodactyl-installer/pterodactyl-installer/master/theme.sh)';
      } else {
        command = sshCustomCommand.value.trim();
      }

      if (!command) {
        triggerToast('COMMAND CANNOT BE EMPTY', 'info');
        return;
      }

      // Show console and clear previous output
      sshConsoleWrapper.classList.remove('hidden');
      sshConsole.innerHTML = '<div>[SYSTEM] Initializing stream...</div>';
      
      // Disable execute button
      btnExecuteSsh.disabled = true;
      const originalBtnText = btnExecuteSsh.innerHTML;
      btnExecuteSsh.innerHTML = `<span class="relative z-10 animate-pulse">EXECUTING INSTALLATION...</span>`;

      triggerToast('CONNECTING TO VPS...', 'info');

      try {
        const response = await fetch('/api/tools/execute-ssh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ip,
            port,
            username,
            password,
            command
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          appendToConsole(`[SYSTEM ERROR] Server returned HTTP ${response.status}: ${errText}`);
          triggerToast('CONNECTION/EXECUTION FAILED', 'info');
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Split by newline and append to terminal
          const lines = buffer.split('\n');
          // Keep the last partial line in the buffer
          buffer = lines.pop();
          
          for (const line of lines) {
            appendToConsole(line);
          }
        }
        
        // Print remaining buffer if any
        if (buffer) {
          appendToConsole(buffer);
        }

        appendToConsole('[SYSTEM] Execution connection closed.');
        triggerToast('INSTALLATION COMPLETED', 'success');

      } catch (err) {
        console.error(err);
        appendToConsole(`[SYSTEM ERROR] Fetch error: ${err.message}`);
        triggerToast('SERVER UNREACHABLE OR TIMEOUT', 'info');
      } finally {
        btnExecuteSsh.disabled = false;
        btnExecuteSsh.innerHTML = originalBtnText;
      }
    });
  }

  // 16. Tools Sub-navigation Routing
  const menuLinkPtero = document.getElementById('menuLinkPtero');
  const menuLinkChat = document.getElementById('menuLinkChat');
  const menuLinkDownloader = document.getElementById('menuLinkDownloader');
  const menuLinkNgl = document.getElementById('menuLinkNgl');
  const menuLinkNik = document.getElementById('menuLinkNik');
  const menuLinkLayer4 = document.getElementById('menuLinkLayer4');
  const menuLinkLayer7 = document.getElementById('menuLinkLayer7');
  const toolsSubMenu = document.getElementById('toolsSubMenu');
  const toolsInstallerPanel = document.getElementById('toolsInstallerPanel');
  const toolsChatPanel = document.getElementById('toolsChatPanel');
  const toolsDownloaderPanel = document.getElementById('toolsDownloaderPanel');
  const toolsNglPanel = document.getElementById('toolsNglPanel');
  const toolsNikPanel = document.getElementById('toolsNikPanel');
  const toolsLayer4Panel = document.getElementById('toolsLayer4Panel');
  const toolsLayer7Panel = document.getElementById('toolsLayer7Panel');
  const btnBackFromInstaller = document.getElementById('btnBackFromInstaller');
  const btnBackFromChat = document.getElementById('btnBackFromChat');
  const btnBackFromDownloader = document.getElementById('btnBackFromDownloader');
  const btnBackFromNgl = document.getElementById('btnBackFromNgl');
  const btnBackFromNik = document.getElementById('btnBackFromNik');
  const btnBackFromLayer4 = document.getElementById('btnBackFromLayer4');
  const btnBackFromLayer7 = document.getElementById('btnBackFromLayer7');

  const showSubPanel = (panelToShow) => {
    if (toolsSubMenu) toolsSubMenu.classList.add('hidden');
    if (toolsInstallerPanel) toolsInstallerPanel.classList.add('hidden');
    if (toolsChatPanel) toolsChatPanel.classList.add('hidden');
    if (toolsDownloaderPanel) toolsDownloaderPanel.classList.add('hidden');
    if (toolsNglPanel) toolsNglPanel.classList.add('hidden');
    if (toolsNikPanel) toolsNikPanel.classList.add('hidden');
    if (toolsLayer4Panel) toolsLayer4Panel.classList.add('hidden');
    if (toolsLayer7Panel) toolsLayer7Panel.classList.add('hidden');
    
    if (panelToShow) panelToShow.classList.remove('hidden');
  };

  const showSubMenu = () => {
    if (toolsSubMenu) toolsSubMenu.classList.remove('hidden');
    if (toolsInstallerPanel) toolsInstallerPanel.classList.add('hidden');
    if (toolsChatPanel) toolsChatPanel.classList.add('hidden');
    if (toolsDownloaderPanel) toolsDownloaderPanel.classList.add('hidden');
    if (toolsNglPanel) toolsNglPanel.classList.add('hidden');
    if (toolsNikPanel) toolsNikPanel.classList.add('hidden');
    if (toolsLayer4Panel) toolsLayer4Panel.classList.add('hidden');
    if (toolsLayer7Panel) toolsLayer7Panel.classList.add('hidden');
    
    // Stop chat polling
    stopChatPolling();
  };

  if (menuLinkPtero && toolsInstallerPanel) {
    menuLinkPtero.addEventListener('click', () => {
      showSubPanel(toolsInstallerPanel);
    });
  }

  if (menuLinkChat && toolsChatPanel) {
    menuLinkChat.addEventListener('click', () => {
      showSubPanel(toolsChatPanel);
      startChatPolling();
    });
  }

  if (menuLinkDownloader && toolsDownloaderPanel) {
    menuLinkDownloader.addEventListener('click', () => {
      showSubPanel(toolsDownloaderPanel);
    });
  }

  if (menuLinkNgl && toolsNglPanel) {
    menuLinkNgl.addEventListener('click', () => {
      showSubPanel(toolsNglPanel);
    });
  }

  if (menuLinkNik && toolsNikPanel) {
    menuLinkNik.addEventListener('click', () => {
      showSubPanel(toolsNikPanel);
    });
  }

  if (menuLinkLayer4 && toolsLayer4Panel) {
    menuLinkLayer4.addEventListener('click', () => {
      showSubPanel(toolsLayer4Panel);
    });
  }

  if (menuLinkLayer7 && toolsLayer7Panel) {
    menuLinkLayer7.addEventListener('click', () => {
      showSubPanel(toolsLayer7Panel);
    });
  }

  if (btnBackFromInstaller) {
    btnBackFromInstaller.addEventListener('click', showSubMenu);
  }
  if (btnBackFromChat) {
    btnBackFromChat.addEventListener('click', showSubMenu);
  }
  if (btnBackFromDownloader) {
    btnBackFromDownloader.addEventListener('click', showSubMenu);
  }
  if (btnBackFromNgl) {
    btnBackFromNgl.addEventListener('click', showSubMenu);
  }
  if (btnBackFromNik) {
    btnBackFromNik.addEventListener('click', showSubMenu);
  }
  if (btnBackFromLayer4) {
    btnBackFromLayer4.addEventListener('click', showSubMenu);
  }
  if (btnBackFromLayer7) {
    btnBackFromLayer7.addEventListener('click', showSubMenu);
  }

  // 16b. Media Downloader Form Logic
  let selectedPlatform = 'tiktok';
  const btnPlatformTiktok = document.getElementById('btnPlatformTiktok');
  const btnPlatformInstagram = document.getElementById('btnPlatformInstagram');
  const downloaderForm = document.getElementById('downloaderForm');
  const downloaderUrlInput = document.getElementById('downloaderUrlInput');
  const downloaderResultWrapper = document.getElementById('downloaderResultWrapper');
  const downloaderResult = document.getElementById('downloaderResult');
  const btnExecuteDownload = document.getElementById('btnExecuteDownload');

  if (btnPlatformTiktok && btnPlatformInstagram) {
    btnPlatformTiktok.addEventListener('click', () => {
      selectedPlatform = 'tiktok';
      btnPlatformTiktok.className = 'platform-card p-3 rounded-xl border-2 border-red-500/40 bg-red-500/10 text-center transition-all duration-300 cursor-pointer active:scale-[0.97]';
      btnPlatformTiktok.querySelector('span').className = 'text-[10px] font-bold tracking-[0.15em] text-red-300 font-orbitron uppercase';
      
      btnPlatformInstagram.className = 'platform-card p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-center transition-all duration-300 cursor-pointer hover:border-zinc-700 active:scale-[0.97]';
      btnPlatformInstagram.querySelector('span').className = 'text-[10px] font-bold tracking-[0.15em] text-zinc-400 font-orbitron uppercase';
    });

    btnPlatformInstagram.addEventListener('click', () => {
      selectedPlatform = 'instagram';
      btnPlatformInstagram.className = 'platform-card p-3 rounded-xl border-2 border-red-500/40 bg-red-500/10 text-center transition-all duration-300 cursor-pointer active:scale-[0.97]';
      btnPlatformInstagram.querySelector('span').className = 'text-[10px] font-bold tracking-[0.15em] text-red-300 font-orbitron uppercase';
      
      btnPlatformTiktok.className = 'platform-card p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-center transition-all duration-300 cursor-pointer hover:border-zinc-700 active:scale-[0.97]';
      btnPlatformTiktok.querySelector('span').className = 'text-[10px] font-bold tracking-[0.15em] text-zinc-400 font-orbitron uppercase';
    });
  }

  if (downloaderForm) {
    downloaderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = downloaderUrlInput.value.trim();
      if (!url) return;

      btnExecuteDownload.disabled = true;
      btnExecuteDownload.innerText = 'PROCESSING...';
      downloaderResultWrapper.classList.add('hidden');
      downloaderResult.innerHTML = '';

      try {
        const apiUrl = selectedPlatform === 'tiktok'
          ? `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`
          : `https://api.siputzx.my.id/api/d/igram?url=${encodeURIComponent(url)}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        
        const resData = await response.json();
        downloaderResultWrapper.classList.remove('hidden');
        
        let downloadUrl = '';
        let title = '';
        let previewHtml = '';

        if (resData.status && resData.data) {
          const media = resData.data;
          
          if (selectedPlatform === 'tiktok') {
            title = media.title || 'TikTok Video';
            
            if (media.media && Array.isArray(media.media) && media.media.length > 0) {
              const hdMedia = media.media.find(m => m.quality === 'HD' || m.type === 'video_hd');
              const sdMedia = media.media.find(m => m.quality === 'SD' || m.type === 'video');
              const firstMedia = media.media[0];
              downloadUrl = (hdMedia && hdMedia.url) || (sdMedia && sdMedia.url) || (firstMedia && firstMedia.url) || '';
            } else {
              downloadUrl = media.video || (media.videos && media.videos.no_watermark) || media.no_watermark || '';
            }

            if (downloadUrl) {
              previewHtml = `<video src="${downloadUrl}" controls class="w-full rounded-lg border border-zinc-800 max-h-[250px] bg-black"></video>`;
            }
          } else {
            title = media.caption || 'Instagram Media';
            
            if (media.media && Array.isArray(media.media) && media.media.length > 0) {
              const hdMedia = media.media.find(m => m.quality === 'HD' || m.type === 'video_hd');
              const sdMedia = media.media.find(m => m.quality === 'SD' || m.type === 'video');
              const firstMedia = media.media[0];
              downloadUrl = (hdMedia && hdMedia.url) || (sdMedia && sdMedia.url) || (firstMedia && firstMedia.url) || '';
            } else if (Array.isArray(media)) {
              const firstMedia = media[0];
              downloadUrl = firstMedia.url || firstMedia;
            } else if (typeof media === 'string') {
              downloadUrl = media;
            } else {
              downloadUrl = media.url || media.video || media.image || '';
            }
            
            if (downloadUrl) {
              if (downloadUrl.includes('.mp4') || (media.type && media.type === 'video')) {
                previewHtml = `<video src="${downloadUrl}" controls class="w-full rounded-lg border border-zinc-800 max-h-[250px] bg-black"></video>`;
              } else {
                previewHtml = `<img src="${downloadUrl}" class="w-full rounded-lg border border-zinc-800 max-h-[250px] object-cover" />`;
              }
            }
          }
        } else {
          title = 'Media Source';
          downloadUrl = resData.url || (resData.result && (resData.result.url || resData.result.video)) || '';
        }

        if (!downloadUrl) {
          downloadUrl = resData.url || resData.download || (resData.data && (resData.data.video || resData.data.url)) || '';
        }

        let html = '';
        if (title) {
          html += `<p class="font-bold text-zinc-100 mb-2 truncate">${title}</p>`;
        }
        if (previewHtml) {
          html += `<div class="mb-3">${previewHtml}</div>`;
        }
        if (downloadUrl) {
          html += `
            <a href="${downloadUrl}" target="_blank" download class="btn-primary w-full py-2.5 inline-flex items-center justify-center text-center gap-2 text-xs">
              <span class="relative z-10">OPEN / DOWNLOAD MEDIA</span>
            </a>
          `;
        } else {
          html += `<p class="text-red-400 font-bold uppercase text-[10px]">Failed to extract download link.</p>`;
        }

        html += `
          <details class="mt-3 border-t border-zinc-800 pt-2 cursor-pointer">
            <summary class="text-[9px] text-zinc-500 font-bold tracking-wider uppercase select-none">VIEW RAW DATA</summary>
            <pre class="mt-2 text-[9px] font-mono text-zinc-400 overflow-x-auto bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 leading-normal max-h-[150px] select-text">${JSON.stringify(resData, null, 2)}</pre>
          </details>
        `;

        downloaderResult.innerHTML = html;
        triggerToast("DOWNLOAD COMPLETE", "success");

      } catch (err) {
        console.error(err);
        downloaderResultWrapper.classList.remove('hidden');
        downloaderResult.innerHTML = `
          <p class="text-red-400 font-bold uppercase text-[10px]">Error fetching media data.</p>
          <p class="text-zinc-500 text-[9px] mt-1">${err.message}</p>
        `;
        triggerToast("FETCH FAILED", "info");
      } finally {
        btnExecuteDownload.disabled = false;
        btnExecuteDownload.innerText = 'START DOWNLOAD';
      }
    });
  }

  // 17. Global Chat Logic
  const chatMessagesBox = document.getElementById('chatMessagesBox');
  const chatInputForm = document.getElementById('chatInputForm');
  const chatInputText = document.getElementById('chatInputText');
  let chatPollInterval = null;
  let lastChatCount = 0;

  async function fetchChats() {
    try {
      const res = await fetch('/api/chat');
      if (!res.ok) return;
      const data = await res.json();
      const chats = data.chats || [];
      
      // Render messages
      renderChatMessages(chats);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
  }

  function renderChatMessages(chats) {
    if (!chatMessagesBox) return;
    
    if (chats.length === 0) {
      chatMessagesBox.innerHTML = `
        <div class="text-center text-[10px] text-zinc-600 tracking-wider py-12 uppercase font-bold">
          No messages yet. Start the conversation!
        </div>
      `;
      return;
    }

    const isAtBottom = chatMessagesBox.scrollHeight - chatMessagesBox.clientHeight <= chatMessagesBox.scrollTop + 50;

    chatMessagesBox.innerHTML = chats.map(chat => {
      // Role coloring logic
      let badgeClass = 'border-zinc-850 text-zinc-500 bg-zinc-900/50';
      let nameColorClass = 'text-sky-400';

      if (chat.status === 'Owner') {
        badgeClass = 'border-red-500/30 text-red-400 bg-red-500/10 glow-red';
        nameColorClass = 'text-red-400';
      } else if (chat.status === 'Reseller') {
        badgeClass = 'border-purple-500/30 text-purple-400 bg-purple-500/10';
        nameColorClass = 'text-purple-400';
      } else if (chat.status === 'User') {
        badgeClass = 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10';
        nameColorClass = 'text-emerald-400';
      } else if (chat.status === 'VIP') {
        badgeClass = 'border-amber-500/30 text-amber-300 bg-amber-500/10 glow-amber';
        nameColorClass = 'text-amber-400';
      }

      // Format time
      const timeStr = chat.date ? chat.date.substring(11, 16) : '--:--';
      
      // Determine if self or other
      const isSelf = chat.username === savedUsername;
      
      const isOwner = chat.status === 'Owner';
      const verifiedBadge = isOwner ? `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" class="inline-block flex-shrink-0 drop-shadow-[0_0_4px_rgba(0,149,246,0.65)] ml-0.5 align-middle">
          <path d="M22.25 12c0-1.43-.88-2.67-2.15-3.26.15-.39.24-.82.24-1.27 0-2-1.61-3.64-3.6-3.64-.45 0-.87.09-1.27.24C14.88 2.8 13.56 2 12 2s-2.88.8-3.47 2.07c-.4-.15-.82-.24-1.27-.24-1.99 0-3.6 1.64-3.6 3.64 0 .45.09.88.24 1.27-1.27.59-2.15 1.83-2.15 3.26 0 1.43.88 2.67 2.15 3.26-.15.39-.24.82-.24 1.27 0 2 1.61 3.64 3.6 3.64.45 0 .87-.09 1.27-.24.59 1.27 1.91 2.07 3.47 2.07s2.88-.8 3.47-2.07c.4.15.82.24 1.27.24 1.99 0 3.6-1.64 3.6-3.64 0-.45-.09-.88-.24-1.27 1.27-.59 2.15-1.83 2.15-3.26z" fill="#0095f6"/>
          <path d="M7.5 12.5L10 15L16.5 8.5" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      ` : '';
      
      const imageTag = chat.image ? `
        <div class="mb-1.5 max-w-full overflow-hidden rounded">
          <img src="${chat.image}" alt="Chat Attachment" class="max-w-full h-auto object-cover rounded shadow-sm hover:scale-105 transition-transform duration-200 cursor-pointer" onclick="window.open('${chat.image}', '_blank')">
        </div>
      ` : '';
      const messageContent = chat.message ? `<div>${escapeHtml(chat.message)}</div>` : '';

      if (isSelf) {
        return `
          <div class="flex justify-end w-full mb-1 anim-slide-up">
            <div class="relative max-w-[80%] px-3 py-2 rounded-lg bg-[#5c0d16] text-white rounded-tr-none after:content-[''] after:absolute after:top-0 after:right-[-6px] after:w-0 after:h-0 after:border-t-[8px] after:border-t-[#5c0d16] after:border-r-[8px] after:border-r-transparent pr-14 pb-5 text-xs font-sans break-all shadow-[0_1px_0.5px_rgba(0,0,0,0.15)] leading-relaxed">
              ${imageTag}
              ${messageContent}
              <div class="absolute bottom-1 right-2 flex items-center gap-0.5 text-[9px] text-zinc-400 font-sans select-none leading-none">
                <span>${timeStr}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="text-red-400 inline-block align-middle flex-shrink-0">
                  <path d="M2 12l5 5L20 4M8 17l2 2L22 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="flex justify-start w-full mb-1 anim-slide-up">
            <div class="relative max-w-[80%] px-3 py-2 rounded-lg bg-[#221415] text-white rounded-tl-none before:content-[''] before:absolute before:top-0 before:left-[-6px] before:w-0 before:h-0 before:border-t-[8px] before:border-t-[#221415] before:border-l-[8px] before:border-l-transparent pb-5 pr-12 text-xs font-sans break-all shadow-[0_1px_0.5px_rgba(0,0,0,0.15)] leading-relaxed">
              <div class="flex items-center gap-1.5 mb-1.5 text-[9px] font-bold uppercase select-none">
                <span class="${nameColorClass} font-sans flex items-center gap-0.5">${chat.username}${verifiedBadge}</span>
                <span class="text-[7px] px-1 py-0.2 rounded border tracking-widest ${badgeClass} font-mono">${chat.status}</span>
              </div>
              ${imageTag}
              ${messageContent}
              <div class="absolute bottom-1 right-2 text-[9px] text-zinc-500 font-sans select-none leading-none">
                <span>${timeStr}</span>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');

    // Auto scroll if user was already at bottom or new chats are loaded for first time
    if (isAtBottom || chats.length !== lastChatCount) {
      chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
      lastChatCount = chats.length;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  function startChatPolling() {
    fetchChats();
    clearInterval(chatPollInterval);
    chatPollInterval = setInterval(fetchChats, 3000);
  }

  // Bind stop chat polling to original switch tab functionality to prevent unnecessary background polling when tab changes
  const originalSwitchTab = switchTab;
  switchTab = function(tabId) {
    originalSwitchTab(tabId);
    if (tabId !== 'tools') {
      stopChatPolling();
    }
  };

  function stopChatPolling() {
    clearInterval(chatPollInterval);
  }

  if (chatInputForm) {
    const chatSendIcon = document.getElementById('chatSendIcon');
    const chatMicIcon = document.getElementById('chatMicIcon');
    const btnAttachChatFile = document.getElementById('btnAttachChatFile');
    const chatImageInput = document.getElementById('chatImageInput');

    if (chatInputText && chatSendIcon && chatMicIcon) {
      chatInputText.addEventListener('input', () => {
        const hasText = chatInputText.value.trim().length > 0;
        if (hasText) {
          chatSendIcon.classList.remove('hidden');
          chatMicIcon.classList.add('hidden');
        } else {
          chatSendIcon.classList.add('hidden');
          chatMicIcon.classList.remove('hidden');
        }
      });
      // Initialize to mic icon
      chatSendIcon.classList.add('hidden');
      chatMicIcon.classList.remove('hidden');
    }

    if (btnAttachChatFile && chatImageInput) {
      btnAttachChatFile.addEventListener('click', () => {
        chatImageInput.click();
      });

      chatImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset
        chatImageInput.value = '';

        if (!file.type.startsWith('image/')) {
          triggerToast('Please select an image file', 'info');
          return;
        }

        try {
          triggerToast('Sending image...', 'info');
          const base64Str = await compressImage(file, 500, 500, 0.6);

          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: savedUsername,
              message: '',
              image: base64Str
            })
          });

          if (res.ok) {
            fetchChats();
          } else {
            triggerToast('Failed to send image', 'info');
          }
        } catch (err) {
          console.error(err);
          triggerToast('Failed to process image', 'info');
        }
      });
    }

    chatInputForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = chatInputText.value.trim();
      if (!message) return;

      chatInputText.value = '';
      if (chatInputText) {
        chatInputText.dispatchEvent(new Event('input'));
      }
      
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: savedUsername,
            message
          })
        });

        if (res.ok) {
          // Immediately reload messages
          fetchChats();
        } else {
          triggerToast('Failed to send message', 'info');
        }
      } catch (err) {
        console.error(err);
        triggerToast('Server unreachable', 'info');
      }
    });
  }

  window.togglePublicSender = async function (num) {
    try {
      const res = await fetch('/api/senders/toggle-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: savedUsername, number: num })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(data.isPublic ? "SENDER SET TO PUBLIC" : "SENDER SET TO PRIVATE", "success");
        pollSendersStatus();
      } else {
        triggerToast(data.error || "FAILED TO TOGGLE PUBLIC STATUS", "error");
      }
    } catch (e) {
      triggerToast("SERVER UNREACHABLE", "error");
    }
  };

  // 16c. NGL Spammer Form Logic
  const nglForm = document.getElementById('nglForm');
  const nglUsernameInput = document.getElementById('nglUsernameInput');
  const nglMessageInput = document.getElementById('nglMessageInput');
  const nglCountInput = document.getElementById('nglCountInput');
  const nglResultWrapper = document.getElementById('nglResultWrapper');
  const nglResult = document.getElementById('nglResult');
  const btnExecuteNgl = document.getElementById('btnExecuteNgl');

  if (nglForm) {
    nglForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = nglUsernameInput.value.trim();
      const question = nglMessageInput.value.trim();
      const count = parseInt(nglCountInput.value, 10) || 1;

      if (!username || !question) return;

      btnExecuteNgl.disabled = true;
      btnExecuteNgl.innerText = 'SENDING...';
      nglResultWrapper.classList.add('hidden');
      nglResult.innerHTML = '';

      try {
        const response = await fetch('/api/tools/ngl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, question, count })
        });

        const data = await response.json();
        nglResultWrapper.classList.remove('hidden');

        if (response.ok && data.success) {
          nglResult.innerHTML = `
            <p class="text-emerald-400 font-bold uppercase text-[10px]">Successfully Sent</p>
            <p class="text-zinc-300 mt-1">Success: <span class="font-bold text-white">${data.successCount}</span></p>
            <p class="text-zinc-500">Failed: <span>${data.failCount}</span></p>
          `;
          triggerToast("NGL SPAMMER COMPLETED", "success");
        } else {
          nglResult.innerHTML = `
            <p class="text-red-400 font-bold uppercase text-[10px]">Failed to Send</p>
            <p class="text-zinc-500 mt-1">${data.error || 'Unknown error occurred'}</p>
          `;
          triggerToast("NGL SEND FAILED", "error");
        }
      } catch (err) {
        console.error(err);
        nglResultWrapper.classList.remove('hidden');
        nglResult.innerHTML = `
          <p class="text-red-400 font-bold uppercase text-[10px]">Server Error</p>
          <p class="text-zinc-500 mt-1">${err.message}</p>
        `;
        triggerToast("SERVER UNREACHABLE", "error");
      } finally {
        btnExecuteNgl.disabled = false;
        btnExecuteNgl.innerText = 'START SENDING';
      }
    });
  }

  // 16d. NIK Parser Form Logic
  const nikForm = document.getElementById('nikForm');
  const nikInput = document.getElementById('nikInput');
  const nikResultWrapper = document.getElementById('nikResultWrapper');
  const nikResult = document.getElementById('nikResult');

  if (nikForm) {
    nikForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = nikInput.value.trim();
      if (!val) return;

      nikResultWrapper.classList.add('hidden');
      nikResult.innerHTML = '';

      const parsed = parseIndonesianNIK(val);
      nikResultWrapper.classList.remove('hidden');

      if (parsed.success) {
        const d = parsed.data;
        nikResult.innerHTML = `
          <div class="space-y-1.5 font-mono text-[11px] leading-relaxed">
            <p><span class="text-zinc-500 font-bold">PROVINSI :</span> <span class="text-zinc-200">${d.province}</span></p>
            <p><span class="text-zinc-500 font-bold">KABUPATEN :</span> <span class="text-zinc-200">KODE ${d.kabCode}</span></p>
            <p><span class="text-zinc-500 font-bold">KECAMATAN :</span> <span class="text-zinc-200">KODE ${d.kecCode}</span></p>
            <p><span class="text-zinc-500 font-bold">GENDER    :</span> <span class="${d.gender === 'Laki-laki' ? 'text-sky-400' : 'text-pink-400'} font-bold">${d.gender.toUpperCase()}</span></p>
            <p><span class="text-zinc-500 font-bold">LAHIR     :</span> <span class="text-zinc-200">${d.birthDate}</span></p>
            <p><span class="text-zinc-500 font-bold">UMUR      :</span> <span class="text-emerald-400 font-bold">${d.age} TAHUN</span></p>
            <p><span class="text-zinc-500 font-bold">ZODIAC    :</span> <span class="text-amber-400 font-bold">${d.zodiac.toUpperCase()}</span></p>
            <p><span class="text-zinc-500 font-bold">ANTREAN   :</span> <span class="text-zinc-400">NO. ${d.uniqueCode}</span></p>
          </div>
        `;
        triggerToast("NIK PARSED SUCCESSFULLY", "success");
      } else {
        nikResult.innerHTML = `
          <p class="text-red-400 font-bold uppercase text-[10px]">FAILED TO PARSE NIK</p>
          <p class="text-zinc-500 mt-1">${parsed.error}</p>
        `;
        triggerToast("INVALID NIK FORMAT", "error");
      }
    });
  }

  function parseIndonesianNIK(nik) {
    if (!/^\d{16}$/.test(nik)) {
      return { success: false, error: 'NIK harus terdiri dari 16 digit angka' };
    }

    const provCode = nik.substring(0, 2);
    const kabCode = nik.substring(2, 4);
    const kecCode = nik.substring(4, 6);
    let day = parseInt(nik.substring(6, 8), 10);
    const month = parseInt(nik.substring(8, 10), 10);
    let year = parseInt(nik.substring(10, 12), 10);
    const uniqueCode = nik.substring(12, 16);

    const provinces = {
      "11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi",
      "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung", "19": "Kepulauan Bangka Belitung",
      "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah",
      "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat",
      "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah",
      "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara",
      "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara",
      "75": "Gorontalo", "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara",
      "91": "Papua", "92": "Papua Barat"
    };

    const province = provinces[provCode] || `Provinsi Kode ${provCode}`;

    let gender = 'Laki-laki';
    if (day > 40) {
      gender = 'Perempuan';
      day -= 40;
    }

    const currentYear = new Date().getFullYear();
    const currentYearTwoDigits = currentYear % 100;
    const birthYear = year <= currentYearTwoDigits ? 2000 + year : 1900 + year;

    const birthDate = new Date(birthYear, month - 1, day);
    if (isNaN(birthDate.getTime()) || month < 1 || month > 12 || day < 1 || day > 31) {
      return { success: false, error: 'Format tanggal lahir pada NIK tidak valid' };
    }

    let age = currentYear - birthYear;
    const m = new Date().getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
      age--;
    }

    const zodiacs = [
      { name: "Capricorn", start: [12, 22], end: [1, 19] },
      { name: "Aquarius", start: [1, 20], end: [2, 18] },
      { name: "Pisces", start: [2, 19], end: [3, 20] },
      { name: "Aries", start: [3, 21], end: [4, 19] },
      { name: "Taurus", start: [4, 20], end: [5, 20] },
      { name: "Gemini", start: [5, 21], end: [6, 20] },
      { name: "Cancer", start: [6, 21], end: [7, 22] },
      { name: "Leo", start: [7, 23], end: [8, 22] },
      { name: "Virgo", start: [8, 23], end: [9, 22] },
      { name: "Libra", start: [9, 23], end: [10, 22] },
      { name: "Scorpio", start: [10, 23], end: [11, 21] },
      { name: "Sagittarius", start: [11, 22], end: [12, 21] }
    ];

    let zodiac = "Unknown";
    for (const z of zodiacs) {
      const startMonth = z.start[0];
      const startDay = z.start[1];
      const endMonth = z.end[0];
      const endDay = z.end[1];

      if (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay)
      ) {
        zodiac = z.name;
        break;
      }
    }

    const birthDateStr = birthDate.toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return {
      success: true,
      data: {
        nik,
        province,
        kabCode,
        kecCode,
        gender,
        birthDate: birthDateStr,
        age,
        zodiac,
        uniqueCode
      }
    };
  }

  // 16e. Layer 4 Stresser Form Logic
  const layer4Form = document.getElementById('layer4Form');
  const layer4TargetInput = document.getElementById('layer4TargetInput');
  const layer4PortInput = document.getElementById('layer4PortInput');
  const layer4DurationInput = document.getElementById('layer4DurationInput');
  const layer4MethodSelect = document.getElementById('layer4MethodSelect');
  const layer4ResultWrapper = document.getElementById('layer4ResultWrapper');
  const layer4Result = document.getElementById('layer4Result');
  const btnExecuteLayer4 = document.getElementById('btnExecuteLayer4');
  const btnStopLayer4 = document.getElementById('btnStopLayer4');

  let currentAttackId = null;

  if (layer4Form) {
    layer4Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const target = layer4TargetInput.value.trim();
      const port = parseInt(layer4PortInput.value, 10);
      const duration = parseInt(layer4DurationInput.value, 10) || 15;
      const method = layer4MethodSelect.value;
      const proxies = document.getElementById('layer4ProxiesInput') ? document.getElementById('layer4ProxiesInput').value.trim() : '';

      if (!target || !port) return;

      btnExecuteLayer4.disabled = true;
      btnExecuteLayer4.innerText = 'STRESS TESTING...';
      btnStopLayer4.classList.remove('hidden');
      layer4ResultWrapper.classList.remove('hidden');
      
      const proxyCount = proxies ? proxies.split('\n').filter(p => p.trim()).length : 0;
      layer4Result.innerHTML = `[STRESSER] Resolving host ${target}...\n`;
      if (proxyCount > 0) {
        layer4Result.innerHTML += `[STRESSER] Configured ${proxyCount} proxy nodes for rotation.\n`;
      }

      try {
        const response = await fetch('/api/tools/layer4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, port, duration, method, proxies })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          currentAttackId = data.attackId;
          layer4Result.innerHTML += `[STRESSER] Test active (ID: ${currentAttackId})\n`;
          layer4Result.innerHTML += `[STRESSER] Flooding ${target}:${port} via ${method}...\n`;
          triggerToast("STRESS TEST STARTED", "success");

          setTimeout(() => {
            if (currentAttackId === data.attackId) {
              stopStressorUI('[STRESSER] Stress test completed.');
            }
          }, duration * 1000);
        } else {
          layer4Result.innerHTML += `[ERROR] ${data.error || 'Failed to start stress test'}\n`;
          stopStressorUI('[ERROR] Handshake failed.');
        }
      } catch (err) {
        layer4Result.innerHTML += `[ERROR] Network error: ${err.message}\n`;
        stopStressorUI('[ERROR] Connection lost.');
      }
    });
  }

  if (btnStopLayer4) {
    btnStopLayer4.addEventListener('click', async () => {
      if (!currentAttackId) return;
      layer4Result.innerHTML += `[STRESSER] Sending stop signal...\n`;
      try {
        await fetch('/api/tools/layer4/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attackId: currentAttackId })
        });
        stopStressorUI('[STRESSER] Stress test terminated by operator.');
      } catch (err) {
        stopStressorUI('[ERROR] Stop handshake failed.');
      }
    });
  }

  function stopStressorUI(msg) {
    layer4Result.innerHTML += `${msg}\n`;
    btnExecuteLayer4.disabled = false;
    btnExecuteLayer4.innerText = 'START TEST';
    btnStopLayer4.classList.add('hidden');
    currentAttackId = null;
  }

  // 16f. Layer 7 Stresser Form Logic
  const layer7Form = document.getElementById('layer7Form');
  const layer7TargetInput = document.getElementById('layer7TargetInput');
  const layer7DurationInput = document.getElementById('layer7DurationInput');
  const layer7MethodSelect = document.getElementById('layer7MethodSelect');
  const layer7ResultWrapper = document.getElementById('layer7ResultWrapper');
  const layer7Result = document.getElementById('layer7Result');
  const btnExecuteLayer7 = document.getElementById('btnExecuteLayer7');
  const btnStopLayer7 = document.getElementById('btnStopLayer7');

  let currentLayer7AttackId = null;

  if (layer7Form) {
    layer7Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const target = layer7TargetInput.value.trim();
      const duration = parseInt(layer7DurationInput.value, 10) || 15;
      const method = layer7MethodSelect.value;
      const proxies = document.getElementById('layer7ProxiesInput') ? document.getElementById('layer7ProxiesInput').value.trim() : '';
      const headers = document.getElementById('layer7HeadersInput') ? document.getElementById('layer7HeadersInput').value.trim() : '';
      const body = document.getElementById('layer7BodyInput') ? document.getElementById('layer7BodyInput').value.trim() : '';

      if (!target) return;

      btnExecuteLayer7.disabled = true;
      btnExecuteLayer7.innerText = 'STRESS TESTING...';
      btnStopLayer7.classList.remove('hidden');
      layer7ResultWrapper.classList.remove('hidden');
      
      const proxyCount = proxies ? proxies.split('\n').filter(p => p.trim()).length : 0;
      const headerCount = headers ? headers.split('\n').filter(h => h.trim()).length : 0;

      layer7Result.innerHTML = `[STRESSER] Targeting URL ${target}...\n`;
      if (proxyCount > 0) {
        layer7Result.innerHTML += `[STRESSER] Configured ${proxyCount} proxy nodes for rotation.\n`;
      }
      if (headerCount > 0) {
        layer7Result.innerHTML += `[STRESSER] Configured ${headerCount} custom headers.\n`;
      }
      if (body) {
        layer7Result.innerHTML += `[STRESSER] Configured custom POST payload body.\n`;
      }

      try {
        const response = await fetch('/api/tools/layer7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, duration, method, proxies, headers, body })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          currentLayer7AttackId = data.attackId;
          layer7Result.innerHTML += `[STRESSER] Test active (ID: ${currentLayer7AttackId})\n`;
          layer7Result.innerHTML += `[STRESSER] Flooding ${target} via ${method}...\n`;
          triggerToast("STRESS TEST STARTED", "success");

          setTimeout(() => {
            if (currentLayer7AttackId === data.attackId) {
              stopLayer7StressorUI('[STRESSER] Stress test completed.');
            }
          }, duration * 1000);
        } else {
          layer7Result.innerHTML += `[ERROR] ${data.error || 'Failed to start stress test'}\n`;
          stopLayer7StressorUI('[ERROR] Handshake failed.');
        }
      } catch (err) {
        layer7Result.innerHTML += `[ERROR] Network error: ${err.message}\n`;
        stopLayer7StressorUI('[ERROR] Connection lost.');
      }
    });
  }

  if (btnStopLayer7) {
    btnStopLayer7.addEventListener('click', async () => {
      if (!currentLayer7AttackId) return;
      layer7Result.innerHTML += `[STRESSER] Sending stop signal...\n`;
      try {
        await fetch('/api/tools/layer7/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attackId: currentLayer7AttackId })
        });
        stopLayer7StressorUI('[STRESSER] Stress test terminated by operator.');
      } catch (err) {
        stopLayer7StressorUI('[ERROR] Stop handshake failed.');
      }
    });
  }

  function stopLayer7StressorUI(msg) {
    layer7Result.innerHTML += `${msg}\n`;
    btnExecuteLayer7.disabled = false;
    btnExecuteLayer7.innerText = 'START TEST';
    btnStopLayer7.classList.add('hidden');
    currentLayer7AttackId = null;
  }

  // PWA Install Prompt Logic
  let deferredPrompt = null;
  const pwaInstallContainer = document.getElementById('pwaInstallContainer');
  const pwaInstallBtn = document.getElementById('pwaInstallBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can install the PWA
    if (pwaInstallContainer) {
      pwaInstallContainer.classList.remove('hidden');
    }
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        triggerToast('GUNAKAN MENU BROWSER -> ADD TO HOME SCREEN', 'info');
        return;
      }
      // Show the prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install prompt choice: ${outcome}`);
      // We've used the prompt, and can't use it again
      deferredPrompt = null;
      // Hide the install button
      if (pwaInstallContainer) {
        pwaInstallContainer.classList.add('hidden');
      }
    });
  }

  window.addEventListener('appinstalled', (evt) => {
    console.log('PWA was installed successfully!');
    if (pwaInstallContainer) {
      pwaInstallContainer.classList.add('hidden');
    }
  });
});
