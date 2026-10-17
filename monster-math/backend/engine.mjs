import crypto from 'node:crypto';
import {types,question,correct,hint} from './math.mjs';
export function createEngine(snapshot={rooms:[],sessions:[]}) {
const rooms=new Map(),sessions=new Map(),limits=new Map();
const token=()=>crypto.randomBytes(24).toString('hex');
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
function drop(room){rooms.delete(room.code);for(const [k,s]of sessions)if(s.room===room)sessions.delete(k);}
function clean(){const now=Date.now();for(const room of rooms.values())if(room.expires<now)drop(room);for(const [k,v]of limits)if(v.until<now)limits.delete(k);}

function fail(msg,status=400){const e=Error(msg);e.status=status;throw e;}
function publicState(room){return {code:room.code,status:room.status,hp:room.hp,maxHp:room.maxHp,scope:room.scope,players:room.players.map(p=>({id:p.id,alias:p.alias,hits:p.hits})),expires:room.expires};}
function safeQuestion(q,id){return {id,type:q.type,a:q.a,b:q.b,div:q.div,hint:hint(q)};}
function api(route,data,req){clean();const key=req.socket.remoteAddress;let rate=limits.get(key);if(!rate||rate.until<Date.now()){rate={n:0,until:Date.now()+60000};limits.set(key,rate);}if(++rate.n>6000)fail('요청이 많아요. 잠시 후 다시 해 주세요.',429);
 if(route==='/api/create'){if(rooms.size>=50)fail('열려 있는 방이 많아요. 잠시 후 다시 해 주세요.');const scope=Array.isArray(data.scope)?data.scope:[];if(!scope.length||scope.some(t=>!types.some(x=>x[0]===t)))fail('문제 범위를 선택해 주세요.');let code;do{code=String(crypto.randomInt(100000,1000000));}while(rooms.has(code));const room={code,scope:[...new Set(scope)],status:'waiting',hp:0,maxHp:0,players:[],expires:Date.now()+7200000};rooms.set(code,room);const t=token();sessions.set(hash(t),{room,host:true});return {token:t,...publicState(room)};}
 if(route==='/api/join'){const room=rooms.get(String(data.code));if(!room)fail('방을 찾을 수 없어요. 코드를 확인해 주세요.',404);if(room.status!=='waiting')fail('이미 시작되었거나 끝난 방이에요.');if(room.players.length>=30)fail('이 방은 30명이 모두 모였어요.');const p={id:token().slice(0,12),alias:['구름','별빛','초록','반짝','달빛'][room.players.length%5]+['토끼','여우','곰','고래','수달'][Math.floor(room.players.length/5)%5]+(room.players.length+1),hits:0,q:null,last:null};room.players.push(p);const t=token();sessions.set(hash(t),{room,p,host:false});return {token:t,me:p.id,...publicState(room)};}
 const s=sessions.get(hash(String(data.token||'')));if(!s)fail('방이 종료되었거나 연결 정보가 만료됐어요.',410);const room=s.room;
 if(route==='/api/state')return {...publicState(room),me:s.p?.id};
 if(route==='/api/start'){if(!s.host)fail('방을 만든 선생님만 시작할 수 있어요.',403);if(room.status!=='waiting')fail('이미 시작한 방이에요.');if(!room.players.length)fail('학생이 한 명 이상 들어오면 시작할 수 있어요.');room.status='playing';room.hp=room.maxHp=room.players.length*5;return publicState(room);}
 if(route==='/api/end'){if(!s.host)fail('방을 만든 선생님만 종료할 수 있어요.',403);drop(room);return {ended:true};}
 if(s.host)fail('학생 화면에서 문제를 풀어 주세요.',403);if(room.status!=='playing')fail(room.status==='won'?'보스를 물리쳤어요!':'아직 시작하지 않았어요.');
 if(route==='/api/question'){if(!s.p.q){const q=question(room.scope[crypto.randomInt(room.scope.length)]);s.p.q={id:token().slice(0,16),...q};}return safeQuestion(s.p.q,s.p.q.id);}
 if(route==='/api/answer'){if(typeof data.requestId!=='string'||data.requestId.length>100)fail('올바르지 않은 제출이에요.');if(s.p.last?.requestId===data.requestId)return s.p.last.result;const q=s.p.q;if(!q||q.id!==data.questionId)fail('이미 푼 문제이거나 다른 문제예요.');if(!Number.isSafeInteger(data.answer)||!Number.isSafeInteger(data.remainder))fail('숫자로 답을 입력해 주세요.');const ok=correct(q,data.answer,data.remainder);if(ok){room.hp=Math.max(0,room.hp-1);s.p.hits++;s.p.q=null;if(!room.hp)room.status='won';}const result={correct:ok,hint:hint(q),...publicState(room)};s.p.last={requestId:data.requestId,result};return result;}
 fail('없는 요청이에요.',404);
}

for(const [code,room] of snapshot.rooms) rooms.set(code,room);
for(const [key,value] of snapshot.sessions) {
 const room=rooms.get(value.roomCode);
 if(room) sessions.set(key,{room,host:value.host,userId:value.userId,p:room.players.find(p=>p.id===value.playerId)});
}
return {
 run(route,data,userId) {
  if(!['create','join'].includes(route)) {
   const s=sessions.get(hash(String(data.token||'')));
   if(!s||s.userId!==userId) fail('로그인한 계정의 모험방이 아니에요.',403);
  }
  const result=api('/api/'+route,data,{socket:{remoteAddress:userId}});
  if(result.token) sessions.get(hash(result.token)).userId=userId;
  return result;
 },
 dump(){return {rooms:[...rooms],sessions:[...sessions].map(([k,s])=>[k,{roomCode:s.room.code,host:s.host,userId:s.userId,playerId:s.p?.id}])}}
};
}
