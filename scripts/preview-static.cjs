const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[2]),port=Number(process.argv[3]||5188),prefix=process.argv[4]||'';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.bcmap':'application/octet-stream'};
http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
 if(prefix&&!pathname.startsWith(prefix+'/')){res.writeHead(404);return res.end()}
 let file=path.resolve(root,'.'+pathname.slice(prefix.length));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(pathname.endsWith('/'))file=path.join(file,'index.html');
 fs.readFile(file,(error,body)=>{if(error){res.writeHead(404);return res.end()}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
 });
}).listen(port,'127.0.0.1',()=>console.log('Static artifact preview: http://127.0.0.1:'+port+prefix+'/'));
