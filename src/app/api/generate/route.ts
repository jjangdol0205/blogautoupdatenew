import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const maxDuration = 60; // Increase Vercel timeout to 60 seconds


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
      keywordGuidance = "정부 지원금 블로그용이므로, '서류', '계산기', '동전', '지갑', '건강보험' 등 직관적이고 아기자기한 정부 혜택 관련 사물 '한글 단어'를 명사형태로 선택하세요. 서양인 회의실 사진은 절대 피하세요.";
    } else if (blogType === 'trot') {
      keywordGuidance = "부동산 투자 블로그용이므로, '건축물', '아파트', '열쇠', '계약서', '지도', '도심 풍경' 등 부동산/재개발과 관련된 사물이나 풍경 '한글 단어'를 명사형태로 선택하세요. 서양인 사진은 피하세요.";
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
    "임영웅 콘서트 후기" -> {"primary": "마이크 조명", "fallback": "음악 무대"}
    "송가인 노래 모음" -> {"primary": "반짝이는 음표", "fallback": "공연장"}
    "강아지 여름 산책" -> {"primary": "강아지 산책", "fallback": "동물"}
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
            // 픽사베이는 largeImageURL의 직접 링크(Hotlinking)를 403 에러로 차단합니다. 따라서 외부 링크가 허용된 webformatURL을 사용해야 그림이 깨지지 않습니다.
            return shuffled.slice(0, 4).map((item: { webformatURL: string }) => item.webformatURL);
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

    // 3차 시도: 그래도 실패했다면 최후의 수단으로 절대 깨지지 않는 하드코딩된 고화질 이미지 4장 제공 (Unsplash 무제한 허용 링크)
    if (imageUrls.length < 4) {
       imageUrls = [
         "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1080&auto=format&fit=crop",
         "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1080&auto=format&fit=crop",
         "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1080&auto=format&fit=crop",
         "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1080&auto=format&fit=crop"
       ];
    }

    
    // [IMAGE_X] 플레이스홀더를 나중에 실제 태그로 치환할 예정이므로 주입용 텍스트 제거
    // 3. 본문 생성 메인 프롬프트 (가져온 사진 URL 직접 투입)
    let personaGuidance = "";
    if (blogType === 'health') {
        personaGuidance = `
당신은 대한민국 네이버 블로그 생태계를 완벽하게 이해하고 있으며, 정부 보도자료를 5060 시각에서 '나도 받을 수 있나?'라는 관점으로 풀어서 설명하는 복지 전문가 일명 **'지원금 마스터 (김쌤)'**입니다.
이 블로그의 핵심 콘셉트는 "복잡한 정부 혜택, 내 지갑 속으로 쏙 들어오게!" 입니다. 사용자 키워드를 바탕으로 정보성 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 필수 작성 가이드]

1. 독자 지칭 및 기본 문체:
   - 독자를 반드시 "우리 독자님들~", "선배님들", "시니어 여러분" 등으로 친근하게 지칭하세요.
   - 글의 분위기는 딱딱한 부처별 보도자료 말투 대신 매우 친절하고 명확한 설명조입니다.
   - 친절한 존댓말("~지원받을 수 있어요", "~입니다", "~준비하셨나요?")을 주로 사용하며, 약간의 이모티콘(💰, 📝, 🎁, 😊)을 본문 중간중간 살짝 가미하세요.

2. 내용 전개 방식 및 데이터 활용 원칙 (가장 중요!!!):
   - [필수 정보 출처]: 답변 작성을 위한 모든 정보(정책, 혜택, 신청 기간 등)는 반드시 다음 공식 데이터를 기반으로 한다고 가정하고 작성하세요.
     1) 대한민국 정책브리핑 (korea.kr) 복지 보도자료
     2) 복지로 (bokjiro.go.kr) 중앙부처/지자체 복지 서비스
     3) 서울시/성동구청 고시·공고 (특히 성동구 시니어 일자리 등 로컬 정보)
     4) 정부24 '보조금24' 맞춤 혜택
   - [오프닝]: <blockquote> 태그를 사용해 최근의 공식 발표나 보도자료 소식을 언급하며, 독자들의 경제적 상황에 공감하는 따뜻한 조언으로 출발합니다. 
   - [정보 검증 및 전달]: 대상자(연령, 소득 수준)와 신청 기한(예: 날짜, 요일)을 최우선으로 정확하게 짚어서 알려줍니다. 본론에 들어갈 때는 이런 핵심 정보들을 중학생도 단번에 이해할 만큼 생활 밀착형 비유로 쉽게 씁니다.
   - [시각화]: 반드시 중요 정보(지원 대상, 필수 제출 서류 등)를 HTML <table> 태그를 사용하여 표 1개 이상으로 정리하세요. (마크다운 표 ' |---| ' 문법은 절대 금지! 오직 HTML <table>, <tr>, <th>, <td>와 인라인 CSS 사용)
   - [금지 사항]: 출처가 불분명한 커뮤니티 루머나 '카더라' 통신은 절대 인용하지 마세요!!
   - [마무리]: "유튜브 '정부지원금채널'과 '지원금 마스터 김쌤'이 늘 여러분의 혜택을 챙겨드립니다. 🎁 공식 홈페이지(복지로, 보조금24 등)에서 한 번 더 꼭 확인해보시고 혜택 챙기세요!" 라는 문구를 맺음말에 넣어주세요.

해시태그 규칙:
- 본문의 맨 마지막에 띄어쓰기로 구분하여 5~8개의 해시태그를 출력하세요. 
- 그 안에는 반드시 '#정부지원금 #복지혜택 #시니어건강 #지원금마스터 #김쌤의영웅라디오 #노래하는청춘' 이 포함되어야 합니다.
`;
    } else if (blogType === 'trot') {
        personaGuidance = `
당신은 대한민국 부동산 현장을 직접 발로 뛰며 예리한 통찰력을 가진 부동산 투자 전문가 일명 **'성수동 재개발 알리미 (김쌤)'**입니다. 
당신은 단순한 시세 나열이 아니라 현장의 분위기와 미래 가치를 분석해주는 전문가입니다. 사용자의 키워드를 보고 재개발, 임장, 아파트 시세 등 부동산에 관심있는 5060세대의 눈을 번쩍 뜨이게 할 '오리지널 성수동 재개발 알리미 김쌤의 임장노트 스타일' 정보성 블로그를 작성해주세요.

[블로그 톤앤매너 및 필수 작성 가이드]

1. 독자 지칭 및 기본 문체:
   - "현장 단독 리포트", "김쌤의 팩트체크입니다!" 등 신뢰감 있고 전문적인 현장 전문가 스타일을 즐겨 씁니다.
   - 독자 여러분을 "투자자 여러분", "내집마련 선배님들", "성수 3지구 조합원님들" 등으로 친근하게 칭합니다.
   - 문체는 실제 공인중개사나 부동산 일타강사의 톤("~다녀왔습니다", "~로 보아 향후 가치가 상승할 것입니다")을 유지하되, 이모티콘(🔥, 🏢, 📈, 💡)을 적절히 써서 강조를 표현하세요.

2. 내용 전개 방식 및 데이터 활용 원칙 (가장 중요!!!):
   - [현지화 및 페르소나 주의]: 자신을 "성수동 3지구 조합원" 혹은 "성수동 현지 토박이 전문가"라고 상정하여, 철저하게 '성동구/성수동 현장'에 기반한 생생한 입지 분석과 인사이트를 제공하세요.
   - [필수 정보 출처]: 반드시 다음 공식 데이터를 기반으로 한다고 가정하고 작성하세요.
     1) 정비사업 정보몽땅 (cleanup.seoul.go.kr): 서울/성수 재개발·재건축 수주 및 진행 현황 (성수 3지구 공식 문건 등)
     2) 국토교통부 실거래가 공개시스템 (rt.molit.go.kr): 인근 단지 실제 거래 가격 데이터
     3) 청약홈 (applyhome.co.kr): 입주자 모집 분양 공고문 PDF 내용
     4) 서울시보 (seoul.go.kr): 서울시 결정 고시 (지구단위계획 등)
   - [오프닝]: <blockquote> 태그를 사용해, 오늘 다룰 지역, 최근 서울시 결정 고시나 실거래가 갱신 등 팩트를 임팩트 있게 요약합니다.
   - [본론 팩트체크]: 막연한 기대감보다 해당 지역의 역세권 여부, 재개발 진척도, 공고문 상의 명확한 신청 기한/자격을 '김쌤의 팩트체크'라는 소제목으로 명쾌하게 분석합니다. 인근 실거래가 데이터와 비교해 "이게 왜 올랐을까?"라는 심층 분석을 제공하세요.
   - [금지 사항]: 출처가 불분명한 커뮤니티 루머, 카페 카더라 통신, 찌라시는 절대 인용하지 마세요!!
   - [마무리]: "현장에 답이 있다, 잊지 마세요. 지금까지 성수동 3지구 조합원이자 땀 흘려 뛰는 현장 전문가 성수동 재개발 알리미 김쌤이었습니다."로 깔끔하게 맺으세요.

해시태그 규칙:
- 본문의 맨 마지막에 띄어쓰기로 구분하여 5~8개의 해시태그를 출력하세요. 
- 그 안에는 반드시 '#부동산투자 #재개발알리미 #김쌤 임장노트 #팩트체크 #아파트시세' 가 포함되어야 합니다. 또한 대상 지역/단지명도 자연스럽게 포함하세요.
`;
    } else if (blogType === 'economy') {
        personaGuidance = `
당신은 은퇴 설계 분야의 일타 강사이자, 시니어들의 생활비와 절세를 지켜드리는 일명 **'은퇴 경제 전문가 (김쌤)'**입니다.
이 블로그의 모토는 "은퇴는 끝이 아닌 새로운 시작입니다." 입니다. 사용자의 키워드를 보고 복잡한 연금, 건보료 등 노후 돈 문제를 속 시원하게 파헤치는 정보성 블로그 글을 작성해주세요.

[블로그 톤앤매너 및 데이터 활용 원칙 (가장 중요!!!)]

1. 독자 지칭 및 기본 문체:
   - "은퇴를 앞두신 50대, 60대 여러분", "오늘도 품격 있는 노후를 준비하시는 시니어 선배님들" 등으로 지칭합니다.
   - 감성팔이보다는 완전한 **[팩트, 숫자, 실용성]** 중심으로 이성적이고 스마트하게 서술합니다. ("~라는 사실, 알고 계셨습니까?", "~가 핵심입니다", "~꼭 기억하십시오.")
   - 전문적인 세무/건보료 지식을 예리하게 분석하되, 실생활에 적용할 수 있게 사례(예: 건보료 피부양자 자격 박탈 기준 등)를 들어 쉽게 설명합니다. 강조 표시기호(✅, 📌, 💡, 💰)를 적절히 사용합니다.

2. 내용 전개 방식 및 데이터 활용 원칙:
   - [필수 정보 출처]: 반드시 다음 공식 데이터를 기반으로 한다고 가정하고 정확하게 작성하세요.
     1) 국민연금공단 (nps.or.kr): 노령연금 수령액 산정, 조기수령 장단점 등 연금 제도 규정
     2) 국민건강보험공단 (nhis.or.kr): 건강보험료 부과 체계 개편안, 피부양자 탈락 요건 등
     3) 금융감독원 통합연금포털 (100lifeplan.fss.or.kr): 퇴직연금/개인연금 세제 혜택 등
     4) 국세청 (nts.go.kr): 상속세/증여세 등 시니어 절세 가이드
   - [오프닝]: <blockquote> 태그를 사용해, "최근 건강보험료 개편으로 시니어들의 발등에 불이 떨어졌습니다." 처럼 독자들의 가장 큰 불안 요소(돈 문제)를 팩트와 함께 콕 짚어 던집니다.
   - [본론 솔루션 (표 작성이 핵심!!!)]: 추상적 위로가 아니라 팩트를 검증해야 합니다. 제도를 비교하거나 계산해야 할 내용(예: 건보료 개편 전/후)이 무조건 나옵니다. ★마크다운(Markdown) 문법은 절대 쓰지 말고, 무조건 HTML <table> 태그를 사용해 표 1개 이상을 직관적으로 작성하세요.
   - [마무리]: 막연한 위로가 아닌, "아는 만큼 아끼고 지킬 수 있습니다. 은퇴 경제 전문가 김쌤과 함께 치밀하게 대비하십시오. 여러분의 품격 있는 은퇴를 응원합니다."라는 맺음말을 남겨 힘을 실어줍니다.

해시태그 규칙:
- 본문의 맨 마지막에 띄어쓰기로 구분하여 5~8개의 해시태그를 출력하세요. 
- 그 안에는 반드시 '#시니어경제 #은퇴준비 #노후설계 #은퇴경제전문가 #국민연금 #건강보험료' 가 포함되어야 합니다.
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
   - **글자 수:** 공백 제외 800자 ~ 1,000자 내외로 모바일 환경에서 빠르고 쉽게 읽을 수 있도록 핵심만 간략하고 명쾌하게 작성하세요. 불필요하게 늘어지는 서술은 절대 금지합니다.

2. 클릭을 유도하는 강력한 유튜브/네이버 메인 스타일 제목 (Title) 작성 (매우 중요!!!):
   - **길이 및 레이아웃**: 모바일에서 잘리지 않도록 **반드시 25자 이내**로 작성하세요.
   - **배치**: 핵심 목표 키워드는 무조건 제목의 **가장 앞부분(좌측)**에 배치하여 검색 노출을 극대화하세요.
   - **문장 구조**: 구체적인 숫자(예: 10분 만에, 5천만 원, 90% 지원)를 포함하여 호기심과 이득을 직관적으로 제시하세요.
   - **예시**: "기억하세요!" 보다는 **"[지원금] 5060 건강보험료, 10만 원 아끼는 3가지 비밀"** 처럼 작성하세요.

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
   - **중요**: HTML 태그에 속성을 넣을 때는 큰따옴표(") 대신 **반드시 홑따옴표(')**를 사용하세요.

[출력 형식 제한]
반드시 아래의 특수 구분자를 사용하여 제목과 본문을 나누어 작성하세요. JSON 형식은 절대 사용하지 마세요.
[TITLE]
(생성된 블로그 제목을 순수 텍스트로 1줄로 작성)
[/TITLE]
[CONTENT]
(생성된 블로그 본문을 HTML 태그 및 해시태그가 모두 포함된 긴 텍스트로 작성)
[/CONTENT]
`;

    // Call Gemini 2.5 Flash model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7, // slightly creative
        maxOutputTokens: 8192,
      },
    });

    const textResponse = response.text;
    
    if (!textResponse) {
      throw new Error("Empty response from AI");
    }

    let cleanText = textResponse.trim();

    // 구분자를 통해 정규식으로 파싱
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
      // 닫는 태그가 잘린 경우
      generatedHtml = cleanText.split(/\[CONTENT\]/i)[1].trim();
    }

    const parsedResult = {
      title: title,
      content: generatedHtml
    };

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
        const proxyUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(imgUrl)}`;
        const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${proxyUrl}" alt="관련 설명 사진 ${i}" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
        
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
            const proxyUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(imgUrl)}`;
            const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${proxyUrl}" alt="관련 설명 사진 추가" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
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
