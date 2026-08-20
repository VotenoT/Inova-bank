window.InovaPatch = {
  apply(html) {
    const ENDPOINT = "https://inova-bank.kaio2511henrique.workers.dev";

    // Visual do lembrete por criticidade + estado concluído.
    html = html.replace("</style>", `
.reminder{border-left-width:8px!important;cursor:pointer;transition:transform .18s ease,opacity .2s ease,border-color .2s ease}
.reminder:hover{transform:translateY(-1px)}
.reminder.crit-baixo{border-left-color:#18a34a!important}
.reminder.crit-medio{border-left-color:#e6b800!important}
.reminder.crit-alto{border-left-color:#f07818!important}
.reminder.crit-critico{border-left-color:#e53131!important}
.reminder.completed{opacity:.62}
.reminder.completed h3{text-decoration:line-through}
.reminder-check{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#18a34a;color:#fff;font-weight:900;margin-left:auto}
.reminder-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.reminder-actions .danger{grid-column:1/-1}
</style>`);

    // Endpoint fixo da IA.
    html = html.replace(
      "const nowIso = () => new Date().toISOString();",
      `const nowIso = () => new Date().toISOString();
  const INOVA_AI_ENDPOINT = "${ENDPOINT}";`
    );

    html = html.replace(
      /let state=loadState\(\);/,
      `let state=loadState();
  state.workerUrl = INOVA_AI_ENDPOINT;`
    );

    // Remove qualquer configuração visível do Worker/API.
    html = html.replace(
      /\s*<div class="card">\s*<strong>Boas práticas do protótipo<\/strong>[\s\S]*?<\/div>\s*(?=<\/section>)/,
      ""
    );
    html = html.replace(
      /\s*<div class="card">\s*<h3 style="margin-top:0">IA via Cloudflare<\/h3>[\s\S]*?<\/div>\s*(?=<\/section>)/,
      ""
    );
    html = html.replace(/\s*\$\('#workerUrl'\)\.value=state\.workerUrl\|\|'';\s*/g, "\n");
    html = html.replace(
      /\s*\$\('#saveWorkerBtn'\)\.addEventListener\('click',\(\)=>\{[\s\S]*?\n\s*\}\);\s*/g,
      "\n"
    );

    // A IA usa somente o endpoint fixo.
    html = html.replace(
      /const url=\(state\.workerUrl\|\|''\)\.trim\(\)\.replace\(\/\\\/$\/,''\);\s*if\(!url\)\{[\s\S]*?return;\s*\}/,
      "const url=INOVA_AI_ENDPOINT;"
    );
    html = html.replace(/const url=state\.workerUrl[^;]*;/g, "const url=INOVA_AI_ENDPOINT;");
    html = html.replace(/const url=INOVA_AI_ENDPOINT;/g, "const url=INOVA_AI_ENDPOINT;");

    // Concluídos não entram no mural prioritário.
    html = html.replace(
      "const sorted=[...state.reminders].sort((a,b)=>reminderScore(b)-reminderScore(a));",
      "const sorted=state.reminders.filter(r=>!r.completed).sort((a,b)=>reminderScore(b)-reminderScore(a));"
    );

    // Card: barra colorida por criticidade + ✓ quando concluído.
    html = html.replace(
      /function reminderCard\(r\)\{[\s\S]*?\n\s*\}\n\s*function renderReminders/,
`function reminderCard(r){
    const crit=String(r.criticality||'baixo').toLowerCase();
    const done=!!r.completed;
    return \`<div class="reminder crit-\${crit}\${done?' completed':''}" data-reminder-id="\${escapeHtml(r.id)}" role="button" tabindex="0">
      <div class="meta">
        <span class="badge">\${escapeHtml(r.sector)}</span>
        <span class="badge">\${escapeHtml(r.criticality)}</span>
        <span class="badge">\${money(r.value)}</span>
        \${done?'<span class="reminder-check" title="Concluído">✓</span>':''}
      </div>
      <h3>\${escapeHtml(r.title)}</h3>
      <p>\${escapeHtml(r.description||'Sem descrição')}</p>
      <small>\${done?'✓ Concluído':'⏱ '+new Date(r.due).toLocaleString('pt-BR')}</small>
    </div>\`;
  }

  function renderReminders`
    );

    // Renderização + clique para editar.
    html = html.replace(
      /function renderReminders\(\)\{[\s\S]*?\n\s*\}\n\s*function addReminder\(\)\{/,
`function bindReminderCards(){
    $$('[data-reminder-id]').forEach(card=>{
      const open=()=>editReminder(card.dataset.reminderId);
      card.addEventListener('click',open);
      card.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}
      });
    });
  }

  function renderReminders(){
    if(!$('#topReminders'))return;
    const top=topFourReminders();
    $('#topReminders').innerHTML=top.length
      ? top.map(reminderCard).join('')
      : '<div class="empty">Nenhum lembrete pendente no mural.</div>';

    const all=[...state.reminders].sort((a,b)=>{
      if(!!a.completed!==!!b.completed)return a.completed?1:-1;
      return reminderScore(b)-reminderScore(a);
    });

    $('#allReminders').innerHTML=all.length
      ? \`<div class="reminder-grid">\${all.map(reminderCard).join('')}</div>\`
      : '<div class="empty">Nenhum lembrete.</div>';

    bindReminderCards();
  }

  function editReminder(id){
    const r=state.reminders.find(x=>x.id===id);
    if(!r)return;

    const due=new Date(r.due);
    const dueValue=new Date(due.getTime()-due.getTimezoneOffset()*60000).toISOString().slice(0,16);

    openModal('Editar lembrete',\`
      <form id="editReminderForm">
        <div class="field"><label>Título</label><input id="erTitle" required maxlength="80" value="\${escapeHtml(r.title)}"></div>
        <div class="field"><label>Descrição</label><textarea id="erDesc" maxlength="500">\${escapeHtml(r.description||'')}</textarea></div>
        <div class="row">
          <div class="field"><label>Tipo</label>
            <select id="erFlow">
              <option value="income"\${r.flow==='income'?' selected':''}>Renda</option>
              <option value="expense"\${r.flow==='expense'?' selected':''}>Despesa</option>
            </select>
          </div>
          <div class="field"><label>Criticidade</label>
            <select id="erCrit">
              <option value="baixo"\${r.criticality==='baixo'?' selected':''}>Baixo</option>
              <option value="medio"\${r.criticality==='medio'?' selected':''}>Médio</option>
              <option value="alto"\${r.criticality==='alto'?' selected':''}>Alto</option>
              <option value="critico"\${r.criticality==='critico'?' selected':''}>Crítico</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="field"><label>Setor</label><input id="erSector" required value="\${escapeHtml(r.sector)}"></div>
          <div class="field"><label>Valor relacionado</label><input id="erValue" type="number" min="0" step="0.01" value="\${Number(r.value||0)}"></div>
        </div>
        <div class="field"><label>Data para lembrar</label><input id="erDue" type="datetime-local" required value="\${dueValue}"></div>
        <button class="primary" type="submit">Salvar alterações</button>
      </form>
      <div class="reminder-actions">
        \${r.completed?'':'<button class="secondary" id="completeReminderBtn">✓ Marcar concluído</button>'}
        <button class="danger" id="deleteReminderBtn">Excluir lembrete</button>
      </div>\`,()=>{
        $('#editReminderForm').addEventListener('submit',e=>{
          e.preventDefault();
          r.title=$('#erTitle').value.trim();
          r.description=$('#erDesc').value.trim();
          r.flow=$('#erFlow').value;
          r.criticality=$('#erCrit').value;
          r.sector=$('#erSector').value.trim();
          r.value=Number($('#erValue').value||0);
          r.due=new Date($('#erDue').value).toISOString();
          save();renderReminders();closeModal();toast('Lembrete atualizado.');
        });

        $('#completeReminderBtn')?.addEventListener('click',()=>{
          r.completed=true;
          r.completedAt=nowIso();
          save();renderReminders();closeModal();toast('Lembrete concluído.');
        });

        $('#deleteReminderBtn').addEventListener('click',()=>{
          state.reminders=state.reminders.filter(x=>x.id!==id);
          save();renderReminders();closeModal();toast('Lembrete excluído.');
        });
      });
  }

  function addReminder(){`
    );

    // Novos lembretes começam pendentes.
    html = html.replace(
      "value:Number($('#rValue').value||0),due:new Date($('#rDue').value).toISOString(),createdAt:nowIso()",
      "value:Number($('#rValue').value||0),due:new Date($('#rDue').value).toISOString(),createdAt:nowIso(),completed:false,completedAt:null"
    );

    return html;
  }
};
