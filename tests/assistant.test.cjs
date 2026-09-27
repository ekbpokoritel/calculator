const assert = require('node:assert/strict');
const {LocalAssistantEngine, arithmetic} = require('../assistant-engine.js');
const registry = require('../tool-registry.js');
const calc = require('../calculations.js');
const engine = new LocalAssistantEngine(registry, calc);
(async () => {
 for (const phrase of ['посчитать ипотеку','сколько платить за квартиру','кредит на жильё','хочу купить квартиру в кредит','сколько будет платёж по ипотеке']) {
  const response=await engine.respond(phrase,{});assert.equal(response.actions[0].toolId,'loan');
 }
 assert.match((await engine.respond('Сколько будет 18 процентов от 750?')).text,/135/);
 assert.match((await engine.respond('Как разделить 250 евро между 6 людьми?')).text,/41,666/);
 assert.equal(arithmetic('(12 + 8) / 4'),5);
 assert.equal(arithmetic('-2 * (3 + 4,5)'),-15);
 assert.throws(()=>arithmetic('1/0'));
 assert.throws(()=>arithmetic('alert(1)'));
 assert.throws(()=>arithmetic('2**3'));
 assert.throws(()=>arithmetic('1..2+3'));
 assert.match((await engine.respond('Хочу покрасить комнату 5 на 4')).text,/пока нет/);
 const context={tool:registry.find(t=>t.id==='loan'),inputs:{principal:'1000000',annual:'12',months:'36'},result:[['Платёж',33214.31,'₽'],['Всего',1195715.15,'₽'],['Переплата',195715.15,'₽'],['Кредит',1000000,'₽']]};
 assert.match((await engine.respond('Почему столько процентов?',context)).text,/195/);
 assert.match((await engine.respond('Объясни результат',{...context,error:'Введите срок'})).text,/Введите срок/);
 assert.match((await engine.respond('Объясни результат',{})).text,/Откройте инструмент/);
 assert.match((await engine.respond('Напиши стих про море')).text,/не удалось/);
 console.log('18 assistant checks passed');
})();
