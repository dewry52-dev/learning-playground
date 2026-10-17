const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),path=require('node:path');
exports.createDiaryApi=function(directory=path.join(__dirname,'data')){
 fs.mkdirSync(directory,{recursive:true});
 const db=new DatabaseSync(path.join(directory,'diary.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, mood TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, updated TEXT NOT NULL)');
 return async function(req,res){
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith('/api/diary'))return false;
  const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value))};
  try{
   const match=/^\/api\/diary(?:\/(\d+))?$/.exec(url.pathname);
   if(!match){reply(404,{error:'주소를 찾을 수 없어요.'});return true}
   const id=match[1]?Number(match[1]):null;
   if(!['GET','HEAD'].includes(req.method)){
    if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`){reply(403,{error:'허용되지 않은 요청이에요.'});return true}
    if(req.headers['sec-fetch-site']==='cross-site'){reply(403,{error:'허용되지 않은 요청이에요.'});return true}
   }
   if(req.method==='GET'){
    const result=id?db.prepare('SELECT * FROM entries WHERE id=?').get(id):db.prepare('SELECT * FROM entries ORDER BY date DESC,id DESC').all();
    reply(result?200:404,result||{error:'일기를 찾을 수 없어요.'});return true;
   }
   if(req.method==='DELETE'&&id){const result=db.prepare('DELETE FROM entries WHERE id=?').run(id);reply(result.changes?200:404,result.changes?{ok:true}:{error:'일기를 찾을 수 없어요.'});return true}
   if((req.method==='POST'&&!id)||(req.method==='PUT'&&id)){
    if(!req.headers['content-type']?.startsWith('application/json')){reply(415,{error:'JSON 형식이 필요해요.'});return true}
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>250000){reply(413,{error:'일기가 너무 길어요.'});return true}chunks.push(chunk)}const raw=Buffer.concat(chunks).toString('utf8');
    let data;try{data=JSON.parse(raw)}catch{reply(400,{error:'올바른 기록이 아니에요.'});return true}
    const {date,mood,title,body}=data||{};
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!['happy','calm','excited','sad','tired'].includes(mood)||typeof title!=='string'||!title.trim()||title.length>100||typeof body!=='string'||!body.trim()||body.length>30000){reply(400,{error:'날짜, 기분, 제목(100자 이내), 내용(30,000자 이내)을 확인해 주세요.'});return true}
    const updated=new Date().toISOString();
    if(id){const result=db.prepare('UPDATE entries SET date=?,mood=?,title=?,body=?,updated=? WHERE id=?').run(date,mood,title.trim(),body.trim(),updated,id);if(!result.changes){reply(404,{error:'일기를 찾을 수 없어요.'});return true}}
    const saved=id||Number(db.prepare('INSERT INTO entries(date,mood,title,body,updated) VALUES(?,?,?,?,?)').run(date,mood,title.trim(),body.trim(),updated).lastInsertRowid);
    reply(id?200:201,db.prepare('SELECT * FROM entries WHERE id=?').get(saved));return true;
   }
   reply(405,{error:'지원하지 않는 요청이에요.'});
  }catch(error){console.error('Diary:',error.message);reply(500,{error:'저장소에 접근하지 못했어요. 다시 시도해 주세요.'})}
  return true;
 };
};
