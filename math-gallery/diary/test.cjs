const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createDiaryApi}=require('../diary-api.cjs');
test('local SQLite CRUD, validation, origin protection and persistence',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'diary-test-'));
 let handler=createDiaryApi(directory);
 const server=http.createServer((req,res)=>handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/diary`;
 const send=(url,method,data,headers={})=>fetch(base+url,{method,headers:{'Content-Type':'application/json',...headers},body:data?JSON.stringify(data):undefined});
 try{
  const entry={date:'2026-10-17',mood:'happy',title:'나의 하루',body:'한글 기록과 😊 마음'};
  let r=await send('','POST',entry);assert.equal(r.status,201);const saved=await r.json();assert.equal(saved.body,entry.body);
  handler=createDiaryApi(directory);r=await fetch(base);assert.equal((await r.json())[0].title,entry.title);
  r=await send('/'+saved.id,'PUT',{...entry,title:'수정한 하루'});assert.equal((await r.json()).title,'수정한 하루');
  assert.equal((await send('','POST',{...entry,date:'2026-02-30'})).status,400);
  assert.equal((await send('','POST',entry,{Origin:'https://other.example'})).status,403);
  assert.equal((await send('/'+saved.id,'DELETE')).status,200);
  assert.deepEqual(await (await fetch(base)).json(),[]);
  assert.equal((await fetch(base+'/'+saved.id)).status,404);
  assert.ok(fs.existsSync(path.join(directory,'diary.sqlite')));
 }finally{await new Promise(r=>server.close(r))}
});
