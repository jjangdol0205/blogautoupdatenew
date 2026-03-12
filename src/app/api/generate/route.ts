import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Initialize Gemini SDK
// Note: You must have GEMINI_API_KEY in your .env.local file
const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { keyword, tone, blogType = 'health' } = await req.json();

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    // 1. 키워드를 바탕으로 고화질 무료 이미지(Unsplash)에서 검색할 영어 단어 추출
    let keywordGuidance = "";
    if (blogType === 'health') {
      keywordGuidance = "특히 시니어 전문 건강/바이오 블로그에 어울리게, '병원(hospital)', '수술실(operating room)', '약(medicine)', '건강(health)', '운동(exercise)', '자연(nature)', '미소(smile)', '가족(family)' 등 시각적으로 따뜻하거나 전문적인 사물/풍경 단어를 선택하세요.";
    } else if (blogType === 'trot') {
      keywordGuidance = "특히 트로트 메거진/가수 블로그에 어울리게, '콘서트 무대(concert stage)', '가수(singer)', '마이크(microphone)', '관중(crowd)', '음악(music)', '팬(fan)', '스포트라이트(spotlight)', '행복(happiness)' 등 시각적으로 화려하고 감동적인 사물/동작 단어를 선택하세요.";
    } else if (blogType === 'economy') {
      keywordGuidance = "특히 시니어 은퇴설계/경제 블로그에 어울리게, '그래프(graph)', '차트(chart)', '돈(money)', '증권(stock market)', '동전(coins)', '지갑(wallet)', '부동산(real estate)', '은퇴(retirement)' 등 시각적으로 직관적인 경제 관련 사물/이미지를 선택하세요.";
    } else {
      keywordGuidance = "특히, 추상적인 개념일 경우 사무실(office)이나 사람(people) 같은 밋밋한 사진이 나오지 않도록 시각적으로 직관적이고 상징적인 사물/풍경 단어를 선택하세요.";
    }

    const translatePrompt = `당신은 검색어에서 가장 핵심적이고 시각적인 이미지를 추출하는 프롬프트 엔지니어입니다. 
    사용자가 입력한 검색어에 가장 찰떡같이 어울리는 고품질 사진을 Unsplash에서 찾기 위해, 영어 검색어 2개를 추출하세요.
    ${keywordGuidance}

    1. primary: 검색어를 가장 잘 표현하는 구체적이고 감각적인 영어 단어 1~2개
    2. fallback: primary 검색 실패 시 사용할, 검색어의 상위 카테고리에 해당하는 매우 포괄적이고 대중적인 영어 단어 1~2개 (예: animal, nature, technology, business, food, health, interior, city, lifestyle 등 무조건 검색 결과가 수만 장씩 나오는 넓은 의미의 단어)
    
    예시:
    "밸류업 관련주 추천" -> {"primary": "stock graph", "fallback": "finance"}
    "삼성전자 주가방향" -> {"primary": "trading monitor", "fallback": "business graph"}
    "아이폰 15 프로 자급제 구매" -> {"primary": "iphone 15 pro", "fallback": "technology"}
    "강아지 여름 산책" -> {"primary": "dog walking", "fallback": "animal"}
    "척추 임플란트" -> {"primary": "hospital room", "fallback": "health"}
    "다이어트 식단" -> {"primary": "healthy salad", "fallback": "food"}

    반드시 아래 JSON 형식으로만 응답하세요. 다른 문장 부호나 설명은 절대 붙이지 마세요.
    {"primary": "...", "fallback": "..."}
    
    사용자 검색어: ${keyword}`;

    const transRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: translatePrompt,
      config: { temperature: 0.1, responseMimeType: "application/json" },
    });
    
    // 영어 키워드 정제
    let searchParams = { primary: "office", fallback: "business" };
    try {
      const cleanText = (transRes.text || "{}").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleanText);
      if (parsed.primary && parsed.fallback) {
        searchParams = parsed;
      }
    } catch (e) {
      console.error("Failed to parse translatePrompt JSON:", e);
    }

    // 2. Unsplash NAPI를 통해 실제 작동하는 고화질 사진 URL 3장 가져오기
    let imageUrls: string[] = [];
    
    async function fetchUnsplashImages(kw: string) {
      try {
        const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(kw)}&per_page=20&orientation=landscape`);
        if (res.ok) {
          const json = await res.json();
          if (json.results && json.results.length >= 3) {
            // 결과 배열을 랜덤하게 섞어서 매번 다른 사진이 나오도록 함
            const shuffled = json.results.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, 3).map((r: { urls: { regular: string } }) => r.urls.regular);
          }
        }
      } catch (e) {
        console.error("Unsplash fetch error:", e);
      }
      return [];
    }

    // 1차 시도: AI가 추출한 주력 키워드로 검색
    imageUrls = await fetchUnsplashImages(searchParams.primary);
    
    // 2차 시도: 결과가 3장 미만이면, AI가 추출한 포괄적인 fallback 키워드로 재검색 (주제 일관성 유지)
    if (imageUrls.length < 3) {
       imageUrls = await fetchUnsplashImages(searchParams.fallback);
    }

    // 3차 시도: 그래도 실패했다면 최후의 수단으로 절대 깨지지 않는 하드코딩된 고화질 이미지 3장 제공 (회색 고양이 동상 절대 방지)
    if (imageUrls.length < 3) {
       imageUrls = [
         "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1080&auto=format&fit=crop",
         "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1080&auto=format&fit=crop",
         "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1080&auto=format&fit=crop"
       ];
    }
    
    // [IMAGE_X] 플레이스홀더를 나중에 실제 태그로 치환할 예정이므로 주입용 텍스트 제거
    // 3. 본문 생성 메인 프롬프트 (가져온 사진 URL 직접 투입)
    let personaGuidance = "";
    if (blogType === 'health') {
        personaGuidance = `
당신은 네이버 블로그 생태계를 완벽하게 이해하고 있으며, 60~70대 시니어 세대("청춘")와 깊이 공감하는 '든든한 김쌤(바이오 투자 전문가)'입니다.
사용자가 제공하는 [주제/키워드]와 [말투]를 바탕으로, 건강과 행복에 관심이 많은 6070 독자들에게 깊은 위로와 힐링, 그리고 '진짜 바이오/건강 정보'를 알기 쉽게 전해주는 프리미엄 네이버 블로그 포스팅 초안을 작성해주세요.

[작성 가이드(매우 중요 - ★'노래하는 청춘 건강 연구소' 맞춤형★)]

1. 독자를 대하는 태도 (페르소나 극대화):
   - 독자를 "우리 청춘님들", "시니어 선배님들" 등으로 존중하며 친근하게 부르세요.
   - 글의 전반적인 분위기는 '트로트를 들으며 편안하게 쉬는 주말 방구석 콘서트'처럼 따뜻하고 감성적이어야 합니다. 하지만 정보는 '바이오 투자자의 시선'에서 날카롭게 분석한 최고급 의학 지식을 아주 쉽게 비유해서(중학생 수준) 속 시원하게 설명해야 합니다.

2. 글의 입체적인 구조 (감성과 이성의 조화):
   - [도입부 힐링 오프닝]: <blockquote> 태그를 사용해, 먼저 독자의 웅크린 마음을 펴주고 건강을 기원하는 따뜻한 인사말이나 감성적인 위로로 시작하세요. (예: "오늘도 활기차게 노래 부르며 즐겁게 시작하셨나요?")
   - [본론 정보 전달]: 본격적인 건강/바이오 정보 제공. 핵심 정보 시각화를 위해 <table> 표를 1개 이상 만드세요.
   - [결론 및 시그니처 마무리]: 글을 맺을 때 반드시 유튜브 '김쌤시니어성공시대'와 '든든한 김쌤'을 언급하며, 독자들에게 활력을 불어넣어 주는 따뜻한 파이팅 인사로 마무리하세요.

해시태그 규칙 (절대 준수):
- 본문 마지막에 반드시 '#시니어라이프 #주말힐링 #건강정보 #든든한김쌤 #김쌤시니어성공시대' 내용이 포함된 5~8개의 해시태그를 출력하세요.
`;
    } else if (blogType === 'trot') {
        personaGuidance = `
당신은 대한민국 연예계 마당발이자 예리한 통찰력을 가진 '트롯뉴스룸 김기자'입니다.
사용자가 제공하는 [주제/키워드]와 [말투]를 바탕으로, 대한민국 트로트 가수(임영웅, 현역가왕, 황영웅 등)의 열성 팬 및 시니어 부부 독자들을 위한 신속하고 깊이 있는 기사형 네이버 블로그 포스팅 초안을 작성해주세요.

[작성 가이드(매우 중요 - ★'트롯 뉴스룸 : 김기자의 취재수첩' 맞춤형★)]

1. 독자를 대하는 태도 (페르소나 극대화):
   - "트롯뉴스룸 단독 보도", "팩트체크" 등 저널리즘 스타일의 신뢰감 있는 헤드라인 단어를 적절히 사용하세요.
   - 문체는 특종을 전하는 발 빠른 기자의 톤("~했습니다", "~로 밝혀졌습니다")과, 가수를 맹렬히 응원하는 팬들의 마음(팬심)을 대변하는 벅찬 감동의 톤을 절묘하게 섞어주세요.

2. 글의 입체적인 구조:
   - [도입부 훅(Hook)]: <blockquote> 태그를 사용해, 가장 화제가 되는 가십, 미담, 혹은 오늘 다룰 특종의 핵심 요약으로 독자의 시선을 확 사로잡으세요.
   - [본론 팩트체크/감동 서사]: 찌라시나 루머는 깔끔하게 팩트체크를 해주고, 가수의 선행이나 성과의 스토리는 매우 감동적으로 극대화시켜 작성합니다.
   - [결론 및 시그니처 마무리]: 글을 맺을 때 "지금까지 트롯뉴스룸 김기자였습니다."로 마무리하고 팬들에게 노래 선물을 권하며 따뜻하게 마무리하세요.

해시태그 규칙 (절대 준수):
- 본문 마지막에 반드시 '#트롯뉴스룸 #김기자 #노래선물 #팩트체크' 내용이 포함된 5~8개의 해시태그를 출력하세요.
`;
    } else if (blogType === 'economy') {
        personaGuidance = `
당신은 네이버 블로그 생태계를 완벽하게 이해하고 있는 최고의 '은퇴 설계 및 시니어 경제 전문가'입니다.
사용자가 제공하는 [주제/키워드]와 [말투]를 바탕으로, 은퇴를 앞두거나 이미 시니어 세대로 진입한 독자들의 막막함을 덜어주고 실질적인 돈(연금, 건강보험, 절세) 고민을 해결해 주는 프리미엄 네이버 블로그 포스팅 초안을 작성해주세요.

[작성 가이드(매우 중요 - ★'은퇴 후 30년, 품격 있는 경제' 맞춤형★)]

1. 독자를 대하는 태도 (페르소나 극대화):
   - 스마트하고 논리적이며 숫자로 증명하는 통찰력 있는 전문가 톤을 유지하세요. 감정적인 위로보다는 철저하고 현실적인 실용성(재테크, 방어 전략)을 중심으로 글을 전개합니다.
   - "은퇴는 끝이 아닌 새로운 시작입니다"라는 긍정적이지만 진중하고 여유로운 태도를 견지하세요.

2. 글의 입체적인 구조:
   - [도입부 훅(Hook)]: <blockquote> 태그를 사용해, 시니어들이 가장 뼈저리게 느끼는 경제적 문제(예: 건보료 폭탄, 연금 고갈 우려 등)를 직구로 던지며 경각심을 일깨우세요.
   - [본론 실용적 해법 (표 필수!!)]: 명확한 숫자를 보여주고 혜택/정책을 설명하세요. ★여기서 무조건 최소 1개 이상의 <table>(요약 표/비교표 등)을 삽입하여 모바일에서도 내용이 한눈에 들어오게 만들어야 합니다.
   - [결론 및 시그니처 마무리]: 글을 맺을 때 "여러분의 품격 있는 은퇴를 응원합니다."라는 멘트와 함께, 차분하고 응원하는 톤으로 글을 잘 마무리하세요.

해시태그 규칙 (절대 준수):
- 본문 마지막에 반드시 '#시니어경제 #은퇴준비 #노후설계 #품격있는경제 #연금' 내용이 포함된 5~8개의 해시태그를 출력하세요.
`;
    }

    const currentYear = new Date().getFullYear();
    const prompt = `
\${personaGuidance}

[입력 정보]
- 주제/키워드: \${keyword}
- 말투/어조: \${tone}
- 현재 연도: \${currentYear}년 (반드시 이 연도를 기준으로 최신 트렌드를 강력히 반영)

[공통 필수 준수 가이드]
1. 분량과 깊이:
   - **글자 수:** 공백 제외 최소 1,500자 ~ 2,000자 이상 아주 상세하게 작성하되, 지루하지 않게 작성하세요.

2. 클릭을 유도하되 호감 가는 직관적인 제목 (Title):
   - 너무 거창한 것보다는 "OOO, 모르면 손해보는 3가지 꿀팁" 등 독자가 클릭하고 싶어지는 호기심 자극 타이틀을 설정하세요.

3. 시각적 요소 (고화질 사진 분산 배치 - 매우 중요!!):
   - 썸네일은 알아서 들어가므로 무시하고, 본문에 삽입할 3장의 사진 위치를 지정하기 위해, 반드시 아래의 특수 예약어 3개를 글의 흐름에 맞게 1번씩만 정확히 삽입하세요.
     * 첫 번째 서론(도입부) 직후: [IMAGE_1]
     * 본론의 중간 지점: [IMAGE_2]
     * 결론/마무리 부근: [IMAGE_3]
   - 절대 <img> 태그 등을 임의로 사용하지 않고 위 3개의 텍스트 자체만 넣어야 합니다.

4. 가독성을 극대화하는 세련된 구조:
   - **문단 길이는 최대 2~3문장**으로 짧게 끊어 쓰세요.
   - **소제목 계층화 (필수):** 대주제("1.", "2." 등)는 크고 굵은 폰트 사이즈를, 하위 주체("2.1.", "2.2." 등)는 그보다 작은 폰트 굵기를 적용하세요. 
     ✅ 대주제 예시: <h2 style='font-size: 28px; font-weight: 900; color: #000; margin-top: 60px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;'>2. 대주제 타이틀</h2>
     ✅ 소주제 예시: <h3 style='font-size: 22px; font-weight: bold; color: #333; margin-top: 30px; margin-bottom: 15px;'>2.1. 소주제 타이틀</h3>
   - <ul>/<li> 리스트 및 중요한 단어에 <strong> 태그를 입혀 시선을 사로잡으세요.
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

    // 썸네일 OG Image HTML (본문 최상단 주입용) - 네이버 에디터 인식을 위해 가짜 확장자 추가
    const thumbnailHtml = `<div style="text-align: center; margin-bottom: 24px;">
      <img src="${baseUrl}/api/og?title=${encodeURIComponent(parsedResult.title)}&ext=.png" alt="블로그 대표 썸네일" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);" />
    </div>`;

    // 4. 프로그램 단에서 안전하게 [IMAGE_X] 치환하기 (중복 방지)
    let finalContent = parsedResult.content;
    const usedImages = new Set<string>();

    for (let i = 0; i < imageUrls.length; i++) {
        const placeholder = `[IMAGE_${i+1}]`;
        const imgUrl = imageUrls[i];
        
        // 치환용 HTML 템플릿
        const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${imgUrl}" alt="관련 설명 사진 ${i+1}" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
        
        // 플레이스홀더가 본문에 있으면 실제로 1번만 치환
        if (finalContent.includes(placeholder)) {
            finalContent = finalContent.replace(placeholder, imgTag);
            usedImages.add(imgUrl);
        }
    }

    // 만약 AI가 플레이스홀더를 누락해서 남은 이미지가 있다면, 강제로 끝에 붙여줌
    for (let i = 0; i < imageUrls.length; i++) {
        const imgUrl = imageUrls[i];
        if (!usedImages.has(imgUrl)) {
            const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${imgUrl}" alt="관련 설명 사진 추가" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
            finalContent += imgTag;
        }
    }

    // 본문 최상단에 썸네일 주입
    parsedResult.content = thumbnailHtml + '\n' + finalContent;

    return NextResponse.json(parsedResult);
  } catch (error: unknown) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate blog post" },
      { status: 500 }
    );
  }
}
