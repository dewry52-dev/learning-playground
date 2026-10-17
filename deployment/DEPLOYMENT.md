# 배포 구성

- GitHub Pages: `node scripts/build-pages.cjs` 출력만 배포. 허브·약수/배수·브라우저 PDF 도구 포함. DB·일기·Node 서버 소스 제외.
- Firebase: `deployment/diary/`의 Google 로그인 일기장. 프로젝트 `classroom-diary-dewry52`, 서울 Firestore `diary`. 사용자 UID별 일기 경로에 접근 규칙 적용. 로컬 SQLite 기록은 자동 업로드하지 않음.
- Supabase: `monster-math/backend/schema.sql`, `index.ts`, `engine.mjs`, `math.mjs`. 로그인·가입과 서버 정답 판정·학습 기록·협동방 보관. 비밀번호는 Supabase Auth에서 해시 저장. 프런트엔드에는 publishable key만 사용.
- Vercel: `monster-math/`에서 `node build.cjs`. 허용된 정적 파일만 `dist/`에 복사.

몬스터 게임은 영문/숫자/밑줄 3~20자 아이디와 8자 이상 비밀번호를 사용합니다. 이메일 주소를 수집하지 않습니다. 담당 교사는 Supabase 프로젝트의 Authentication 사용자 관리에서 해당 아이디의 내부 계정(`아이디@monster.students.invalid`)을 확인해 비밀번호를 재설정하고 세션을 종료합니다. 학생에게 관리자 키를 전달하지 마세요.

로그인 세션은 공용 기기를 고려해 몬스터 게임은 메모리, 일기장은 탭 세션 범위로 유지합니다. 새로고침 후 몬스터 게임은 다시 로그인해야 하며 학습 기록은 서버에 남습니다.

Firebase 보안 규칙은 소유자 구분·필드/길이/시간 검증을 위한 초안입니다. 광범위하게 공유하기 전 계정 간 접근 차단 테스트 결과를 확인해야 합니다.
