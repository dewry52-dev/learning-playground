(() => {
  const config = window.MONSTER_CLOUD;
  let accessToken = null;
  let currentUser = null;
  const account = document.createElement('section');
  account.className = 'account-bar';
  account.setAttribute('aria-label', '내 계정');
  document.body.prepend(account);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function request(action, data = {}) {
    if (!config) throw Error('온라인 서비스를 준비하고 있어요.');
    const response = await fetch(config.endpoint, {method:'POST',headers:{'Content-Type':'application/json',apikey:config.publishableKey,...(accessToken ? {Authorization:`Bearer ${accessToken}`} : {})},body:JSON.stringify({action,...data}),signal:AbortSignal.timeout(15000)});
    const value = await response.json();
    if (!response.ok) {
      if(response.status===401&&accessToken){accessToken=null;currentUser=null;paint();window.dispatchEvent(new Event('monster-account-change'));}
      throw Error(value.error || '연결을 확인해 주세요.');
    }
    return value;
  }
  function paint() {
    account.innerHTML = currentUser
      ? `<span>${escape(currentUser)} · 나의 모험</span><button type="button" id="account-history">내 학습 기록</button><button type="button" id="account-logout">로그아웃</button><a href="https://dewry52-dev.github.io/learning-playground/">교실 도구 허브 ↗</a><p id="account-message" role="status"></p>`
      : `<form id="account-form"><label>아이디<input name="username" required pattern="[A-Za-z0-9_]{3,20}" minlength="3" maxlength="20" autocomplete="username" placeholder="영문·숫자·밑줄 3~20자"></label><label>비밀번호<input name="password" type="password" required minlength="8" maxlength="72" autocomplete="current-password" placeholder="8자 이상"></label><button name="action" value="login">로그인</button><button name="action" value="signup">가입하기</button></form><p>실명 대신 별명을 사용해요. 비밀번호를 잊었다면 담당 교사에게 문의하세요.</p><p id="account-message" role="status">${config ? '공용 기기에서는 사용 후 로그아웃하세요.' : '현재는 로컬 모드예요. 온라인 가입은 배포 후 사용할 수 있어요.'}</p>`;
    if (!currentUser) document.querySelector('#account-form').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const username = form.elements.username.value.trim().toLowerCase();
      const password = form.elements.password.value;
      const action = event.submitter?.value || 'login';
      const buttons = form.querySelectorAll('button');
      buttons.forEach(button => button.disabled = true);
      try {
        const value = await request(action, {username,password});
        accessToken = value.access_token;
        currentUser = username;
        form.reset();
        paint();
        window.dispatchEvent(new Event('monster-account-change'));
      } catch (error) { document.querySelector('#account-message').textContent = error.message; }
      finally { buttons.forEach(button => button.disabled = false); }
    };
    else {
      document.querySelector('#account-logout').onclick = async () => {
        try { await request('logout'); } catch {}
        accessToken = null; currentUser = null; paint();
        window.dispatchEvent(new Event('monster-account-change'));
        location.reload();
      };
      document.querySelector('#account-history').onclick = async () => {
        const message = document.querySelector('#account-message');
        message.textContent = '학습 기록을 불러오고 있어요…';
        try {
          const {records} = await request('history');
          message.replaceChildren();
          if (!records.length) { message.textContent = '아직 기록이 없어요. 개인 모험을 시작해 볼까요?'; return; }
          const list = document.createElement('ul');
          for (const record of records) {
            const item = document.createElement('li');
            const typeName = TYPES.find(type=>type[0]===record.type)?.[1] || '계산 연습';
            item.textContent = `${new Date(record.completed_at).toLocaleString('ko-KR')} · ${typeName} · 정답 ${record.correct}개 / 시도 ${record.attempts}번`;
            list.append(item);
          }
          message.append(list);
        } catch (error) { message.textContent = error.message; }
      };
    }
  }
  window.monsterAccount = {request,get signedIn(){return !!accessToken},get online(){return !!config}};
  paint();
})();
