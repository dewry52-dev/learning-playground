const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'dist');
fs.mkdirSync(out, {recursive:true});
for (const file of ['index.html','style.css','math.js','app.js','account.js','cloud-config.js']) {
  fs.copyFileSync(path.join(__dirname,file), path.join(out,file));
}
console.log('Reviewed static files copied to dist');
