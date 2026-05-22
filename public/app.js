const state = {
  user: null,
  accessToken: localStorage.getItem('smartSupportAccess') || '',
  refreshToken: localStorage.getItem('smartSupportRefresh') || '',
  tickets: [],
  selectedTicket: null,
  ticketFilter: 'all',
  conversationId: '',
  lastTicketId: '',
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  authView: $('#authView'),
  appView: $('#appView'),
  authForm: $('#authForm'),
  authMessage: $('#authMessage'),
  authSubmit: $('#authSubmit'),
  loginTab: $('#loginTab'),
  registerTab: $('#registerTab'),
  nameInput: $('#nameInput'),
  emailInput: $('#emailInput'),
  passwordInput: $('#passwordInput'),
  sessionName: $('#sessionName'),
  sessionMeta: $('#sessionMeta'),
  logoutButton: $('#logoutButton'),
  healthDot: $('#healthDot'),
  healthText: $('#healthText'),
  viewTitle: $('#viewTitle'),
  overviewMetrics: $('#overviewMetrics'),
  recentTickets: $('#recentTickets'),
  quickKbInput: $('#quickKbInput'),
  quickKbButton: $('#quickKbButton'),
  quickKbResults: $('#quickKbResults'),
  messageList: $('#messageList'),
  chatForm: $('#chatForm'),
  chatInput: $('#chatInput'),
  chatInsights: $('#chatInsights'),
  clearChatButton: $('#clearChatButton'),
  ticketList: $('#ticketList'),
  ticketDetail: $('#ticketDetail'),
  ticketDialog: $('#ticketDialog'),
  newTicketButton: $('#newTicketButton'),
  cancelTicketButton: $('#cancelTicketButton'),
  ticketForm: $('#ticketForm'),
  kbInput: $('#kbInput'),
  kbButton: $('#kbButton'),
  kbResults: $('#kbResults'),
  articleForm: $('#articleForm'),
  feedbackForm: $('#feedbackForm'),
  feedbackList: $('#feedbackList'),
  refreshFeedbackButton: $('#refreshFeedbackButton'),
  adminMetrics: $('#adminMetrics'),
  auditRows: $('#auditRows'),
  refreshAuditButton: $('#refreshAuditButton'),
  toast: $('#toast'),
};

let authMode = 'login';
let toastTimer = null;

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3200);
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function emptyItem(message) {
  return `<div class="item"><p>${escapeHtml(message)}</p></div>`;
}

function setBusy(button, busy, text) {
  if (!button) return;
  button.disabled = busy;
  if (text) button.textContent = text;
}

function storeSession(payload) {
  state.accessToken = payload.accessToken;
  state.refreshToken = payload.refreshToken;
  state.user = payload.user;
  localStorage.setItem('smartSupportAccess', payload.accessToken);
  localStorage.setItem('smartSupportRefresh', payload.refreshToken);
}

function clearSession() {
  state.accessToken = '';
  state.refreshToken = '';
  state.user = null;
  localStorage.removeItem('smartSupportAccess');
  localStorage.removeItem('smartSupportRefresh');
}

async function api(path, options = {}, retry = true) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(path, { ...options, headers });
  let body = null;
  try {
    body = await response.json();
  } catch (_error) {
    body = {};
  }

  if (response.status === 401 && retry && state.refreshToken) {
    const refreshed = await refreshSession();
    if (refreshed) return api(path, options, false);
  }

  if (!response.ok || body.success === false) {
    throw new Error(body.message || `Request failed with status ${response.status}`);
  }

  return body.data ?? body;
}

async function refreshSession() {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: state.refreshToken }),
    });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error('Refresh failed');
    storeSession(body.data);
    renderShell();
    return true;
  } catch (_error) {
    clearSession();
    renderShell();
    return false;
  }
}

async function checkHealth() {
  try {
    const body = await api('/health', {}, false);
    els.healthDot.className = `status-dot ${body.status === 'ok' ? 'ok' : 'bad'}`;
    els.healthText.textContent = `API ${body.status}, DB ${body.database}`;
  } catch (_error) {
    els.healthDot.className = 'status-dot bad';
    els.healthText.textContent = 'API unavailable';
  }
}

function renderShell() {
  const signedIn = Boolean(state.user && state.accessToken);
  els.authView.classList.toggle('hidden', signedIn);
  els.appView.classList.toggle('hidden', !signedIn);
  els.sessionName.textContent = signedIn ? state.user.name || state.user.email : 'Not signed in';
  els.sessionMeta.textContent = signedIn ? `${state.user.role} account` : 'Connect to the backend API';
  els.logoutButton.classList.toggle('hidden', !signedIn);

  const canAdmin = state.user?.role === 'admin';
  const canManageKb = state.user?.role === 'admin';
  $$('.admin-only').forEach((node) => node.classList.toggle('hidden', !canAdmin && node.id !== 'newArticleButton'));
  $('#newArticleButton')?.classList.toggle('hidden', !canManageKb);
  $('#articleForm')?.closest('.surface')?.classList.toggle('hidden', !canManageKb);
}

function setAuthMode(mode) {
  authMode = mode;
  els.loginTab.classList.toggle('active', mode === 'login');
  els.registerTab.classList.toggle('active', mode === 'register');
  $$('.register-field').forEach((node) => node.classList.toggle('hidden', mode !== 'register'));
  els.authSubmit.textContent = mode === 'login' ? 'Login' : 'Create account';
  els.authMessage.textContent = '';
}

async function handleAuth(event) {
  event.preventDefault();
  setBusy(els.authSubmit, true, authMode === 'login' ? 'Logging in...' : 'Creating...');
  els.authMessage.textContent = '';
  try {
    const payload = {
      email: els.emailInput.value.trim(),
      password: els.passwordInput.value,
    };
    if (authMode === 'register') payload.name = els.nameInput.value.trim();

    const data = await api(`/api/auth/${authMode === 'login' ? 'login' : 'register'}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);

    storeSession(data);
    renderShell();
    await bootAppData();
    showToast(`Welcome, ${data.user.name || data.user.email}`);
  } catch (error) {
    els.authMessage.textContent = error.message;
  } finally {
    setBusy(els.authSubmit, false, authMode === 'login' ? 'Login' : 'Create account');
  }
}

async function loadMe() {
  if (!state.accessToken) return false;
  try {
    const data = await api('/api/auth/me');
    state.user = data.user;
    renderShell();
    return true;
  } catch (_error) {
    clearSession();
    renderShell();
    return false;
  }
}

function setView(view) {
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  $$('.view-panel').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.panel !== view));
  els.viewTitle.textContent = titleCase(view === 'kb' ? 'Knowledge' : view);

  if (view === 'chat') loadHistory();
  if (view === 'tickets') loadTickets();
  if (view === 'knowledge') searchKb(els.kbInput.value || 'account');
  if (view === 'feedback') loadFeedback();
  if (view === 'admin') loadAdmin();
}

function metricCard(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderOverviewMetrics(metrics = {}) {
  const openTickets = metrics.ticketsByStatus?.open || state.tickets.filter((ticket) => ticket.status === 'open').length;
  const escalated = metrics.ticketsByStatus?.escalated || state.tickets.filter((ticket) => ticket.status === 'escalated').length;
  els.overviewMetrics.innerHTML = [
    metricCard('Tickets', state.tickets.length),
    metricCard('Open', openTickets),
    metricCard('Escalated', escalated),
    metricCard('AI confidence', metrics.averageConfidence ? `${Math.round(metrics.averageConfidence * 100)}%` : 'Live'),
  ].join('');
}

async function bootAppData() {
  await Promise.allSettled([loadTickets(), loadHistory(), loadFeedback()]);
  if (state.user?.role === 'admin') {
    await loadAdmin();
  } else {
    renderOverviewMetrics();
  }
  await searchKb('account', els.quickKbResults);
}

function renderRecentTickets() {
  const recent = state.tickets.slice(0, 5);
  els.recentTickets.innerHTML = recent.length
    ? recent.map(ticketItem).join('')
    : emptyItem('No tickets yet. Create one manually or ask the AI to escalate an issue.');
}

function ticketItem(ticket) {
  return `
    <div class="item interactive" data-ticket-id="${escapeHtml(ticket._id)}">
      <div class="item-title">
        <span>${escapeHtml(ticket.subject)}</span>
        <span class="pill ${ticket.status === 'escalated' ? 'danger' : ''}">${escapeHtml(ticket.status)}</span>
      </div>
      <p>${escapeHtml(ticket.description || ticket.aiSummary || 'No description')}</p>
      <div class="pill-row">
        <span class="pill ${ticket.priority === 'urgent' || ticket.priority === 'high' ? 'warn' : ''}">${escapeHtml(ticket.priority)}</span>
        <span class="pill">${escapeHtml(ticket.category || 'general')}</span>
        <span class="pill">${formatDate(ticket.createdAt)}</span>
      </div>
    </div>
  `;
}

async function loadTickets() {
  try {
    state.tickets = await api('/api/support/tickets');
    if (!state.selectedTicket && state.tickets.length) state.selectedTicket = state.tickets[0];
    renderTickets();
    renderRecentTickets();
    renderOverviewMetrics();
  } catch (error) {
    els.ticketList.innerHTML = emptyItem(error.message);
    els.recentTickets.innerHTML = emptyItem(error.message);
  }
}

function renderTickets() {
  const visible = state.ticketFilter === 'all'
    ? state.tickets
    : state.tickets.filter((ticket) => ticket.status === state.ticketFilter);
  els.ticketList.innerHTML = visible.length ? visible.map(ticketItem).join('') : emptyItem('No tickets match this filter.');
  renderTicketDetail(state.selectedTicket);
}

function renderTicketDetail(ticket) {
  if (!ticket) {
    els.ticketDetail.innerHTML = emptyItem('Select a ticket to inspect or create a new one.');
    return;
  }

  els.ticketDetail.innerHTML = `
    <h2>${escapeHtml(ticket.subject)}</h2>
    <p>${escapeHtml(ticket.description || ticket.aiSummary || 'No description provided.')}</p>
    <div class="pill-row">
      <span class="pill">${escapeHtml(ticket.status)}</span>
      <span class="pill ${ticket.priority === 'urgent' || ticket.priority === 'high' ? 'warn' : ''}">${escapeHtml(ticket.priority)}</span>
      <span class="pill">${escapeHtml(ticket.category || 'general')}</span>
      <span class="pill">${escapeHtml(ticket.channel || 'web')}</span>
    </div>
    <div class="ticket-actions">
      <button class="small-button" data-ticket-status="open" type="button">Open</button>
      <button class="small-button" data-ticket-status="pending" type="button">Pending</button>
      <button class="small-button" data-ticket-status="resolved" type="button">Resolve</button>
      <button class="small-button" data-escalate-ticket="${escapeHtml(ticket._id)}" type="button">Escalate</button>
    </div>
    <p class="session-meta">Created ${formatDate(ticket.createdAt)}${ticket.closedAt ? `, closed ${formatDate(ticket.closedAt)}` : ''}</p>
  `;
}

async function createTicket(event) {
  event.preventDefault();
  try {
    const ticket = await api('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify({
        subject: $('#ticketSubject').value.trim(),
        description: $('#ticketDescription').value.trim(),
        priority: $('#ticketPriority').value,
        category: $('#ticketCategory').value.trim() || 'general',
      }),
    });
    state.selectedTicket = ticket;
    els.ticketDialog.close();
    els.ticketForm.reset();
    await loadTickets();
    showToast('Ticket created');
  } catch (error) {
    showToast(error.message);
  }
}

async function updateSelectedTicket(fields) {
  if (!state.selectedTicket?._id) return;
  try {
    state.selectedTicket = await api(`/api/support/tickets/${state.selectedTicket._id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
    await loadTickets();
    showToast('Ticket updated');
  } catch (error) {
    showToast(error.message);
  }
}

function renderMessages(messages = []) {
  if (!messages.length) {
    els.messageList.innerHTML = `<div class="message system">Start a conversation with the AI support assistant.</div>`;
    return;
  }
  els.messageList.innerHTML = messages
    .map((message) => `<div class="message ${escapeHtml(message.senderType || message.role)}">${escapeHtml(message.content)}</div>`)
    .join('');
  els.messageList.scrollTop = els.messageList.scrollHeight;
}

async function loadHistory() {
  try {
    const data = await api('/api/chat/history');
    state.conversationId = data.conversation?._id || '';
    state.lastTicketId = data.conversation?.ticketId || state.lastTicketId;
    renderMessages(data.messages || []);
    renderChatInsights({
      totalTokens: data.totalTokens || 0,
      conversationId: state.conversationId || 'New',
      status: data.conversation?.status || 'ready',
      confidence: data.conversation?.aiConfidence || 0,
    });
  } catch (error) {
    renderMessages([{ senderType: 'system', content: error.message }]);
  }
}

function renderChatInsights(data = {}) {
  const rows = Object.entries(data).filter(([, value]) => value !== undefined && value !== '');
  els.chatInsights.innerHTML = rows.length
    ? rows.map(([key, value]) => `<dt>${escapeHtml(titleCase(key))}</dt><dd>${escapeHtml(value)}</dd>`).join('')
    : '<dt>Status</dt><dd>Ready</dd>';
}

async function sendChat(event) {
  event.preventDefault();
  const message = els.chatInput.value.trim();
  if (!message) return;

  const pending = [...els.messageList.children].map((node) => ({
    senderType: node.classList.contains('user') ? 'user' : node.classList.contains('assistant') ? 'assistant' : 'system',
    content: node.textContent,
  }));
  pending.push({ senderType: 'user', content: message }, { senderType: 'system', content: 'Thinking...' });
  renderMessages(pending);
  els.chatInput.value = '';

  try {
    const data = await api('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversationId: state.conversationId || undefined,
        ticketId: state.lastTicketId || undefined,
      }),
    });
    state.conversationId = data.conversationId;
    state.lastTicketId = data.ticketId || state.lastTicketId;
    renderChatInsights({
      action: data.action,
      intent: data.intent,
      sentiment: data.sentiment,
      urgency: data.urgency,
      confidence: `${Math.round((data.confidence || 0) * 100)}%`,
      tokensUsed: data.tokensUsed,
      ticketId: data.ticketId || '',
    });
    await loadHistory();
    if (data.ticketId) await loadTickets();
  } catch (error) {
    pending[pending.length - 1] = { senderType: 'system', content: error.message };
    renderMessages(pending);
  }
}

async function clearChat() {
  try {
    await api('/api/chat/history', { method: 'DELETE' });
    state.conversationId = '';
    state.lastTicketId = '';
    await loadHistory();
    await loadTickets();
    showToast('Conversation cleared');
  } catch (error) {
    showToast(error.message);
  }
}

async function searchKb(query, target = els.kbResults) {
  const q = String(query || '').trim();
  if (!q) {
    target.innerHTML = emptyItem('Enter a search term.');
    return;
  }
  try {
    const results = await api(`/api/kb/search?q=${encodeURIComponent(q)}`);
    target.innerHTML = results.length
      ? results.map((article) => `
        <div class="item">
          <div class="item-title"><span>${escapeHtml(article.title)}</span><span class="pill">${escapeHtml(article.slug)}</span></div>
          <p>${escapeHtml(article.summary || article.content || '')}</p>
          <div class="pill-row">${(article.tags || []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('')}</div>
        </div>
      `).join('')
      : emptyItem('No matching published articles.');
  } catch (error) {
    target.innerHTML = emptyItem(error.message);
  }
}

async function saveArticle(event) {
  event.preventDefault();
  try {
    await api('/api/kb', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#articleTitle').value.trim(),
        category: $('#articleCategory').value.trim() || 'general',
        tags: $('#articleTags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
        summary: $('#articleSummary').value.trim(),
        content: $('#articleContent').value.trim(),
        status: $('#articleStatus').value,
      }),
    });
    els.articleForm.reset();
    showToast('Article saved');
    await searchKb(els.kbInput.value || $('#articleTitle').value || 'support');
  } catch (error) {
    showToast(error.message);
  }
}

async function submitFeedback(event) {
  event.preventDefault();
  try {
    await api('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        rating: Number($('#ratingInput').value),
        comment: $('#feedbackComment').value.trim(),
        source: $('#feedbackSource').value,
        conversationId: state.conversationId || undefined,
        ticketId: state.lastTicketId || state.selectedTicket?._id || undefined,
      }),
    });
    $('#feedbackComment').value = '';
    showToast('Feedback submitted');
    await loadFeedback();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadFeedback() {
  try {
    const items = await api('/api/feedback');
    els.feedbackList.innerHTML = items.length
      ? items.map((item) => `
        <div class="item">
          <div class="item-title"><span>${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</span><span class="pill">${escapeHtml(item.source)}</span></div>
          <p>${escapeHtml(item.comment || 'No comment')}</p>
          <div class="pill-row"><span class="pill">${formatDate(item.createdAt)}</span></div>
        </div>
      `).join('')
      : emptyItem('No feedback submitted yet.');
  } catch (error) {
    els.feedbackList.innerHTML = emptyItem(error.message);
  }
}

async function loadAdmin() {
  if (state.user?.role !== 'admin') return;
  try {
    const metrics = await api('/api/admin/metrics');
    renderOverviewMetrics(metrics);
    els.adminMetrics.innerHTML = [
      metricCard('Conversations', metrics.conversationCount),
      metricCard('Messages', metrics.messageCount),
      metricCard('Feedback', metrics.feedbackCount),
      metricCard('Articles', metrics.articleCount),
      metricCard('Total tokens', metrics.totalTokens),
      metricCard('Avg confidence', `${Math.round((metrics.averageConfidence || 0) * 100)}%`),
    ].join('');
    await loadAuditLogs();
  } catch (error) {
    els.adminMetrics.innerHTML = emptyItem(error.message);
  }
}

async function loadAuditLogs() {
  try {
    const logs = await api('/api/admin/audit-logs');
    els.auditRows.innerHTML = logs.length
      ? logs.map((log) => `
        <tr>
          <td>${escapeHtml(log.action)}</td>
          <td>${escapeHtml(log.actorRole || 'system')}</td>
          <td>${escapeHtml(log.targetType || '')}</td>
          <td>${formatDate(log.createdAt)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="4">No audit logs yet.</td></tr>';
  } catch (error) {
    els.auditRows.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function logout() {
  try {
    if (state.accessToken) await api('/api/auth/logout', { method: 'POST' }, false);
  } catch (_error) {
  } finally {
    clearSession();
    renderShell();
    setView('overview');
  }
}

function bindEvents() {
  els.loginTab.addEventListener('click', () => setAuthMode('login'));
  els.registerTab.addEventListener('click', () => setAuthMode('register'));
  els.authForm.addEventListener('submit', handleAuth);
  els.logoutButton.addEventListener('click', logout);
  els.chatForm.addEventListener('submit', sendChat);
  els.clearChatButton.addEventListener('click', clearChat);
  els.newTicketButton.addEventListener('click', () => els.ticketDialog.showModal());
  els.cancelTicketButton.addEventListener('click', () => els.ticketDialog.close());
  els.ticketForm.addEventListener('submit', createTicket);
  els.kbButton.addEventListener('click', () => searchKb(els.kbInput.value));
  els.quickKbButton.addEventListener('click', () => searchKb(els.quickKbInput.value, els.quickKbResults));
  els.articleForm.addEventListener('submit', saveArticle);
  els.feedbackForm.addEventListener('submit', submitFeedback);
  els.refreshFeedbackButton.addEventListener('click', loadFeedback);
  els.refreshAuditButton.addEventListener('click', loadAuditLogs);

  $$('.nav-item').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  $$('[data-view-link]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.viewLink)));

  $('#ticketFilter').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-status]');
    if (!button) return;
    state.ticketFilter = button.dataset.status;
    $$('#ticketFilter button').forEach((item) => item.classList.toggle('active', item === button));
    renderTickets();
  });

  document.addEventListener('click', async (event) => {
    const ticketNode = event.target.closest('[data-ticket-id]');
    if (ticketNode) {
      const ticket = state.tickets.find((item) => item._id === ticketNode.dataset.ticketId);
      state.selectedTicket = ticket || state.selectedTicket;
      renderTicketDetail(state.selectedTicket);
    }

    const statusButton = event.target.closest('[data-ticket-status]');
    if (statusButton) {
      await updateSelectedTicket({ status: statusButton.dataset.ticketStatus });
    }

    const escalateButton = event.target.closest('[data-escalate-ticket]');
    if (escalateButton && state.selectedTicket?._id) {
      try {
        state.selectedTicket = await api(`/api/support/tickets/${state.selectedTicket._id}/escalate`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Manual escalation from support console' }),
        });
        await loadTickets();
        showToast('Ticket escalated');
      } catch (error) {
        showToast(error.message);
      }
    }
  });

  [els.kbInput, els.quickKbInput].forEach((input) => {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (input === els.kbInput) searchKb(els.kbInput.value);
        else searchKb(els.quickKbInput.value, els.quickKbResults);
      }
    });
  });
}

async function init() {
  bindEvents();
  setAuthMode('login');
  renderShell();
  await checkHealth();
  const signedIn = await loadMe();
  if (signedIn) await bootAppData();
  setInterval(checkHealth, 30000);
}

init();
