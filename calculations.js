/* Pure calculations, shared by the interface and checks. */
const Calc = {
    percent(a, b, mode) {
        if (mode === 'part') return a * b / 100;
        if (a === 0) throw Error('Исходное число не должно быть нулём.');
        return mode === 'share' ? b / a * 100 : (b - a) / a * 100;
    },
    discount(price, rate) { return [price * (1 - rate / 100), price * rate / 100]; },
    loan(principal, annual, months) {
        const r = annual / 1200;
        const payment = r === 0 ? principal / months : principal * r / (-Math.expm1(-months * Math.log1p(r)));
        return [payment, payment * months, payment * months - principal];
    },
    units: {
        length: { 'м': 1, 'км': 1000, 'см': .01, 'мм': .001, 'мили': 1609.344, 'футы': .3048 },
        mass: { 'кг': 1, 'г': .001, 'тонны': 1000, 'фунты': .45359237 },
        temperature: { '°C': 1, '°F': 1, 'K': 1 }
    },
    convert(value, category, from, to) {
        if (category !== 'temperature') return value * this.units[category][from] / this.units[category][to];
        const c = from === '°F' ? (value - 32) * 5 / 9 : from === 'K' ? value - 273.15 : value;
        if (c < -273.15000001) throw Error('Температура не может быть ниже абсолютного нуля.');
        return to === '°F' ? c * 9 / 5 + 32 : to === 'K' ? c + 273.15 : c;
    },
    days(from, to) {
        if (!from || !to) throw Error('Укажите обе даты.');
        return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
    },
    text(value) {
        const words = value.trim() ? value.trim().split(/\s+/u).length : 0;
        return [Array.from(value).length, words, value ? value.split(/\r?\n/).length : 0, Math.ceil(words / 200)];
    },
    tips(bill, rate, people) { const tip = bill * rate / 100; return [(bill + tip) / people, bill + tip, tip]; }
};
if (typeof module !== 'undefined') module.exports = Calc;
