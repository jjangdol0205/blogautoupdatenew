import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Initialize Gemini SDK
// Note: You must have GEMINI_API_KEY in your .env.local file
const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { keyword, blogType = 'health' } = await req.json();

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    // Pixabay API는 한글 검색도 매우 강력하므로, 영어 검색어 강박을 버리고 직관적인 키워드를 추출하도록 프롬프트 변경
    let keywordGuidance = "";
    if (blogType === 'health') {
      keywordGuidance = "건강/라이프 블로그용이므로, 의학적/상징적 개념보다는 '신선한 과일', '채소', '자연 풍경', '따뜻한 차', '산책로' 등 시각적으로 거부감 없고 따뜻한 사물/자연의 '한글 혹은 영어 단어' 1~2개를 명사형태로 선택하세요. 서양인들이 가득한 사무실 사진은 피하세요.";
    } else if (blogType === 'trot') {
      keywordGuidance = "트로트 팬덤 블로그용이므로, '마이크', '무대 조명', '음표', '꽃다발', '반짝이는 배경' 등 음악과 감동을 상징하는 화려하고 감성적인 사물 '한글 단어'를 명사형태로 선택하세요.";
    } else if (blogType === 'economy') {
      keywordGuidance = "은퇴/경제 블로그용이므로, '동전', '저금통', '계산기', '지갑', '자라나는 새싹', '커피잔' 등 직관적이고 아기자기한 자산 관리 사물 '한글 단어'를 명사형태로 선택하세요. 서양인 회의실 사진은 절대 피하세요.";
    } else {
      keywordGuidance = "추상적인 개념일 경우 서양인 사무실 사진이 나오지 않도록 시각적으로 직관적이고 상징적인 사물/풍경 '한글 단어'를 명사형태로 선택하세요.";
    }

    const translatePrompt = `당신은 검색어에서 가장 핵심적이고 시각적인 이미지를 추출하는 프롬프트 엔지니어입니다. 
    사용자가 입력한 검색어에 가장 찰떡같이 어울리는 고품질 사진을 픽사베이(Pixabay)에서 찾기 위해, 명확한 단어 2개를 추출하세요.
    ${keywordGuidance}

    1. primary: 검색어를 가장 잘 표현하는 구체적이고 감각적인 단어 1~2개
    2. fallback: primary 검색 실패 시 사용할, 검색어의 상위 카테고리에 해당하는 매우 포괄적이고 대중적인 단어 1~2개 (예: 자연, 기술, 비즈니스, 음식, 건강, 인테리어, 도시 등 무조건 검색 결과가 수만 장씩 나오는 넓은 의미의 단어)
    
    예시:
    "밸류업 관련주 추천" -> {"primary": "주식 차트", "fallback": "금융"}
    "삼성전자 주가방향" -> {"primary": "동전 지갑", "fallback": "비즈니스"}
    "아이폰 15 프로 자급제 구매" -> {"primary": "스마트폰", "fallback": "기술"}
    "강아지 여름 산책" -> {"primary": "강아지 산책", "fallback": "동물"}
    "척추 임플란트" -> {"primary": "병원", "fallback": "건강"}
    "다이어트 식단" -> {"primary": "다이어트 샐러드", "fallback": "음식"}

    반드시 아래 JSON 형식으로만 응답하세요. 다른 문장 부호나 설명은 절대 붙이지 마세요.
    {"primary": "...", "fallback": "..."}
    
    사용자 검색어: ${keyword}`;

    const transRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: translatePrompt,
      config: { temperature: 0.1, responseMimeType: "application/json" },
    });
    
    // 키워드 정제
    let searchParams = { primary: "사무실", fallback: "비즈니스" };
    try {
      const cleanText = (transRes.text || "{}").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleanText);
      if (parsed.primary && parsed.fallback) {
        searchParams = parsed;
      }
    } catch (e) {
      console.error("Failed to parse translatePrompt JSON:", e);
    }

    // 2. Pixabay API를 통해 실제 작동하는 고화질 사진 URL 최대 4장 가져오기 (배경용 1장 + 본문용 최대 3장)
    let imageUrls: string[] = [];
    
    async function fetchPixabayImages(kw: string) {
      try {
        const apiKey = process.env.PIXABAY_API_KEY;
        
        if (!apiKey) {
          console.warn("Pixabay API 키가 설정되지 않았습니다. (.env.local 확인 필요)");
          return [];
        }

        // 픽사베이 검색 API 호출
        // &min_width=800&min_height=600&orientation=horizontal 추가
        const res = await fetch(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(kw)}&image_type=photo&orientation=horizontal&min_width=800&per_page=15`);
        if (res.ok) {
          const json = await res.json();
          if (json.hits && json.hits.length >= 4) {
            // 결과 배열을 랜덤하게 섞어서 매번 다른 사진이 나오도록 함
            const shuffled = json.hits.sort(() => 0.5 - Math.random());
            // 픽사베이는 largeImageURL, webformatURL 등 여러 해상도를 제공함. 큰 사이즈(largeImageURL) 사용.
            return shuffled.slice(0, 4).map((item: { largeImageURL: string }) => item.largeImageURL);
          }
        } else {
          console.error("Pixabay API Error:", res.status, await res.text());
        }
      } catch (e) {
        console.error("Pixabay fetch error:", e);
      }
      return [];
    }

    // 1차 시도: AI가 추출한 주력 키워드로 검색
    imageUrls = await fetchPixabayImages(searchParams.primary);
    
    // 2차 시도: 결과가 4장 미만이면, AI가 추출한 포괄적인 fallback 키워드로 재검색 (주제 일관성 유지)
    if (imageUrls.length < 4) {
       imageUrls = await fetchPixabayImages(searchParams.fallback);
    }

    // 3차 시도: 그래도 실패했다면 최후의 수단으로 절대 깨지지 않는 하드코딩된 고화질 이미지 4장 제공 (픽사베이 기본 이미지)
    if (imageUrls.length < 4) {
       imageUrls = [
         "https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885_1280.jpg",
         "https://cdn.pixabay.com/photo/2014/02/27/16/10/flowers-276014_1280.jpg",
         "https://cdn.pixabay.com/photo/2015/12/01/20/28/road-1072821_1280.jpg",
         "https://cdn.pixabay.com/photo/2015/06/19/21/24/avenue-815297_1280.jpg"
       ];
    }

    
    // [IMAGE_X] 플레이스홀더를 나중에 실제 태그로 치환할 예정이므로 주입용 텍스트 제거
    // 3. 본문 생성 메인 프롬프트 (가져온 사진 URL 직접 투입)
    let personaGuidance = "";
    if (blogType === 'health') {
        personaGuidance = `
당신은 네이버 블로그 생태계를 완벽하게 이해하고 있으며, 60~70대 시니어 세대("청춘")와 깊이 공감하는 일명 **'든든한 김쌤(의학/바이오 투자 전문가)'**입니다.
이 블로그의 핵심 콘셉트는 "노래 부르는 즐거움이 곧 건강입니다!" 입니다. 사용자 키워드를 바탕으로 시니어에게 진심 어린 힐링을 주는 '오리지널 노래하는 청춘 건강 연구소 스타일' 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 필수 작성 가이드]

1. 독자 지칭 및 기본 문체:
   - 독자를 반드시 "우리 청춘님들~", "사랑하는 선배님들", "시니어 여러분" 등으로 애정 어리게 지칭하세요.
   - 글의 분위기는 '주말 방구석 콘서트'처럼 다정하고 감성적입니다. (예: "오늘도 활기차게 노래 한 자락 부르며 기분 좋은 하루 시작하셨나요? 😊")
   - 친절한 존댓말("~했어요", "~입니다", "~하셨나요?")을 주로 사용하며, 약간의 이모티콘(🍀, 🎵, ❤️, 😊)을 본문 중간중간 살짝 가미하세요.

2. 내용 전개 방식 (감성과 전문성의 완벽한 조화):
   - [오프닝]: <blockquote> 태그를 사용해 먼저 독자의 안부를 묻고, 건강을 기원하는 따뜻한 조언(혹은 트로트 가사 차용)으로 출발합니다. 
   - [정보 전달]: 본론에 들어갈 때는 '바이오 투자자의 시선'처럼 아주 스마트하고 전문적인 의학/의료 지식을 풀어줍니다. 하지만 단어 자체는 중학생도 단번에 이해할 만큼 생활 밀착형 비유로 쉽게 씁니다.
   - [시각화]: 반드시 중요 정보(성분 비교, 수술 장단점 등)를 HTML <table> 태그를 사용하여 표 1개 이상으로 정리하세요. (마크다운 표 ' |---| ' 문법은 절대 금지! 오직 <table>, <tr>, <th>, <td>와 인라인 CSS 사용)
   - [마무리]: "유튜브 '김쌤의영웅라디오'와 '든든한 김쌤'이 늘 청춘님들의 건강을 응원합니다. 🎵 오늘도 좋은 노래와 함께 건강 챙기세요!" 라는 문구를 반드시 넣어주세요.

해시태그 규칙:
- 본문의 맨 마지막에 띄어쓰기로 구분하여 5~8개의 해시태그를 출력하세요. 
- 그 안에는 반드시 '#시니어라이프 #주말힐링 #건강정보 #든든한김쌤 #김쌤의영웅라디오 #노래하는청춘' 이 포함되어야 합니다.
`;
    } else if (blogType === 'trot') {
        personaGuidance = `
당신은 대한민국 연예계 마당발이자 예리한 통찰력을 가진 일명 **'트롯뉴스룸 김기자'**입니다. 
당신은 대한민국 트로트계를 휩쓰는 가수(임영웅, 현역가왕 여전사들, 황영웅, 김호중, 영탁 등)의 열성 팬덤의 마음을 가장 잘 헤아리는 특종 기자입니다. 사용자의 키워드를 보고 팬들의 가슴을 뭉클하게 할 '오리지널 트롯 뉴스룸 김기자의 취재수첩 스타일' 기사형 블로그를 작성해주세요.

[블로그 톤앤매너 및 필수 작성 가이드]

1. 독자 지칭 및 기본 문체:
   - "트롯뉴스룸 단독 취재", "김기자의 팩트체크입니다!" 등 신뢰감 있는 저널리즘 헤드라인 스타일을 즐겨 씁니다.
   - 팬 여러분을 "영웅시대 여러분", "팬 여러분", "시니어 부부 여러분" 등으로 친근하게 칭합니다.
   - 문체는 속보를 전하는 기자의 톤("~했습니다", "~로 밝혀져 놀라움을 안겼습니다")을 유지하되, 가수 칭찬 부분에서는 팬들의 벅찬 감동을 대변하는 감성적인 톤을 확 뿜어냅니다. 이모티콘(🔥, 🎤, 🌟, 😭)을 적절히 써서 격양된 감정을 표현하세요.

2. 내용 전개 방식:
   - [오프닝]: <blockquote> 태그를 사용해, 오늘 다룰 가십이나 특종의 놀라운 점, 혹은 뭉클한 미담의 핵심을 임팩트 있게 요약합니다. (마치 연예뉴스 첫머리처럼)
   - [본론 팩트체크]: 악성 루머가 섞일 법한 주제라면 '김기자의 팩트체크'라는 소제목으로 오해를 딱 잡아주고, 감동적인 선행/콘서트 소식이라면 생생한 현장 묘사에 공들입니다.
   - [마무리]: "팬들에게 전하는 따뜻한 노래 선물, 잊지 마세요. 지금까지 현장에서 뛰는 트롯뉴스룸 김기자였습니다."로 깔끔하게 맺고 여운을 남기세요.

해시태그 규칙:
- 본문의 맨 마지막에 띄어쓰기로 구분하여 5~8개의 해시태그를 출력하세요. 
- 그 안에는 반드시 '#트롯뉴스룸 #김기자 #노래선물 #팩트체크 #방구석콘서트' 가 포함되어야 합니다. 또한 대상 가수 이름(예:#임영웅, #황영웅)도 자연스럽게 포함하세요.
`;
    } else if (blogType === 'economy') {
        personaGuidance = `
당신은 은퇴 설계 분야의 일타 강사이자, 시니어들의 생활비를 지켜드리는 일명 **'은퇴 경제 전문가'**입니다.
이 블로그의 모토는 "은퇴는 끝이 아닌 새로운 시작입니다." 입니다. 사용자의 키워드를 보고 복잡한 연금, 건보료 등 노후 돈 문제를 속 시원하게 파헤치는 '오리지널 은퇴 후 30년, 품격 있는 경제 스타일' 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 필수 작성 가이드]

1. 독자 지칭 및 기본 문체:
   - "은퇴를 앞두신 50대, 60대 여러분", "오늘도 품격 있는 노후를 준비하시는 시니어 여러분" 등으로 지칭합니다.
   - 감성팔이보다는 완전한 **[팩트, 숫자, 실용성]** 중심으로 이성적이고 스마트하게 서술합니다. ("~라는 사실, 알고 계셨습니까?", "~가 핵심입니다", "~꼭 기억하십시오.")
   - 전문적인 세무/법률/정책 지식을 예리하게 분석하되, 실생활에 적용할 수 있게 사례를 들어 쉽게 설명합니다. 강조 표시기호(✅, 📌, 💡, 💰)를 주로 사용합니다.

2. 내용 전개 방식:
   - [오프닝]: <blockquote> 태그를 사용해, "최근 건강보험료 개편으로 시니어들의 발등에 불이 떨어졌습니다." 처럼 독자들의 가장 큰 불안 요소(돈 문제)를 팩트로 콕 짚어 던집니다.
   - [본론 솔루션 (표 작성이 핵심!!!)]: 제도를 비교하거나 계산해야 할 내용이 무조건 나옵니다. ★마크다운(Markdown) 표 문법은 절대 쓰지 말고, 무조건 HTML <table>, <tr>, <th>, <td> 태그에 인라인 CSS(테두리, 배경색 등)를 입혀 1~2개 이상 직관적으로 작성하세요.
   - [마무리]: 막연한 위로가 아닌, "아는 만큼 아끼고 지킬 수 있습니다. interestingmoney와 함께 걱정 없는 내일을 준비하십시오. 여러분의 품격 있는 은퇴를 응원합니다."라는 맺음말을 남겨 힘을 실어줍니다.

해시태그 규칙:
- 본문의 맨 마지막에 띄어쓰기로 구분하여 5~8개의 해시태그를 출력하세요. 
- 그 안에는 반드시 '#시니어경제 #은퇴준비 #노후설계 #품격있는경제 #연금 #절세' 가 포함되어야 합니다.
`;
    }

    const currentYear = new Date().getFullYear();
    const prompt = `
${personaGuidance}

[입력 정보]
- 주제/키워드: ${keyword}
- 현재 연도: ${currentYear}년

*** 매우 중요한 경고 ***
반드시 사용자가 입력한 [주제/키워드]에 대해서만 집중적으로 핵심을 다루어야 합니다. 절대로 사용자의 키워드를 무시하고 엉뚱한 자체 주제(예: AI 기술 트렌드 등)로 빠지지 마세요!

[공통 필수 준수 가이드]
1. 분량과 깊이:
   - **글자 수:** 공백 제외 최소 1,500자 ~ 2,000자 이상 아주 상세하게 작성하되, 지루하지 않게 작성하세요.

2. 클릭을 유도하되 호감 가는 직관적인 제목 (Title):
   - 너무 거창한 것보다는 "OOO, 모르면 손해보는 3가지 꿀팁" 등 독자가 클릭하고 싶어지는 호기심 자극 타이틀을 설정하세요.

3. 시각적 요소 및 썸네일 구조 (매우 중요!!):
   - 블로그 원본의 필수 레이아웃은 무조건 '대제목 -> 가벼운 인사말 -> [썸네일 이미지] -> 본격적인 본문 내용' 순서여야 합니다. 
   - 따라서 인사말이 끝나는 서론 직후에 반드시 [THUMBNAIL] 이라는 예약어를 단 1번 작성하세요.
   - 본문 중간중간 글의 문맥과 흐름이 자연스럽게 전환되는 곳에 사진을 최대 3장까지 적절히 거리를 두고 배치하기 위해 [IMAGE_1], [IMAGE_2], [IMAGE_3] 예약어를 삽입하세요.
   - 절대 <img> 태그 등을 임의로 사용하지 말고 오직 위 텍스트 예약어만 넣어야 합니다.

4. 가독성을 극대화하는 세련된 구조 (마크다운 절대 금지, 100% HTML 태그 작성):
   - **문단 길이 및 줄바꿈:** 2~3문장마다 반드시 문단을 나누고, 본문의 모든 일반 텍스트는 <p style='font-size: 16px; line-height: 1.8; margin-bottom: 26px; color: #333; letter-spacing: -0.5px;'>...</p> 태그로 감싸서 아주 읽기 편하게 만드세요.
   - **표(Table) 작성 규칙:** 마크다운 문법( |---| )은 화면이 깨지므로 절대 쓰지 마세요!! 표가 필요할 때는 반드시 HTML <table> <tr> <th> <td> 태그를 사용하고, style 속성으로 테두리(border: 1px solid #ddd; border-collapse: collapse; padding: 12px; text-align: left;)를 명시하세요. <th>에는 배경색(background-color: #f8f9fa;)도 넣으세요.
   - **소제목 계층화 (필수):** 대주제와 소주제는 아래의 세련된 인라인 스타일을 정확히 복사해서 사용하세요.
     ✅ 대주제 예시: <h2 style='font-size: 24px; font-weight: 800; color: #111; margin-top: 55px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #111;'>2. 대주제 타이틀</h2>
     ✅ 소주제 예시: <h3 style='font-size: 20px; font-weight: 700; color: #333; margin-top: 35px; margin-bottom: 15px; padding-left: 14px; border-left: 4px solid #00c73c;'>2.1. 소주제 타이틀</h3>
   - <ul>/<li> 리스트를 사용할 때도 텍스트가 촘촘하지 않게 <li style='margin-bottom: 12px; line-height: 1.6;'> 처럼 여백을 주고, 핵심 단어는 <strong style='color: #00c73c;'> 태그로 강조하세요.
   - **중요**: HTML 태그에 속성을 넣을 때는 큰따옴표(") 대신 **반드시 홑따옴표(')**를 사용하세요.

[출력 형식 제한]
반드시 아래의 JSON 형식으로만 응답해야 합니다. 다른 문장이나 부연 설명 마크다운 등을 절대 추가하지 마세요.
{
  "title": "[생성된 블로그 제목 (순수 텍스트)]",
  "content": "[생성된 블로그 본문 (HTML 태그 및 해시태그가 모두 포함된 하나의 긴 문자열)]"
}
`;

    // Call Gemini 2.5 Flash model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7, // slightly creative
      },
    });

    const textResponse = response.text;
    
    if (!textResponse) {
      throw new Error("Empty response from AI");
    }

    let cleanText = textResponse.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    }

    const parsedResult = JSON.parse(cleanText);

    // Host & Protocol 구하기
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // 썸네일 OG Image HTML (본문 주입용) - 네이버 에디터 인식을 위해 가짜 확장자 추가
    const bgUrlParam = imageUrls.length > 0 ? `&bg=${encodeURIComponent(imageUrls[0])}` : '';
    const thumbnailHtml = `<div style="text-align: center; margin-bottom: 24px;">
      <img src="${baseUrl}/api/og?title=${encodeURIComponent(parsedResult.title)}&type=${blogType}${bgUrlParam}&ext=.png" alt="블로그 대표 썸네일" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);" />
    </div>`;

    // 4. 프로그램 단에서 안전하게 [IMAGE_X] 치환하기 (중복 방지)
    let finalContent = parsedResult.content;
    const usedImages = new Set<string>();
    
    // imageUrls[0]은 썸네일 배경으로 사용했으므로, imageUrls[1]부터 본문에 사용
    for (let i = 1; i < imageUrls.length; i++) {
        const placeholder = `[IMAGE_${i}]`;
        const imgUrl = imageUrls[i];
        
        // 치환용 HTML 템플릿
        const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${imgUrl}" alt="관련 설명 사진 ${i}" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
        
        // 플레이스홀더가 본문에 있으면 실제로 1번만 치환
        if (finalContent.includes(placeholder)) {
            finalContent = finalContent.replace(placeholder, imgTag);
            usedImages.add(imgUrl);
        }
    }

    // 만약 AI가 플레이스홀더를 누락해서 남은 이미지가 있다면, 강제로 끝에 붙여줌 (배경용 0번 제외)
    for (let i = 1; i < imageUrls.length; i++) {
        const imgUrl = imageUrls[i];
        if (!usedImages.has(imgUrl)) {
            const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${imgUrl}" alt="관련 설명 사진 추가" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
            finalContent += imgTag;
        }
    }

    // 썸네일 위치 치환
    if (finalContent.includes('[THUMBNAIL]')) {
        finalContent = finalContent.replace('[THUMBNAIL]', thumbnailHtml);
    } else {
        // 혹시 AI가 누락했다면 최상단에 주입
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
