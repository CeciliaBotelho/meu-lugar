import { state, peekDay, updateDay, setSetting, uid, clone } from '../store.js';
import { todayKey, nowTime, fmtMedium } from '../dates.js';
import { esc, openSheet, toast, confetti, hearts, registerToast, num, confirmSheet } from '../ui.js';
import { rerender, dateBar } from '../router.js';
import { dayKcal, mealKcal, extrasKcal, plannedMeals } from '../report.js';

const menu = () => state.settings.menu || [];

export function render() {
  const date = state.date;
  const day = peekDay(date);
  const kcal = dayKcal(day);
  const ref = Number(state.settings.kcalReference) || 1500;
  const pct = Math.min(100, (kcal / ref) * 100);
  const menuIds = new Set(menu().map((m) => m.id));
  const orphanMeals = Object.entries(day.meals || {}).filter(([id, m]) => !menuIds.has(id) && (m.items || []).length);

  return `
  ${dateBar(date)}
  <div class="card pink">
    <div class="row between"><div><div class="small muted" style="font-weight:700">Total do dia</div><div style="font-size:30px;font-weight:900;color:var(--pink-strong)">${kcal} <small style="font-size:15px">kcal</small></div></div>
    <div class="center"><div class="tiny muted" style="font-weight:700">Referência</div><button class="mini-btn" data-action="edit-ref">${ref} kcal ✏️</button></div></div>
    <div class="progress mt"><span style="width:${pct}%"></span></div>
    <p class="tiny muted mt-s">Referência pessoal e configurável — não é limite nem prescrição. Valores calóricos são estimativas editáveis. 💗</p>
  </div>

  ${menu().map((m) => mealCard(m, day)).join('')}
  ${orphanMeals.map(([id, m]) => orphanCard(id, m, day)).join('')}

  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">➕</span><h3>Alimentos extras</h3></div><span class="meal-total">${extrasKcal(day)} kcal</span></div>
    ${(day.extras || []).length ? day.extras.map((e) => `
      <div class="extra-item">
        <div class="grow"><div style="font-weight:700">${esc(e.name)}</div><div class="small muted">${[e.qty, e.time ? 'às ' + e.time : '', e.mealId ? mealName(e.mealId, day) : ''].filter(Boolean).map(esc).join(' · ')}</div></div>
        <b style="color:var(--pink-strong)">${Number(e.kcal) || 0} kcal</b>
        <button class="mini-btn" data-action="edit-extra" data-uid="${e.uid}" aria-label="Editar">✏️</button>
      </div>`).join('') : '<p class="small faint">Nenhum extra registrado. Tudo bem registrar qualquer coisa a mais que comer — sem culpa. 🌸</p>'}
    <button class="btn ghost block mt" data-action="add-extra">➕ Adicionar alimento extra</button>
  </div>

  <div class="btn-row">
    <button class="btn soft" data-action="edit-menu">✏️ Editar cardápio</button>
  </div>
  <p class="tiny faint center mt">Editar o cardápio não altera dias já registrados.</p>
  `;
}

function mealName(id, day) {
  const m = menu().find((x) => x.id === id);
  return m ? m.name : (day.meals[id] && day.meals[id].mealName) || id;
}

function mealCard(m, day) {
  const rec = day.meals[m.id] || { items: [] };
  const items = rec.items || [];
  const total = mealKcal(rec) + extrasKcal(day, m.id);
  const optionIds = new Set(m.options.map((o) => o.id));
  const customItems = items.filter((it) => !optionIds.has(it.optionId));
  return `
  <div class="card meal-card">
    <div class="card-head">
      <div class="ttl"><span class="emoji">${esc(m.emoji || '🍽️')}</span><div><h3>${esc(m.name)}</h3><div class="tiny muted">planejado ≈ ${esc(m.time || '')}</div></div></div>
      <span class="meal-total">${total} kcal</span>
    </div>
    <label class="meal-time">🕐 Horário real <input type="time" value="${esc(rec.time || '')}" data-action-change="meal-time" data-meal="${m.id}" aria-label="Horário real de ${esc(m.name)}"></label>
    ${m.options.map((o) => optionBtn(m, o, items.find((it) => it.optionId === o.id))).join('')}
    ${customItems.map((it) => optionBtn(m, null, it)).join('')}
    <div class="option-tools" style="margin-top:10px">
      <button class="mini-btn" data-action="add-custom-item" data-meal="${m.id}">＋ Outro alimento nesta refeição</button>
    </div>
  </div>`;
}

function orphanCard(id, rec, day) {
  return `
  <div class="card meal-card">
    <div class="card-head"><div class="ttl"><span class="emoji">${esc(rec.emoji || '🍽️')}</span><div><h3>${esc(rec.mealName || id)}</h3><div class="tiny muted">refeição que não está mais no cardápio</div></div></div><span class="meal-total">${mealKcal(rec)} kcal</span></div>
    ${rec.items.map((it) => optionBtn({ id, name: rec.mealName }, null, it)).join('')}
  </div>`;
}

/** Botão de uma opção. Se selecionada, mostra o que foi REGISTRADO (snapshot), não o cardápio atual. */
function optionBtn(m, o, sel) {
  const src = sel || o;
  const lt = (o && o.lactoseTip) || (sel && sel.lactoseTip);
  return `
  <div>
    <button class="option ${sel ? 'selected' : ''}" data-action="toggle-option" data-meal="${m.id}" ${o ? `data-option="${o.id}"` : ''} ${sel ? `data-uid="${sel.uid}"` : ''} aria-pressed="${sel ? 'true' : 'false'}">
      <span class="check">✓</span>
      <span class="body">
        <span class="row between" style="align-items:flex-start"><span class="name">${esc(src.name)}</span><span class="kcal">≈ ${Number(src.kcal) || 0} kcal</span></span>
        <ul>${(src.ingredients || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        ${lt ? `<span class="alt">🥛 ${esc(lt)}</span>` : ''}
        ${sel && sel.note ? `<span class="small muted" style="display:block;margin-top:4px">📝 ${esc(sel.note)}</span>` : ''}
        ${sel ? `<span class="sel-note">${sel.edited ? 'Registrado (ajustado neste dia) 💗' : 'Registrado 💗'}</span>` : ''}
      </span>
    </button>
    ${sel ? `<div class="option-tools"><button class="mini-btn" data-action="edit-item" data-meal="${m.id}" data-uid="${sel.uid}">✏️ Ajustar porção / ingredientes</button></div>` : ''}
  </div>`;
}

async function afterMealChange(date) {
  const day = peekDay(date);
  const planned = plannedMeals();
  const all = planned.length && planned.every((m) => (day.meals[m.id]?.items || []).length);
  if (all && !day.flags.allMeals) {
    await updateDay(date, (d) => { d.flags.allMeals = true; });
    confetti(70);
    toast('Parabéns, Cecilia! 💗 Você registrou todas as refeições de hoje! Que bom ver você se cuidando! 🌸', { big: true, ms: 5200 });
  } else {
    registerToast();
  }
}

function snapshotFromOption(m, o) {
  return { uid: uid('it'), optionId: o.id, name: o.name, kcal: Number(o.kcal) || 0, ingredients: [...(o.ingredients || [])], lactoseTip: o.lactoseTip || '', note: '', addedAt: new Date().toISOString() };
}

function ensureMeal(d, m) {
  if (!d.meals[m.id]) d.meals[m.id] = { mealName: m.name, emoji: m.emoji, plannedTime: m.time || '', time: '', items: [] };
  const rec = d.meals[m.id];
  if (!rec.time) rec.time = d.date === todayKey() ? nowTime() : (m.time || '');
  return rec;
}

export const actions = {
  async 'toggle-option'(el) {
    const date = state.date;
    const m = menu().find((x) => x.id === el.dataset.meal) || { id: el.dataset.meal, name: peekDay(date).meals[el.dataset.meal]?.mealName || '' };
    const optId = el.dataset.option;
    const selUid = el.dataset.uid;
    if (selUid) {
      // desmarcar (com opção de desfazer)
      let removed = null, idx = -1;
      await updateDay(date, (d) => {
        const rec = d.meals[m.id];
        if (!rec) return;
        idx = rec.items.findIndex((it) => it.uid === selUid);
        if (idx >= 0) removed = rec.items.splice(idx, 1)[0];
        if (!rec.items.length) rec.time = '';
      });
      rerender();
      if (removed) toast(`Desmarcado: ${removed.name}`, { action: { label: 'Desfazer', fn: async () => {
        await updateDay(date, (d) => { const rec = ensureMeal(d, m); if (!rec.items.some((it) => it.uid === removed.uid)) rec.items.splice(Math.min(idx, rec.items.length), 0, removed); });
        rerender();
      } } });
      return;
    }
    const o = m.options && m.options.find((x) => x.id === optId);
    if (!o) return;
    await updateDay(date, (d) => {
      const rec = ensureMeal(d, m);
      if (rec.items.some((it) => it.optionId === o.id)) return; // sem duplicação
      rec.items.push(snapshotFromOption(m, o));
    });
    hearts(5);
    rerender();
    afterMealChange(date);
  },

  async 'meal-time'(el) {
    const date = state.date;
    const m = menu().find((x) => x.id === el.dataset.meal);
    await updateDay(date, (d) => {
      if (!d.meals[el.dataset.meal]) {
        if (!el.value) return;
        d.meals[el.dataset.meal] = { mealName: m ? m.name : el.dataset.meal, emoji: m ? m.emoji : '', plannedTime: m ? m.time : '', time: '', items: [] };
      }
      d.meals[el.dataset.meal].time = el.value;
    });
  },

  'edit-item'(el) { itemSheet(el.dataset.meal, el.dataset.uid); },
  'add-custom-item'(el) { itemSheet(el.dataset.meal, null); },
  'add-extra'() { extraSheet(null); },
  'edit-extra'(el) { extraSheet(el.dataset.uid); },
  'edit-menu'() { menuSheet(); },
  'edit-ref'() {
    openSheet(`<h2>Referência diária</h2>
      <p class="small muted">Um número de referência para acompanhar seus registros. Não é limite, meta obrigatória nem prescrição nutricional. 💗</p>
      <label class="field mt"><span>kcal por dia</span><input class="input" id="ref" type="number" inputmode="numeric" min="0" step="10" value="${state.settings.kcalReference}"></label>
      <div class="sheet-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="ok">Salvar</button></div>`, {
      onMount(s, close) {
        s.querySelector('#ok').addEventListener('click', async () => {
          const v = num(s.querySelector('#ref').value);
          if (v == null || v < 0) return toast('Digite um número válido 💗');
          await setSetting('kcalReference', Math.round(v));
          close(); rerender();
        });
      }
    });
  }
};

/** Ajusta um item registrado NESTE dia (não altera o cardápio). uid=null cria item avulso. */
function itemSheet(mealId, itemUid) {
  const date = state.date;
  const day = peekDay(date);
  const m = menu().find((x) => x.id === mealId) || { id: mealId, name: day.meals[mealId]?.mealName || mealId, options: [] };
  const it = itemUid ? (day.meals[mealId]?.items || []).find((x) => x.uid === itemUid) : null;
  const v = it || { name: '', kcal: '', ingredients: [], note: '' };
  openSheet(`
    <h2>${it ? '✏️ Ajustar neste dia' : '＋ Alimento em ' + esc(m.name)}</h2>
    <p class="small muted" style="margin-top:-6px">${esc(fmtMedium(date))} · muda só o registro deste dia</p>
    <div class="form mt">
      <label class="field"><span>Nome</span><input class="input" id="nm" value="${esc(v.name)}" placeholder="ex.: Iogurte sem lactose"></label>
      <label class="field"><span>Calorias (estimativa)</span><input class="input" id="kc" type="number" inputmode="numeric" min="0" value="${esc(v.kcal)}"></label>
      <label class="field"><span>Ingredientes e quantidades (um por linha) — substitua à vontade</span><textarea class="input" id="ing" rows="5">${esc((v.ingredients || []).join('\n'))}</textarea></label>
      ${v.lactoseTip ? `<div class="notice lilac">🥛 ${esc(v.lactoseTip)}</div>` : ''}
      <label class="field"><span>Observação</span><input class="input" id="nt" value="${esc(v.note || '')}" placeholder="opcional"></label>
    </div>
    <div class="sheet-actions">
      ${it ? '<button class="btn danger" id="rm">Remover</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}
      <button class="btn" id="ok">Salvar</button>
    </div>`, {
    onMount(s, close) {
      s.querySelector('#ok').addEventListener('click', async () => {
        const name = s.querySelector('#nm').value.trim();
        if (!name) return toast('Dê um nome ao alimento 💗');
        const kcal = Math.max(0, Math.round(num(s.querySelector('#kc').value) || 0));
        const ingredients = s.querySelector('#ing').value.split('\n').map((x) => x.trim()).filter(Boolean);
        const note = s.querySelector('#nt').value.trim();
        await updateDay(date, (d) => {
          const rec = ensureMeal(d, m);
          if (it) {
            const t = rec.items.find((x) => x.uid === it.uid);
            if (t) Object.assign(t, { name, kcal, ingredients, note, edited: true });
          } else {
            rec.items.push({ uid: uid('it'), optionId: null, name, kcal, ingredients, note, custom: true, addedAt: new Date().toISOString() });
          }
        });
        close(); rerender(); if (!it) afterMealChange(date); else registerToast();
      });
      const rm = s.querySelector('#rm');
      if (rm) rm.addEventListener('click', async () => {
        await updateDay(date, (d) => { const rec = d.meals[mealId]; if (rec) { rec.items = rec.items.filter((x) => x.uid !== it.uid); if (!rec.items.length) rec.time = ''; } });
        close(); rerender();
      });
    }
  });
}

function extraSheet(extraUid) {
  const date = state.date;
  const day = peekDay(date);
  const e = extraUid ? day.extras.find((x) => x.uid === extraUid) : null;
  const v = e || { name: '', qty: '', kcal: '', time: date === todayKey() ? nowTime() : '', mealId: '' };
  openSheet(`
    <h2>${e ? '✏️ Editar extra' : '➕ Alimento extra'}</h2>
    <div class="form">
      <label class="field"><span>O que foi?</span><input class="input" id="nm" value="${esc(v.name)}" placeholder="ex.: Café com leite sem lactose"></label>
      <div class="row">
        <label class="field grow"><span>Quantidade</span><input class="input" id="qt" value="${esc(v.qty)}" placeholder="ex.: 1 xícara"></label>
        <label class="field" style="width:110px"><span>kcal</span><input class="input" id="kc" type="number" inputmode="numeric" min="0" value="${esc(v.kcal)}"></label>
      </div>
      <div class="row">
        <label class="field" style="width:130px"><span>Horário</span><input class="input" id="tm" type="time" value="${esc(v.time)}"></label>
        <div class="grow"><div class="tiny muted" style="font-weight:700;margin:0 0 4px 4px">Junto de qual refeição? (opcional)</div>
          <div class="chips" id="ml">${[{ id: '', name: 'Avulso' }, ...menu()].map((m) => `<button class="chip ${v.mealId === m.id ? 'on' : ''}" data-m="${m.id}">${esc(m.name)}</button>`).join('')}</div>
        </div>
      </div>
    </div>
    <div class="sheet-actions">
      ${e ? '<button class="btn danger" id="rm">Remover</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}
      <button class="btn" id="ok">Salvar</button>
    </div>`, {
    onMount(s, close) {
      let mealId = v.mealId || '';
      s.querySelector('#ml').addEventListener('click', (ev) => {
        const c = ev.target.closest('[data-m]'); if (!c) return;
        mealId = c.dataset.m;
        s.querySelectorAll('#ml .chip').forEach((x) => x.classList.toggle('on', x === c));
      });
      s.querySelector('#ok').addEventListener('click', async () => {
        const name = s.querySelector('#nm').value.trim();
        if (!name) return toast('Diga o que foi 💗');
        const data = { name, qty: s.querySelector('#qt').value.trim(), kcal: Math.max(0, Math.round(num(s.querySelector('#kc').value) || 0)), time: s.querySelector('#tm').value, mealId };
        await updateDay(date, (d) => {
          if (e) { const t = d.extras.find((x) => x.uid === e.uid); if (t) Object.assign(t, data); }
          else d.extras.push({ uid: uid('ex'), ...data, addedAt: new Date().toISOString() });
        });
        close(); rerender(); registerToast();
      });
      const rm = s.querySelector('#rm');
      if (rm) rm.addEventListener('click', async () => {
        await updateDay(date, (d) => { d.extras = d.extras.filter((x) => x.uid !== e.uid); });
        close(); rerender();
      });
    }
  });
}

// ===== Editor do cardápio (modelos) =====
function menuSheet() {
  const list = menu();
  openSheet(`
    <h2>Meu cardápio</h2>
    <p class="small muted" style="margin-top:-6px">Mudanças valem para os próximos registros. O histórico guarda o que foi registrado em cada dia.</p>
    ${list.map((m, mi) => `
      <div class="card" style="margin-top:12px">
        <div class="card-head"><div class="ttl"><span class="emoji">${esc(m.emoji)}</span><div><h3>${esc(m.name)}</h3><div class="tiny muted">≈ ${esc(m.time)} ${m.planned === false ? '· não conta como refeição planejada' : ''}</div></div></div>
          <button class="mini-btn" data-me="meal" data-i="${mi}">✏️</button></div>
        ${m.options.map((o, oi) => `<div class="extra-item"><div class="grow"><b>${esc(o.name)}</b><div class="tiny muted">${esc((o.ingredients || []).join(' · '))}</div></div><span class="small" style="font-weight:800;color:var(--pink-strong)">${o.kcal} kcal</span><button class="mini-btn" data-me="opt" data-i="${mi}" data-o="${oi}">✏️</button></div>`).join('')}
        <button class="btn ghost small block mt" data-me="new-opt" data-i="${mi}">＋ Nova opção</button>
      </div>`).join('')}
    <button class="btn soft block mt" data-me="new-meal">＋ Cadastrar nova refeição</button>
    <div class="sheet-actions"><button class="btn" data-close>Pronto</button></div>
  `, {
    onMount(s, close) {
      s.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-me]'); if (!b) return;
        const mi = Number(b.dataset.i), oi = Number(b.dataset.o);
        if (b.dataset.me === 'meal') mealEditSheet(mi);
        if (b.dataset.me === 'new-meal') mealEditSheet(null);
        if (b.dataset.me === 'opt') optionEditSheet(mi, oi);
        if (b.dataset.me === 'new-opt') optionEditSheet(mi, null);
      });
    },
    onClose() { rerender(); }
  });
}

function mealEditSheet(mi) {
  const m = mi == null ? { id: uid('ref'), name: '', emoji: '🍽️', time: '', planned: true, options: [] } : clone(menu()[mi]);
  openSheet(`
    <h2>${mi == null ? 'Nova refeição' : 'Editar refeição'}</h2>
    <div class="form">
      <div class="row"><label class="field" style="width:80px"><span>Emoji</span><input class="input" id="em" value="${esc(m.emoji)}"></label>
      <label class="field grow"><span>Nome</span><input class="input" id="nm" value="${esc(m.name)}" placeholder="ex.: Ceia"></label></div>
      <label class="field" style="width:140px"><span>Horário aproximado</span><input class="input" id="tm" type="time" value="${esc(m.time)}"></label>
      <label class="row small"><input type="checkbox" id="pl" ${m.planned !== false ? 'checked' : ''} style="width:22px;height:22px;accent-color:#e84f8c"> Conta como refeição planejada do dia</label>
    </div>
    <div class="sheet-actions">${mi == null ? '<button class="btn ghost" id="back">Voltar</button>' : '<button class="btn danger" id="rm">Excluir</button>'}<button class="btn" id="ok">Salvar</button></div>`, {
    onMount(s) {
      s.querySelector('#ok').addEventListener('click', async () => {
        const name = s.querySelector('#nm').value.trim();
        if (!name) return toast('Dê um nome à refeição 💗');
        Object.assign(m, { name, emoji: s.querySelector('#em').value.trim() || '🍽️', time: s.querySelector('#tm').value, planned: s.querySelector('#pl').checked });
        const list = clone(menu());
        if (mi == null) list.push(m); else list[mi] = m;
        await setSetting('menu', list);
        menuSheet();
      });
      const back = s.querySelector('#back'); if (back) back.addEventListener('click', menuSheet);
      const rm = s.querySelector('#rm');
      if (rm) rm.addEventListener('click', async () => {
        const ok = await confirmSheet({ title: `Excluir “${m.name}” do cardápio?`, text: 'Os dias já registrados continuam guardados no histórico.', ok: 'Excluir', danger: true });
        if (ok) { const list = clone(menu()); list.splice(mi, 1); await setSetting('menu', list); }
        menuSheet();
      });
    }
  });
}

function optionEditSheet(mi, oi) {
  const meal = menu()[mi];
  const o = oi == null ? { id: uid('op'), name: '', kcal: '', ingredients: [], lactoseTip: '' } : clone(meal.options[oi]);
  openSheet(`
    <h2>${oi == null ? 'Nova opção' : 'Editar opção'} · ${esc(meal.name)}</h2>
    <div class="form">
      <label class="field"><span>Nome</span><input class="input" id="nm" value="${esc(o.name)}"></label>
      <label class="field" style="width:140px"><span>kcal (estimativa)</span><input class="input" id="kc" type="number" inputmode="numeric" min="0" value="${esc(o.kcal)}"></label>
      <label class="field"><span>Ingredientes e quantidades (um por linha)</span><textarea class="input" id="ing" rows="5">${esc((o.ingredients || []).join('\n'))}</textarea></label>
      <label class="field"><span>Dica sem lactose (opcional)</span><input class="input" id="lt" value="${esc(o.lactoseTip || '')}"></label>
    </div>
    <div class="sheet-actions">${oi == null ? '<button class="btn ghost" id="back">Voltar</button>' : '<button class="btn danger" id="rm">Excluir</button>'}<button class="btn" id="ok">Salvar</button></div>`, {
    onMount(s) {
      s.querySelector('#ok').addEventListener('click', async () => {
        const name = s.querySelector('#nm').value.trim();
        if (!name) return toast('Dê um nome à opção 💗');
        Object.assign(o, { name, kcal: Math.max(0, Math.round(num(s.querySelector('#kc').value) || 0)), ingredients: s.querySelector('#ing').value.split('\n').map((x) => x.trim()).filter(Boolean), lactoseTip: s.querySelector('#lt').value.trim() });
        const list = clone(menu());
        if (oi == null) list[mi].options.push(o); else list[mi].options[oi] = o;
        await setSetting('menu', list);
        menuSheet();
      });
      const back = s.querySelector('#back'); if (back) back.addEventListener('click', menuSheet);
      const rm = s.querySelector('#rm');
      if (rm) rm.addEventListener('click', async () => {
        const list = clone(menu()); list[mi].options.splice(oi, 1); await setSetting('menu', list);
        menuSheet();
      });
    }
  });
}
