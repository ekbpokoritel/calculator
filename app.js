(() => {
'use strict';
const $ = s => document.querySelector(s);
const tools = ToolRegistry;
const read = (key, fallback) => {try{return JSON.parse(localStorage.getItem(key)) || fallback;}catch{return fallback;}};
const save = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let favorites = read('orbita-favorites',[]); if(!Array.isArray(favorites)) favorites=[];
let recent = read('orbita-recent',[]); if(!Array.isArray(recent)) recent=[];
let category='Все', onlyFavorites=false;
const fmt = (n, digits=2) => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:digits}).format(Object.is(n,-0)?0:n);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function card(t,compact=false){return `<article class="tool-card ${compact?'compact':''}"><a href="#/tool/${t.id}"><span class="tool-icon ${t.color}">${t.icon}</span><div><h3>${t.name}</h3><p>${t.description}</p>${compact?'':`<span class="category-label">${t.category}</span>`}</div><span class="card-arrow">↗</span></a>${compact?'':`<button class="favorite ${favorites.includes(t.id)?'active':''}" data-favorite="${t.id}" aria-label="${favorites.includes(t.id)?'Убрать из':'Добавить в'} избранное: ${t.name}" aria-pressed="${favorites.includes(t.id)}">${favorites.includes(t.id)?'♥':'♡'}</button>`}</article>`;}
function renderCatalog(){
 const q=$('#search').value.toLowerCase().replace(/ё/g,'е').trim();
 const list=tools.filter(t=>(category==='Все'||t.category===category)&&(!onlyFavorites||favorites.includes(t.id))&&`${t.name} ${t.tags} ${t.description}`.toLowerCase().replace(/ё/g,'е').includes(q));
 $('#catalog').innerHTML=list.map(t=>card(t)).join('');$('#empty').hidden=!!list.length;
 $('#result-count').textContent=`Найдено: ${list.length}`;$('#catalog-title').innerHTML=`${onlyFavorites?'Избранное':'Все инструменты'} <span class="count">${list.length}</span>`;
 $('#fav-count').textContent=favorites.length;
 $('#favorites-nav').setAttribute('aria-pressed',String(onlyFavorites));
 $('#filters').innerHTML=['Все',...new Set(tools.map(t=>t.category))].map(c=>`<button data-category="${c}" class="${category===c?'selected':''}" aria-pressed="${category===c}">${c}</button>`).join('');
 $('#popular-section').hidden=onlyFavorites||!!q||category!=='Все';
 $('#popular').innerHTML=['basic','loan','convert'].map(id=>card(tools.find(t=>t.id===id),true)).join('');
 const validRecent=recent.map(id=>tools.find(t=>t.id===id)).filter(Boolean).slice(0,3);
 $('#recent-section').hidden=!validRecent.length||onlyFavorites||!!q;
 $('#recent').innerHTML=validRecent.map(t=>card(t,true)).join('');
}
$('#search').addEventListener('input',renderCatalog);
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;renderCatalog();}});
$('#catalog').addEventListener('click',e=>{const b=e.target.closest('[data-favorite]');if(!b)return;const id=b.dataset.favorite;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];save('orbita-favorites',favorites);renderCatalog();});
$('#favorites-nav').onclick=()=>{onlyFavorites=!onlyFavorites;category='Все';$('#search').value='';location.hash='#/';route();};
$('#catalog-link').onclick=()=>{onlyFavorites=false;category='Все';$('#search').value='';renderCatalog();};
document.addEventListener('keydown',e=>{if(!e.target.closest('#assistant-panel')&&e.key==='/'&&!e.target.matches('input,textarea,select')&&!$('#home').hidden){e.preventDefault();$('#search').focus();}});
const input=(id,label,value,unit='',min=0,max='',step='any')=>`<label class="field">${label}<span class="input-shell"><input id="${id}" name="${id}" type="text" inputmode="decimal" value="${value}" data-min="${min}" data-max="${max}" data-step="${step}" required><span>${unit}</span></span></label>`;
const select=(id,label,options)=>`<label class="field">${label}<select id="${id}" name="${id}">${options.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>`;
function number(id){const el=$('#'+id);const raw=el.value.trim().replace(/\s/g,'').replace(',','.');const n=Number(raw);if(!raw||!Number.isFinite(n)||n<Number(el.dataset.min)||el.dataset.max&&n>Number(el.dataset.max)||el.dataset.step==='1'&&!Number.isInteger(n))throw Error('Проверьте поле «'+el.closest('label').firstChild.textContent.trim()+'»: введите допустимое число'+(el.dataset.step==='1'?' без дробной части':'')+'.');return n;}
const config={
 percent:{fields:()=>select('mode','Что нужно найти',[['part','Процент от числа'],['share','Сколько процентов составляет число'],['change','Изменение в процентах']])+input('a','Исходное число',1000,'',-1e15,1e15)+input('b','Процент',15,'%',-1e15,1e15), calc:()=>{const mode=$('#mode').value;return [['Результат',Calc.percent(number('a'),number('b'),mode),mode==='part'?'':'%']];},note:'Процент от числа: A × B / 100. Доля: B / A × 100. Изменение: (B − A) / A × 100.'},
 discount:{fields:()=>input('price','Цена до скидки',5000,'₽',0,1e12)+input('rate','Скидка',20,'%',0,100),calc:()=>{const [total,saved]=Calc.discount(number('price'),number('rate'));return [['Цена со скидкой',total,'₽'],['Вы экономите',saved,'₽']];},note:'Итоговая цена = исходная цена × (1 − скидка / 100). Скидка может быть от 0 до 100%.'},
 loan:{fields:()=>input('principal','Сумма кредита',1000000,'₽',1,1e12)+input('annual','Годовая ставка',12,'%',0,100)+input('months','Срок кредита',36,'мес.',1,600,'1'),calc:()=>{const p=number('principal');const [payment,total,interest]=Calc.loan(p,number('annual'),number('months'));return [['Ежемесячный платёж',payment,'₽'],['Общая сумма выплат',total,'₽'],['Переплата',interest,'₽'],['Сумма кредита',p,'₽']];},note:'Аннуитетный расчёт с равными ежемесячными платежами. Ставка фиксированная; комиссии, страховки и банковское округление не учитываются. При нулевой ставке сумма делится на срок.'},
 convert:{fields:()=>select('dimension','Величина',[['length','Длина'],['mass','Масса'],['temperature','Температура']])+input('value','Значение',1,'',-1e15,1e15)+`<div class="two-fields">${select('from','Из',Object.keys(Calc.units.length).map(x=>[x,x]))}${select('to','В',Object.keys(Calc.units.length).map(x=>[x,x]))}</div>`,calc:()=>[['Результат',Calc.convert(number('value'),$('#dimension').value,$('#from').value,$('#to').value),$('#to').value]],note:'Линейные величины переводятся через базовую единицу. Температуры переводятся с учётом смещения шкал. Результаты округляются до 8 знаков после запятой.'},
 dates:{fields:()=>`<label class="field">Начальная дата<input id="start" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label class="field">Конечная дата<input id="end" type="date" value="${new Date(Date.now()+30*86400000).toISOString().slice(0,10)}" required></label>`,calc:()=>[['Разница между датами',Calc.days($('#start').value,$('#end').value),'дн.']],note:'Разница календарных дат без включения начального дня и без влияния часовых поясов. Если конечная дата раньше начальной, результат отрицательный.'},
 text:{fields:()=>'<label class="field">Ваш текст<textarea id="text-value" rows="8" placeholder="Напишите или вставьте текст…"></textarea></label>',calc:()=>Calc.text($('#text-value').value).map((n,i)=>[['Символов с пробелами','Слов','Строк','Время чтения'][i],n,i===3?'мин.':'']),note:'Слова разделяются пробелами и переносами. Время чтения — ориентировочно 200 слов в минуту, округлено вверх. Символы считаются по кодовым точкам Unicode.'},
 tips:{fields:()=>input('bill','Сумма счёта',3000,'₽',0,1e12)+input('tip','Чаевые',10,'%',0,100)+input('people','Количество человек',3,'чел.',1,10000,'1'),calc:()=>{const [each,total,tip]=Calc.tips(number('bill'),number('tip'),number('people'));return [['С каждого',each,'₽'],['Всего с чаевыми',total,'₽'],['Чаевые',tip,'₽']];},note:'Счёт и чаевые делятся поровну. Сумма на человека округляется до копеек; при оплате может понадобиться распределить остаток в несколько копеек.'}
};
function openTool(t){
 $('#tool-title').textContent=t.name;$('#tool-category').textContent=t.category;$('#tool-description').textContent=t.description;document.title=t.name+' — Орбита';
 $('#basic-host').hidden=t.id!=='basic';$('#tool-content').innerHTML='';
 if(t.id==='basic')return;
 const c=config[t.id];$('#tool-content').innerHTML=`<div class="workspace"><form id="tool-form" class="panel" novalidate><h2>Ваши данные</h2>${c.fields()}<button class="primary" type="submit">Рассчитать <span>↗</span></button><p class="form-hint">Результат обновляется при вводе</p></form><section class="panel result-panel"><div class="eyebrow">ВАШ РЕЗУЛЬТАТ</div><div id="result" aria-live="polite"></div><p id="form-error" role="alert" hidden></p><button id="copy" class="copy">Копировать результат</button><p id="copy-status" role="status"></p></section></div><aside class="explanation"><h3>Как это считается</h3><p>${c.note}</p></aside>`;
 if(t.id==='convert')$('#to').selectedIndex=1;
 let copyText='';
 function compute(){try{const rows=c.calc();if(rows.some(r=>!Number.isFinite(r[1])))throw Error('Проверьте введённые значения.');$('#result').innerHTML=rows.map(([label,n,unit],i)=>`<div class="result-row ${i===0?'main-result':''}"><span>${esc(label)}</span><strong>${fmt(n,t.id==='convert'?8:2)} <small>${esc(unit)}</small></strong></div>`).join('');if(t.id==='loan'){const pct=rows[3][1]/rows[1][1]*100;$('#result').innerHTML+=`<div class="payment-bar" aria-hidden="true"><span style="width:${pct}%"></span></div><div class="chart-legend">● Основной долг <span>● Проценты</span></div>`;}$('#form-error').hidden=true;$('#copy').disabled=false;copyText=t.name+'\n'+rows.map(([l,n,u])=>`${l}: ${fmt(n,t.id==='convert'?8:2)} ${u}`).join('\n');}catch(e){$('#result').innerHTML='';$('#form-error').textContent=e.message;$('#form-error').hidden=false;$('#copy').disabled=true;copyText='';}$('#copy-status').textContent='';}
 $('#tool-form').onsubmit=e=>{e.preventDefault();compute();};
 $('#tool-form').addEventListener('input',compute);
 $('#tool-form').addEventListener('change',e=>{if(e.target.id==='dimension'){const opts=Object.keys(Calc.units[e.target.value]).map(x=>`<option>${x}</option>`).join('');$('#from').innerHTML=opts;$('#to').innerHTML=opts;$('#to').selectedIndex=1;}if(e.target.id==='mode'){const b=$('#b').closest('label');b.firstChild.textContent=e.target.value==='part'?'Процент':'Второе число';b.querySelector('.input-shell > span').textContent=e.target.value==='part'?'%':'';}compute();});
 $('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(copyText);$('#copy-status').textContent='Результат скопирован';}catch{$('#copy-status').textContent='Копирование недоступно. Выделите и скопируйте результат вручную.';}};
 compute();
}
function route(){const match=location.hash.match(/^#\/tool\/([^/]+)$/);const t=match&&tools.find(t=>t.id===match[1]);$('#home').hidden=!!t;$('#tool-page').hidden=!t;$('#basic-host').hidden=true;if(t){recent=[t.id,...recent.filter(id=>id!==t.id)].slice(0,6);save('orbita-recent',recent);openTool(t);$('#tool-title').focus({preventScroll:true});window.scrollTo(0,0);}else{document.title='Орбита — все расчёты в одном месте';renderCatalog();}}
// Shared, read-only context adapter. Results are recomputed from current inputs.
window.Orbita = {
 tools,
 getContext() {
  const tool = tools.find(t => t.route === location.hash) || null;
  const context = {route: location.hash || '#/', tool, inputs: {}, result: [], note: '', error: ''};
  if (!tool) return context;
  if (tool.id === 'basic') { context.display = $('.current-value').textContent; context.previous = $('.previous-value').textContent; return context; }
  document.querySelectorAll('#tool-form input, #tool-form select, #tool-form textarea').forEach(el => { context.inputs[el.id] = el.value; });
  context.note = config[tool.id].note;
  try { context.result = config[tool.id].calc(); if(context.result.some(row => !Number.isFinite(row[1]))) throw Error('Проверьте значения в форме.'); }
  catch(e) { context.error = e.message; }
  return context;
 },
 openTool(id) { const tool = tools.find(t => t.id === id); if(tool) location.hash = tool.route; }
};
window.addEventListener('hashchange',route);route();
})();
