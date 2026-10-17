# 배움 팝! · 학습 연수 프로젝트

학생용 학습 도구와 수학 게임을 담은 로컬 실행 프로젝트입니다.

## 온라인 서비스

- 일기장: https://classroom-diary-dewry52.web.app — Google 로그인, 계정별 비공개 일기
- 몬스터 수학 게임: https://monster-math-dewry52.vercel.app — 아이디 가입, 서버 채점, 학습 기록
- 허브와 약수·배수 게임: GitHub Pages 배포 워크플로는 `.github/workflows/pages.yml`입니다.

배포 구성과 교사용 계정 복구 안내는 [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md)를 참고하세요.

- `math-gallery/`: 약수·배수 게임, PDF 글자 수 세기, 로컬 일기장
- `monster-math/`: 초등 3학년 곱셈·나눗셈 개인 및 협동 게임

## 실행

Node.js 24 이상을 설치한 뒤 각 폴더에서 실행합니다. 기본 실행에는 추가 패키지가 필요하지 않습니다.

```sh
cd math-gallery
node server.cjs
```

학습 놀이터: http://127.0.0.1:5180/

```sh
cd monster-math
node server.cjs
```

몬스터 수학 게임: http://127.0.0.1:5193/

각 앱의 README에서 기능과 검증 방법을 확인하세요. 소스 공개와 인터넷 서비스 운영은 별개입니다. 서버는 로컬 PC에만 연결합니다.

## 데이터와 보안

실제 일기 데이터, 개인 작업 문서, 임시 도구, 환경변수 및 자격증명 파일은 공개 대상에서 제외했습니다. 일기장은 실행 시 `math-gallery/data/`에 SQLite 파일을 생성합니다. 이 폴더를 업로드하지 마세요.

보안 검토 범위와 운영 제한은 [SECURITY.md](SECURITY.md)를 참고하세요.

PDF.js와 CMap의 원래 라이선스는 `math-gallery/pdf-counter/vendor/`에 보존되어 있습니다.
