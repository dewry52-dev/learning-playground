const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../monster-math');
const math = fs.readFileSync(path.join(root,'math.cjs'),'utf8').replace('module.exports={types,question,correct,hint};','export {types,question,correct,hint};');
fs.writeFileSync(path.join(root,'backend/math.mjs'),math);
let core = fs.readFileSync(path.join(root,'server.cjs'),'utf8');
core = core.slice(core.indexOf('const rooms='),core.indexOf('const server='));
core = core.replace('setInterval(clean,60000).unref();','');
const moduleText = `import crypto from 'node:crypto';
import {types,question,correct,hint} from './math.mjs';
export function createEngine(snapshot={rooms:[],sessions:[]}) {
${core}
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
`;
fs.writeFileSync(path.join(root,'backend/engine.mjs'),moduleText);
console.log('Generated cloud engine from reviewed local arithmetic and game rules');
