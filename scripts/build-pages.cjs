const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
require('../math-gallery/pdf-counter/restore-cmaps.cjs')();
const out = path.join(root, 'deployment', 'pages', 'dist');
fs.mkdirSync(out, { recursive: true });
for (const file of ['index.html', 'style.css', 'game.js', 'math.mjs', 'programs.js']) {
  fs.copyFileSync(path.join(root, 'math-gallery', file), path.join(out, file));
}
fs.cpSync(path.join(root, 'math-gallery', 'pdf-counter'), path.join(out, 'pdf-counter'), {
  recursive: true,
  filter: source => !/^test/.test(path.basename(source)) && !/\.(cjs|tar\.gz)$/.test(source)
});
const pdfPage = path.join(out, 'pdf-counter', 'index.html');
fs.writeFileSync(pdfPage, fs.readFileSync(pdfPage, 'utf8').replaceAll('href="/"', 'href="../"'));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
const files = fs.readdirSync(out);
if (files.some(name => /data|diary|server|sqlite/.test(name))) throw Error('Unexpected private/server files in Pages output');
console.log('Pages artifact ready: deployment/pages/dist');
