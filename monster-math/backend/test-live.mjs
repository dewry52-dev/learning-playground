import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../cloud-config.js',import.meta.url),'utf8'),context);
const config=context.window.MONSTER_CLOUD;
if(!config)throw Error('Cloud configuration required');
const suffix=Date.now().toString(36);
const accounts=[];
async function request(action,data={},token=null,status=200){
 const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publishableKey,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action,...data})});
 const value=await response.json();
 assert.equal(response.status,status,`${action}: ${value.error||response.status}`);
 return value;
}
try{
 await request('history',{},null,401);
 for(const number of [1,2]){
  const username=`qa_${suffix}_${number}`,password='Qa-'+crypto.randomUUID();
  const session=await request('signup',{username,password});
  const userResponse=await fetch(config.endpoint.split('/functions/')[0]+'/auth/v1/user',{headers:{apikey:config.publishableKey,Authorization:`Bearer ${session.access_token}`}});
  const user=await userResponse.json();
  accounts.push({username,id:user.id,token:session.access_token});
 }
 const [alice,bob]=accounts;
 const exercise=await request('solo-start',{type:'m21'},alice.token);
 await request('solo-answer',{exerciseId:exercise.exerciseId,questionId:exercise.question.id,requestId:crypto.randomUUID(),answer:1,remainder:0},bob.token,403);
 let q=exercise.question;
 let lastSubmission,lastReply;
 for(let i=0;i<5;i++){
  assert.equal(q.answer,undefined);
  const body={exerciseId:exercise.exerciseId,questionId:q.id,requestId:crypto.randomUUID(),answer:q.a*q.b,remainder:0};
  const reply=await request('solo-answer',body,alice.token);
  assert.equal(reply.correct,true);lastSubmission=body;lastReply=reply;q=reply.question;
 }
 assert.equal(lastReply.complete,true);
 await request('solo-answer',lastSubmission,alice.token);
 const history=await request('history',{},alice.token);
 assert.equal(history.records.length,1);assert.equal(history.records[0].correct,5);
 assert.equal((await request('history',{},bob.token)).records.length,0);
 const rest=config.endpoint.split('/functions/')[0]+'/rest/v1/learning_records?select=*';
 const bobRows=await fetch(rest,{headers:{apikey:config.publishableKey,Authorization:`Bearer ${bob.token}`}});
 assert.equal(bobRows.status,200);assert.deepEqual(await bobRows.json(),[]);
 const anonymousRows=await fetch(rest,{headers:{apikey:config.publishableKey}});
 assert.ok([401,403].includes(anonymousRows.status));
 const room=await request('create',{scope:['m21']},alice.token);
 const player=await request('join',{code:room.code},bob.token);
 await request('start',{roomCode:room.code,token:player.token},bob.token,403);
 await request('start',{roomCode:room.code,token:room.token},alice.token);
 const teamQ=await request('question',{roomCode:room.code,token:player.token},bob.token);
 const answer={roomCode:room.code,token:player.token,questionId:teamQ.id,requestId:crypto.randomUUID(),answer:teamQ.a*teamQ.b,remainder:0};
 const hit=await request('answer',answer,bob.token);
 const duplicate=await request('answer',answer,bob.token);
 assert.equal(hit.correct,true);assert.equal(duplicate.hp,hit.hp);
 await request('end',{roomCode:room.code,token:room.token},alice.token);
 await request('state',{roomCode:room.code,token:player.token},bob.token,410);
 console.log('PASS: real signup/login, server grading, saved history, cross-account RLS, anonymous denial, co-op authorization and idempotency');
} finally {
 const out=new URL('../../.deployment-tools/monster-qa-users.json',import.meta.url);
 fs.mkdirSync(new URL('./',out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(accounts.map(({id,username})=>({id,username}))));
}
