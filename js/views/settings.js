import { state, setSetting, load } from '../store.js';
import { esc, toast, openSheet, confirmSheet, saveFile, hearts } from '../ui.js';
import { rerender, go } from '../router.js';
import { buildBackup, encryptBackup, decryptBackup, validateBackup, restore, backupFilename, cryptoAvailable, BACKUP_FORMAT } from '../backup.js';
import { clearAll } from '../db.js';
import { fmtShort } from '../dates.js';

export const APP_VERSION = '1.1.1';

export function render() {
  const lb = state.settings.lastBackup;
  const st = state.ui.storage || {};
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  return `
  <div class="section-title" style="margin-top:4px"><h2>Ajustes e backup</h2><button class="link-btn" data-action="go" data-tab="home">Fechar</button></div>

  <div class="card pink">
    <div class="card-head"><div class="ttl"><span class="emoji">☁️</span><h3>Backup</h3></div></div>
    <p class="small">${lb ? `Último backup confirmado: <b>${esc(new Date(lb).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}</b>` : 'Você ainda não confirmou nenhum backup.'}</p>
    <p class="tiny muted mt-s">${state.days.size} dia(s) com registros e ${state.books.size} livro(s) neste aparelho.</p>
    <div class="btn-row mt">
      <button class="btn" data-action="backup-save">Salvar backup 💗</button>
      <button class="btn ghost" data-action="backup-restore">Restaurar backup 🌸</button>
    </div>
    <input type="file" id="restore-file" accept="application/json,.json" class="hidden" data-action-change="backup-file">
    <label class="row small mt"><input type="checkbox" data-action-change="toggle-reminder" ${state.settings.backupReminder !== false ? 'checked' : ''} style="width:22px;height:22px;accent-color:#e84f8c"> Lembrar de fazer backup todo mês</label>
    <div class="notice mt">O backup é um arquivo <b>.json</b> com tudo: alimentação, treinos, cargas, ciclo, sintomas, humor, sono, diário, livros e configurações. No iPhone, toque em <b>Salvar em Arquivos</b> e escolha <b>iCloud Drive</b> para guardar fora do aparelho. Não há sincronização automática com o iCloud — o backup é feito por você.</div>
  </div>

  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">💾</span><h3>Armazenamento no aparelho</h3></div></div>
    <p class="small">Seus registros ficam no <b>IndexedDB</b> deste navegador/app, salvos a cada alteração.</p>
    <dl class="kv mt">
      <dt>Armazenamento persistente</dt><dd>${st.persisted === true ? 'Concedido ✅' : st.persisted === false ? 'Não concedido' : 'Verificando…'}</dd>
      ${st.usage != null ? `<dt>Espaço usado</dt><dd>${(st.usage / 1024 / 1024).toFixed(2).replace('.', ',')} MB</dd>` : ''}
      <dt>Aberto como app</dt><dd>${standalone ? 'Sim (Tela de Início) ✅' : 'Não — abra pela Tela de Início'}</dd>
    </dl>
    ${st.persisted === false ? '<button class="btn soft small mt" data-action="persist">Pedir armazenamento persistente</button>' : ''}
    <div class="notice peach mt">⚠️ <b>Importante:</b> o Safari pode apagar dados locais de sites (por exemplo, se faltar espaço, se você limpar os dados do Safari, ou após um período sem uso quando o site é aberto só pelo navegador). Instalar na Tela de Início ajuda, mas armazenamento local <b>não garante conservação permanente</b>. Por isso, faça backups regulares. 💗</div>
  </div>

  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">📱</span><h3>Instalar no iPhone</h3></div></div>
    <ol class="small" style="margin:0;padding-left:20px;line-height:1.7">
      <li>Abra este endereço no <b>Safari</b>.</li>
      <li>Toque em <b>Compartilhar</b> (quadrado com seta ↑).</li>
      <li>Toque em <b>Adicionar à Tela de Início</b>.</li>
      <li>Confirme o nome <b>Cantinho da Ce</b> e toque em <b>Adicionar</b>.</li>
    </ol>
    <p class="tiny muted mt-s">Depois do primeiro carregamento, o app funciona offline. Observação: o app da Tela de Início e o Safari guardam dados separados — use sempre o mesmo (de preferência o da Tela de Início) ou transfira com backup.</p>
  </div>

  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">🔒</span><h3>Privacidade</h3></div></div>
    <ul class="small muted" style="margin:0;padding-left:18px;line-height:1.6">
      <li>Nenhum registro é enviado para servidores — nem para o GitHub.</li>
      <li>Sem anúncios, rastreadores ou analytics.</li>
      <li>Sem fontes ou bibliotecas externas: o app só carrega os próprios arquivos.</li>
      <li>Você pode exportar (backup) e apagar seus dados quando quiser.</li>
    </ul>
    <button class="btn danger block mt" data-action="wipe">🗑️ Apagar todos os meus dados deste aparelho</button>
  </div>

  <div class="card soft">
    <div class="row between"><span class="small">Cantinho da Ce 🌸 versão ${APP_VERSION}</span><button class="mini-btn" data-action="check-update">🔄 Procurar atualização</button></div>
  </div>`;
}

export async function refreshStorageInfo() {
  const out = {};
  try { out.persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { out.persisted = null; }
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); out.usage = e.usage; } } catch (e) { /* ok */ }
  state.ui.storage = out;
}

async function confirmSaved(when) {
  const ok = await confirmSheet({ title: 'O arquivo foi salvo? 💗', text: 'Confirme somente se você viu o arquivo salvo (por exemplo, em Arquivos › iCloud Drive). Assim o app registra a data do último backup.', ok: 'Sim, salvei', cancel: 'Não salvei' });
  if (ok) { await setSetting('lastBackup', when); hearts(6); toast('Backup registrado 🌸'); }
  else toast('Tudo bem — o último backup não foi alterado.');
  rerender();
}

export const actions = {
  'backup-save'() {
    const canEnc = cryptoAvailable();
    openSheet(`<h2>Salvar backup 💗</h2>
      <p class="small muted">Gera um arquivo com todos os seus registros. Você escolhe onde salvar (ex.: Arquivos › iCloud Drive).</p>
      ${canEnc ? `<label class="row small mt"><input type="checkbox" id="enc" style="width:22px;height:22px;accent-color:#e84f8c"> Proteger com senha (criptografado)</label>
      <div id="pw-box" class="hidden form mt">
        <label class="field"><span>Senha</span><input class="input" id="pw1" type="password" autocomplete="new-password"></label>
        <label class="field"><span>Repita a senha</span><input class="input" id="pw2" type="password" autocomplete="new-password"></label>
        <div class="notice peach">Guarde bem esta senha: sem ela não é possível restaurar o backup protegido.</div>
      </div>` : ''}
      <div class="sheet-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="go">Gerar arquivo</button></div>`, {
      onMount(s, close) {
        const enc = s.querySelector('#enc');
        if (enc) enc.addEventListener('change', () => s.querySelector('#pw-box').classList.toggle('hidden', !enc.checked));
        s.querySelector('#go').addEventListener('click', async () => {
          try {
            const data = buildBackup();
            let out = data;
            const useEnc = enc && enc.checked;
            if (useEnc) {
              const p1 = s.querySelector('#pw1').value, p2 = s.querySelector('#pw2').value;
              if (p1.length < 4) return toast('Use uma senha com pelo menos 4 caracteres 💗');
              if (p1 !== p2) return toast('As senhas não são iguais 💗');
              out = await encryptBackup(data, p1);
            }
            close();
            const r = await saveFile(backupFilename(useEnc), JSON.stringify(out, null, useEnc ? 0 : 1), 'application/json');
            if (r === 'cancelled') return toast('Backup cancelado — nada foi salvo.');
            await confirmSaved(data.exportedAt);
          } catch (e) {
            console.error(e);
            toast('Não foi possível gerar o backup: ' + (e.message || e));
          }
        });
      }
    });
  },
  'backup-restore'() { document.getElementById('restore-file').click(); },
  async 'backup-file'(el) {
    const file = el.files && el.files[0];
    el.value = '';
    if (!file) return;
    let obj;
    try { obj = JSON.parse(await file.text()); } catch (e) { return toast('Arquivo inválido: não é um JSON legível.'); }
    if (!obj || obj.format !== BACKUP_FORMAT) return toast('Este arquivo não é um backup do Cantinho da Ce.');
    if (obj.encrypted) {
      if (!cryptoAvailable()) return toast('Este navegador não consegue abrir backups protegidos.');
      openSheet(`<h2>Backup protegido 🔒</h2>
        <label class="field"><span>Senha do backup</span><input class="input" id="pw" type="password" autocomplete="current-password"></label>
        <div class="sheet-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="ok">Abrir</button></div>`, {
        onMount(s, close) {
          s.querySelector('#ok').addEventListener('click', async () => {
            try { const plain = await decryptBackup(obj, s.querySelector('#pw').value); close(); await confirmRestore(plain); }
            catch (e) { toast(e.message); }
          });
        }
      });
      return;
    }
    await confirmRestore(obj);
  },
  async 'toggle-reminder'(el) { await setSetting('backupReminder', el.checked); },
  async persist() {
    try {
      const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false;
      toast(ok ? 'Armazenamento persistente concedido ✅' : 'O navegador não concedeu agora. Instalar na Tela de Início e usar com frequência ajuda.');
    } catch (e) { toast('Não foi possível pedir agora.'); }
    await refreshStorageInfo(); rerender();
  },
  async wipe() {
    const ok = await confirmSheet({ title: 'Apagar TODOS os dados?', text: 'Isto remove deste aparelho todos os registros e configurações. Faça um backup antes, se quiser guardar. Não pode ser desfeito.', ok: 'Apagar tudo', danger: true, requireText: 'APAGAR' });
    if (!ok) return;
    await clearAll();
    await load();
    toast('Dados apagados. Seu cantinho está novinho. 🌸');
    go('home');
  },
  async 'check-update'() {
    if (!('serviceWorker' in navigator)) return toast('Atualizações automáticas não disponíveis aqui.');
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return toast('Recarregue o app com internet para ativar o modo offline.');
    try { await reg.update(); } catch (e) { return toast('Sem internet agora — tente mais tarde.'); }
    if (reg.waiting || reg.installing) toast('Nova versão encontrada! Ela será aplicada em instantes. 💗');
    else toast('Você já está na versão mais recente 🌸');
  }
};

async function confirmRestore(obj) {
  let valid;
  try { valid = validateBackup(obj); } catch (e) { return toast(e.message, { ms: 5000 }); }
  const when = valid.exportedAt ? new Date(valid.exportedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'data desconhecida';
  const ok = await confirmSheet({
    title: 'Restaurar este backup? 🌸',
    text: `Backup de <b>${esc(when)}</b> com <b>${valid.days.length}</b> dia(s) de registros e <b>${valid.books.length}</b> livro(s)${valid.first ? ` (${fmtShort(valid.first)} a ${fmtShort(valid.last)})` : ''}.<br><br>Isto vai <b>substituir</b> todos os registros atuais deste aparelho (${state.days.size} dia(s)). Se quiser, faça um backup dos dados atuais antes.`,
    ok: 'Substituir e restaurar', danger: true
  });
  if (!ok) return toast('Restauração cancelada. Nada foi alterado.');
  try {
    await restore(valid);
    await load();
    toast(`Backup restaurado: ${valid.days.length} dia(s) 💗`, { big: true });
    hearts(8);
    go('home');
  } catch (e) {
    console.error(e);
    toast('Não foi possível restaurar: ' + (e.message || e) + '. Seus dados atuais foram mantidos.', { ms: 6000 });
  }
}
