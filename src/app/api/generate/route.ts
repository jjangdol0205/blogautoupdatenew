import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({});

export const maxDuration = 60; // Vercel 서버리스 함수 타임아웃 최대 연장

export async function POST(req: Request) {
  try {
    const { keyword, deviceType = 'desktop', category = 'general', goodUrl = "", badUrl = "" } = await req.json();

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    // 1. [SEO 전략] 네이버 검색광고 API를 사용해 메인 키워드에 대한 연관 서브 키워드 4개 추출
    let subKeywordsText = "";
    try {
      const customerId = process.env.NAVER_AD_CUSTOMER_ID;
      const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
      const secretKey = process.env.NAVER_AD_SECRET_KEY;
      
      if (customerId && accessLicense && secretKey && keyword.trim().length > 0) {
        const crypto = require('crypto');
        const timestamp = Date.now().toString();
        const method = "GET";
        const path = "/keywordstool";
        const signature = crypto.createHmac("sha256", secretKey).update(`${timestamp}.${method}.${path}`).digest("base64");
        
        // 메인 키워드(최대 5단어 조합 가능) 중 첫 단어로 연관검색어 조회
        const seedKw = keyword.trim().split(' ')[0];
        const apiUrl = `https://api.naver.com${path}?hintKeywords=${encodeURIComponent(seedKw)}&showDetail=1`;
        
        const res = await fetch(apiUrl, {
          method: "GET",
          headers: { 'X-Timestamp': timestamp, 'X-API-KEY': accessLicense, 'X-Customer': customerId, 'X-Signature': signature }
        });
        
        if (res.ok) {
          const data = await res.json();
          const list = data.keywordList || [];
          // 입력한 키워드와 정확히 일치하는 것은 제외, 모바일 검색량 순 정렬
          const filtered = list.filter((k: any) => k.relKeyword !== seedKw);
          filtered.sort((a: any, b: any) => parseInt(b.monthlyMobileQcCnt || "0") - parseInt(a.monthlyMobileQcCnt || "0"));
          
          const topSubKw = filtered.slice(0, 4).map((k: any) => k.relKeyword);
          if (topSubKw.length > 0) {
            subKeywordsText = `
[네이버 스마트블록 & 상위노출 필수 조건]
블로그 텍스트 정보량을 풍부하게 만들기 위해, 다음 4개의 <연관(서브) 키워드>를 포스팅 본문에 아주 자연스럽게 1~2회씩 무조건 섞어서 작성하세요. 
서브 키워드: ${topSubKw.join(', ')}
독자가 어색함을 느끼지 못하도록 진짜 정보인 것처럼 녹여내야 최적화 블로그 점수를 받습니다.`;
          }
        }
      }
    } catch (e) {
      console.warn("Sub-keywords fetch failed, proceeding without them", e);
    }

    const keywordGuidance = "추상적인 개념일 경우 서양인 사무실 사진이 나오지 않도록 시각적으로 직관적이고 상징적인 사물/풍경 '한글 단어'를 명사형태로 선택하세요.";

    const translatePrompt = `당신은 검색어에서 가장 핵심적이고 시각적인 이미지를 추출하는 프롬프트 엔지니어입니다. 
    사용자가 입력한 검색어에 가장 찰떡같이 어울리는 고품질 사진을 찾기 위해, 명확한 단어를 추출하세요.
    ${keywordGuidance}

    1. primary: 검색어를 가장 잘 표현하는 구체적이고 감각적인 한글 단어 1~2개
    2. fallback: primary 검색 실패 시 사용할, 검색어의 상위 카테고리에 해당하는 매우 포괄적이고 중립적인 한글 단어 1~2개
    3. englishSubject: 이 주제를 그림으로 그릴 때 메인 피사체가 될 만한 구체적인 영단어 2~3개
    
    [🔥 초강력 어그로/후킹 썸네일 문구 작성 지침 🔥]
    4, 5, 6번 썸네일 문구는 네이버 메인 홈판에서 무조건 클릭하고 싶게 만드는 도발적인 극한의 카피라이팅이어야 합니다.
    4. thumbnailTop: 상단 해시태그용 어그로 문구 (예: #안보면손해 #수백만원절약 #1퍼센트만아는비밀) - 띄어쓰기 없이 해시태그로 3개 작성 (15자 이내)
    5. thumbnailMid: 썸네일 중앙 핵심 주제 (예: 청년미래적금, 숨은 정부지원금, 블로그 수익화) - 8자 이내 명사형태
    6. thumbnailBottom: 손실 회피 및 호기심을 극도로 자극하는 하단 문구 (예: 지금 당장 신청하세요!, 99%가 놓치는 꿀팁, 모르면 평생 후회) - 13자 이내
    
    예시:
    "블로그 썸네일 만들기" -> {"primary": "디자인", "fallback": "컴퓨터", "englishSubject": "designing on computer", "thumbnailTop": "#조회수폭발 #인플루언서비밀", "thumbnailMid": "썸네일 꿀팁", "thumbnailBottom": "안 보면 무조건 손해!"}
    "삼성전자 주가방향" -> {"primary": "주식 차트", "fallback": "금융", "englishSubject": "stock market chart rising", "thumbnailTop": "#개미투자자 #무조건필독", "thumbnailMid": "삼성전자 주가", "thumbnailBottom": "지금이 마지막 기회일까?"}

    반드시 아래 JSON 형식으로만 응답하세요. 다른 문장 부호나 설명은 절대 붙이지 마세요.
    {"primary": "...", "fallback": "...", "englishSubject": "...", "thumbnailTop": "...", "thumbnailMid": "...", "thumbnailBottom": "..."}
    
    사용자 검색어: ${keyword}`;

    const transRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: translatePrompt,
      config: { temperature: 0.1, responseMimeType: "application/json" },
    });
    
    let searchParams = { primary: "사무실", fallback: "비즈니스", englishSubject: "office desktop", thumbnailTop: "오늘의 핵심 정보", thumbnailMid: keyword || "핵심 요약", thumbnailBottom: "지금 바로 확인!" };
    try {
      const jsonStr = transRes.text?.trim() || "{}";
      const cleanedJsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      searchParams = JSON.parse(cleanedJsonStr);
    } catch (e) {
      console.warn("Failed to parse translate response, using fallback", e);
    }

    const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
    let imageUrls: string[] = [];
    
    if (PIXABAY_API_KEY) {
      try {
        const fetchImages = async (query: string, limit: number) => {
          const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=15`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.hits && data.hits.length > 0) {
            return data.hits.sort(() => 0.5 - Math.random()).slice(0, limit).map((hit: any) => hit.webformatURL);
          }
          return [];
        };

        // 1. primary 검색
        let foundImages = await fetchImages(searchParams.primary, 4);
        
        // 2. 만약 primary 결과가 부족하면 fallback으로 보충
        if (foundImages.length < 4) {
             const fallbackImages = await fetchImages(searchParams.fallback, 4 - foundImages.length);
             foundImages = [...foundImages, ...fallbackImages];
        }
        
        // 3. 그래도 부족하면 완전 기본 키워드로 보충
        if (foundImages.length < 4) {
             const safeFallback = 'nature';
             const safeImages = await fetchImages(safeFallback, 4 - foundImages.length);
             foundImages = [...foundImages, ...safeImages];
        }

        imageUrls = foundImages;
      } catch (e) {
        console.error("Pixabay fetch error:", e);
      }
    }

    let personaGuidance = `
당신은 한국 네이버 블로그 생태계를 완벽하게 파악하고 있는 최고의 '전문가 블로거'이자 친근한 이웃입니다.
최근 조회수가 폭발하는 상위노출 블로그들의 패턴을 완벽히 흡수하여 아래의 [블로그 톤앤매너 및 필수 작성 가이드]를 엄격하게 지켜 작성하세요.

[블로그 톤앤매너 및 필수 작성 가이드]
1. 도입부 (초강력 FOMO 자극 및 공감 훅 - 가장 중요!!):
   - 글 시작 부분에서 독자의 불안감이나 결핍(FOMO)을 강력하게 자극하며 시작하세요. 
   - [필수 예시 멘트]: "혹시 지금 'OOO' 검색해보고 불안한 마음에 클릭하셨나요?", "나만 또 이런 꿀정보를 놓칠까 봐, 조급한 마음 제가 다 압니다."
   - "이 글 하나만 제대로 읽으시면, 엄한 곳에서 시간 낭비하며 후회하는 일은 절대 없을 겁니다. 단 5분만 투자해서 모두 챙겨가세요!" 와 같이 독자를 안심시키고 체류시간을 극대화하는 멘트를 반드시 포함하세요.

2. 페르소나 (압도적 전문가 + 친근한 이웃):
   - 독자를 "여러분" 혹은 "이웃님들"로 친근하게 부르며, "제가 다 압니다", "정신 바짝 차리고 따라오세요!" 같은 구어체(~해요, ~입니다)를 적극 사용하세요.
   - 정보는 두루뭉술하게 적지 말고, 반드시 [구체적인 숫자, 비교 비용 절감액 등]을 명시하여 압도적인 신뢰감을 주어야 합니다.

3. 본문 구조 (목차형 구조 및 시각적 기호 필수):
   - 긴 글은 반드시 2~3줄 단위로 짧게 쪼개어 가독성을 높입니다.
   - 소제목에는 반드시 시각적 기호(📌, ✅, ✔️ 등)를 사용하고 번호를 매기세요.
   - [필수 삽입 섹션]: 본문 후반부에 반드시 "💡 [상위 1%만 아는 가입/활용 꿀팁 (이거 모르면 손해)]" 라는 소제목을 만들어 남들이 모르는 핵심 노하우를 2~3가지 방출하세요.

4. 결론 (핵심 요약 및 행동 촉구 - CTA):
   - 포스팅 맨 마지막에는 반드시 "✨ 오늘 내용 핵심 요약 정리! ✨"라는 소제목으로 가장 중요한 정보 3~5가지를 번호를 매겨 깔끔하게 요약하세요.
   - "궁금한 점이 있다면 주저 말고 댓글 남겨주세요! 제가 아는 선에서 최대한 자세하게 답변해 드릴게요!" 라며 독자의 댓글 참여를 유도하며 마무리하세요.
   - 해시태그 규칙: 맨 아래에 태그 목록을 #전문가컬럼 #정보성블로그 등 검색어와 매칭하여 스페이스로 구분해 5~7개 적어주세요.
`;

    if (category === 'sports') {
        personaGuidance = `
당신은 한국 최고의 '프로 스포츠 특화 분석 전문 리뷰어'입니다.
유튜브 하이라이트 리뷰보다 더 날카롭고 유머러스하며, 해당 스포츠의 딥팬(골수팬)들이 열광하는 통찰력 넘치는 분석가 톤(~다, ~했다 등 단호하고 명쾌한 평론가체)을 유지하세요.
절대로 뻔하고 얌전한 블로그 톤이 아니라 직설적이고 통찰력있는 전문가다운 톤이어야 합니다.

[블로그 톤앤매너 및 필수 작성 가이드 (스포츠 리뷰 특화)]
1. 반드시 글의 맨 최상단(도입부)에는 이 매치업의 [최종 경기 결과(스코어보드)]를 시각적으로 가장 먼저, 누구나 한눈에 알기 쉽게 강조하여 배치하세요. (예: "결과: 팀A 0 : 0 팀B")
2. 전체적인 글의 템플릿 구조는 아래와 같은 '전문가 리뷰 5단계 포맷'을 따르되, 각각의 소제목 이름은 매 포스팅마다 그날 경기 내용에 녹아들도록 센스있게 창작(변형)하세요. (맹목적인 단어 반복 금지)
   - 서본: 매치업 결과 스코어 직후, 경기에 대한 강력한 [전문가 한 줄 평] 작성
   - 본문 1장: 경기 초/중/후반의 전반적인 [흐름 통찰 및 요약]
   - 본문 2장: 승부의 향방을 완전히 가른 치명적인 2~3가지의 [결정적 장면(승부처) 해설]
   - 본문 3장: 단순 득점을 넘어 딥팬들이 볼 만한 [핵심 데이터 및 세부 지표 분석]
   - 본문 4장: 오늘의 [최고의 수훈 선수(MVP)]와 [역적/워스트 선수]를 지목하고 이유를 직설적으로 평가
   - 본문 5장: 데이터에 기반한 다음 매치업 [전망 및 총평]
3. 분석 수준은 표면적인 기사 요약을 넘어 굉장히 딥(Deep)해야 합니다. "에러 라인업", "공짜 출루를 헌납", "볼넷 파티로 자멸", "스노우볼이 굴러갔다", "마운드가 불탔다"와 같은 커뮤니티 골수팬들의 은어를 최대한 자연스럽게 하나 이상은 반드시 녹여내어 글의 감칠맛을 폭발시키세요.
4. 소제목과 본문 내 중요한 단어(선수 이름, 중요 기록, 핵심 승부처 등)는 반드시 컬러 하이라이트(<span style="color:#00c73c;">)나 볼드체(<b>)를 적극적으로 활용해, 텍스트 벽처럼 보이지 않게 눈에 확 띄도록 꾸며주세요.
`;
    } else if (category === 'finance') {
        personaGuidance = `
당신은 한국 최고의 '글로벌 경제/증시 이슈 분석 전문 리뷰어'입니다.
월스트리트저널, 블룸버그 등 외신 기사를 날카롭게 해체하고, 월가 트레이더나 경제 딥팬들이 열광하는 통찰력 넘치는 분석가 톤(~다, ~했다 등 단호하고 명쾌한 평론가체)을 유지하세요.
절대로 뻔하고 얌전한 교과서적인 경제 블로그 톤이 아니라 직설적이고 인사이트가 넘치는 전문가다운 톤이어야 합니다.

[블로그 톤앤매너 및 필수 작성 가이드 (경제/국제 리뷰 특화)]
1. 도입부 (시선 집중 및 FOMO 훅 필수): 
   - 독자의 불안감과 결핍을 찌르면서 시작하세요. "혹시 지금 'OOO' 관련 뉴스 보고 내 주식/계좌 어떻게 될지 불안해서 클릭하셨나요? 정신 바짝 차리고 따라오세요. 이 글 하나만 제대로 읽으시면 막대한 손실을 피할 수 있습니다." 와 같은 친근하면서도 강력한 어그로성 도입부를 작성하여 체류시간을 폭발시키세요.
   - 도입부 직후에 이 이슈가 시장에 미치는 [핵심 영향력 요약(증시 향방, 환율, 관련주 등)]을 시각적으로 가장 먼저, 누구나 한눈에 알기 쉽게 강조하여 배치하세요.
2. 전체적인 글의 템플릿 구조는 아래와 같은 '전문가 리뷰 5단계 포맷'을 따르되, 각각의 소제목 이름은 매 포스팅마다 그날 경제 이슈에 녹아들도록 센스있게 창작(변형)하세요. (맹목적인 단어 반복 금지)
   - 서본: 핵심 영향력 요약 직후, 해당 뉴스/이슈에 대한 강력한 [전문가 한 줄 평] 작성
   - 본문 1장: 이슈의 발생 배경 및 시장 반응 [흐름 통찰 및 요약]
   - 본문 2장: 사건의 향방을 완전히 가른 치명적인 2~3가지의 [결정적 팩트체크 및 숨은 의도 해설]
   - 본문 3장: 단순 기사 요약을 넘어 기관투자자들이 볼 만한 [핵심 데이터 및 세부 거시/미시 지표 분석]
   - 본문 4장: 오늘의 파급력 높은 [최고 수혜자/수혜주]와 [최대 피해자/피해 섹터]를 지목하고 이유를 직설적으로 평가
   - 본문 5장: 데이터에 기반한 향후 시장 [전망 및 포트폴리오 대응 전략 총평]
3. 분석 수준은 표면적인 기사 요약을 넘어 굉장히 딥(Deep)해야 합니다. "빅컷", "매파적 스탠스", "숏 스퀴즈", "개미털기", "안전자산 쏠림"과 같은 월스트리트/여의도 투자자들의 은어와 전문 용어를 최대한 자연스럽게 하나 이상은 반드시 녹여내어 글의 감칠맛을 폭발시키세요.
4. 소제목과 본문 내 중요한 단어(정치인/인물 이름, 금리 수치, 퍼센트, 기업명 등)는 반드시 컬러 하이라이트(<span style="color:#00c73c;">)나 볼드체(<b>)를 적극적으로 활용해, 텍스트 벽처럼 보이지 않게 눈에 확 띄도록 꾸며주세요.
`;
    }


    const currentYear = new Date().getFullYear();

    let visualGuidance = "";
    if (deviceType === 'mobile') {
        visualGuidance = `
3. 시각적 요소 및 썸네일 구조 (모바일 앱 전용 - 매우 중요!!):
   - 블로그 원본의 필수 레이아웃은 무조건 '대제목 -> 가벼운 인사말 -> [썸네일 이미지] -> 본격적인 본문 내용' 순서여야 합니다. 
   - 따라서 인사말이 끝나는 서론 직후에 반드시 [THUMBNAIL] 이라는 예약어를 단 1번 작성하세요.
   - 네이버 블로그 앱은 외부 사진 복사를 차단하므로 보조 사진 배치 명령어([IMAGE_1] 등)는 생략합니다.

4. 모바일 화면 최적화: 극강의 가독성 및 띄어쓰기 원칙 (가장 기본 HTML 태그와 인라인 컬러만 허용):
   - 네이버 블로그 앱은 복잡한 구조(표, 박스 등)를 부숴버리지만 **단순 글자색과 줄바꿈은 유지**합니다.
   - 따라서 전체 본문을 **오직 <p>, <br>, <b>, <span style="color:색상">** 태그만으로 작성하세요. 
   - <h2>, <h3>, <blockquote>, <table>, <ul>, <li> 등은 복사 시 박살나므로 일절 금지! **마크다운 기호(*, #, - 등)**도 앱에서 깨지므로 **절대 금지**합니다.
   
   - **소제목 구분 및 간격:** 
     소제목은 위/아래로 딱 한 칸 줄바꿈(<br>)만 허용합니다. 빈 줄이 뻥 뚫려 보이는 두 줄 띄어쓰기(<br><br> 또는 <p><br></p>)는 절대 금지합니다.
     올바른 형태 예시:
     <br>
     <p><b>📌 [1. 소제목 이름]</b></p>
     <br>
     <p>내용을 이어서 작성합니다...</p>
   
   - **자연스러운 여백 및 1줄 띄어쓰기 (두 줄 띄어쓰기 절대 금지):** 
     문단과 문단 사이, 또는 문장 사이에 빈 줄이 아예 없도록 **딱 한 번만 줄바꿈(<br>)** 하세요. 
     스마트폰 화면에서 텅 비어 보이지 않게, <br><br>나 <p><br></p> 같은 '두 줄 띄어쓰기'는 절대 피하고 촘촘하게 작성하세요.
   
   - **핵심 포인트 색상 강조:** 가독성을 끌어올리기 위해, 제품명이나 장점 등 중요 포인트에는 <span style="color: #00c73c;">...</span> 나 다른 눈에 띄는 색상을 무조건 적극적으로 사용해서 화사하게 꾸며주세요.`;
    } else {
        visualGuidance = `
3. 시각적 요소 및 썸네일 구조 (매우 중요!!):
   - 블로그 원본의 필수 레이아웃은 무조건 '대제목 -> 가벼운 인사말 -> [썸네일 이미지] -> 본격적인 본문 내용' 순서여야 합니다. 
   - 따라서 인사말이 끝나는 서론 직후에 반드시 [THUMBNAIL] 이라는 예약어를 단 1번 작성하세요.
   - 본문 중간중간 글의 문맥과 흐름이 자연스럽게 전환되는 곳에 사진을 최대 3장까지 적절히 거리를 두고 배치하기 위해 [IMAGE_1], [IMAGE_2], [IMAGE_3] 예약어를 삽입하세요.
   - 절대 <img> 태그 등을 임의로 사용하지 말고 오직 위 텍스트 예약어만 넣어야 합니다.

4. 가독성을 극대화하는 세련된 구조 (마크다운 절대 금지, 100% HTML 태그 작성):
   - **문단 길이 및 줄바꿈:** 2~3문장마다 반드시 문단을 나누고, 본문의 모든 일반 텍스트는 <p style='font-size: 16px; line-height: 1.8; margin-bottom: 26px; color: #333; letter-spacing: -0.5px;'>...</p> 태그로 감싸서 아주 읽기 편하게 만드세요.
   - **표(Table) 작성 규칙:** 마크다운 문법( |---| )은 화면이 깨지므로 절대 쓰지 마세요!! 표가 필요할 때는 반드시 HTML <table> <tr> <th> <td> 태그를 사용하고, style 속성으로 테두리(border: 1px solid #ddd; border-collapse: collapse; padding: 12px; text-align: left;)를 명시하세요. <th>에는 배경색(background-color: #f8f9fa;)도 넣으세요.
   - **소제목 계층화 (필수):** 대주제와 소주제는 글의 흐름이 자연스럽게 이어지도록 직관적으로 작성하고(번호 포함 가능), 아래의 세련된 인라인 스타일을 정확히 복사해서 사용하세요.
     ✅ 대주제 예시: <h2 style='font-size: 24px; font-weight: 800; color: #111; margin-top: 70px; margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #111;'>1. 대주제 타이틀</h2>
     ✅ 소주제 예시: <h3 style='font-size: 20px; font-weight: 700; color: #333; margin-top: 60px; margin-bottom: 20px; padding-left: 14px; border-left: 4px solid #00c73c;'>1.1. 소주제 타이틀</h3>
   - **리스트(List) 작성 규칙:** <ul> 태그에는 위아래 숨통을 트기 위해 반드시 <ul style='margin-top: 15px; margin-bottom: 35px; padding-left: 22px;'> 를 적용하세요. 그 안의 <li> 태그는 본문과 글씨 크기가 다르게 튀지 않도록 <li style='font-size: 16px; letter-spacing: -0.5px; margin-bottom: 15px; line-height: 1.8; color: #333;'> 처럼 폰트 사이즈와 여백을 명시하고, 핵심 단어는 <strong style='color: #00c73c;'> 태그로 강조하세요.
   - **중요**: HTML 태그에 속성을 넣을 때는 큰따옴표(") 대신 **반드시 홑따옴표(')**를 사용하세요.`;
    }

    const realTimeSeoGuidance = `
[네이버 상위노출 경쟁 분석 및 벤치마킹]
- 구글 검색 도구(Tools)를 활용하여 목표 키워드('${keyword}')로 작성된 최신 상위노출 글들이 어떤 흐름과 꿀팁을 다루는지 실시간으로 검색하고 분석하세요.
- 상단 랭커들이 언급한 핵심 정보(장단점, 가격, 꿀팁, 대기시간, 해결책 등)를 모두 포함하되, 그것을 복사하지 말고 본인만의 인사이트가 돋보이게 더 풍부하고 가독성 좋게 재구성해야만 1위에 오를 수 있습니다.
- 독자가 이 글 하나만 읽어도 블로그 5개를 찾아본 것과 같은 압도적인 가치를 얻도록 작성하세요.
${subKeywordsText}

[🚨 필수 적용: 메가 키워드 타겟팅 금지 및 카피라이팅 지침 🚨]
1. 제목([TITLE]) 생성 시 절대로 포괄적이고 뻔한 "~~~ 총정리!", "~~~ 완벽 정리!", "~~~ 초보자 필독!" 같은 인공지능이 쓴 티가 나는 제목은 피하세요. (조회수 폭망의 원흉입니다)
2. 만약 입력된 키워드('${keyword}')가 '장외주식거래', '여자트로트가수', '증권사 수수료' 와 같이 너무 거대한 경쟁 키워드라면, 통합검색 10페이지 밖으로 밀리지 않도록 **반드시 구체적인 플랫폼 이름, 행사 종류, 꿀팁 이름 등을 덧붙여서 세부 롱테일 주제로 좁혀야 합니다.**

[🔥 어그로 폭발: 클릭을 참을 수 없는 도발적 본문/제목 카피라이팅 지침 🔥]
3. 제목([TITLE]) 생성 시 무조건!! 사람들의 '손실 회피 심리(Loss Aversion)', '극적 호기심', '충격적 사실'을 자극하는 유튜브식 썸네일 어그로 작명법을 강력하게 사용하세요! 네이버 홈판에서 사람들의 손가락이 미끄러져서라도 클릭하게 만들어야 합니다.
   - 👎 [학습된 실패 사례(절대 금지)]: "2026 청년미래적금 조건 알아보기", "연말정산 환급금 조회 방법 완벽 정리" (이런 AI 특유의 얌전하고 정직한 제목은 최악의 조회수를 만듭니다.)
   - 👍 [지향해야 하는 성공 사례]: "안 받으면 수백만 원 손해? 2026 청년미래적금 99%가 놓치는 갈아타기 꿀팁", "내 월급에 이거 안 하면 바보? 중소기업 재직자 무조건 신청하세요", "세무사가 몰래 쓴다? 1%만 아는 OOO 절세 비법 확인"
4. 본문 도입부에서도 제목의 기대감을 받아주어, "이 글을 끝까지 안 읽으면 나만 바보가 될 것 같은 불안감"을 조성하며 몰입도를 300% 높이세요. 독자의 결핍(Pain Point)과 생생한 경험담(내돈내산 같은 톤)이 글에 강력하게 묻어나야 합니다.

[🚨 실존 데이터/팩트체크 및 할루시네이션(거짓정보) 방지 절대 규칙 🚨]
5. (가장 중요) 절대!!! 존재하지 않는 금융상품, 가상의 금리, 주가, 임의의 혜택 날짜나 금액을 상상해서(Hallucination) 지어내지 마세요. 거짓 정보를 생성하면 블로그가 영구 정지당하므로, 반드시 구글 검색을 통해 100% 검증된 사실만 작성하세요. 
   - 검색해도 정확한 숫자(예: 금리, 날짜)를 찾을 수 없다면 절대 지어내지 말고, "현재 기준 변동 가능성이 높으므로", "상세한 조건은 공식 홈페이지 참조 부탁드립니다"와 같이 우회하십시오.
6. 예/적금, 특판, 부동산 등을 추천/언급할 때는 "00신협", "○○은행"과 같이 가상의 블라인드 처리를 금지합니다. 실제로 찾은 정확한 지점명이나 명칭(예: "더뱅크신협 6% 특판")만 기입하십시오.
7. 글의 맨 마지막(결론 및 해시태그 바로 위)에는 반드시 아래의 '면책 조항' 텍스트를 정확히 그대로 추가하여 법적/운영적 책임 소지를 방지하세요.
   <br><br><p style='font-size: 13px; color: #888; text-align: center; line-height: 1.5;'>🚨 <b>[팩트체크/면책조항]</b><br>본 포스팅은 정보 공유를 목적으로 작성되었으며, 시장 상황, 정책 변경, 조기 마감 등에 따라 실제 내용이 다를 수 있습니다. 청약, 계약, 상품 가입 전 반드시 해당 기관/금융사 공식 채널에서 최종 확인하시기 바랍니다.</p>
`;

    let feedbackLearningGuidance = "";
    if (goodUrl || badUrl) {
      feedbackLearningGuidance += `
[개인화된 AI 강화 학습 지침 (매우 중요)]
사용자가 자신의 과거 블로그 포스팅 결과를 바탕으로 다음의 피드백 링크를 제공했습니다. 구글 검색 툴을 이용해 반드시 다음 URL들의 본문 내용을 파악하고 아래 지시를 100% 따르세요.
`;
      if (goodUrl) {
        feedbackLearningGuidance += `- 👍 [성공 사례 벤치마킹 필수 대상]: ${goodUrl}\n  이 글은 트래픽이 터진 '대박' 포스팅입니다. 이 글의 장점(가독성 퀄리티, 정보 배치 순서, 도입부의 공감 요소, 말투 등)을 철저히 분석하고, 이번 포스팅을 작성할 때 이 성공 패턴의 분위기와 전개 방식을 완벽하게 흡수하여 작성하세요.\n`;
      }
      if (badUrl) {
        feedbackLearningGuidance += `- 👎 [실패 사례 회피 필수 대상]: ${badUrl}\n  이 글은 노출되지 않은 '폭망' 포스팅입니다. 이 글의 단점(지루한 서론, 뻔한 정보 나열, 부족한 가독성 등)을 철저히 분석하고, 이번 포스팅에서는 절대로 이 글과 같은 스타일이나 정보 전개 방식을 답습하지 마세요.\n`;
      }
    }

    const prompt = `
${personaGuidance}
${realTimeSeoGuidance}
${feedbackLearningGuidance}

사용자가 검색한 아래 키워드를 바탕으로 최상급 품질의 네이버 블로그 포스팅을 작성하세요.

현재 연도(참고용): ${currentYear}년
목표 검색어/키워드: ${keyword}

${visualGuidance}

[출력 형식 제한]
반드시 아래의 특수 구분자를 사용하여 제목과 본문을 나누어 작성하세요. JSON 형식은 절대 사용하지 마세요.
[TITLE]
(생성된 블로그 제목을 순수 텍스트로 1줄로 작성)
[/TITLE]
[CONTENT]
${deviceType === 'mobile' ? "(생성된 블로그 본문을 <p>, <br>, <b> 태그만을 엄격하게 사용한 형태로 작성)" : "(생성된 블로그 본문을 화려한 HTML 태그 및 CSS가 포함된 텍스트로 작성)"}
[/CONTENT]
`;

    const commonConfig = {
      temperature: 0.7,
      maxOutputTokens: 8192,
      tools: [{ googleSearch: {} }],
      // @ts-ignore
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
      ]
    };

    let streamRes;
    try {
      streamRes = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: commonConfig,
      });
    } catch (generateErr: any) {
      if (generateErr.message?.includes('503') || generateErr.message?.includes('high demand') || generateErr.message?.includes('UNAVAILABLE')) {
        console.warn("gemini-2.5-pro is currently overloaded (503). Falling back to gemini-2.5-flash...");
        streamRes = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: commonConfig,
        });
      } else {
        throw generateErr;
      }
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // 2. [비주얼 강화] 생성된 텍스트를 바탕으로 뚜렷한 타이포그래피 썸네일 생성 (next/og 활용) 또는 AI 아바타 썸네일
    let thumbnailHtml = "";
    
    try {
      const topParams = encodeURIComponent(searchParams.thumbnailTop || '주목할 만한 정보');
      const midParams = encodeURIComponent(searchParams.thumbnailMid || keyword || '핵심 요약');
      const bottomParams = encodeURIComponent(searchParams.thumbnailBottom || '5분만에 알아보기');
      
      const styleParam = category ? `&style=${category}` : "";
      const ogUrl = `${baseUrl}/api/og?top=${topParams}&mid=${midParams}&bottom=${bottomParams}${styleParam}&ext=.png`;

      thumbnailHtml = `<div style="text-align: center; margin-bottom: 24px;">
        <img src="${ogUrl}" alt="대표 썸네일" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);" />
      </div>`;
    } catch (imgError) {
      console.error("OG Thumbnail Generation Failed:", imgError);
    }

    let processedImages: string[] = [];
    if (deviceType === 'desktop') {
      processedImages = imageUrls.slice(1).map(url => `${baseUrl}/api/proxy?url=${encodeURIComponent(url)}`);
    }

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const metaMsg = JSON.stringify({ type: 'meta', thumbnailHtml, images: processedImages });
          controller.enqueue(encoder.encode(`data: ${metaMsg}\n\n`));

          for await (const chunk of streamRes) {
            if (chunk.text) {
              const textMsg = JSON.stringify({ type: 'text', text: chunk.text });
              controller.enqueue(encoder.encode(`data: ${textMsg}\n\n`));
            }
          }
          controller.close();
        } catch (e) {
          console.error("Stream Error:", e);
          controller.error(e);
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: unknown) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate blog post" },
      { status: 500 }
    );
  }
}
