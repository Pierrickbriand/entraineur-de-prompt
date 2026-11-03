// Contrôle d'étalonnage de l'entraîneur : fait passer un corpus de consignes
// dans les vrais critères de index.html et compare à la note attendue.
// Lancer : node tests/etalonnage.js [corpus.json] [--detail]
// Corpus par défaut : corpus-texte.json (utilisé pour régler les critères) ; corpus-hors-reglage.json sert de contre-épreuve.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const el = () => new Proxy(function () {}, {
  get: (t, k) => k === 'classList' ? { add() {}, remove() {}, toggle() {} } : (k === 'style' || k === 'dataset') ? {} : el(),
  apply: () => el(), set: () => true });
const ctx = { document: new Proxy({}, { get: () => () => el() }), localStorage: { getItem: () => null, setItem() {} },
  window: { addEventListener() {} }, console, setTimeout() {}, navigator: {} };
vm.createContext(ctx);
vm.runInContext(src + ';this.evaluer=evaluer;this.totalPoints=totalPoints;this.scoreDe=scoreDe;this.SEUIL=SEUIL_PRET', ctx);

// Mêmes seuils que les messages de l'outil : rouge jusqu'à 35 %, « prêt » à partir de 85 %
const bande = r => r >= ctx.SEUIL ? 'pret' : r > 0.35 ? 'moyen' : 'faible';
const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, process.argv.find(a => a.endsWith('.json')) || 'corpus-texte.json'), 'utf8'));
const max = ctx.totalPoints('texte');
let juste = 0, inversions = 0; const ecarts = [];
corpus.forEach(c => {
  const crit = ctx.evaluer(c.t, 'texte');
  const pts = ctx.scoreDe(crit, 'texte');
  const b = bande(pts / max), ok = b === c.attendu;
  const inv = (b === 'pret' && c.attendu === 'faible') || (b === 'faible' && c.attendu === 'pret');
  if (ok) juste++; else ecarts.push(c.id + ' attendu ' + c.attendu + ', obtenu ' + b + ' (' + pts + '/' + max + ')' + (inv ? ' INVERSION' : '') + ' : manque ' + crit.filter(x => !x.ok).map(x => x.id).join(','));
  if (inv) inversions++;
  if (process.argv.includes('--detail')) console.log(c.id.padEnd(4), String(pts).padStart(2) + '/' + max, b.padEnd(6), ok ? 'ok' : 'ÉCART');
});
console.log('Concordance : ' + juste + '/' + corpus.length + ' (' + Math.round(100 * juste / corpus.length) + ' %), inversions : ' + inversions);
ecarts.forEach(e => console.log('  – ' + e));
process.exit(inversions ? 1 : 0);
