/* No network, eval or UI dependencies. A replacement engine only needs respond(text, context). */
(function (root) {
'use strict';
const normalize = text => text.toLowerCase().replace(/ё/g, 'е').replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, ' ').trim();
const format = (n, digits=2) => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: digits}).format(n);
const reply = (text, actions = []) => ({text, actions});
const open = tool => ({type: 'openTool', toolId: tool.id, label: 'Открыть: ' + tool.name});

// Restricted arithmetic grammar: numbers, unary signs, parentheses and four operators.
function arithmetic(source) {
 if(source.length > 200 || !/^[\d.,+*/()\s-]+$/.test(source)) throw Error('Поддерживаются числа, скобки и операции + − × ÷.');
 const tokens = source.replace(/,/g,'.').match(/\d+(?:\.\d+)?|\.\d+|[()+*/-]/g) || [];
 if(tokens.join('') !== source.replace(/,/g,'.').replace(/\s/g,'')) throw Error('Проверьте запись выражения.');
 let pos = 0;
 function factor(){ const token=tokens[pos++]; if(token==='+'||token==='-') return (token==='-'?-1:1)*factor(); if(token==='('){const n=sum();if(tokens[pos++]!==')')throw Error('Проверьте скобки.');return n;} if(!token||!/^\d|^\.\d/.test(token))throw Error('Не хватает числа.');return Number(token); }
 function product(){let n=factor();while(tokens[pos]==='*'||tokens[pos]==='/'){const op=tokens[pos++],b=factor();if(op==='/'&&b===0)throw Error('На ноль делить нельзя.');n=op==='*'?n*b:n/b;}return n;}
 function sum(){let n=product();while(tokens[pos]==='+'||tokens[pos]==='-'){const op=tokens[pos++],b=product();n=op==='+'?n+b:n-b;}return n;}
 const n=sum();if(pos!==tokens.length||!Number.isFinite(n)||Math.abs(n)>1e15)throw Error('Выражение слишком большое или записано неверно.');return n;
}
function simpleMath(text, calc) {
 const number='(-?\\d+(?:[.,]\\d+)?)';
 const numberWords = {'двумя':'2','двух':'2','тремя':'3','трех':'3','четырьмя':'4','четырех':'4','пятью':'5','пяти':'5','шестью':'6','шести':'6','семью':'7','семи':'7','восемью':'8','восьми':'8','девятью':'9','девяти':'9','десятью':'10','десяти':'10'};
 text=text.replace(/[а-я]+/g,word=>numberWords[word]||word);
 const clean=text.replace(/^(?:сколько (?:будет|получится)|посчитай|вычисли|рассчитай)\s*/,'').replace(/[?!=]+$/,'').trim();
 const percent=clean.match(new RegExp('^'+number+'\\s*(?:%|процент(?:а|ов)?)\\s*от\\s*'+number+'$'));
 if(percent)return reply(`${format(Number(percent[1].replace(',','.')))}% от ${percent[2]} = ${format(calc.percent(Number(percent[2].replace(',','.')),Number(percent[1].replace(',','.')),'part'))}.`);
 const split=clean.match(new RegExp('^(?:как\\s+)?(?:разделить|поделить)\\s+'+number+'\\s*(евро|рублей|рубля|руб|₽|€|долларов|\\$)?\\s+(?:между|на)\\s+(\\d+)\\s*(?:людьми|человек(?:ами)?|людей)?$'));
 if(split){const total=Number(split[1].replace(',','.')),people=Number(split[3]);if(total<0||people<1)throw Error('Нужна неотрицательная сумма и хотя бы один человек.');const share=total/people;return reply(`Поровну: ${format(share,8)} ${split[2]||''} на человека (${split[1]} ÷ ${people}).${split[2]?' При оплате округлите до сотых и распределите оставшиеся копейки/центы.':''}`);}
 if(/^[\d.,+*/()\s-]+$/.test(clean)&&/\d/.test(clean))return reply(`${clean} = ${format(arithmetic(clean),8)}.`);
 return null;
}
const intentRules = [
 {id:'explain',patterns:[/объясн/,/почему/,/что (?:означает|значит)/,/разбер/,/простыми словами/,/откуда/]},
 {id:'usage',patterns:[/как (?:пользоваться|работает|считается|найти|посчитать)/,/как влияет/,/как уменьшить/,/что такое/]},
 {id:'catalog',patterns:[/что (?:здесь )?можно/,/популярн/,/инструмент/,/калькулятор/,/подобрать/]},
 {id:'help',patterns:[/^помоги[.!]?$/,/^помощь$/, /^привет/ ]}
];
class IntentResolver {
 resolve(text, registry, context) {
  const intents=intentRules.map(rule=>({id:rule.id,score:rule.patterns.reduce((n,re)=>n+(re.test(text)?2:0),0)})).sort((a,b)=>b.score-a.score);
  const words=text.match(/[а-яa-z]+/g)||[];
  const matches=registry.map(tool=>{
   const hits=(tool.keywords||[]).filter(key=>words.some(word=>word.startsWith(key)));
   let score=hits.length*3;
   if(normalize(tool.name)===text)score+=8;
   if(normalize(tool.category)===text)score+=5;
   if(score&&context.tool?.id===tool.id)score+=1;
   return {tool,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  return {intent:intents[0]?.score?intents[0].id:null,matches};
 }
}
const explainers = {
 loan(c){const r=c.result, i=c.inputs;return `При сумме кредита ${format(r[3][1])} ₽, ставке ${i.annual}% в год и сроке ${i.months} мес. платёж — ${format(r[0][1])} ₽ в месяц. За весь срок: ${format(r[1][1])} ₽. Разница ${format(r[2][1])} ₽ — проценты банку. Они начисляются на остаток долга каждый месяц. Более длинный срок обычно снижает платёж, но увеличивает общие проценты при той же ставке. Комиссии и страховки здесь не учтены.`;},
 discount(c){return `От цены ${c.inputs.price} ₽ вычитается ${c.inputs.rate}%. Экономия — ${format(c.result[1][1])} ₽, к оплате — ${format(c.result[0][1])} ₽.`;},
 percent(c){const {a,b,mode}=c.inputs;const formulas={part:`${a} × ${b} / 100`,share:`${b} / ${a} × 100`,change:`(${b} − ${a}) / ${a} × 100`};return `${formulas[mode]} = ${format(c.result[0][1])}${mode==='part'?'':'%'}. ${mode==='change'?'Положительное значение означает рост, отрицательное — снижение.':mode==='share'?'Исходное число принято за 100%.':'Процент — одна сотая часть числа.'}`;},
 dates(c){return `Между ${c.inputs.start} и ${c.inputs.end}: ${format(c.result[0][1])} дней. Начальный день не включён. Отрицательное число означает, что конечная дата раньше начальной.`;},
 tips(c){return `К счёту ${c.inputs.bill} ₽ добавляем ${c.inputs.tip}% чаевых: ${format(c.result[2][1])} ₽. Итого ${format(c.result[1][1])} ₽ делим на ${c.inputs.people} человек: по ${format(c.result[0][1])} ₽. При оплате округлите до копеек и распределите остаток.`;}
};
class LocalAssistantEngine {
 constructor(registry, calculations){this.registry=registry;this.calc=calculations;this.resolver=new IntentResolver();}
 async respond(raw, context = {}) {
  const text=normalize(raw);if(!text)return reply('Опишите, что нужно посчитать.');
  if(text.length>1000)return reply('Сократите запрос до 1000 символов.');
  try{const result=simpleMath(text,this.calc);if(result)return result;}catch(e){return reply(e.message);}
  const unavailable=[[/краск|покрас|плитк|обои|ремонт/,'расчётов материалов для ремонта'],[/бензин|топлив|расход.*авто/,'расхода топлива'],[/калори|здоров|болит|лекар|диагноз|лечени/,'здоровья'],[/инвест|акци[ийя]|юрид|налог/,'инвестиционных, юридических и налоговых вопросов']].find(([re])=>re.test(text));
  if(unavailable)return reply(`Инструментов для ${unavailable[1]} в текущем каталоге пока нет. Я не буду придумывать результат. Могу помочь с доступными расчётами.`,this.registry.slice(0,3).map(open));
  const {intent,matches}=this.resolver.resolve(text,this.registry,context);
  const referringToCurrent=context.tool&&['explain','usage'].includes(intent)&&(!matches.length||matches[0].tool.id===context.tool.id||/мой|результат/.test(text)||(context.tool.id==='loan'&&/переплат|ставк|процент/.test(text)));
  if(referringToCurrent){
   if(context.error)return reply(`Сейчас в «${context.tool.name}» нет корректного результата: ${context.error} Исправьте поле и спросите ещё раз.`);
   if(context.tool.id==='basic')return reply(`На дисплее: ${context.display}.${context.previous?' Предыдущее действие: '+context.previous+'.':''} Введите число, выберите операцию, затем второе число и =. Enter считает, Escape очищает. Я вижу дисплей, но не историю всех вычислений.`);
   if(intent==='usage'&&context.tool.id==='loan'&&/ставк|уменьшить/.test(text))return reply('При той же сумме и сроке более высокая ставка увеличивает платёж и общую сумму процентов. Более длинный срок обычно снижает ежемесячный платёж, но увеличивает переплату. Измените одно поле и сравните результат. Это объяснение формулы, а не подбор кредитного продукта.');
   if(intent==='usage')return reply(`${context.tool.name}: заполните подписанные поля — результат пересчитается автоматически.\n\n${context.note}`);
   const explain=explainers[context.tool.id];
   return reply(explain?explain(context):`${context.tool.name}:\n${context.result.map(([label,value,unit])=>`${label}: ${format(value)} ${unit}`).join('\n')}\n\n${context.note}`);
  }
  if(matches.length){const selected=matches.filter(x=>x.score>=matches[0].score-2).slice(0,3);const housing=/ипотек|квартир|жиль/.test(text)&&selected.some(x=>x.tool.id==='loan');return reply(housing?'Для оценки платежа за жильё подойдёт наш кредитный калькулятор. Введите сумму займа после вычета первоначального взноса. Отдельного ипотечного инструмента пока нет.':selected.length>1?'Подойдут несколько инструментов. Выберите нужный:':`Для этой задачи подойдёт «${selected[0].tool.name}». ${selected[0].tool.description}`,selected.map(x=>open(x.tool)));}
  if(intent==='explain'||intent==='usage')return reply('Откройте инструмент и введите значения. Тогда я смогу объяснить его текущий результат.',this.registry.slice(0,3).map(open));
  if(intent==='catalog'||intent==='help')return reply('Опишите задачу обычными словами. Я могу найти инструмент, объяснить открытый расчёт или посчитать выражение, например «18% от 750». Сейчас доступны:',this.registry.map(open));
  return reply('Пока не удалось уверенно понять задачу. Уточните, что нужно найти: платёж по кредиту, скидку, процент, разницу дат или перевод единиц. Для арифметики напишите, например, (12 + 8) / 4.',this.registry.filter(t=>['loan','percent','convert'].includes(t.id)).map(open));
 }
}
root.LocalAssistantEngine=LocalAssistantEngine;
if(typeof module!=='undefined')module.exports={LocalAssistantEngine,IntentResolver,arithmetic};
})(typeof window!=='undefined'?window:globalThis);
