import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Initialize Gemini SDK
// Note: You must have GEMINI_API_KEY in your .env.local file
const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { keyword, tone } = await req.json();

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    // 1. 키워드를 바탕으로 고화질 무료 이미지(Unsplash)에서 검색할 영어 단어 추출
    const translatePrompt = `당신은 검색어에서 가장 핵심적인 이미지를 추출하는 AI입니다. 
    사용자가 입력한 검색어에 가장 잘 어울리는 고품질 무료 사진을 Unsplash에서 찾기 위해, 영어 검색어 2개를 추출하세요.
    1. primary: 검색어를 가장 잘 표현하는 구체적이고 감각적인 영어 단어 1~2개
    2. fallback: primary 검색 실패 시 사용할, 검색어의 상위 카테고리에 해당하는 매우 포괄적이고 대중적인 영어 단어 1~2개 (예: animal, nature, technology, business, food, health, interior, city, lifestyle 등 무조건 검색 결과가 수만 장씩 나오는 넓은 의미의 단어)
    
    예시:
    "강아지 여름 산책" -> {"primary": "dog walking", "fallback": "happy dog"}
    "척추 임플란트" -> {"primary": "hospital room", "fallback": "health"}
    "엘앤케이바이오" -> {"primary": "laboratory", "fallback": "science"}
    "삼성전자" -> {"primary": "semiconductor", "fallback": "technology"}
    "다이어트 식단" -> {"primary": "healthy salad", "fallback": "diet food"}

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
        const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(kw)}&per_page=3&orientation=landscape`);
        if (res.ok) {
          const json = await res.json();
          if (json.results && json.results.length >= 3) {
            return json.results.slice(0, 3).map((r: { urls: { regular: string } }) => r.urls.regular);
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
    const prompt = `
당신은 네이버 블로그 생태계를 완벽하게 이해하고 있는 '상위 1% 전문 지식 블로거이자 브랜딩 전문가'입니다.
사용자가 제공하는 [주제/키워드]와 [말투]를 바탕으로, 가볍지 않고 **매우 세련되고(Sophisticated), 신뢰감을 주며, 읽는 이의 품격을 올려주는 프리미엄 네이버 블로그 포스팅 초안**을 작성해주세요.

[입력 정보]
- 주제/키워드: ${keyword}
- 말투/어조: ${tone}

[작성 가이드(매우 중요 - ★프리미엄 원고 타겟★)]

1. 분량과 깊이 (극대화):
   - **글자 수:** 공백 제외 최소 1,500자 ~ 2,000자 이상 아주 상세하고 밀도 있게 작성하세요.
   - **전문성과 세련됨:** 너무 자극적이거나 '돈 버는 법', '대박' 같은 저렴한 표현을 배제하세요. 대신 깊이 있는 원리, 정제된 장단점 비교, 우아한 해결책, 전문가적 통찰을 고급스러운 어휘로 총망라하세요.
   - **구조의 미학:** 밋밋한 줄글 대신, 여러 개의 <hr>(구분선), <blockquote>(정제된 인용구/핵심 요약), 번호 매기기, 그리고 <table>(깔끔한 비교표) 등을 적극 활용하여 시각적으로도 아름다운 문서를 만드세요.

2. 클릭을 유도하되 품격을 잃지 않는 제목 (Title):
   - **핵심 키워드 배치:** 타겟 키워드는 제목에 자연스럽게 녹이되 상위 노출을 고려하세요.
   - **은유와 구체성의 결합:** 자극적인 수치보다는 "완벽한 가이드", "본질에 다가가는", "전문가가 제안하는", "가장 우아한 선택" 등 신뢰도를 높이는 타이틀을 구성하세요.

3. 시각적 요소 (**고화질 사진 완벽 분산 배치 - 매우 중요!!**):
   - 본문에 들어갈 3장의 사진 위치를 지정하기 위해, 반드시 아래의 특수 예약어(Placeholder) 3개를 글의 흐름에 맞게 1번씩만 정확히 삽입하세요.
   - 썸네일은 시스템이 자동으로 최상단에 넣으므로 제외하고, 당신이 넣는 3장의 사진 자리표시는 반드시 아래의 매칭 규칙에 따라 **글 전체에 넓게 분산**시켜야 합니다:
     * 서론(도입부)가 끝나고 본격적인 본론(1번 대주제)이 시작되기 직전 -> **[IMAGE_1]** 텍스트 삽입
     * 본론의 중간 지점 (2번 대주제 내용 중) -> **[IMAGE_2]** 텍스트 삽입
     * 결론(마무리 과정) 또는 마지막 인사이트 부분 -> **[IMAGE_3]** 텍스트 삽입
   - 절대 <img> 태그나 다른 HTML을 사용하지 말고 오직 **[IMAGE_1]**, **[IMAGE_2]**, **[IMAGE_3]** 이 세 개의 텍스트만 본문에 정확히 넣어주세요. (같은 예약어를 두 번 쓰면 절대 안 됩니다.)
   - 예약어 위아래로 약간의 여백(<p><br></p>)을 두세요.

4. 체류시간을 늘리는 세련된 본문 구조 (단순 나열 절대 금지, 가독성 극대화):
   - **가장 중요한 규칙:** 글이 답답해 보이지 않도록 **문단(Paragraph)은 최대 2~3문장**으로 짧게 끊어 쓰세요. 단조로운 줄글의 나열은 독자가 바로 이탈하게 만듭니다.
   - **소제목(목차) 계층화 및 스타일링 (매우 필수!):** "2. OOO", "2.1. OOO" 처럼 섹션을 나눌 때 절대 일반 <p>나 단순 텍스트, 혹은 굵기만 준 텍스트를 쓰지 마세요!! 대주제와 소주제의 크기와 디자인 차이가 명확해야 합니다.
     ✅ 대주제("1.", "2." 등) 예시: <h2 style='font-size: 28px; font-weight: 900; color: #000; margin-top: 60px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;'>2. 대주제 타이틀</h2>
     ✅ 소주제("2.1.", "2.2." 등) 예시: <h3 style='font-size: 22px; font-weight: bold; color: #333; margin-top: 30px; margin-bottom: 15px;'>2.1. 소주제 타이틀</h3>
   - **리스트(Bullet Points) 및 강조 적극 활용:** 여러 항목을 설명할 때는 줄글로 쓰지 말고, 반드시 <ul>과 <li> 태그를 사용하여 목록형으로 정리하세요. 글 중간중간 중요한 단어나 문장에는 **<strong>** 태그를 입혀 시선을 사로잡으세요.
   - **첫 도입부(에세이 형식):** <blockquote>를 활용하여 독자의 감성을 건드리거나 지적 호기심을 유발하는 고급스러운 오프닝 문단을 최상단에 작성하세요. (인용구 스타일 예: <blockquote style='border-left: 4px solid #00c73c; padding-left: 16px; color: #4b5563;'>...</blockquote>)
   - **논리적 전개:** ①문제 인식 및 트렌드 조망 → ②핵심 가치 제안 → ③객관적 비교 테이블(Table) → ④전문가의 제언 및 인사이트 → ⑤우아한 마무리 및 행동 유도. 내용 중 중요한 부분은 깔끔한 <table> 태그 구문을 1개 이상 필수 작성하세요.
   - **중요**: HTML 태그에 속성을 넣을 때는 큰따옴표(") 대신 **반드시 홑따옴표(')**를 사용하세요.

5. 절대 금지! (저품질 및 스팸 방지):
   - '대출', '보험' 등 저품질 키워드나 너무 상업적인 "무조건 당장 클릭하세요" 등의 싸구려 멘트(Clickbait)는 절대 금지합니다.
   - 정보의 질을 낮추는 과도한 이모티콘 반복을 피하고, 텍스트 자체의 우수함으로 승부하세요.

6. 해시태그 (Tags):
   - 본문 내용과 완전히 들어맞는 세련된 해시태그 5~8개를 작성하되, **반드시 본문(content) HTML의 제일 마지막 부분**에 추가하세요 (<p>#해시태그1 #해시태그2</p>).

[출력 형식 제한]
반드시 아래의 JSON 형식으로만 응답해야 합니다. 다른 부연 설명이나 코드 블럭 기호를 추가하지 마세요.
**[매우 중요]**: JSON 형식이 깨지지 않도록, "content" 영역 내에 부득이하게 큰따옴표가 들어갈 경우 역슬래시(\\")로 이스케이프 처리해야 하며, 줄바꿈은 반드시 \\n 으로 입력하세요. HTML 속성은 무조건 홑따옴표를 씁니다.
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
