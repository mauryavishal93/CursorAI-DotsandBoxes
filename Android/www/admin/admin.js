(function () {
  const TOKEN_KEY = 'dotsAdminToken';
  const api = (path, opts = {}) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    };
    return fetch(path, { ...opts, headers, credentials: 'include' }).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const err = new Error(data.message || r.statusText || 'Request failed');
        err.status = r.status;
        err.data = data;
        throw err;
      }
      return data;
    });
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const loginView = $('#login-view');
  const appView = $('#app-view');
  const loginError = $('#login-error');

  function showLogin() {
    sessionStorage.removeItem(TOKEN_KEY);
    loginView.classList.remove('hidden');
    appView.classList.add('hidden');
  }

  function showApp() {
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
  }

  function setSection(id) {
    $$('.section').forEach((s) => s.classList.toggle('active', s.id === 'section-' + id));
    $$('.admin-sidebar nav button').forEach((b) => {
      b.classList.toggle('active', b.dataset.section === id);
    });
  }

  async function verifySession() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      await api('/api/admin/me');
      return true;
    } catch {
      return false;
    }
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.remove('visible');
    const email = $('#admin-email').value.trim();
    const password = $('#admin-password').value;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }
      if (!data.user || !data.user.isAdmin) {
        throw new Error('This account is not an administrator.');
      }
      sessionStorage.setItem(TOKEN_KEY, data.token);
      showApp();
      await loadDashboard();
    } catch (err) {
      loginError.textContent = err.message || 'Login failed';
      loginError.classList.add('visible');
    }
  });

  $('#logout-btn').addEventListener('click', () => showLogin());

  const adminSidebar = $('#admin-sidebar');
  const navToggle = $('#admin-nav-toggle');

  function isCompactNav() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function setMobileNavOpen(open) {
    if (!adminSidebar || !navToggle) return;
    adminSidebar.classList.toggle('nav-open', !!open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  if (navToggle && adminSidebar) {
    navToggle.addEventListener('click', () => {
      setMobileNavOpen(!adminSidebar.classList.contains('nav-open'));
    });
  }

  window.addEventListener('resize', () => {
    if (!isCompactNav()) closeMobileNav();
  });

  $$('.admin-sidebar nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.section;
      setSection(id);
      if (id === 'dashboard') loadDashboard();
      if (id === 'users') loadUsers(1);
      if (id === 'games') loadGames(1);
      if (id === 'leaderboard') loadLeaderboard();
      if (id === 'system') loadSystem();
      if (id === 'settings') loadSettings();
      if (id === 'activity') loadActivity();
      if (isCompactNav()) closeMobileNav();
    });
  });

  async function loadDashboard() {
    const d = await api('/api/admin/dashboard');
    const dash = d.dashboard;
    $('#dash-users-total').textContent = dash.users.total;
    $('#dash-registered').textContent = dash.users.registered;
    $('#dash-guests').textContent = dash.users.guests;
    $('#dash-games').textContent = dash.games.total;
    $('#dash-games-7d').textContent = dash.games.last7Days;
    $('#dash-admins').textContent = dash.users.admins;

    const modeEl = $('#dash-by-mode');
    modeEl.innerHTML = (dash.games.byMode || [])
      .map((m) => `<div class="card"><div class="label">${m._id || '—'}</div><div class="value">${m.count}</div></div>`)
      .join('') || '<p class="muted">No games yet.</p>';

    const recent = $('#dash-recent-games');
    recent.innerHTML =
      '<table class="admin-table"><thead><tr><th>Ended</th><th>Mode</th><th>Lobby</th><th>Winner</th></tr></thead><tbody>' +
      (dash.recentGames || [])
        .map(
          (g) =>
            `<tr><td>${g.endedAt ? new Date(g.endedAt).toLocaleString() : '—'}</td><td>${g.gameMode}</td><td>${g.lobbyCode || '—'}</td><td>${g.winner && g.winner.username ? g.winner.username : '—'}</td></tr>`
        )
        .join('') +
      '</tbody></table>';
  }

  let usersPage = 1;
  async function loadUsers(page) {
    usersPage = page;
    const search = $('#users-search').value.trim();
    const q = new URLSearchParams({ page: String(page), limit: '20', ...(search ? { search } : {}) });
    const d = await api('/api/admin/users?' + q);
    const tbody = $('#users-tbody');
    tbody.innerHTML = (d.users || [])
      .map(
        (u) => `
      <tr data-id="${u._id}">
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${u.isGuest ? '<span class="badge guest">Guest</span>' : '<span class="badge user">Registered</span>'}</td>
        <td>${u.isAdmin ? '<span class="badge admin">Admin</span>' : '—'}</td>
        <td>${u.points ?? '—'}</td>
        <td>${u.gamesPlayed ?? 0}</td>
        <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
        <td>${
          !u.isGuest
            ? `<button type="button" class="toggle-admin" data-admin="${u.isAdmin ? '1' : '0'}">${u.isAdmin ? 'Revoke admin' : 'Make admin'}</button>`
            : '—'
        }</td>
      </tr>`
      )
      .join('');
    $('#users-pagination').textContent = `Page ${d.pagination.page} of ${d.pagination.pages} (${d.pagination.total} users)`;
    $('#users-prev').disabled = d.pagination.page <= 1;
    $('#users-next').disabled = d.pagination.page >= d.pagination.pages;

    tbody.querySelectorAll('.toggle-admin').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const id = tr.dataset.id;
        const makeAdmin = btn.getAttribute('data-admin') !== '1';
        if (!confirm(makeAdmin ? 'Grant admin to this user?' : 'Remove admin from this user?')) return;
        try {
          await api('/api/admin/users/' + id, {
            method: 'PATCH',
            body: JSON.stringify({ isAdmin: makeAdmin })
          });
          await loadUsers(usersPage);
        } catch (e) {
          alert(e.message);
        }
      });
    });
  }

  $('#users-filter-btn').addEventListener('click', () => loadUsers(1));

  let gamesPage = 1;
  async function loadGames(page) {
    gamesPage = page;
    const mode = $('#games-mode').value;
    const q = new URLSearchParams({ page: String(page), limit: '20', ...(mode ? { mode } : {}) });
    const d = await api('/api/admin/games?' + q);
    const tbody = $('#games-tbody');
    tbody.innerHTML = (d.games || [])
      .map((g) => {
        const p1 = g.players && g.players[0] ? g.players[0].username : null;
        const p2 = g.players && g.players[1] ? g.players[1].username : null;
        const winner = g.winner && g.winner.username ? g.winner.username : null;

        const w1 = winner && p1 && String(p1) === String(winner)
          ? ' <span class="badge winner" title="Winner">W</span>'
          : '';
        const w2 = winner && p2 && String(p2) === String(winner)
          ? ' <span class="badge winner" title="Winner">W</span>'
          : '';

        return `
      <tr>
        <td><code>${escapeHtml(g.gameId)}</code></td>
        <td>${g.gameMode}</td>
        <td>${g.endedAt ? new Date(g.endedAt).toLocaleString() : '—'}</td>
        <td>${g.lobbyCode || '—'}</td>
        <td>${p1 ? escapeHtml(p1) + w1 : '—'}</td>
        <td>${p2 ? escapeHtml(p2) + w2 : '—'}</td>
        <td>${g.plannedOpponentType || '—'}</td>
        <td><button type="button" class="toggle-admin game-detail-btn" data-id="${escapeHtml(g.gameId)}">JSON</button></td>
      </tr>`;
      })
      .join('');
    $('#games-pagination').textContent = `Page ${d.pagination.page} of ${d.pagination.pages} (${d.pagination.total} games)`;
    $('#games-prev').disabled = d.pagination.page <= 1;
    $('#games-next').disabled = d.pagination.page >= d.pagination.pages;

    tbody.querySelectorAll('.game-detail-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          const r = await api('/api/admin/games/detail/' + encodeURIComponent(id));
          $('#game-json').textContent = JSON.stringify(r.game, null, 2);
          const modal = $('#game-json-modal');
          modal.classList.remove('hidden');
        } catch (e) {
          alert(e.message);
        }
      });
    });
  }

  $('#games-filter-btn').addEventListener('click', () => loadGames(1));
  $('#game-json-close').addEventListener('click', () => $('#game-json-modal').classList.add('hidden'));

  async function loadLeaderboard() {
    const d = await api('/api/admin/leaderboard?limit=50');
    const tbody = $('#leaderboard-tbody');
    tbody.innerHTML = (d.leaderboard || [])
      .map(
        (u, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(u.username)}</td>
        <td>${u.points ?? 0}</td>
        <td>${u.wins ?? 0}</td>
        <td>${u.losses ?? 0}</td>
        <td>${u.gamesPlayed ?? 0}</td>
        <td>${u.highestStreak ?? 0}</td>
      </tr>`
      )
      .join('');
  }

  async function loadSystem() {
    const d = await api('/api/admin/system');
    const s = d.system;

    function bytesToMB(n) {
      const num = Number(n);
      if (!Number.isFinite(num)) return '—';
      return `${Math.round(num / 1024 / 1024)} MB`;
    }

    function formatSeconds(sec) {
      const num = Number(sec);
      if (!Number.isFinite(num)) return '—';
      const total = Math.max(0, Math.floor(num));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s2 = total % 60;
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0) return `${m}m ${s2}s`;
      return `${s2}s`;
    }

    $('#sys-env').textContent = s.env || '—';
    $('#sys-db').textContent = s.database || '—';
    $('#sys-uptime').textContent = formatSeconds(s.uptimeSeconds);
    $('#sys-node').textContent = s.nodeVersion || '—';
    $('#sys-platform').textContent = s.platform || '—';

    $('#sys-rss').textContent = bytesToMB(s.memory && s.memory.rss);
    $('#sys-heap-used').textContent = bytesToMB(s.memory && s.memory.heapUsed);
    $('#sys-heap-total').textContent = bytesToMB(s.memory && s.memory.heapTotal);

    $('#system-pre').textContent = JSON.stringify(s, null, 2);

    const health = await fetch('/health').then((r) => r.json());
    $('#health-status').textContent = health.status || '—';
    $('#health-version').textContent = health.version || '—';
    $('#health-uptime').textContent = formatSeconds(health.uptime);
    $('#health-timestamp').textContent = health.timestamp ? new Date(health.timestamp).toLocaleString() : '—';
    $('#health-pre').textContent = JSON.stringify(health, null, 2);
  }

  async function loadSettings() {
    const d = await api('/api/admin/settings');
    $('#settings-pre').textContent = JSON.stringify(d.settings, null, 2);
  }

  async function loadActivity() {
    $('#activity-note').textContent = 'Live socket / lobby metrics can be added server-side. Use Dashboard → recent games for now.';
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  $('#users-prev').addEventListener('click', () => loadUsers(Math.max(1, usersPage - 1)));
  $('#users-next').addEventListener('click', () => loadUsers(usersPage + 1));
  $('#games-prev').addEventListener('click', () => loadGames(Math.max(1, gamesPage - 1)));
  $('#games-next').addEventListener('click', () => loadGames(gamesPage + 1));

  (async function init() {
    if (await verifySession()) {
      showApp();
      setSection('dashboard');
      await loadDashboard();
    } else {
      showLogin();
    }
  })();
})();
