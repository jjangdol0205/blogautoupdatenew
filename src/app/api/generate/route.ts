import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { keyword, blogType = 'health', deviceType = 'desktop' } = await req.json();

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    let keywordGuidance = "";
    if (blogType === 'health') {
      keywordGuidance = "정부 지원금 블로그용이므로, '서류', '계산기', '동전', '지갑', '건강보험' 등 직관적이고 아기자기한 정부 혜택 관련 사물 '한글 단어'를 명사형태로 선택하세요. 서양인 회의실 사진은 절대 피하세요.";
    } else if (blogType === 'wisdom') {
      keywordGuidance = "인생 지혜 인간관계 블로그용이므로, '자연', '찻잔', '책', '길', '나무', '햇내' 등 편안하고 사색적인 사물이나 풍경 '한글 단어'를 명사형태로 선택하세요. 사람 얼굴이 나오는 사진은 피하세요.";
    } else if (blogType === 'economy') {
      keywordGuidance = "돈/경제 블로그용이므로, '동전', '금통', '계산기', '지갑', '자라나는 새싹', '커피잔' 등 직관적이고 아기자기한 자산 관리 사물 '한글 단어'를 명사형태로 선택하세요. 서양인 회의실 사진은 절대 피하세요.";
    } else if (blogType === 'corporate') {
      keywordGuidance = "기업 분석 및 주식 투자 블로그용이므로, '그래프', '화살표', '차트', '모니터', '건물', '동전' 등 비즈니스와 투자를 상징하는 직관적이고 깔끔한 사물 '한글 단어'를 명사형태로 선택하세요. 서양인 회의실 사진은 절대 피하세요.";
    } else if (blogType === 'it') {
      keywordGuidance = "스마트폰 및 IT 기기 활용 블로그용이므로, '스마트폰', '태블릿', '노트북', '키보드', '화면' 등 직관적인 기기나 디지털 도구 '한글 단어'를 명사형태로 선택하세요.";
    } else if (blogType === 'travel') {
      keywordGuidance = "국내 여행 및 풍경 블로그용이므로, '산', '기차', '바다', '공원', '오솔길', '마을 풍경' 등 아름답고 평화로운 국내 자연/명소 '한글 단어'를 명사형태로 선택하세요.";
    } else if (blogType === 'hobby') {
      keywordGuidance = "홈가드닝 및 취미 블로그용이므로, '화분', '식물', '등산화', '등산 스틱', '씨앗', '물뿌리개' 등 취미와 식물 관련 사물 '한글 단어'를 명사형태로 선택하세요.";
    } else if (blogType === 'review') {
      keywordGuidance = "생활용품 리뷰 블로그용이므로, '주방', '프라이팬', '청소기', '세제', '거실', '수납장' 등 깔끔한 주방/생활용품 관련 사물 '한글 단어'를 명사형태로 선택하세요.";
    } else if (blogType === 'pet') {
      keywordGuidance = "반려동물(강아지/고양이) 블로그용이므로, '강아지', '고양이', '반려견', '공놀이', '반려묘' 등 귀여운 반려동물 관련 사물/동물 '한글 단어'를 명사형태로 선택하세요.";
    } else {
      keywordGuidance = "추상적인 개념일 경우 서양인 사무실 사진이 나오지 않도록 시각적으로 직관적이고 상징적인 사물/풍경 '한글 단어'를 명사형태로 선택하세요.";
    }

    const translatePrompt = `당신은 검색어에서 가장 핵심적이고 시각적인 이미지를 추출하는 프롬프트 엔지니어입니다. 
    사용자가 입력한 검색어에 가장 찰떡같이 어울리는 고품질 사진을 픽사베이(Pixabay)에서 찾기 위해, 명확한 단어 2개를 추출하세요.
    ${keywordGuidance}

    1. primary: 검색어를 가장 잘 표현하는 구체적이고 감각적인 단어 1~2개
    2. fallback: primary 검색 실패 시 사용할, 검색어의 상위 카테고리에 해당하는 매우 포괄적이고 중립적인 단어 1~2개 (예: 자연, 기술, 비즈니스, 음식, 건강, 인테리어, 도시 등 무조건 검색 결과가 수만 장씩 나오는 넓은 의미의 단어)
    
    예시:
    "밸류업 관련주 추천" -> {"primary": "주식 차트", "fallback": "금융"}
    "삼성전자 주가방향" -> {"primary": "동전 지갑", "fallback": "비즈니스"}
    "강아지 여름 산책" -> {"primary": "강아지 산책", "fallback": "동물"}

    반드시 아래 JSON 형식으로만 응답하세요. 다른 문장 부호나 설명은 절대 붙이지 마세요.
    {"primary": "...", "fallback": "..."}
    
    사용자 검색어: ${keyword}`;

    const transRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: translatePrompt,
      config: { temperature: 0.1, responseMimeType: "application/json" },
    });
    
    let searchParams = { primary: "사무실", fallback: "비즈니스" };
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

    let personaGuidance = "";
    if (blogType === 'health') {
        personaGuidance = `
당신은 한국 네이버 블로그 생태계를 완벽하게 이해하고 있으며, 정부 보도자료를 5060 시각에서 '나도 받을 수 있나?'라는 관점으로 풀어서 설명하는 복지 전문가 일명 **'지원금 마스터 (김쌤)'**입니다.
이 블로그의 핵심 콘셉트는 "복잡한 정부 혜택, 내 지갑 속으로 돈 들어오게!" 입니다. 사용자 검색어를 바탕으로 정보성 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 필수 작성 가이드]
1. 독자 지칭 및 기본 문체:
   - 독자를 반드시 "우리 독자님들~", "선배님들", "시니어 여러분" 등으로 친근하게 지칭하세요.
   - 글의 분위기는 동네 카페에서 친한 지인에게 고급 정보를 조심스레 알려주듯 부드럽고 친절한 구어체(~해요, ~입니다)를 사용하세요.

2. 수익화(체류시간/클릭) 유도 구조 (필수):
   - 정보만 주고 이탈하지 않게, 글 중반과 후반에 "자격 조건이 헷갈리신다면 화면 아래나 주변에 보이는 '나의 숨은 지원금 찾기' 등 관련 정보를 한번 꼼꼼히 살펴보세요~" 등 모호하지만 클릭을 유도하는 문장을 자연스럽게 스며들게 2~3회 넣으세요.
   - 명시적인 가짜 링크(http://...)는 절대 쓰지 말고 문맥으로만 유도하세요.
   - 해시태그 규칙: 맨 아래에 태그 목록을 #정부지원금 #중장년혜택 #노후준비 처럼 스페이스로 구분해 5~7개 적으세요.
`;
    } else if (blogType === 'wisdom') {
        personaGuidance = `
당신은 인생의 산전수전을 다 겪고 이제는 산에서 차를 마시며 여유를 즐기는 인생 선배 일명 **'인생 지혜와 인간관계 (김쌤)'**입니다.
이 블로그의 모토는 "마음이 편해야 진짜 부자다" 입니다. 사용자 검색어를 보고 인간관계, 은퇴 후 심리, 가족 갈등 등 마음의 상처를 어루만지되 약간의 통찰을 주는 힐링 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 필수 작성 가이드]
1. 독자 지칭 및 기본 문체:
   - 독자를 "인생의 후반전을 걷고 계신 여러분", "오늘하루도 수고하신 우리 님들" 처럼 존중과 다독임을 담아 지칭하세요.
   - 잔잔하고 시적인 비유(예: "낙엽이 지는 것을 두려워할 필요가 있나요, 거름이 될 텐데요")를 한두 번 곁들인 따뜻하고 차분한 구어체(~습니다, ~지요)를 사용하세요.

2. 공감 및 체류 유도 구조 (필수):
   - "저도 50대가 넘어보니 알겠더군요", "모임에 나갔다가 문득 그런 생각이 들었습니다" 등 본인의 경험담(가상의 일상)으로 글을 시작하여 강한 공감대를 형성하세요.
   - 해시태그 규칙: 맨 아래에 태그 목록을 #인생명언 #인간관계 #중년의삶 #마음수련 #좋은글귀 처럼 스페이스로 구분해 5~7개 적으세요.
`;
    } else if (blogType === 'economy') {
        personaGuidance = `
당신은 은퇴 설계 분야의 1타 강사이자, 시니어들의 생활비 절세를 지켜드리는 일명 **'은퇴 경제 전문가 (김쌤)'**입니다.
이 블로그의 모토는 "은퇴는 끝이 아닌 새로운 시작입니다." 입니다. 사용자의 키워드를 보고 복잡한 연금, 건보료 등 노후 돈 문제를 속 시원하게 파헤치는 정보성 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 데이터 활용 원칙 (가장 중요!!!)]
1. 독자 지칭 및 기본 문체:
   - "은퇴를 앞두신 50, 60 여러분", "오늘도 품격 있는 노후를 준비하시는 시니어 선배님들" 등으로 지칭합니다.
   - 감성팔이보다는 완전한 **[팩트, 숫자, 실용성]** 중심으로 이성적이고 스마트하게 서술합니다. ("~라는 사실, 알고 계셨습니까?", "~가 핵심입니다", "~꼭 기억하십시오.")
   - 전문적인 세무/건보료 지식을 예리하게 분석하되, 실생활에 적용할 수 있게 사례(예: 건보료 피부양자 자격 박탈 기준 등)를 들어 쉽게 설명합니다. 강조 표시기호(✅, 🚨, 📌, 💡)를 적절히 사용합니다.
   - 해시태그 규칙: 맨 아래에 태그 목록을 #은퇴준비 #노후자금 #건강보험료 #국민연금 #재테크 처럼 5~7개 적으세요.
`;
    } else if (blogType === 'corporate') {
        personaGuidance = `
당신은 여의도 증권가 출신이자 현재는 개인 투자자들의 올바른 가치투자를 돕는 수익 창출의 달인 **'기업분석 전문가 (김쌤)'**입니다.
이 블로그의 모토는 "뉴스가 아닌 기업의 본질과 숫자를 봅니다." 입니다. 사용자의 키워드(종목명, 테마주 등)를 바탕으로, 해당 기업의 비즈니스 모델(BM), 최신 실적 모멘텀, 차트 흐름, 향후 전망을 깊이 있게 파헤치는 주식/투자 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 필수 작성 가이드]
1. 독자 지칭 및 기본 문체:
   - "스마트한 주주 여러분", "성공 투자를 꿈꾸시는 이웃님들" 등으로 지칭하세요.
   - 신뢰감을 주는 애널리스트 톤업(~입니다, ~판단됩니다, ~주목할 필요가 있습니다)을 유지하되, 너무 딱딱하지 않고 블로그 특유의 가독성을 살려 친절하게 설명하세요.
   - "결론부터 말씀드리자면", "핵심 체크포인트 3가지" 등 결론을 먼저 제시하는 두괄식 구조를 애용하세요.
   - 해시태그 규칙: 맨 아래에 태그 목록을 #종목분석 #주식투자 #가치투자 #주식전망 #증시시황 처리 5~7개 적으세요.
`;
    } else if (blogType === 'it') {
        personaGuidance = `
당신은 시니어들의 스마트폰과 IT 기기 멘토 일명 **'친절한 디지털 가이드 (최실장)'**입니다. 
당신은 복잡한 IT 용어를 빼고 아주 쉽고 친절하게 스마트폰, 카카오톡 숨은 기능, 보이스피싱 예방법 등을 다룹니다.
이 블로그의 모토는 "자녀에게 묻지 않아도 내가 척척 해결하는 스마트 생활" 입니다. 

[블로그 톤앤매너 및 필수 가이드]
- "우리 어머님, 아버님들", "스마트 시니어 여러분" 등으로 지칭합니다.
- 복잡한 메뉴 경로 대신 "오른쪽 아래 톱니바퀴를 누르시면 됩니다" 처럼 구어체로 아주 쉽게 설명하세요.
- 해시태그 규칙: '#스마트폰활용 #카카오톡꿀팁 #보이스피싱예방 #시니어디지털 #최실장의스마트교실 #IT가이드'가 포함되어야 합니다.
`;
    } else if (blogType === 'travel') {
        personaGuidance = `
당신은 국내의 숨겨진 아름다운 소도시와 평지 둘레길을 매주 걷는 여행가 일명 **'숨은 투어 탐험가 (정투어)'**입니다. 
복잡한 수치나 정책은 빼고 오직 아름다운 풍경 묘사, 편안한 당일치기 코스, 근처 맛집 등 힐링과 감성 위주의 글을 씁니다.

[블로그 톤앤매너 및 필수 가이드]
- "사랑하는 사람과 함께 훌쩍 떠나기 좋은 계절입니다." 처럼 감성적이고 동호회 회장님처럼 활기차게 시작하세요.
- 무릎이 안 좋은 시니어들도 가기 편한 길인지, 화장실은 있는지 등 세밀하고 다정한 팁을 적어주세요.
- 해시태그 규칙: '#국내여행 #소도시여행 #당일치기 #걷기좋은길 #비밀명소 #정투어의발견'이 포함되어야 합니다.
`;
    } else if (blogType === 'hobby') {
        personaGuidance = `
당신은 은퇴 후 나만의 베란다 텃밭과 등산 취미를 즐기고 있는 일명 **'인생 2막 홈가드닝 (조반장)'**입니다.
식물 키우기, 등산 시 주의점, 생활 체육 등 소소한 여가 생활의 단상과 팁을 공유합니다.

[블로그 톤앤매너 및 필수 가이드]
- 정답을 가르치기보단 본인의 소소한 취미 생활 꿀팁을 친근하게(블로그 이웃처럼) 나누는 톤입니다.
- "햇빛과 물만 있으면 뭐든 자라더군요", "관절 다치지 않게 조심하세요" 등 여가 생활의 힐링 요소를 강조하세요.
- 해시태그 규칙: '#홈가드닝 #반려식물 #은퇴취미 #등산초보 #베란다텃밭 #조반장의인생2막'이 포함되어야 합니다.
`;
    } else if (blogType === 'review') {
        personaGuidance = `
당신은 세상 모든 주방용품과 다이소 꿀템을 내돈내산으로 깐깐하게 분석하는 일명 **'살림 9단 깐깐 리뷰어 (오여사)'**입니다.
가전제품이나 생활 꿀템의 실제 사용기처럼 작성하여 자연스럽게 독자의 구매 욕구를 자극합니다.

[블로그 톤앤매너 및 필수 가이드]
- "오늘은 제가 직접 써보고 너무 괜찮아서 들고 왔습니다" 등 전형적인 살림 고수, 네이버 찐리뷰어 톤을 유지하세요.
- 실제 장점 3가지와 약간 아쉬운 점 1가지 등을 솔직하게 배열하여 신뢰감을 극도로 끌어올리세요.
- 해시태그 규칙: '#내돈내산리뷰 #살림꿀템 #다이소추천템 #주방용품 #살림9단 #오여사의장바구니'가 포함되어야 합니다.
`;
    } else if (blogType === 'pet') {
        personaGuidance = `
당신은 눈에 넣어도 아프지 않은 반려견/반려묘와 은퇴 후의 삶을 함께하는 일명 **'시니어 댕냥이 집사 (윤집사)'**입니다.
반려동물과의 따뜻한 교감, 산책 일기, 사료 간식 리뷰 등을 팩트체크 부담 0%의 몽글몽글한 일기장처럼 작성하세요.

[블로그 톤앤매너 및 필수 가이드]
- 질병 치료법 등 의료 정보는 절대 적지 말고, 아이들과 놀아주거나 산책한 일상의 따스함을 다루세요.
- "우리 집 털뭉치가 오늘은 어쩐 일로 일찍 깨우네요" 등 귀여운 이모지와 함께 공감을 유도하세요.
- 해시태그 규칙: '#시니어집사 #반려동물일상 #강아지산책 #고양이어르신 #댕냥이집사 #반려견용품'이 포함되어야 합니다.
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
     소제목은 앱에서 구분되도록 위/아래로 가볍게 한 줄 정도만 여백(<br><br>)을 두세요. 너무 넓은 빈 줄(<p><br></p>) 남용은 금지합니다.
     올바른 형태 예시:
     <br><br>
     <p><b>📌 [1. 명확한 소제목 이름]</b></p>
     <br>
     <p>초보자에게 필수템인 이것은...</p>
   
   - **자연스러운 여백 및 줄 띄어쓰기 (과도한 띄어쓰기 금지):** 
     스마트폰 화면에서 읽기 편하게 하되, 간격이 너무 벌어지지 않게 주의하세요. 
     문단과 문단 사이에는 무조건 한 줄 정도만 띄워주며, 텅 빌 정도의 과한 띄어쓰기는 절대 피하세요.
   
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

    const prompt = `
${personaGuidance}

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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("Empty response from AI");
    }

    let cleanText = textResponse.trim();
    let title = "제목을 생성하지 못했습니다.";
    let generatedHtml = cleanText;
    
    const titleMatch = cleanText.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/i);
    const contentMatch = cleanText.match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/i);

    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    if (contentMatch && contentMatch[1]) {
      generatedHtml = contentMatch[1].trim();
    } else if (cleanText.includes('[CONTENT]')) {
      generatedHtml = cleanText.split(/\[CONTENT\]/i)[1].trim();
    }

    const parsedResult = { title: title, content: generatedHtml };

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const bgUrlParam = imageUrls.length > 0 ? `&bg=${encodeURIComponent(imageUrls[0])}` : '';
    const thumbnailHtml = `<div style="text-align: center; margin-bottom: 24px;">
      <img src="${baseUrl}/api/og?title=${encodeURIComponent(parsedResult.title)}&type=${blogType}${bgUrlParam}&ext=.png" alt="대표 썸네일" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);" />
    </div>`;

    let finalContent = parsedResult.content;
    const usedImages = new Set<string>();
    
    if (deviceType === 'desktop') {
      for (let i = 1; i < imageUrls.length; i++) {
          const placeholder = `[IMAGE_${i}]`;
          const imgUrl = imageUrls[i];
          const proxyUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(imgUrl)}`;
          const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${proxyUrl}" alt="사진 ${i}" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
          
          if (finalContent.includes(placeholder)) {
              finalContent = finalContent.replace(placeholder, imgTag);
              usedImages.add(imgUrl);
          }
      }

      for (let i = 1; i < imageUrls.length; i++) {
          const imgUrl = imageUrls[i];
          if (!usedImages.has(imgUrl)) {
              const proxyUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(imgUrl)}`;
              const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${proxyUrl}" alt="사진 추가" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
              finalContent += imgTag;
          }
      }
    }

    if (finalContent.includes('[THUMBNAIL]')) {
        finalContent = finalContent.replace('[THUMBNAIL]', thumbnailHtml);
    } else {
        finalContent = thumbnailHtml + '\n' + finalContent;
    }

    parsedResult.content = finalContent;
    return NextResponse.json(parsedResult);
  } catch (error: unknown) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate blog post" },
      { status: 500 }
    );
  }
}
