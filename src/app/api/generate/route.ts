import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { keyword, deviceType = 'desktop' } = await req.json();

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

    const personaGuidance = `
당신은 한국 네이버 블로그 생태계를 완벽하게 파악하고 있는 최고의 '전문가 블로거'입니다.
이 블로그의 핵심 콘셉트는 "명확한 정보 전달과 높은 체류시간 유도"입니다. 사용자 검색어를 바탕으로 최고 품질의 전문가급 정보성 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 필수 작성 가이드]
1. 독자 지칭 및 기본 문체:
   - 독자를 "여러분" 혹은 "이웃님들"로 친근하게 지칭하세요.
   - 글의 분위기는 전문적이지만, 읽기 편한 구어체(~해요, ~입니다)를 바탕으로 아주 친절하고 꼼꼼하게 설명하세요.
   - 어려운 용어는 누구나 이해하기 쉽게 풀어쓰고, 도입부에서는 독자의 고민이나 검색 의도에 강하게 공감하며 시작하세요.

2. 공감 및 체류 유도 구조 (필수):
   - 본문 중간중간 독자에게 질문을 던지거나 공감을 유도하는 문장형을 배치하여 가독성을 높이세요.
   - 실질적인 꿀팁과 요약 정리를 잘 배치해 정보의 가치와 포스팅의 퀄리티를 극대화하세요.
   - 해시태그 규칙: 맨 아래에 태그 목록을 #전문가컬럼 #정보성블로그 등 검색어와 매칭하여 스페이스로 구분해 5~7개 적어주세요.
`;

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
`;

    const prompt = `
${personaGuidance}
${realTimeSeoGuidance}

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
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        tools: [{ googleSearch: {} }] // 구글 검색을 통한 최신 타 블로그 글 분석 벤치마킹 활성화
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
      <img src="${baseUrl}/api/og?title=${encodeURIComponent(parsedResult.title)}&type=expert${bgUrlParam}&ext=.png" alt="대표 썸네일" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);" />
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
