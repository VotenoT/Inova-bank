(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const STORAGE_KEY = 'inovaAiChatHistory';
  const MAX_HISTORY = 30;
  const AI_ENDPOINT = 'https://inova-bank.kaio2511henrique.workers.dev';

  const escapeHtml = (value='') => String(value).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function getAppState(){
    try { return JSON.parse(localStorage.getItem('inovaState') || '{}') || {}; }
    catch { return {}; }
  }

  function getHistory(){
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }

  function saveHistory(history){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  }

  function buildContext(){
    const state = getAppState();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const tx = Array.isArray(state.transactions) ? state.transactions : [];
    const last24 = tx.filter(t => new Date(t.date).getTime() >= cutoff);
    const income = last24.filter(t => t.type === 'income').reduce((sum,t) => sum + Number(t.amount || 0), 0);
    const expense = last24.filter(t => t.type === 'expense').reduce((sum,t) => sum + Number(t.amount || 0), 0);
    const selected = state.selectedCurrency || 'USD-BRL';
    return {
      simulation: true,
      balance: Number(state.balance || 0),
      investment: Number(state.investment || 0),
      company: state.company || null,
      last24h: { income, expense, net: income - expense, transactions: last24.slice(0, 30) },
      reminders: (Array.isArray(state.reminders) ? state.reminders : []).filter(r => !r.completed).slice(0, 30),
      selectedCurrency: state.currencyCache?.[selected] || { pair: selected, status: 'sem cache' }
    };
  }

  function chatbotMarkup(){
    return `
      <div class="sheet ai-sheet-chat">
        <div class="sheet-head">
          <div>
            <h2>IA Inova</h2>
            <div class="ai-chat-note">Converse sobre seus gráficos, gastos, empresa e moedas.</div>
          </div>
          <button class="close" id="aiChatClose" aria-label="Fechar">×</button>
        </div>
        <div class="ai-chat-tools">
          <button class="secondary" data-chat-prompt="Explique de forma simples o que aconteceu nas minhas últimas 24 horas financeiras.">Resumo 24h</button>
          <button class="secondary" data-chat-prompt="Quais lembretes empresariais merecem atenção primeiro? Explique de forma simples.">Prioridades</button>
          <button class="secondary" data-chat-prompt="Explique a cotação selecionada de forma simples, sem recomendar compra ou venda.">Entender moeda</button>
          <button class="secondary" id="aiChatClear">Limpar conversa</button>
        </div>
        <div class="ai-chat-messages" id="aiChatMessages" aria-live="polite"></div>
        <div class="ai-chat-composer">
          <textarea id="aiChatInput" rows="1" placeholder="Digite sua pergunta..."></textarea>
          <button class="ai-chat-send" id="aiChatSend" aria-label="Enviar">➜</button>
        </div>
      </div>`;
  }

  function renderMessages(){
    const box = $('#aiChatMessages');
    if (!box) return;
    const history = getHistory();
    if (!history.length) {
      box.innerHTML = '<div class="ai-chat-message system">Olá! Posso explicar os dados do Inova de forma simples. Pergunte como se estivesse conversando comigo.</div>';
    } else {
      box.innerHTML = history.map(m => `<div class="ai-chat-message ${m.role === 'user' ? 'user' : 'assistant'}">${escapeHtml(m.content)}</div>`).join('');
    }
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  }

  function pushMessage(role, content){
    const history = getHistory();
    history.push({ role, content: String(content), at: new Date().toISOString() });
    saveHistory(history);
    renderMessages();
  }

  function setTyping(active){
    const box = $('#aiChatMessages');
    if (!box) return;
    $('#aiChatTyping')?.remove();
    if (active) {
      const el = document.createElement('div');
      el.id = 'aiChatTyping';
      el.className = 'ai-chat-message assistant';
      el.innerHTML = '<span class="ai-chat-typing"><i></i><i></i><i></i></span>';
      box.appendChild(el);
      box.scrollTop = box.scrollHeight;
    }
  }

  async function sendMessage(question){
    const q = String(question || '').trim();
    if (!q) return;

    const input = $('#aiChatInput');
    const send = $('#aiChatSend');

    pushMessage('user', q);
    if (input) { input.value = ''; input.style.height = 'auto'; }

    if (send) send.disabled = true;
    setTyping(true);

    try {
      const history = getHistory().slice(0, -1).slice(-11).map(m => ({ role: m.role, content: m.content }));
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ question:q, context:buildContext(), history })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setTyping(false);
      pushMessage('assistant', data.answer || 'Não consegui gerar uma resposta agora.');
    } catch (error) {
      setTyping(false);
      pushMessage('assistant', `Não consegui consultar a IA agora. Motivo: ${error.message}`);
    } finally {
      if (send) send.disabled = false;
    }
  }

  function initializeChat(){
    const modal = $('#aiModal');
    if (!modal || modal.dataset.chatReady === '1') return;
    modal.dataset.chatReady = '1';
    modal.innerHTML = chatbotMarkup();

    $('#aiChatClose')?.addEventListener('click', () => modal.classList.remove('open'));
    $('#aiChatClear')?.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      renderMessages();
    });
    $('#aiChatSend')?.addEventListener('click', () => sendMessage($('#aiChatInput')?.value));
    $('#aiChatInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(e.currentTarget.value);
      }
    });
    $('#aiChatInput')?.addEventListener('input', e => {
      e.currentTarget.style.height = 'auto';
      e.currentTarget.style.height = Math.min(120, e.currentTarget.scrollHeight) + 'px';
    });
    modal.querySelectorAll('[data-chat-prompt]').forEach(btn =>
      btn.addEventListener('click', () => sendMessage(btn.dataset.chatPrompt))
    );
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('open');
    });
    renderMessages();
  }

  function enhanceAiOpen(){
    const top = $('#aiTopBtn');
    if (!top) return;
    top.addEventListener('click', () => {
      initializeChat();
      renderMessages();
      setTimeout(() => $('#aiChatInput')?.focus(), 180);
    }, true);
  }

  function addRippleFeedback(){
    document.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      btn.animate([
        { transform:'scale(1)' },
        { transform:'scale(.965)' },
        { transform:'scale(1)' }
      ], { duration:180, easing:'ease-out' });
    });
  }

  function start(){
    initializeChat();
    enhanceAiOpen();
    addRippleFeedback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();
