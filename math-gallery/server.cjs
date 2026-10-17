const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
require('./pdf-counter/restore-cmaps.cjs')();
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/game.js':'game.js','/programs.js':'programs.js','/math.mjs':'math.mjs'};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.bcmap':'application/octet-stream'};
const diaryApi=require('./diary-api.cjs').createDiaryApi();
const server=http.createServer(async(req,res)=>{
 if(await diaryApi(req,res))return;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end('Method not allowed')}
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end('Bad request')}
 let file=files[url];
 if(url==='/diary'||url==='/diary/')file='diary/index.html';
 else if(/^\/diary\/(?:app\.js|style\.css)$/.test(url))file=url.slice(1);
 if(url==='/pdf-counter'||url==='/pdf-counter/')file='pdf-counter/index.html';
 else if(/^\/pdf-counter\/(?:counter\.(?:mjs|css)|count\.mjs|vendor\/pdf(?:\.worker)?\.mjs|vendor\/cmaps\/[A-Za-z0-9_-]+\.bcmap)$/.test(url))file=url.slice(1);
 if(!file){res.writeHead(404);return res.end('Not found')}
 fs.readFile(path.join(__dirname,file),(error,data)=>{if(error){res.writeHead(404);return res.end('Not found')}
 res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:data);});
});
server.on('error',error=>{console.error('Server error:',error.message);process.exitCode=1});
server.listen(Number(process.env.PORT)||5180,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${server.address().port}`));
