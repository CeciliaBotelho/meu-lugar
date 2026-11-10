# Cantinho da Ce 🌸

Aplicativo web pessoal (PWA) para acompanhar **alimentação, treinos, ciclo menstrual, sintomas, humor, energia, sono, diário e livros lidos**, feito para usar todos os dias no iPhone.

**Endereço:** https://ceciliabotelho.github.io/meu-lugar/

> 🔒 **Privacidade:** este repositório contém apenas o código e dados iniciais genéricos (cardápio e treinos de exemplo). Os registros ficam **somente no aparelho** (IndexedDB) e nunca são enviados ao GitHub nem a nenhum servidor. O app não tem anúncios, rastreadores, analytics, fontes nem bibliotecas externas.

---

## 📱 Instalar no iPhone

1. Abra **https://ceciliabotelho.github.io/meu-lugar/** no **Safari**.
2. Toque em **Compartilhar** (quadrado com a seta ↑).
3. Toque em **Adicionar à Tela de Início**.
4. Confirme o nome **Cantinho da Ce** e toque em **Adicionar**.

Depois do primeiro carregamento, o app funciona **offline**.

⚠️ O app da Tela de Início e o Safari guardam dados **separados**. Use sempre o app da Tela de Início (ou transfira os dados com um backup).

## ☁️ Backup e restauração

Toque na engrenagem ⚙️ (canto superior direito).

**Salvar backup 💗**
1. Toque em **Salvar backup 💗** (opcional: marque **Proteger com senha** para criptografar o arquivo com AES‑GCM).
2. Toque em **Gerar arquivo** → na folha de compartilhamento, escolha **Salvar em Arquivos** → **iCloud Drive** → **Salvar**.
3. O app pergunta se o arquivo foi salvo. Confirme só se viu o arquivo salvo — assim ele registra a data do último backup.

O arquivo `.json` inclui alimentação, extras, treinos, cargas, ciclo, sintomas, humor, energia, sono, diário, livros e configurações, com data e versão do backup. O app mostra a data do último backup e lembra mensalmente.

**Restaurar backup 🌸**
1. Toque em **Restaurar backup 🌸** e escolha o arquivo `.json` (em Arquivos/iCloud Drive).
2. Se for protegido, digite a senha.
3. O app valida o arquivo e mostra quantos dias ele contém. Confirme para **substituir** os dados atuais.

**Exportar um dia:** em 🌷 Histórico, escolha a data → **📄 Exportar texto** (arquivo `.txt`) ou **🖨️ PDF / imprimir** (no iPhone: Imprimir → compartilhar → Salvar em Arquivos).

> Não existe sincronização automática com o iCloud: o backup é um arquivo que você salva onde quiser.

## 💾 Sobre o armazenamento local

- Cada alteração é gravada na hora no **IndexedDB** do aparelho; os registros continuam após fechar o app, trocar de aba ou reiniciar o iPhone.
- Os dados são organizados por **data local** (`AAAA-MM-DD`), sem misturar dias por fuso horário.
- Cada dia guarda uma **cópia do que foi registrado** (nomes, ingredientes, quantidades, calorias, séries, repetições e cargas). Editar o cardápio ou os treinos **não altera** dias anteriores.
- Nada é apagado automaticamente. Atualizações do app não tocam nos dados (o banco tem migrações incrementais).
- **Limite importante:** o Safari pode apagar dados de sites (falta de espaço, limpeza de dados do Safari, longos períodos sem uso quando aberto pelo navegador). Instalar na Tela de Início ajuda, mas **armazenamento local não garante conservação permanente** — faça backups regulares.

## 📚 Meus livros

No início, toque no card **Meus livros**. Registre livros lidos, em leitura e que quer ler, com nota de 0,5 a 5 estrelas, datas, páginas, formato, gênero, anotações e trecho favorito. Tem meta anual, resumo do ano e gráfico por mês.

## 🌙 Sobre o ciclo

As fases, a ovulação e a janela fértil são **estimativas de calendário** (ovulação ≈ 12–16 dias antes da próxima menstruação), com margem de incerteza. O app **não confirma ovulação, não é diagnóstico e não serve como método contraceptivo**. Ele não altera treinos nem a referência de calorias por causa da fase do ciclo.

## 🚀 Publicação no GitHub Pages

O app é HTML, CSS e JavaScript puro, sem etapa de build. Todos os caminhos são relativos, então ele funciona em `/meu-lugar/`.

Configuração (uma vez): no GitHub, **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save**. Em 1–2 minutos o site fica em https://ceciliabotelho.github.io/meu-lugar/.

### Publicar uma atualização do app
1. Altere os arquivos.
2. Em `sw.js`, aumente `APP_VERSION` (ex.: `1.0.0` → `1.0.1`). Se criar um arquivo novo, adicione‑o à lista `ASSETS`.
3. Faça commit e push na `main`. O app mostra “Nova versão disponível — Atualizar”; os registros não são afetados.

### Rodar localmente
```bash
python3 -m http.server 8000
# abra http://localhost:8000/
```

## 🗂️ Estrutura

```
index.html              página principal
manifest.webmanifest    PWA (nome, ícones, standalone)
sw.js                   service worker (offline, cache versionado)
css/styles.css          visual rosa, áreas seguras do iPhone, impressão
icons/                  ícones (apple-touch-icon, 192, 512, maskable)
js/app.js               início, navegação, eventos, service worker
js/db.js                IndexedDB e migrações
js/store.js             estado e gravação por data
js/defaults.js          cardápio, treinos, sintomas (genéricos)
js/cycle.js             cálculos do ciclo (estimativas)
js/backup.js            backup JSON e criptografia por senha
js/report.js            resumo do dia e exportação em texto
js/charts.js            gráficos em SVG
js/views/*.js           telas: início, alimentação, treinos, ciclo, histórico, livros, ajustes
```

---

Feito com carinho 💗 — os valores calóricos e os treinos são estimativas e sugestões editáveis, não prescrição nutricional ou clínica.
