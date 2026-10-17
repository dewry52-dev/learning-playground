import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,setPersistence,browserSessionPersistence} from 'firebase/auth';
import {getFirestore,collection,doc,getDoc,query,orderBy,limit,onSnapshot,setDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
import {firebaseConfig} from './firebase-config.js';
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app,'diary');
await setPersistence(auth,browserSessionPersistence);
const $=id=>document.getElementById(id),moods={happy:'😊',calm:'🌿',excited:'✨',sad:'🌧️',tired:'🌙'};
let user=null,entries=[],selected=null,dirty=false,busy=false,stop=null,generation=0;
const today=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`};
const status=message=>{$('status').textContent=message};
const canLeave=()=>!busy&&(!dirty||confirm('저장하지 않은 내용이 있어요. 이동할까요?'));
function render(){
 const term=$('search').value.toLowerCase(),month=$('month').value;
 $('count').textContent=`${entries.length}장`;$('entries').replaceChildren();
 for(const entry of entries.filter(e=>(e.title+' '+e.body).toLowerCase().includes(term)&&(!month||e.date.startsWith(month)))){
  const button=document.createElement('button');button.className='entry';button.type='button';button.setAttribute('aria-current',String(selected?.id===entry.id));
  const date=document.createElement('small'),title=document.createElement('strong'),preview=document.createElement('p');
  date.textContent=`${entry.date} ${moods[entry.mood]}`;title.textContent=entry.title;preview.textContent=entry.body;
  button.append(date,title,preview);button.onclick=()=>{if(canLeave())load(entry)};$('entries').append(button);
 }
}
function count(){$('letters').textContent=`${$('body').value.length.toLocaleString()}자`}
function load(entry){selected=entry||null;$('date').value=entry?.date||today();$('mood').value=entry?.mood||'happy';$('title').value=entry?.title||'';$('body').value=entry?.body||'';$('delete').hidden=!entry;$('mode').textContent=entry?'MY SAVED PAGE · 일기 수정':"TODAY'S PAGE · 새 일기";dirty=false;count();render()}
function lock(value){busy=value;for(const element of $('form').elements)element.disabled=value||!user;$('new').disabled=value||!user;$('logout').disabled=value}
$('login').onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider())}catch{status('로그인하지 못했어요. 팝업 허용과 인터넷 연결을 확인해 주세요.')}};
$('logout').onclick=async()=>{if(canLeave())try{await signOut(auth)}catch{status('로그아웃하지 못했어요. 다시 시도해 주세요.')}};
$('new').onclick=()=>{if(canLeave()){load(null);$('title').focus()}};
$('form').oninput=()=>{dirty=true;count();status('아직 저장하지 않았어요.')};
$('search').oninput=render;$('month').oninput=render;$('clear-filter').onclick=()=>{$('search').value='';$('month').value='';render()};
$('form').onsubmit=async event=>{
 event.preventDefault();if(!user||busy)return;
 const epoch=generation,uid=user.uid;
 const data=Object.fromEntries(['date','mood','title','body'].map(key=>[key,$(key).value.trim()]));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!Number.isFinite(Date.parse(data.date))||new Date(data.date).toISOString().slice(0,10)!==data.date||!data.title||!data.body){status('날짜와 내용을 확인해 주세요.');return}
 lock(true);status('나의 일기장에 저장 중…');
 try{
  const ref=selected?doc(db,'users',uid,'entries',selected.id):doc(collection(db,'users',uid,'entries'));
  const createdAt=selected?.createdAt||serverTimestamp();
  await setDoc(ref,{...data,createdAt,updatedAt:serverTimestamp()});
  const saved=await getDoc(ref);
  if(epoch!==generation)return;
  selected={id:ref.id,...saved.data()};dirty=false;$('delete').hidden=false;status('✓ 나의 일기장에 저장했어요.');
 }catch{if(epoch===generation)status('저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.')}
 finally{if(epoch===generation)lock(false)}
};
$('delete').onclick=async()=>{
 if(!user||!selected||busy||!confirm('이 일기를 삭제할까요? 삭제하면 되돌릴 수 없어요.'))return;
 const epoch=generation;lock(true);
 try{await deleteDoc(doc(db,'users',user.uid,'entries',selected.id));if(epoch===generation){load(null);status('일기를 삭제했어요.')}}
 catch{status('삭제하지 못했어요. 다시 시도해 주세요.')}
 finally{if(epoch===generation)lock(false)}
};
onAuthStateChanged(auth,next=>{
 generation++;stop?.();user=next;entries=[];selected=null;dirty=false;busy=false;
 $('search').value='';$('month').value='';load(null);lock(false);
 $('login').hidden=!!user;$('logout').hidden=!user;$('account').textContent=user?'Google 계정으로 연결됐어요':'Google 계정으로 로그인해 주세요';
 if(!user){status('로그인하면 본인의 일기만 읽고 쓸 수 있어요.');return}
 const epoch=generation;
 // Realtime snapshots are required for edits from another tab/device.
 stop=onSnapshot(query(collection(db,'users',user.uid,'entries'),orderBy('date','desc'),limit(500)),snapshot=>{
  if(epoch!==generation)return;
  entries=snapshot.docs.map(document=>({id:document.id,...document.data()}));
  if(selected&&!dirty){const current=entries.find(e=>e.id===selected.id);if(current)selected=current;}
  render();
 },()=>status('일기를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'));
 status('최근 일기 최대 500장을 보여 줘요. 공용 기기에서는 사용 후 로그아웃하세요.');
});
window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue=''}});
load(null);lock(false);
