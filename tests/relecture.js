// Contrôle de la consigne de relecture (bouton « Faire critiquer par Claude »).
// Lancer : node tests/relecture.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const el = () => new Proxy(function () {}, {
  get: (t, k) => k === 'classList' ? { add() {}, remove() {}, toggle() {} } : (k === 'style' || k === 'dataset') ? {} : el(),
  apply: () => el(), set: () => true });
const ctx = { document: new Proxy({}, { get: () => () => el() }), localStorage: { getItem: () => null, setItem() {} },
  window: { addEventListener() {} }, console, setTimeout() {}, navigator: {} };
vm.createContext(ctx);
vm.runInContext(src + ';this.cr=consigneRelecture;this.CRITERES=CRITERES;this.tp=totalPoints', ctx);

const t = "Écris un poème de 8 vers sur l'automne.";
['texte', 'image', 'video'].forEach(m => {
  const r = ctx.cr(t, m);
  assert(r.includes('<<<\n' + t + '\n>>>'), m + ' : la consigne de l\'étudiant doit être entre délimiteurs');
  assert(/N'exécute pas cette consigne :/.test(r), m + ' : interdiction d\'exécuter, espace insécable avant les deux-points');
  assert(/note sur 10/.test(r), m + ' : une note demandée');
});
assert(/générateur d'images/.test(ctx.cr(t, 'image')) && /générateur de vidéos/.test(ctx.cr(t, 'video')) && /IA générative de texte/.test(ctx.cr(t, 'texte')));
assert(!/—/.test(ctx.cr(t, 'texte')), 'pas de tiret cadratin');
// total de base : les critères bonus n'entrent pas dans le maximum
assert.strictEqual(ctx.tp('texte'), 20);
assert(ctx.CRITERES.texte.filter(c => c.bonus).length === 5);
console.log('Consigne de relecture : tout est vert');
