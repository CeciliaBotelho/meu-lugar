import { state, peekDay, updateDay, setSetting, uid } from '../store.js';
import { todayKey, monthKey, monthLabel, addMonths, monthGrid, fmtMedium, fmtShort, range, diffDays } from '../dates.js';
import { esc, openSheet, toast, hearts, registerToast, num, fmtNum, confirmSheet, debounce } from '../ui.js';
import { rerender, setDate } from '../router.js';
import { stats, infoFor, PHASES, dayClass, predictedPeriodDays, isBleeding } from '../cycle.js';
import { SYMPTOMS, FLOWS, MOODS, ENERGY, SLEEP_QUALITY, INTENSITIES } from '../defaults.js';

export function calendarHTML(ym, selected, { mode = 'cycle', prefix = 'cal' } = {}) {
  const st = stats();
  const today = todayKey();
  const predicted = predictedPeriodDays(st, today);
  const cells = monthGrid(ym);
  const wd = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
  return `
  <div class="cal-head">
    <button class="cal-nav" data-action="${prefix}-month" data-n="-1" aria-label="Mês anterior">‹</button>
    <h3>${esc(monthLabel(ym).replace(/^./, (c) => c.toUpperCase()))}</h3>
    <button class="cal-nav" data-action="${prefix}-month" data-n="1" aria-label="Próximo mês">›</button>
  </div>
  <div class="cal">
    ${wd.map((d) => `<div class="wd">${d}</div>`).join('')}
    ${cells.map((k) => {
      const rec = state.days.get(k);
      const cls = mode === 'cycle' ? dayClass(k, st, today, predicted) : (isBleeding(rec) ? 'ph-men' : '');
      const spot = rec && rec.flow === 'spotting' ? 'spot' : '';
      let dots = '';
      if (mode === 'history' && rec) {
        const f = Object.values(rec.meals || {}).some((m) => m.items && m.items.length) || (rec.extras || []).length;
        const w = Object.values(rec.workouts || {}).some((x) => x.exercises.some((e) => e.done));
        const c = (rec.symptoms || []).length || rec.mood || rec.energy || rec.sleepHours != null;
        const j = (rec.journal || '').trim();
        dots = `<span class="dots">${f ? '<i class="f"></i>' : ''}${w ? '<i class="w"></i>' : ''}${c ? '<i class="c"></i>' : ''}${j ? '<i class="j"></i>' : ''}</span>`;
      }
      return `<button class="day ${cls} ${spot} ${monthKey(k) !== ym ? 'out' : ''} ${k === today ? 'today' : ''} ${k === selected ? 'sel' : ''}" data-action="${prefix}-pick" data-date="${k}" aria-label="${fmtShort(k)}">${Number(k.slice(8))}${dots}</button>`;
    }).join('')}
  </div>`;
}

function legend() {
  return `<div class="legend">
    <span><i style="background:var(--period)"></i>Menstruação</span>
    <span><i style="background:#fff;box-shadow:inset 0 0 0 2px var(--period)"></i>Prevista</span>
    <span><i style="background:var(--follicular)"></i>Folicular</span>
    <span><i style="background:#e9defd"></i>Janela fértil (est.)</span>
    <span><i style="background:var(--ovulation)"></i>Ovulação (est.)</span>
    <span><i style="background:var(--luteal)"></i>Lútea</span>
  </div>`;
}

export function render() {
  const date = state.date;
  const day = peekDay(date);
  const today = todayKey();
  const st = stats();
  const info = infoFor(date, st);
  const ym = state.ui.cycleMonth || monthKey(date);
  const custom = state.settings.customSymptoms || [];
  const symList = [...SYMPTOMS, ...custom];
  const symMap = new Map((day.symptoms || []).map((s) => [s.id, s]));
  const isToday = date === today;

  let summary;
  if (info) {
    const ph = PHASES[info.phase];
    summary = `
    <div class="card ${info.phase === 'ovu' ? 'lilac' : info.phase === 'lut' ? 'peach' : 'pink'}">
      <div class="phase-hero">
        <div class="phase-ring" style="--p:${Math.min(100, info.cycleDay / info.cycleLength * 100).toFixed(0)}%"><div><b>${info.cycleDay}</b><small>dia do ciclo</small></div></div>
        <div class="grow">
          <div class="tiny muted" style="font-weight:700">${isToday ? 'Hoje' : esc(fmtMedium(date))} · estimativa</div>
          <div style="font-weight:900;font-size:18px">${ph.emoji} ${ph.name}</div>
          <div class="small mt-s">${info.beyond ? `A menstruação estava estimada para <b>${fmtMedium(info.nextStart)}</b>. Ciclos variam — registre quando vier. 💗` : `Próxima menstruação ${info.nextIsActual ? 'registrada' : 'estimada'}: <b>${fmtMedium(info.nextStart)}</b>`}</div>
        </div>
      </div>
      ${!info.beyond ? `<div class="notice lilac mt">🦋 Ovulação estimada entre <b>${fmtMedium(info.ovuFrom)}</b> e <b>${fmtMedium(info.ovuTo)}</b> (≈ 12–16 dias antes da próxima menstruação). Janela fértil estimada: ${fmtMedium(info.fertileFrom)} a ${fmtMedium(info.fertileTo)}. É apenas uma estimativa de calendário: não confirma que a ovulação ocorreu e <b>não serve como método contraceptivo</b>.</div>` : ''}
    </div>`;
  } else {
    summary = `<div class="card pink"><div class="card-head"><div class="ttl"><span class="emoji">🌙</span><h3>Comece pelo seu ciclo</h3></div></div>
      <p class="small muted">Registre o primeiro (e o último) dia da sua menstruação para ver o dia e a fase estimados. 🌷</p></div>`;
  }

  const chip = (field, o, cur, extra = '') => `<button class="chip ${extra} ${cur === o.id ? 'on' : ''}" data-action="cy-set" data-field="${field}" data-v="${o.id}">${o.emoji ? o.emoji + ' ' : ''}${esc(o.name)}</button>`;

  return `
  ${summary}

  <div class="card">
    ${calendarHTML(ym, date)}
    ${legend()}
    <div class="btn-row mt">
      <button class="btn" data-action="period-range">🌷 Registrar menstruação</button>
    </div>
  </div>

  <div class="section-title"><h2>${isToday ? 'Hoje' : esc(fmtMedium(date))}</h2>${isToday ? '' : '<button class="link-btn" data-action="date-today">← hoje</button>'}</div>

  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">🩸</span><h3>Sangramento</h3></div></div>
    <div class="chips">${FLOWS.map((f) => chip('flow', f, day.flow)).join('')}</div>
  </div>

  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">🌡️</span><h3>Sintomas</h3></div><span class="tiny muted">toque: leve → moderada → intensa</span></div>
    <div class="chips">
      ${symList.map((s) => { const r = symMap.get(s.id); const lv = r ? r.intensity : 0; return `<button class="chip ${lv ? 'lv' + lv : ''}" data-action="sym" data-id="${esc(s.id)}" data-name="${esc(s.name)}">${esc(s.name)}${lv ? ` <span class="lvl">· ${INTENSITIES[lv - 1].name}</span>` : ''}</button>`; }).join('')}
      ${(day.symptoms || []).filter((s) => !symList.some((x) => x.id === s.id)).map((s) => `<button class="chip lv${s.intensity}" data-action="sym" data-id="${esc(s.id)}" data-name="${esc(s.name)}">${esc(s.name)} <span class="lvl">· ${INTENSITIES[s.intensity - 1]?.name || ''}</span></button>`).join('')}
      <button class="chip" data-action="sym-custom">＋ Outro sintoma</button>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">💭</span><h3>Humor</h3></div></div>
    <div class="chips">${MOODS.map((m) => chip('mood', m, day.mood)).join('')}</div>
    <div class="card-head mt"><div class="ttl"><span class="emoji">🔋</span><h3>Energia</h3></div></div>
    <div class="chips">${ENERGY.map((m) => chip('energy', m, day.energy, 'lilac')).join('')}</div>
  </div>

  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">😴</span><h3>Sono</h3></div></div>
    <div class="row" style="align-items:flex-end">
      <label class="field" style="width:130px"><span>Horas dormidas</span><input class="input" type="number" inputmode="decimal" min="0" max="24" step="0.5" value="${day.sleepHours ?? ''}" data-action-change="cy-sleep" placeholder="ex.: 7,5"></label>
    </div>
    <div class="tiny muted mt" style="font-weight:700;margin-left:4px">Qualidade</div>
    <div class="chips mt-s">${SLEEP_QUALITY.map((m) => chip('sleepQuality', m, day.sleepQuality, 'peach')).join('')}</div>
  </div>

  <div class="card">
    <label class="field"><span>Observações do ciclo</span><textarea class="input" rows="3" data-action-input="cy-notes" placeholder="Algo que queira lembrar…">${esc(day.cycleNotes || '')}</textarea></label>
  </div>

  ${historyCard(st)}
  ${phasesEdu()}
  <div class="notice mt">🔒 Estimativas baseadas apenas no que você registrou. Ciclos variam de pessoa para pessoa e de mês para mês. Não é diagnóstico médico nem método contraceptivo. O app não muda seus treinos nem sua referência de calorias por causa da fase do ciclo.</div>
  `;
}

function historyCard(st) {
  const p = st.periods.slice().reverse();
  const cycles = st.cycles;
  return `
  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">📖</span><h3>Histórico menstrual</h3></div><button class="mini-btn" data-action="cycle-defaults">⚙️</button></div>
    <div class="grid2" style="margin-bottom:8px">
      <div class="stat"><span class="lbl">Média do ciclo</span><span class="val">${st.avgCycle ? st.avgCycle + ' <small style="font-size:13px">dias</small>' : '—'}</span><span class="sub">${st.avgCycle ? `${st.basedOn} ciclo(s)${st.minCycle !== st.maxCycle ? ` · ${st.minCycle}–${st.maxCycle} dias` : ''}` : `usando ${st.cycleLength} dias (padrão)`}</span></div>
      <div class="stat"><span class="lbl">Menstruação dura</span><span class="val">${st.avgPeriod ? st.avgPeriod + ' <small style="font-size:13px">dias</small>' : '—'}</span><span class="sub">${st.avgPeriod ? 'média registrada' : `usando ${st.periodLength} dias (padrão)`}</span></div>
    </div>
    ${p.length ? `<ul class="detail-list">${p.slice(0, 12).map((x) => {
      const c = cycles.find((cc) => cc.start === x.start);
      return `<li><div class="dl-title"><span>🌷 ${fmtShort(x.start)} → ${fmtShort(x.end)}</span><button class="mini-btn" data-action="edit-period" data-start="${x.start}" data-end="${x.end}">✏️</button></div>
        <div class="dl-sub">${x.days} dia(s) de sangramento registrados${c ? ` · ciclo de ${c.length} dias${c.valid ? '' : ' (fora da média)'}` : ' · ciclo atual'}</div></li>`;
    }).join('')}</ul>` : '<p class="small faint">Nenhuma menstruação registrada ainda.</p>'}
  </div>`;
}

function phasesEdu() {
  return `
  <div class="section-title"><h2>Fases do ciclo</h2></div>
  <div class="card soft">
    <details class="edu"><summary>🌷 Menstruação</summary><ul>
      <li>Estrogênio e progesterona geralmente estão baixos.</li>
      <li>Algumas pessoas sentem cólicas, cansaço, dor de cabeça ou desconforto abdominal — outras sentem pouco ou nada.</li></ul></details>
    <details class="edu"><summary>🌱 Fase folicular</summary><ul>
      <li>Começa no primeiro dia da menstruação e vai até a ovulação (por isso se sobrepõe à menstruação).</li>
      <li>O estrogênio geralmente aumenta.</li>
      <li>Algumas pessoas percebem melhora da energia.</li></ul></details>
    <details class="edu"><summary>🦋 Ovulação</summary><ul>
      <li>Geralmente ocorre cerca de 12–16 dias antes da próxima menstruação, mas varia.</li>
      <li>Podem ocorrer alterações do muco cervical e da libido.</li>
      <li>O app mostra uma estimativa com margem de incerteza — o calendário sozinho não confirma que a ovulação aconteceu.</li>
      <li><b>Este aplicativo não serve como método contraceptivo.</b></li></ul></details>
    <details class="edu"><summary>🌙 Fase lútea</summary><ul>
      <li>Vai da ovulação até a próxima menstruação.</li>
      <li>A progesterona geralmente aumenta após a ovulação.</li>
      <li>Algumas pessoas notam sintomas de TPM, inchaço, sensibilidade nos seios, alterações de humor ou de apetite.</li></ul></details>
    <p class="tiny faint mt">Cada corpo é único: nem todas as pessoas apresentam os mesmos sintomas. Em caso de dúvidas ou desconfortos, procure um profissional de saúde.</p>
  </div>`;
}

const saveNotes = debounce((date, v) => updateDay(date, (d) => { d.cycleNotes = v; }), 400);

export const actions = {
  'cal-month'(el) {
    const ym = state.ui.cycleMonth || monthKey(state.date);
    state.ui.cycleMonth = addMonths(ym, Number(el.dataset.n));
    rerender();
  },
  'cal-pick'(el) {
    const k = el.dataset.date;
    if (k > todayKey()) return toast('Datas futuras mostram apenas estimativas 🌙');
    state.ui.cycleMonth = monthKey(k);
    setDate(k);
  },
  async 'cy-set'(el) {
    const f = el.dataset.field, v = el.dataset.v;
    const cur = peekDay(state.date)[f];
    await updateDay(state.date, (d) => { d[f] = cur === v ? null : v; });
    rerender();
    if (cur !== v) { hearts(3); registerToast(); }
  },
  async 'sym'(el) {
    const id = el.dataset.id, name = el.dataset.name;
    await updateDay(state.date, (d) => {
      const s = d.symptoms.find((x) => x.id === id);
      if (!s) d.symptoms.push({ id, name, intensity: 1 });
      else if (s.intensity < 3) s.intensity++;
      else d.symptoms = d.symptoms.filter((x) => x.id !== id);
    });
    rerender();
    registerToast();
  },
  'sym-custom'() {
    openSheet(`<h2>＋ Outro sintoma</h2>
      <label class="field"><span>Nome do sintoma</span><input class="input" id="nm" placeholder="ex.: Tontura"></label>
      <label class="row small mt"><input type="checkbox" id="keep" checked style="width:22px;height:22px;accent-color:#e84f8c"> Guardar na minha lista de sintomas</label>
      <div class="sheet-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="ok">Adicionar</button></div>`, {
      onMount(s, close) {
        s.querySelector('#ok').addEventListener('click', async () => {
          const name = s.querySelector('#nm').value.trim();
          if (!name) return;
          const id = 'c-' + name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
          if (s.querySelector('#keep').checked && !(state.settings.customSymptoms || []).some((x) => x.id === id) && !SYMPTOMS.some((x) => x.id === id)) {
            await setSetting('customSymptoms', [...(state.settings.customSymptoms || []), { id, name }]);
          }
          await updateDay(state.date, (d) => { if (!d.symptoms.some((x) => x.id === id)) d.symptoms.push({ id, name, intensity: 1 }); });
          close(); rerender(); registerToast();
        });
      }
    });
  },
  async 'cy-sleep'(el) {
    const n = num(el.value);
    await updateDay(state.date, (d) => { d.sleepHours = n == null ? null : Math.max(0, Math.min(24, n)); });
    registerToast();
  },
  'cy-notes'(el) { saveNotes(state.date, el.value); },
  'period-range'() { periodSheet(null, null); },
  'edit-period'(el) { periodSheet(el.dataset.start, el.dataset.end); },
  'cycle-defaults'() {
    const def = state.settings.cycleDefaults;
    openSheet(`<h2>Valores padrão do ciclo</h2>
      <p class="small muted">Usados apenas enquanto ainda não há ciclos completos registrados. Depois, o app usa a média dos seus registros.</p>
      <div class="row mt"><label class="field grow"><span>Duração do ciclo (dias)</span><input class="input" id="cl" type="number" inputmode="numeric" min="15" max="60" value="${def.cycleLength}"></label>
      <label class="field grow"><span>Duração da menstruação</span><input class="input" id="pl" type="number" inputmode="numeric" min="1" max="15" value="${def.periodLength}"></label></div>
      <div class="sheet-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="ok">Salvar</button></div>`, {
      onMount(s, close) {
        s.querySelector('#ok').addEventListener('click', async () => {
          const cl = Math.round(num(s.querySelector('#cl').value) || 28), pl = Math.round(num(s.querySelector('#pl').value) || 5);
          await setSetting('cycleDefaults', { cycleLength: Math.min(60, Math.max(15, cl)), periodLength: Math.min(15, Math.max(1, pl)) });
          close(); rerender();
        });
      }
    });
  }
};

/** Registrar/editar menstruação por intervalo: primeiro e último dia + fluxo. */
function periodSheet(start, end) {
  const today = todayKey();
  const editing = !!start;
  const s0 = start || state.date;
  openSheet(`
    <h2>${editing ? '✏️ Editar menstruação' : '🌷 Registrar menstruação'}</h2>
    <div class="form">
      <div class="row">
        <label class="field grow"><span>Primeiro dia</span><input class="input" id="st" type="date" max="${today}" value="${s0}"></label>
        <label class="field grow"><span>Último dia</span><input class="input" id="en" type="date" max="${today}" value="${end || ''}"></label>
      </div>
      <p class="tiny muted">Ainda está menstruada? Deixe o último dia em branco — o app marca do primeiro dia até hoje e você ajusta depois.</p>
      <div><div class="tiny muted" style="font-weight:700;margin:0 0 6px 4px">Fluxo predominante (cada dia pode ser ajustado no calendário)</div>
      <div class="chips" id="fl">${FLOWS.filter((f) => ['light', 'medium', 'heavy'].includes(f.id)).map((f) => `<button class="chip ${f.id === 'medium' ? 'on' : ''}" data-f="${f.id}">${f.emoji} ${f.name}</button>`).join('')}</div></div>
      <label class="row small"><input type="checkbox" id="keepflow" checked style="width:22px;height:22px;accent-color:#e84f8c"> Manter o fluxo dos dias que já tinham registro</label>
    </div>
    <div class="sheet-actions">${editing ? '<button class="btn danger" id="rm">Apagar este período</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}<button class="btn" id="ok">Salvar</button></div>`, {
    onMount(sh, close) {
      let flow = 'medium';
      sh.querySelector('#fl').addEventListener('click', (e) => { const c = e.target.closest('[data-f]'); if (!c) return; flow = c.dataset.f; sh.querySelectorAll('#fl .chip').forEach((x) => x.classList.toggle('on', x === c)); });
      sh.querySelector('#ok').addEventListener('click', async () => {
        const a = sh.querySelector('#st').value;
        let b = sh.querySelector('#en').value || (a <= today ? today : a);
        if (!a) return toast('Escolha o primeiro dia 💗');
        if (a > today) return toast('O primeiro dia não pode estar no futuro 🌙');
        if (b < a) return toast('O último dia precisa ser depois do primeiro 💗');
        if (b > today) b = today;
        if (diffDays(a, b) > 15) {
          const ok = await confirmSheet({ title: 'Período longo', text: `São ${diffDays(a, b) + 1} dias. Deseja marcar todos como menstruação?`, ok: 'Sim, marcar' });
          if (!ok) return;
        }
        const keep = sh.querySelector('#keepflow') ? sh.querySelector('#keepflow').checked : true;
        // ao editar: remove os dias do período antigo que ficaram de fora
        if (editing) for (const k of range(start, end)) if (k < a || k > b) await updateDay(k, (d) => { if (isBleeding(d)) d.flow = null; });
        for (const k of range(a, b)) await updateDay(k, (d) => { if (!(keep && isBleeding(d))) d.flow = flow; });
        close();
        state.ui.cycleMonth = monthKey(a);
        rerender(); hearts(6); toast('Menstruação registrada 🌷 Cuide-se com carinho!');
      });
      const rm = sh.querySelector('#rm');
      if (rm) rm.addEventListener('click', async () => {
        const ok = await confirmSheet({ title: 'Apagar este período?', text: `Os dias de ${fmtShort(start)} a ${fmtShort(end)} deixam de ser marcados como menstruação. Sintomas e outros registros continuam.`, ok: 'Apagar', danger: true });
        if (ok) { for (const k of range(start, end)) await updateDay(k, (d) => { if (isBleeding(d) || d.flow === 'spotting') d.flow = null; }); }
        rerender();
      });
    }
  });
}

export { uid, fmtNum };
