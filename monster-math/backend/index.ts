import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.0';
import { question, correct, hint, types } from './math.mjs';
import { createEngine } from './engine.mjs';

const url = Deno.env.get('SUPABASE_URL')!;
const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false,autoRefreshToken:false}});
const hubOrigin = 'https://dewry52-dev.github.io';
const allowed = (origin:string) => origin === hubOrigin || ['https://monster-math-dewry52.vercel.app','https://monster-math-dewry52-dewry52-8962.vercel.app'].includes(origin) || origin === Deno.env.get('MONSTER_APP_ORIGIN') || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
const safe = (q:any) => ({id:q.id,type:q.type,a:q.a,b:q.b,div:q.div,hint:hint(q)});
const nextQuestion = (type:string) => ({...question(type),id:crypto.randomUUID()});
const fail = (message:string,status=400) => {throw Object.assign(Error(message),{status})};
const checked = (result:any) => {if(result.error) throw result.error; return result.data};

Deno.serve(async (req:Request) => {
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(allowed(origin)) headers['Access-Control-Allow-Origin']=origin;
 headers['Access-Control-Allow-Headers']='authorization, apikey, content-type';
 headers['Access-Control-Allow-Methods']='POST, OPTIONS';
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(req.method==='OPTIONS') return new Response(null,{status:allowed(origin)?204:403,headers});
 try {
  if(origin&&!allowed(origin)) fail('허용되지 않은 접속이에요.',403);
  if(req.method!=='POST') fail('지원하지 않는 요청이에요.',405);
  const raw=await req.text(); if(new TextEncoder().encode(raw).length>12000) fail('요청이 너무 커요.',413);
  let data:any;try{data=JSON.parse(raw)}catch{fail('요청 형식을 확인해 주세요.')}
  const action=data?.action;
  if(['login','signup'].includes(action)) {
   const username=String(data.username||'').toLowerCase();
   const password=data.password;
   if(!/^[a-z0-9_]{3,20}$/.test(username)||typeof password!=='string'||password.length<8||new TextEncoder().encode(password).length>72) fail('아이디는 영문·숫자·밑줄 3~20자, 비밀번호는 8~72바이트로 입력해 주세요.');
   const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))).map(n=>n.toString(16).padStart(2,'0')).join('');
   if(!checked(await service.rpc('monster_take_rate',{p_id:'auth:'+hash,p_limit:30,p_seconds:300}))) fail('잠시 쉬었다가 다시 시도해 주세요.',429);
   if(!checked(await service.rpc('monster_take_rate',{p_id:'account:'+username,p_limit:10,p_seconds:300}))) fail('잠시 쉬었다가 다시 시도해 주세요.',429);
   const email=username+'@monster.students.invalid';
   if(action==='signup') {
    const created=await service.auth.admin.createUser({email,password,email_confirm:true});
    if(created.error) fail('가입하지 못했어요. 다른 아이디를 사용하거나 담당 교사에게 문의하세요.');
   }
   const auth=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:Deno.env.get('SUPABASE_ANON_KEY')!,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
   const session=await auth.json();
   if(!auth.ok) fail('아이디 또는 비밀번호를 확인해 주세요.',401);
   return reply({access_token:session.access_token});
  }
  const token=req.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
  const {data:auth,error}=await service.auth.getUser(token);
  if(error||!auth.user) fail('로그인한 뒤 이용해 주세요.',401);
  const userId=auth.user.id;
  if(!checked(await service.rpc('monster_take_rate',{p_id:'user:'+userId,p_limit:240,p_seconds:60}))) fail('요청이 많아요. 잠시 후 다시 해 주세요.',429);
  if(action==='logout') {await service.auth.admin.signOut(token,'local');return reply({ok:true})}
  if(action==='history') {
   const records=checked(await service.from('learning_records').select('type,correct,attempts,completed_at').eq('user_id',userId).order('completed_at',{ascending:false}).limit(100));
   return reply({records});
  }
  if(action==='solo-start') {
   if(!checked(await service.rpc('monster_take_rate',{p_id:'starts:'+userId,p_limit:60,p_seconds:3600}))) fail('잠시 쉬었다가 새 모험을 시작해 주세요.',429);
   checked(await service.from('monster_state').delete().lt('expires_at',new Date().toISOString()));
   if(!types.some((t:any)=>t[0]===data.type)) fail('계산 범위를 선택해 주세요.');
   const id=crypto.randomUUID(),q=nextQuestion(data.type);
   checked(await service.from('monster_state').insert({id:'solo:'+id,state:{userId,type:data.type,hits:0,attempts:0,q,last:null},expires_at:new Date(Date.now()+7200000).toISOString()}));
   return reply({exerciseId:id,question:safe(q)});
  }
  const solo=action==='solo-answer';
  const roomAction=String(action||'');
  if(!solo&&!['create','join','state','start','end','question','answer'].includes(roomAction)) fail('없는 요청이에요.',404);
  if(!solo&&roomAction==='create') {
   if(!checked(await service.rpc('monster_take_rate',{p_id:'rooms:'+userId,p_limit:20,p_seconds:3600}))) fail('모험방을 너무 많이 만들었어요. 잠시 후 다시 해 주세요.',429);
   checked(await service.from('monster_state').delete().lt('expires_at',new Date().toISOString()));
   for(let n=0;n<10;n++) {
    const engine=createEngine(); const value=engine.run('create',data,userId);
    const inserted=await service.from('monster_state').insert({id:'room:'+value.code,state:engine.dump(),expires_at:new Date(value.expires).toISOString()});
    if(!inserted.error) return reply(value);
    if(inserted.error.code!=='23505') throw inserted.error;
   }
   fail('모험방을 만들지 못했어요. 다시 시도해 주세요.',503);
  }
  const id=solo?'solo:'+String(data.exerciseId):'room:'+String(data.roomCode||data.code);
  if(!solo&&!/^room:\d{6}$/.test(id)) fail('방 코드를 확인해 주세요.');
  for(let attempt=0;attempt<12;attempt++) {
   const saved=checked(await service.from('monster_state').select('*').eq('id',id).maybeSingle());
   if(!saved||Date.parse(saved.expires_at)<Date.now()) fail('모험이 종료되었어요. 다시 시작해 주세요.',410);
   let state=saved.state,value:any;
   if(solo) {
    if(state.userId!==userId) fail('내 모험에서만 답을 제출할 수 있어요.',403);
    if(typeof data.requestId!=='string'||data.requestId.length>100) fail('제출 번호를 확인해 주세요.');
    if(state.hits>=5) {
     checked(await service.from('learning_records').upsert({user_id:userId,exercise_id:data.exerciseId,type:state.type,correct:5,attempts:state.attempts},{onConflict:'exercise_id',ignoreDuplicates:true}));
     return reply(state.last?.value||{correct:true,complete:true});
    }
    if(state.last?.id===data.requestId) return reply(state.last.value);
    if(data.questionId!==state.q.id) fail('이미 푼 문제예요. 새 모험을 시작해 주세요.',409);
    if(!Number.isSafeInteger(data.answer)||!Number.isSafeInteger(data.remainder)) fail('숫자로 답을 입력해 주세요.');
    state.attempts++;
    if(state.attempts>10000) fail('새 모험을 시작해 주세요.');
    const ok=correct(state.q,data.answer,data.remainder);
    if(ok) state.hits++;
    if(ok&&state.hits<5) state.q=nextQuestion(state.type);
    value={correct:ok,complete:state.hits>=5,question:state.hits<5?safe(state.q):null};
    state.last={id:data.requestId,value};
   } else {
    const engine=createEngine(state); value=engine.run(roomAction,data,userId); state=engine.dump();
    if(roomAction==='state') return reply(value);
   }
   const updated=checked(await service.from('monster_state').update({state,version:saved.version+1}).eq('id',id).eq('version',saved.version).select('id'));
   if(!updated.length) continue;
   if(solo&&value.complete) checked(await service.from('learning_records').upsert({user_id:userId,exercise_id:data.exerciseId,type:state.type,correct:5,attempts:state.attempts},{onConflict:'exercise_id',ignoreDuplicates:true}));
   if(!solo&&roomAction==='end') checked(await service.from('monster_state').delete().eq('id',id));
   return reply(value);
  }
  fail('다른 제출을 처리 중이에요. 다시 눌러 주세요.',409);
 } catch(error:any) {
  if(!error.status) console.error('Monster backend failure',error.code||'internal');
  return reply({error:error.status?error.message:'처리하지 못했어요. 잠시 후 다시 시도해 주세요.'},error.status||500);
 }
});
