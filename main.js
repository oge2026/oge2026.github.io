const SUBJECTS = ["Математика", "Русский язык", "Информатика"];
const MONTHS = ["Июнь", "Июль", "Август"];

let DATA = {};
let state = { month: null, subject: null, variant: null };

async function loadData() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'block';

  try {
    const cached = localStorage.getItem('ogeData');
    if (cached) {
      try {
        DATA = JSON.parse(cached);
        if (loading) loading.style.display = 'none';
        render();

        fetchDataFromNetwork();
        return;
      } catch (e) {}
    }

    await fetchDataFromNetwork();
    if (loading) loading.style.display = 'none';
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    if (loading) {
      loading.innerHTML = `
        <div style="background:rgba(255,255,255,0.15);border-radius:16px;padding:30px;max-width:600px;margin:0 auto;">
          <div style="font-size:18px;font-weight:600;margin-bottom:8px;">Ошибка загрузки данных</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.8);">
            Проверьте, что файл <code style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:4px;">data.json</code> находится
            в той же папке, что и <code style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:4px;">index.html</code>
          </div>
          <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;border:none;border-radius:8px;background:white;color:#054d9c;font-weight:700;cursor:pointer;">
            Обновить
          </button>
        </div>
      `;
    }
  }
}

async function fetchDataFromNetwork() {
  const response = await fetch('data.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  DATA = await response.json();
  localStorage.setItem('ogeData', JSON.stringify(DATA));
  render();
}

function render() {
  renderCrumbs();
  const app = document.getElementById('app');
  const label = document.getElementById('stage-label');
  app.innerHTML = "";

  if (!state.month) {
    label.textContent = "Выберите месяц";
    app.appendChild(buildSegmented(MONTHS, null, m => { state.month = m; render(); }));
    return;
  }
  if (!state.subject) {
    label.textContent = "Выберите предмет";
    app.appendChild(buildSegmented(SUBJECTS, null, s => { state.subject = s; render(); }));
    return;
  }
  if (!state.variant) {
    label.textContent = "Выберите вариант";
    const items = Array.from({ length: 15 }, (_, i) => i + 1);
    app.appendChild(buildSegmented(items, null, v => { state.variant = v; render(); }, true));
    return;
  }

  label.textContent = "";
  const data = DATA[state.month] && DATA[state.month][state.subject] && DATA[state.month][state.subject][state.variant];
  if (!data) {
    app.appendChild(buildEmptyCard());
  } else {
    app.appendChild(buildResultCard(data));
  }
}

function buildSegmented(items, activeItem, onClick, isLongRow) {
  const wrap = document.createElement('div');
  wrap.className = "segmented" + (isLongRow ? " scroll" : "");

  const slider = document.createElement('div');
  slider.className = "segmented-slider";
  wrap.appendChild(slider);

  const btns = [];
  let selectedBtn = null;

  items.forEach(item => {
    const b = document.createElement('button');
    b.className = "segmented-btn" + (isLongRow ? " small" : "");
    b.textContent = item;

    b.onclick = () => {
      selectedBtn = b;
      moveSlider(slider, b, btns);
      setTimeout(() => onClick(item), 260);
    };

    b.addEventListener('mouseenter', () => moveSlider(slider, b, btns));

    wrap.appendChild(b);
    btns.push(b);
  });

  wrap.addEventListener('mouseleave', () => {
    if (selectedBtn) moveSlider(slider, selectedBtn, btns);
  });

  requestAnimationFrame(() => {
    const idx = activeItem ? items.indexOf(activeItem) : 0;
    const target = btns[idx] || btns[0];
    if (target) {
      selectedBtn = target;
      moveSlider(slider, target, btns);
    }
  });

  return wrap;
}

function moveSlider(slider, btn, btns) {
  slider.style.left = btn.offsetLeft + "px";
  slider.style.top = btn.offsetTop + "px";
  slider.style.width = btn.offsetWidth + "px";
  slider.style.height = btn.offsetHeight + "px";
  slider.classList.add('shown');
  if (btns) {
    btns.forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
  }
}

function renderCrumbs() {
  const el = document.getElementById('crumbs');
  el.innerHTML = "";
  const steps = [
    { label: "Главная", action: () => { state = { month: null, subject: null, variant: null }; render(); }, active: !state.month },
  ];
  if (state.month) steps.push({ label: state.month, action: () => { state.subject = null; state.variant = null; render(); }, active: !state.subject });
  if (state.subject) steps.push({ label: state.subject, action: () => { state.variant = null; render(); }, active: !state.variant });
  if (state.variant) steps.push({ label: "Вариант " + state.variant, action: () => {}, active: true });

  steps.forEach((s, idx) => {
    if (idx > 0) {
      const sep = document.createElement('span');
      sep.className = "crumb-sep";
      sep.textContent = "›";
      el.appendChild(sep);
    }
    const c = document.createElement('span');
    c.className = "crumb" + (s.active ? " current" : "");
    c.textContent = s.label;
    if (!s.active) c.onclick = s.action;
    el.appendChild(c);
  });
}

function buildEmptyCard() {
  const card = document.createElement('div');
  card.className = "result-card";
  card.innerHTML = `
    <div class="empty-note">
      Для варианта <b>${state.variant}</b> (${state.subject}, ${state.month}) данные ещё не добавлены.<br><br>
      Чтобы добавить результат, найдите объект <code>DATA["${state.month}"]["${state.subject}"][${state.variant}]</code>
      в файле <code>data.json</code> и заполните его по образцу.
    </div>
  `;
  const back = document.createElement('div');
  back.className = "back-row";
  back.innerHTML = `<button class="back-btn" onclick="state.variant=null; render();">← Назад к вариантам</button>`;
  card.appendChild(back);
  return card;
}

function statusColor(status) {
  return status === "ok" ? "var(--ok)" :
    status === "part" ? "var(--part)" :
    status === "bad" ? "var(--bad)" : "var(--none)";
}

function buildResultCard(d) {
  const card = document.createElement('div');
  card.className = "result-card";

  let testRows = d.test.map(r => `
    <tr>
      <td>${r.n}</td>
      <td>${r.id}</td>
      <td style="background:${statusColor(r.status)}">
        ${r.struck ? `<span class="strike">${r.struck}</span>` : ""}${r.user || r.user === "" ? (r.user || "<i style='color:#aaa'>нет ответа</i>") : "<i style='color:#aaa'>нет ответа</i>"}
      </td>
      <td>${r.correct}</td>
    </tr>
  `).join("");

  let expRows = d.expanded.map(r => `
    <tr>
      <td>${r.n}</td>
      <td>${r.id}</td>
      <td style="background:${r.score === r.max ? 'var(--ok)' : (r.score > 0 ? 'var(--part)' : 'var(--bad)')}">${r.score}</td>
      <td>${r.max}</td>
    </tr>
  `).join("");

  card.innerHTML = `
    <p class="result-title">Вариант № ${d.variantNumber}: результаты</p>
    ${d.sourceUrl ? `<div class="source-link"><a href="${d.sourceUrl}" target="_blank" rel="noopener">Открыть оригинал на РЕШУ ОГЭ ↗</a></div>` : ""}
    <div class="grade">${d.grade}</div>
    <div class="grade-label">Ваша оценка</div>
    ${d.secondAttempt ? `<div class="second-attempt">${d.secondAttempt}</div>` : ""}
    <div class="meta-line">
      Заданий с кратким ответом: ${d.shortCount}, с развёрнутым ответом: ${d.longCount}.<br>
      Максимальный балл: ${d.maxScoreText}.
    </div>
    <div class="tables">
      <div class="table-block">
        <h3>Тестовая часть</h3>
        <table class="res_table">
          <tr><th>№ п/п</th><th>№</th><th>Ваш ответ</th><th>Правильный ответ</th></tr>
          ${testRows}
        </table>
      </div>
      <div class="table-block">
        <h3>Развёрнутая часть</h3>
        <table class="res_table">
          <tr><th>№ п/п</th><th>№</th><th>Ваш балл</th><th>Максимальный балл</th></tr>
          ${expRows}
        </table>
      </div>
    </div>
    <p class="summary-line">Решено ${d.solvedOf} из ${d.totalTasks} заданий, набрано ${d.primaryScore} первичных баллов.</p>
    <div class="score-row">
      <span>Тестовая часть: <b>${d.testScoreFrac}</b></span>
      <span>Развёрнутая часть: <b>${d.expandedScoreFrac}</b></span>
    </div>
    <div class="legend">
      <span style="background:var(--ok)">Верно</span>
      <span style="background:var(--part)">Частично верно</span>
      <span style="background:var(--bad)">Неверно</span>
      <span style="background:var(--none)">Нет ответа</span>
    </div>
  `;
  const back = document.createElement('div');
  back.className = "back-row";
  back.innerHTML = `<button class="back-btn" onclick="state.variant=null; render();">← Назад к вариантам</button>`;
  card.appendChild(back);
  return card;
}

loadData();