import {getDocument,GlobalWorkerOptions} from './vendor/pdf.mjs';
import {countText,pageText} from './count.mjs';
GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
const $=id=>document.getElementById(id);
let generation=0, task=null;
async function clear() {
  generation++;
  const clearedGeneration=generation;
  const previous=task; task=null;
  $('file').value=''; $('result').hidden=true; $('progress').hidden=true;
  $('rows').replaceChildren(); $('text').textContent=''; $('filename').textContent=''; $('warning').textContent='';
  for(const id of ['with-space','without-space','pages']) $(id).textContent='0';
  $('status').textContent='파일과 결과를 지웠어요. 새 PDF를 선택해 주세요.';
  if(previous) await previous.destroy().catch(()=>{});
  return clearedGeneration;
}
async function analyze(file) {
  const current=await clear(); if(current!==generation)return;
  if(!file) return;
  if(!/\.pdf$/i.test(file.name) && file.type!=='application/pdf') { $('status').textContent='PDF 파일을 선택해 주세요.'; return; }
  if(file.size>50*1024*1024) { $('status').textContent='50MB 이하의 PDF를 선택해 주세요.'; return; }
  let localTask;
  try {
    $('status').textContent='PDF를 이 브라우저 안에서 여는 중이에요…';
    const data=new Uint8Array(await file.arrayBuffer()); if(current!==generation)return;
    localTask=getDocument({data,cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href,cMapPacked:true,isEvalSupported:false,disableFontFace:true,useSystemFonts:true,useWasm:false,verbosity:0}); task=localTask;
    const pdf=await localTask.promise; if(current!==generation)return;
    const rows=[],texts=[],empty=[]; let withSpace=0,withoutSpace=0;
    $('progress').hidden=false; $('progress').max=pdf.numPages; $('progress').value=0;
    for(let n=1;n<=pdf.numPages;n++) {
      if(current!==generation)return;
      $('status').textContent=`${pdf.numPages}쪽 중 ${n}쪽 분석 중…`;
      const page=await pdf.getPage(n), content=await page.getTextContent();
      if(current!==generation)return;
      const text=pageText(content.items), counts=countText(text); page.cleanup();
      texts.push(text); if(!counts.withoutSpace)empty.push(n);
      withSpace+=counts.withSpace; withoutSpace+=counts.withoutSpace;
      const tr=document.createElement('tr');
      for(const value of [n,counts.withSpace,counts.withoutSpace]) { const td=document.createElement('td');td.textContent=value.toLocaleString('ko-KR');tr.append(td); } rows.push(tr);
      $('progress').value=n;
    }
    $('filename').textContent=file.name;
    $('with-space').textContent=withSpace.toLocaleString('ko-KR'); $('without-space').textContent=withoutSpace.toLocaleString('ko-KR'); $('pages').textContent=pdf.numPages.toLocaleString('ko-KR');
    $('rows').replaceChildren(...rows); $('text').textContent=texts.map((text,i)=>`[${i+1}쪽]\n${text}`).join('\n\n');
    $('warning').textContent=empty.length ? `${empty.length}개 페이지에서 글자를 추출하지 못했어요. 스캔·빈 페이지일 수 있어요. 위 수치는 추출된 글자만 집계한 결과입니다.` : '';
    $('result').hidden=false; $('progress').hidden=true; $('status').textContent='완료! 파일과 결과는 서버에 전송되지 않았어요.';
  } catch(error) {
    if(current!==generation)return;
    $('progress').hidden=true;
    $('status').textContent=error.name==='PasswordException' ? '암호가 설정된 PDF예요. 컴퓨터에서 암호를 해제한 사본을 선택해 주세요.' : 'PDF를 읽지 못했어요. 파일이 손상되었거나 지원되지 않는 형식일 수 있어요. 다른 PDF를 선택해 주세요.';
  } finally { if(localTask)await localTask.destroy().catch(()=>{}); if(task===localTask)task=null; }
}
$('file').addEventListener('change',event=>analyze(event.target.files[0]));
$('clear').addEventListener('click',clear);
for(const type of ['dragover','drop']) document.addEventListener(type,event=>event.preventDefault());
$('drop').addEventListener('dragover',()=>$('drop').classList.add('dragging'));
$('drop').addEventListener('dragleave',()=>$('drop').classList.remove('dragging'));
$('drop').addEventListener('drop',event=>{ $('drop').classList.remove('dragging'); if(event.dataTransfer.files.length!==1){$('status').textContent='PDF를 한 번에 하나씩 놓아 주세요.';return;}analyze(event.dataTransfer.files[0]); });
window.addEventListener('pagehide',()=>{void clear();});
