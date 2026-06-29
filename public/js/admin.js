document.addEventListener('DOMContentLoaded', () => {
  const savedUsername = localStorage.getItem('username');
  if (!savedUsername) {
    window.location.href = '/login';
    return;
  }

  // Element references
  const adminPanelContainer = document.getElementById('adminPanelContainer');
  const gatewayLoadingState = document.getElementById('gatewayLoadingState');
  const usersListWrapper = document.getElementById('usersListWrapper');

  // Modal references
  const addUserModal = document.getElementById('addUserModal');
  const addUserModalBackdrop = document.getElementById('addUserModalBackdrop');
  const openAddUserModalButton = document.getElementById('openAddUserModalButton');
  const cancelModalButton = document.getElementById('cancelModalButton');
  const saveUserForm = document.getElementById('saveUserForm');

  // Custom Delete Confirm Modal references
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const deleteConfirmModalBackdrop = document.getElementById('deleteConfirmModalBackdrop');
  const cancelDeleteButton = document.getElementById('cancelDeleteButton');
  const confirmDeleteButton = document.getElementById('confirmDeleteButton');
  const deleteTargetUsername = document.getElementById('deleteTargetUsername');

  // Form inputs
  const usernameInput = document.getElementById('usernameInput');
  const roleSelect = document.getElementById('roleSelect');
  const limitInput = document.getElementById('limitInput');
  const activeUntilInput = document.getElementById('activeUntilInput');
  const passwordInput = document.getElementById('passwordInput');

  // Toast
  const toastContainer = document.getElementById('toastContainer');

  // Global states
  let users = [];
  let requesterRole = '';
  let userToDelete = null;

  // Initialize
  fetchUsers();

  async function fetchUsers() {
    try {
      const res = await fetch(`/api/admin/users?requester=${savedUsername}`);
      if (!res.ok) {
        window.location.href = '/dashboard';
        return;
      }

      const data = await res.json();
      users = data.users || [];

      // Find requester's own role
      const me = users.find(u => u.username === savedUsername);
      if (!me || (me.status !== 'Owner' && me.status !== 'Reseller')) {
        window.location.href = '/dashboard';
        return;
      }

      requesterRole = me.status;

      // Show panel
      gatewayLoadingState.classList.add('hidden');
      adminPanelContainer.classList.remove('hidden');

      // Render list
      renderUsersList();
    } catch (err) {
      console.error(err);
      triggerToast('FAILED TO FETCH USERS', 'error');
    }
  }

  function renderUsersList() {
    if (users.length === 0) {
      usersListWrapper.innerHTML = `
        <div class="glass p-8 text-center anim-slide-up">
          <p class="text-xs text-zinc-500 font-bold tracking-wider">NO REGISTERED USERS FOUND</p>
        </div>
      `;
      return;
    }

    usersListWrapper.innerHTML = users.map((u, idx) => {
      // Role badge class selection
      let badgeClass = 'bg-zinc-900/50 border-zinc-800 text-zinc-400';
      let avatarBorder = 'from-zinc-700 via-zinc-600 to-zinc-700';
      let glowClass = 'shadow-[0_4px_24px_rgba(0,0,0,0.4)]';
      
      if (u.status === 'Owner') {
        badgeClass = 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
        avatarBorder = 'from-red-500 via-red-600 to-red-500';
        glowClass = 'shadow-[0_0_25px_rgba(239,68,68,0.05)] border-red-500/10';
      } else if (u.status === 'Reseller') {
        badgeClass = 'bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]';
        avatarBorder = 'from-orange-500 via-orange-600 to-orange-500';
        glowClass = 'shadow-[0_0_25px_rgba(249,115,22,0.05)] border-orange-500/10';
      } else if (u.status === 'VIP') {
        badgeClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
        avatarBorder = 'from-amber-500 via-yellow-500 to-amber-500';
        glowClass = 'shadow-[0_0_25px_rgba(245,158,11,0.05)] border-amber-500/10';
      }

      // Check if delete button should be rendered
      const isMe = u.username === savedUsername;
      const canDelete = requesterRole === 'Owner' && !isMe;
      
      const deleteButtonHtml = canDelete 
        ? `<button onclick="deleteUser('${u.username}')" class="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 text-red-400 active:scale-95 transition-all cursor-pointer" title="Delete User">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <polyline points="3 6 5 6 21 6"></polyline>
               <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
               <line x1="10" y1="11" x2="10" y2="17"></line>
               <line x1="14" y1="11" x2="14" y2="17"></line>
             </svg>
           </button>`
        : '';

      const initial = (u.username || 'U')[0].toUpperCase();

      return `
        <div class="glass p-5 relative overflow-hidden group border border-white/5 ${glowClass} anim-slide-up anim-stagger-${Math.min(idx + 1, 4)}">
          <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${
            u.status === 'Owner' ? 'from-red-500 to-red-600' : u.status === 'Reseller' ? 'from-orange-500 to-red-500' : u.status === 'VIP' ? 'from-amber-500 to-yellow-500' : 'from-zinc-700 to-zinc-600'
          }"></div>
          
          <div class="flex justify-between items-center gap-4">
            <div class="flex items-center gap-3.5 min-w-0">
              <!-- User Initial Avatar -->
              <div class="relative flex-shrink-0">
                <div class="w-11 h-11 rounded-xl p-[1.5px] bg-gradient-to-tr ${avatarBorder}">
                  <div class="w-full h-full rounded-[10px] bg-[#0c0c10] flex items-center justify-center">
                    <span class="text-md font-black text-white/90 font-orbitron">${initial}</span>
                  </div>
                </div>
              </div>

              <div class="min-w-0">
                <h3 class="text-sm font-bold tracking-wider text-white font-orbitron uppercase truncate">${u.username}</h3>
                <div class="flex items-center gap-2.5 mt-1 flex-wrap">
                  <span class="text-[8px] px-1.5 py-0.5 rounded border tracking-wider font-extrabold uppercase ${badgeClass}">
                    ${u.status}
                  </span>
                  <span class="text-[9px] text-zinc-500 font-bold font-mono tracking-wider">
                    LIMIT: <span class="text-zinc-300">${u.limit || 0}</span>
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="editUser('${u.username}')" class="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/5 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all cursor-pointer" title="Edit User">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
                </svg>
              </button>
              ${deleteButtonHtml}
            </div>
          </div>

          <div class="mt-4 pt-3.5 border-t border-white/5 flex justify-between items-center text-[9px] text-zinc-500 font-mono font-bold tracking-wider">
            <span class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full ${(u.whatsappSenders || []).some(s => s.linked) ? 'bg-emerald-400 glow-dot' : 'bg-zinc-700'}"></span>
              SENDERS: <span class="text-zinc-300 font-semibold">${(u.whatsappSenders || []).length}</span>
            </span>
            <span>EXP: <span class="text-zinc-300 font-semibold">${u.activeUntil || 'N/A'}</span></span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Edit user action
  window.editUser = function(uname) {
    const user = users.find(u => u.username === uname);
    if (!user) return;

    // Load inputs
    usernameInput.value = user.username;
    usernameInput.disabled = true; // username shouldn't be edited directly once created
    roleSelect.value = user.status;
    limitInput.value = String(user.limit || 10);
    activeUntilInput.value = user.activeUntil || '2026-12-31';
    passwordInput.value = user.password || '123';

    addUserModal.classList.remove('hidden');
  };

  // Delete user action
  window.deleteUser = function(targetUsername) {
    if (targetUsername === savedUsername) {
      triggerToast('CANNOT DELETE YOURSELF', 'error');
      return;
    }
    userToDelete = targetUsername;
    deleteTargetUsername.innerText = targetUsername;
    deleteConfirmModal.classList.remove('hidden');
  };

  const closeDeleteConfirmModal = () => {
    deleteConfirmModal.classList.add('hidden');
    userToDelete = null;
  };

  if (cancelDeleteButton) {
    cancelDeleteButton.addEventListener('click', closeDeleteConfirmModal);
  }
  if (deleteConfirmModalBackdrop) {
    deleteConfirmModalBackdrop.addEventListener('click', closeDeleteConfirmModal);
  }

  if (confirmDeleteButton) {
    confirmDeleteButton.addEventListener('click', async () => {
      if (!userToDelete) return;
      const targetUsername = userToDelete;
      closeDeleteConfirmModal();

      try {
        const res = await fetch('/api/admin/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requester: savedUsername, username: targetUsername })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          triggerToast('USER DELETED', 'success');
          fetchUsers();
        } else {
          triggerToast(data.error || 'FAILED TO DELETE USER', 'error');
        }
      } catch (err) {
        triggerToast('SERVER ERROR', 'error');
      }
    });
  }

  // Open add user modal
  openAddUserModalButton.addEventListener('click', () => {
    usernameInput.value = '';
    usernameInput.disabled = false;
    roleSelect.value = 'User';
    limitInput.value = '10';
    activeUntilInput.value = '2026-12-31';
    
    // Generate a random 6-character password
    const randomPass = Math.random().toString(36).substring(2, 8);
    passwordInput.value = randomPass;
    
    addUserModal.classList.remove('hidden');
  });

  // Modal actions
  cancelModalButton.addEventListener('click', () => {
    addUserModal.classList.add('hidden');
  });

  addUserModalBackdrop.addEventListener('click', () => {
    addUserModal.classList.add('hidden');
  });

  // Save/Create user submit
  saveUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (!username) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: savedUsername,
          username,
          status: roleSelect.value,
          activeUntil: activeUntilInput.value.trim(),
          limit: parseInt(limitInput.value, 10),
          password: passwordInput.value
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('USER SAVED SUCCESSFULLY', 'success');
        addUserModal.classList.add('hidden');
        fetchUsers();
      } else {
        triggerToast(data.error || 'FAILED TO SAVE USER', 'error');
      }
    } catch (err) {
      triggerToast('SERVER ERROR', 'error');
    }
  });

  // Toast alerts
  function triggerToast(message, type = 'success') {
    toastContainer.innerHTML = `
      <div class="glass px-6 py-3.5 flex items-center gap-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${
        type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 glow-green' : 'bg-red-500/10 border-red-500/30 glow-red'
      }">
        <span class="text-xs font-bold tracking-[0.15em] ${type === 'success' ? 'text-emerald-300' : 'text-red-300'}">${message}</span>
      </div>
    `;
    
    toastContainer.classList.remove('hidden');
    setTimeout(() => {
      toastContainer.classList.add('hidden');
    }, 2500);
  }

  // Tab Elements
  const tabUsers = document.getElementById('tabUsers');
  const tabPayloads = document.getElementById('tabPayloads');
  const tabDatabase = document.getElementById('tabDatabase');
  const paneUsers = document.getElementById('paneUsers');
  const panePayloads = document.getElementById('panePayloads');
  const paneDatabase = document.getElementById('paneDatabase');

  // Payload elements
  const savePayloadForm = document.getElementById('savePayloadForm');
  const payloadIdInput = document.getElementById('payloadIdInput');
  const payloadNameInput = document.getElementById('payloadNameInput');
  const payloadTypeSelect = document.getElementById('payloadTypeSelect');
  const payloadContentInput = document.getElementById('payloadContentInput');
  const payloadsListContainer = document.getElementById('payloadsListContainer');

  // Clear Database elements
  const clearDbForm = document.getElementById('clearDbForm');
  const clearChatsCheckbox = document.getElementById('clearChats');
  const clearHistoryCheckbox = document.getElementById('clearHistory');
  const clearPayloadsCheckbox = document.getElementById('clearPayloads');

  let customPayloads = [];

  // Tab switching
  if (tabUsers && tabPayloads && tabDatabase && paneUsers && panePayloads && paneDatabase) {
    tabUsers.addEventListener('click', () => {
      tabUsers.className = 'flex-1 py-2.5 rounded-xl text-[10px] tracking-widest font-bold uppercase border-2 border-red-500/40 bg-red-500/10 text-red-300 transition-all duration-300';
      tabPayloads.className = 'flex-1 py-2.5 rounded-xl text-[10px] tracking-widest font-bold uppercase border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 transition-all duration-300';
      tabDatabase.className = 'flex-1 py-2.5 rounded-xl text-[10px] tracking-widest font-bold uppercase border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 transition-all duration-300';
      paneUsers.classList.remove('hidden');
      panePayloads.classList.add('hidden');
      paneDatabase.classList.add('hidden');
      openAddUserModalButton.classList.remove('hidden');
    });

    tabPayloads.addEventListener('click', () => {
      tabPayloads.className = 'flex-1 py-2.5 rounded-xl text-[10px] tracking-widest font-bold uppercase border-2 border-red-500/40 bg-red-500/10 text-red-300 transition-all duration-300';
      tabUsers.className = 'flex-1 py-2.5 rounded-xl text-[10px] tracking-widest font-bold uppercase border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 transition-all duration-300';
      tabDatabase.className = 'flex-1 py-2.5 rounded-xl text-[10px] tracking-widest font-bold uppercase border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 transition-all duration-300';
      paneUsers.classList.add('hidden');
      panePayloads.classList.remove('hidden');
      paneDatabase.classList.add('hidden');
      openAddUserModalButton.classList.add('hidden');
      fetchPayloads();
    });

    tabDatabase.addEventListener('click', () => {
      tabDatabase.className = 'flex-1 py-2.5 rounded-xl text-[10px] tracking-widest font-bold uppercase border-2 border-red-500/40 bg-red-500/10 text-red-300 transition-all duration-300';
      tabUsers.className = 'flex-1 py-2.5 rounded-xl text-[10px] tracking-widest font-bold uppercase border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 transition-all duration-300';
      tabPayloads.className = 'flex-1 py-2.5 rounded-xl text-[10px] tracking-widest font-bold uppercase border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 transition-all duration-300';
      paneUsers.classList.add('hidden');
      panePayloads.classList.add('hidden');
      paneDatabase.classList.remove('hidden');
      openAddUserModalButton.classList.add('hidden');
    });
  }

  // Fetch custom payloads
  async function fetchPayloads() {
    try {
      const res = await fetch(`/api/admin/payloads?requester=${savedUsername}`);
      if (!res.ok) return;
      const data = await res.json();
      customPayloads = data.payloads || [];
      renderPayloadsList();
    } catch (err) {
      console.error(err);
      triggerToast('FAILED TO FETCH PAYLOADS', 'error');
    }
  }

  // Render Payloads List
  function renderPayloadsList() {
    if (!payloadsListContainer) return;
    if (customPayloads.length === 0) {
      payloadsListContainer.innerHTML = `
        <div class="glass p-6 text-center">
          <p class="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Belum ada payload kustom</p>
        </div>
      `;
      return;
    }

    payloadsListContainer.innerHTML = customPayloads.map(p => `
      <div class="glass p-4 border border-white/5 relative overflow-hidden flex flex-col gap-2.5">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold font-orbitron bg-red-500/15 border border-red-500/30 text-red-400 w-6 h-6 rounded flex items-center justify-center">${p.id}</span>
            <div>
              <p class="text-xs font-bold text-white font-orbitron tracking-wide uppercase">${p.name}</p>
              <p class="text-[8px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">${p.type === 'js' ? 'KODE JAVASCRIPT' : 'PESAN TEKS BIASA'}</p>
            </div>
          </div>
          <button onclick="deletePayload('${p.id}')" class="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/25 active:scale-95 transition-all cursor-pointer" title="Delete Payload">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
        <pre class="text-[10px] font-mono bg-[#050508] p-2.5 rounded border border-zinc-900 overflow-x-auto text-zinc-300 leading-normal max-h-[100px] whitespace-pre-wrap break-all">${escapeHtml(p.content)}</pre>
      </div>
    `).join('');
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

  // Delete custom payload
  window.deletePayload = async function (id) {
    try {
      const res = await fetch('/api/admin/payloads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester: savedUsername, id })
      });
      if (res.ok) {
        triggerToast('PAYLOAD BERHASIL DIHAPUS', 'success');
        fetchPayloads();
      } else {
        triggerToast('GAGAL MENGHAPUS PAYLOAD', 'error');
      }
    } catch (e) {
      triggerToast('SERVER ERROR', 'error');
    }
  };

  // Submit payload form
  if (savePayloadForm) {
    savePayloadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = payloadIdInput.value.trim().toUpperCase();
      const name = payloadNameInput.value.trim();
      const type = payloadTypeSelect.value;
      const content = payloadContentInput.value.trim();

      if (!id || !name || !content) return;

      try {
        const res = await fetch('/api/admin/payloads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requester: savedUsername, id, name, type, content })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          triggerToast('PAYLOAD BERHASIL DISIMPAN', 'success');
          // Reset form fields except selector
          payloadIdInput.value = '';
          payloadNameInput.value = '';
          payloadContentInput.value = '';
          fetchPayloads();
        } else {
          triggerToast(data.error || 'GAGAL MENYIMPAN PAYLOAD', 'error');
        }
      } catch (err) {
        triggerToast('SERVER ERROR', 'error');
      }
    });
  }

  // Clear Database form handler
  if (clearDbForm) {
    clearDbForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const clearChats = clearChatsCheckbox.checked;
      const clearHistory = clearHistoryCheckbox.checked;
      const clearPayloads = clearPayloadsCheckbox.checked;

      if (!clearChats && !clearHistory && !clearPayloads) {
        triggerToast('PILIH MINIMAL SATU OPSI', 'error');
        return;
      }

      const confirmClear = confirm('Apakah Anda yakin ingin menghapus data database terpilih? Tindakan ini permanen!');
      if (!confirmClear) return;

      try {
        const res = await fetch('/api/admin/clear-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester: savedUsername,
            clearChats,
            clearHistory,
            clearPayloads
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          triggerToast('DATABASE BERHASIL DIBERSIHKAN', 'success');
          // Reset checkboxes
          clearChatsCheckbox.checked = false;
          clearHistoryCheckbox.checked = false;
          clearPayloadsCheckbox.checked = false;
        } else {
          triggerToast(data.error || 'GAGAL MEMBERSIHKAN DATABASE', 'error');
        }
      } catch (err) {
        console.error(err);
        triggerToast('ERROR KONEKSI SERVER', 'error');
      }
    });
  }
});

// Prevent browser from automatically showing the PWA installation prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
});
