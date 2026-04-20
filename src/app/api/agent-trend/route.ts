import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import crypto from "crypto";

const ai = new GoogleGenAI({});

export const maxDuration = 60; // Vercel 서버리스 함수 타임아웃 최대 연장

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch(e) {}
    const { goodUrl, badUrl, bannedKeywords = [], style, coreKeyword } = body;

    let feedbackLearningGuidance = "";
    if (goodUrl || badUrl) {
      feedbackLearningGuidance += `
[개인화된 맞춤형 타겟팅 지침]
사용자가 과거 작성한 블로그 피드백 주소입니다. 이 블로그의 톤앤매너와 주요 주제(니치)를 분석하고, 사용자의 전문 분야에 맞는 트렌드 키워드를 발굴하세요.
`;
      if (goodUrl) feedbackLearningGuidance += `- 성공 사례(이 분야 위주로 발굴): ${goodUrl}\n`;
      if (badUrl) feedbackLearningGuidance += `- 실패 사례(이 분야와 유사한 포괄적 키워드는 배제): ${badUrl}\n`;
    }
    const bannedSection = bannedKeywords.length > 0 
      ? `\n[절대 금지 키워드 (이미 과거에 3번 이상 추출됨)]\n아래 키워드들은 절대로 다시 제안하지 마세요: ${bannedKeywords.join(', ')}\n` 
      : "";

    const creatorAdvisorData = `
[📊 네이버 크리에이터 어드바이저 공통 급상승 트렌드 (최신 데이터) 📊]
- 비즈니스/경제: 롯데카드 영업정지, 2026 자녀장려금 100만원, 청년미래적금, 출국납부금 환급, 대우건설 주가 660% 급등, 카카오뱅크 ai퀴즈, 호르무즈 해협
- IT/컴퓨터: 나무엑스 퀴즈, 아이폰18, sbti 테스트, 인스타 계정 삭제, 네이버 나침반, 삼성페이 교통카드, 클로드 ai
- 사회/정치: 박진성 시인, 금쪽이 263회, 영화 살목지 정보, 남미새 뜻, 평택 왁싱샵, 금쪽이 뇌진탕
- 스타/연예인/방송: 유명 걸그룹 오빠 가정폭력 폭로, 송중기 케이티, 안재현 사주, 변우석 아이유 첫 동침 입맞춤, 박명수 매니저 결별
- 인테리어/DIY/생활: 코스트코 추천, 이태원 앤티크 스트릿, 버거킹 아이스크림, 천연제습제, 루비레드키위, 광주 가구쇼
* (지시사항): 블로그당 하루 10~15개씩 포스팅이 발행되므로, 위 최신 데이터를 베이스로 참고하여 서로 절대 중복되지 않도록 다채롭게 발굴하세요.
`;
    feedbackLearningGuidance += creatorAdvisorData;

    let prompt = "";
    
    if (style === 'blog2') {
      prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터이자, **'IT/테크 기기 및 생활/가전/상품 꿀템'**을 전문으로 다루는 "자동봇 2호기(두 번째 블로그)" 편집장입니다.
현재 목표는 20~40대 남녀 직장인 및 주부들이 무조건 클릭하게 만드는 생활 밀착형 대박 롱테일 키워드 5개를 발굴하는 것입니다.
${bannedSection}
${feedbackLearningGuidance}

[크리에이터 어드바이저 기반 타겟 분석 (학습 데이터: 최신 4월 16일자 패턴 적용)]
- IT/컴퓨터(AI 꿀팁/디자인 유출): '아이폰18 디자인 예상/출시일(new)', '덕테이프 AI(new)', '유튜브 프리미엄 라이트', '아이폰 통화녹음/잠금화면'
- 상품리뷰(신규 굿즈/영양제/장난감): '디올뷰티 베니티(new)', '맥도날드 해피밀(new)', '티라노 골드 플러스 가격(new)', '스타벅스 신상(토이스토리, 미니텀블러(new))'

[🔥 두 번째 블로그 실제 상위 노출 증명 데이터 (피드백 반영) 🔥]
1. 디올뷰티 베니티 파우치? 오전 7시 대기줄 실화? 결국 품절... (조회수 450회)
2. 아이폰18 예상 디자인 유출 사진 공개? 렌더링 수준 ㄷㄷ... (조회수 320회)
3. 맥도날드 해피밀 4월 라인업 장난감? 엄마들 줄 서는 이유... (조회수 280회)
* (핵심 분석): 명품 사은품과 IT 신제품 유출 정보의 클릭률이 매우 높습니다. 하지만 한 가지 주제만 파면 트래픽이 정체(Cannibalization)되므로 다양한 카테고리를 섞어야 합니다.

[🚨 두 번째 블로그(Blog2) 핵심 미션: 5대 핵심 카테고리 확장 및 중복 억제 🚨]
- 카테고리 무한 확장: 아래 [5대 핵심 카테고리] 전반을 폭넓게 탐색하여 조회수 폭발이 가능한 완전히 새로운 키워드를 섞어내야 합니다.
  1. [명품 뷰티 굿즈/사은품 대란] (예: 디올뷰티 베니티, 샤넬 파우치 등)
  2. [유명 프랜차이즈/생활용품 핫딜] (예: 맥도날드 해피밀, 스타벅스 신상 텀블러, 코스트코 추천템)
  3. [혁신 AI 툴/앱 사용법] (예: 덕테이프 AI, 클로드 AI, 월 O만원 미친 AI앱 등)
  4. [스마트폰/IT기기 유출 및 꿀팁] (예: 아이폰18 유출, 유튜브 프리미엄 우회, 갤럭시 숨은 기능)
  5. [영유아/가족 추천템] (예: 티라노 골드 플러스 가격, 어린이 영양제, 품절대란 장난감)
- 🚫 [절대 중복 금지 규칙]: 추출하는 5개의 키워드는 반드시 **위 5가지 카테고리에서 각각 1개씩 서로 다르게 골고루 뽑아야** 합니다. 두 개 이상의 키워드가 같은 카테고리에 속하면 절대 안 됩니다.
- 제목 후킹 요소: 스펙 나열이 아닌, **"결국 품절", "오전 7시 대기줄", "공짜로 받는 법", "월 O만원 미친 AI앱", "유출 사진 공개"** 등의 강력한 심리적 후킹 요소를 결합하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "5대 카테고리 중 하나에 속하는 조회수 폭발 강력한 롱테일 키워드 (각 카테고리당 1개씩만 추출)",
      "reason": "왜 이 키워드가 일상적인 검색 니즈와 결핍을 완벽히 자극하는지(1~2문장)"
    }
  ]
}
`;
    } else if (style === 'blog3') {
      prompt = `
당신은 대한민국 4060 세대의 폭발적인 공감을 이끌어내는 **'건강/의학 및 웰니스 전문 꿀팁'** 에디터입니다.
현재 구글 검색(Google Search)을 능동적으로 활용하여 일상 통증, 성인병, 최신 다이어트/신약 트렌드 등을 결합한 한방에 엄청난 트래픽을 끌어올 메가 트렌드 롱테일 키워드 5개를 추론해내세요.
${bannedSection}
${feedbackLearningGuidance}

[크리에이터 어드바이저 건강/의학 타겟 분석 (학습 데이터: 최신 4월 16일자 패턴 적용)]
- 질환/검사/통증: '급성구획증후군(new)', '마라탕 식중독(new)', '송화가루 알레르기(new)', '갑상선암 증상', '당뇨 초기증상', '왼쪽 아랫배/오른쪽 옆구리 통증'
- 미용/다이어트 비법: '아이린 36세 몸매 비법 4가지(new)', '위너확장구멍'
- 의약품/영양제 핫이슈: '투엑스비 츄어블/가격(new)', '아젤리아크림', '올리브오일/마그네슘/알부민 효능', '몸속 염증 없애기'

[🔥 세 번째 블로그 실제 상위 노출 증명 데이터 (피드백 반영) 🔥]
1. 급성구획증후군? 근육 괴사 주의! 초기 증상 무시하면... (조회수 520회)
2. 1020 마라탕 식중독 위생 고발? 자녀가 먹는다면 당장 금지... (조회수 380회)
3. 투엑스비 츄어블 부작용? 약국 품절 대란 가격 총정리... (조회수 310회)
* (핵심 분석): 4060 세대는 '자녀의 건강 위협'과 '급성 질환의 공포'에 가장 민감하게 반응합니다. 정보성 글보다는 경각심을 주는 글이 트래픽이 높습니다.

[🚨 세 번째 블로그(Blog3) 핵심 미션: 5대 핵심 카테고리 확장 및 중복 억제 🚨]
- 카테고리 무한 확장: 아래 [5대 핵심 카테고리] 전반을 폭넓게 탐색하여 조회수 폭발이 가능한 완전히 새로운 건강 키워드를 섞어내야 합니다.
   1. [급성 질환/통증 공포] (예: 급성구획증후군, 갑상선암 증상, 원인 모를 옆구리 통증 등)
   2. [생활 속 위생/식중독 경고] (예: 마라탕 식중독, 배달음식 위생 고발, 송화가루 알레르기)
   3. [약국 핫템/품절 영양제] (예: 투엑스비 츄어블, 아젤리아크림, 특정 비타민 품절 사태)
   4. [중년 다이어트/연예인 관리 비법] (예: 아이린 36세 몸매 비법, 4050 뱃살 빼는 식단)
   5. [민간요법/천연 식재료 효능] (예: 올리브오일/마그네슘 조합, 몸속 염증 없애는 차)
- 🚫 [절대 중복 금지 규칙]: 추출하는 5개의 키워드는 반드시 **위 5가지 카테고리에서 각각 1개씩 서로 다르게 골고루 뽑아야** 합니다. 두 개 이상의 키워드가 같은 카테고리에 속하면 절대 안 됩니다.
- 제목 후킹 규칙: 반드시 **"충격적인 위생", "자녀가 먹는다면 당장 금지", "근육 괴사 주의", "약국 품절 대란", "매일 먹었더니 벌어진 일"** 식의 직관적이고 강력한 건강 썸네일용 텍스트를 기획하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "5대 카테고리 중 하나에 속하는 4060 타겟 강력한 롱테일 키워드 (각 카테고리당 1개씩만 추출)",
      "reason": "왜 이 건강 키워드가 4060 사람들의 절박한 검색 니즈(결핍)를 건드리는지 분석 (1~2문장)"
    }
  ]
}
`;
    } else {
      prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)입니다.
현재 구글 검색을 실시간으로 활용하여, **네이버 홈판 경제/사회/이슈 탭에 올라갈 수 있을 만큼 전국민적인 폭발력을 가진 '메가 황금 트렌드/롱테일 키워드' 딱 5개**를 능동적으로 추론하고 발굴해내세요.
${bannedSection}
${feedbackLearningGuidance}

[사용자 지정 핵심 주제]
- 오늘 집중 탐색할 주제: ${coreKeyword ? `"${coreKeyword}"` : "'대중의 지갑 사정과 연결된 폭발적인 재테크/사회/정치 뉴스'"}

[크리에이터 어드바이저 타겟 분석 (학습 데이터: 최신 4월 16일자 패턴 적용)]
- 비즈니스/경제(충격 경제뉴스/유리기판): '과천 19억 아파트 8억 매매(new)', '장기보유 1주택 양도세 폐지 논란(new)', 'IMF 경고/5년 뒤 한국 빚폭탄(new)', '전기세 인상/개편(new)', '유리기판 관련주(new)', '양자컴퓨터/아이온큐'
- 사회/정치/사건사고(방송인성 논란): '광주 중학생 금쪽이/교사 뇌진탕(new)', '홍대 박성범 인스타(new)', '남미새 뜻(new)', '텐퍼센트 김해부원역점 논란(new)', '오선재(new)'

[🔥 첫 번째 블로그 실제 상위 노출 증명 데이터 (피드백 반영) 🔥]
1. 광주 중학생 금쪽이 교사 뇌진탕? 충격적인 원본 영상 분노... (조회수 890회)
2. 과천 19억 아파트 8억 매매 반토막 현실? 영끌족 비상... (조회수 650회)
3. 장기보유 1주택 양도세 폐지 논란? 안 팔면 바보 되는 이유... (조회수 420회)
* (핵심 분석): 빌런에 대한 '분노(공분)'와 자산 폭락에 대한 '공포'가 가장 높은 클릭을 유도합니다. 동일 주제 쏠림을 막기 위해 분야를 넓혀야 합니다.

[🚨 첫 번째 블로그(Blog1) 핵심 미션: 5대 핵심 카테고리 확장 및 중복 억제 🚨]
- 카테고리 무한 확장: 아래 [5대 핵심 카테고리] 전반을 폭넓게 탐색하여 폭발력이 가장 높은 키워드를 섞어내야 합니다.
  1. [부동산 폭락/자산 위기] (예: 과천 아파트 반토막, 부동산 PF 위기, 깡통전세)
  2. [거시경제/세금 공포] (예: IMF 경고 한국 빚폭탄, 장기보유 양도세 폐지, 전기세 인상)
  3. [사회적 공분/사건사고] (예: 교사 뇌진탕 사건, 텐퍼센트 논란, 맘충/진상 손님 폭로)
  4. [유명인/방송인 인성 논란] (예: 인스타 털기, 방송 하차 요구, 특정 연예인 과거 폭로)
  5. [주식/증시 핫이슈] (예: 유리기판 관련주 폭등, 양자컴퓨터 테마주, 상장폐지 위기)
- 🚫 [절대 중복 금지 규칙]: 추출하는 5개의 키워드는 반드시 **위 5가지 카테고리에서 각각 1개씩 서로 다르게 골고루 뽑아야** 합니다. 두 개 이상의 키워드가 같은 카테고리에 속하면 절대 안 됩니다.
- 제목 후킹과 팩트: 5개 키워드 모두 **"신상 공개/인스타", "충격적인 원본 영상", "IMF 경고", "반토막 현실", "분노 주의", "99%가 모르는"** 등 공분과 공포, 경제적 손실 회피 마케팅을 필수 적용하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "5대 카테고리 중 하나에 속하는 폭발적인 정치/사회/경제 강력한 롱테일 키워드 (각 카테고리당 1개씩만 추출)",
      "reason": "왜 이 키워드가 네이버 메인에 선정될 확률이 높으며 대중이 무조건 클릭할 수밖에 없는지(1~2문장)"
    }
  ]
}
`;
    }

    let response;
    // 2.5 버전이 터졌을 경우, 가장 우수하고 안정적인 gemini-pro를 최우선 투입합니다
    const fallbackModels = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-pro"];
    let attempt = 0;

    while (attempt < fallbackModels.length) {
      try {
        const currentModel = fallbackModels[attempt];
        
        // 마지막 최후의 보루 시도 시, 구글 검색 도구가 503 원인일 수 있으므로 검색 툴을 제거합니다.
        const currentConfig: any = {
           systemInstruction: "당신은 트렌드를 분석하는 AI입니다. 구글 검색 과정이나 원본 검색 데이터({'title': ...} 형태)를 절대 출력하지 마세요. 오직 사용자가 요청한 JSON 형식 문서만 출력해야 합니다.",
           temperature: 0.95, // 온도를 높여 더욱 다양하고 창의적인 키워드 도출 유도
        };
        if (attempt < fallbackModels.length - 1) {
           currentConfig.tools = [{ googleSearch: {} }];
        }

        response = await ai.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: currentConfig,
        });
        break; // 성공 시 탈출
      } catch (err: any) {
        attempt++;
        const is503 = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand') || err?.message?.includes('UNAVAILABLE');
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota');
        
        if ((is503 || is429) && attempt < fallbackModels.length) {
           const waitMs = is429 ? 15000 : 2500;
           console.warn(`[Agent-Trend] 503/429 Error on ${fallbackModels[attempt-1]}. Waiting ${waitMs}ms before fallback to ${fallbackModels[attempt]}...`);
           await new Promise(resolve => setTimeout(resolve, waitMs));
           continue; 
        } else {
           if (attempt >= fallbackModels.length) {
             throw new Error('현재 구글 AI API 요청 제한량(Quota) 초과 또는 트래픽 과부하가 발생했습니다. 잠시 후 다시 시도해주세요. (' + (err?.message || '') + ')');
           }
           throw new Error(err?.message || '알 수 없는 오류');
        }
      }
    }

    if (!response) {
      throw new Error('AI 응답을 받지 못했습니다.');
    }

    let trends = [];
    try {
      const text = response.text || "";
      // AI가 "The search results..." 와 같은 사족을 붙일 경우를 대비해 순수 JSON 블록만 추출
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const jsonStr = text.substring(startIndex, endIndex + 1);
        const parsed = JSON.parse(jsonStr);
        trends = parsed.trends || [];
      } else {
        throw new Error("JSON 블록을 찾을 수 없습니다.");
      }
      
      // 개수 제한 (만약 5개 이상이면 자름)
      trends = trends.slice(0, 5);
      
    } catch (e: any) {
      console.error("Gemini JSON parse failed, text was:", response.text);
      return NextResponse.json({ error: `AI가 트렌드를 분석하는 중 오류가 발생했습니다: JSON 형태가 아닙니다. (${e.message})` }, { status: 500 });
    }

    // 네이버 검색광고 API로 정확한 트래픽(월간 검색량) 조회
    const customerId = process.env.NAVER_AD_CUSTOMER_ID;
    const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
    const secretKey = process.env.NAVER_AD_SECRET_KEY;

    if (customerId && accessLicense && secretKey && trends.length > 0) {
      const timestamp = Date.now().toString();
      const method = "GET";
      const path = "/keywordstool";
      const signature = crypto.createHmac("sha256", secretKey).update(`${timestamp}.${method}.${path}`).digest("base64");

      // Naver keyword hint accepts comma separated, max 5
      const hintKeywords = trends.map((t: any) => t.keyword.replace(/\s+/g, '')).slice(0, 5).join(',');
      const apiUrl = `https://api.naver.com${path}?hintKeywords=${encodeURIComponent(hintKeywords)}&showDetail=1`;

      const naverRes = await fetch(apiUrl, {
        method: "GET",
        headers: { 'X-Timestamp': timestamp, 'X-API-KEY': accessLicense, 'X-Customer': customerId, 'X-Signature': signature }
      });

      if (naverRes.ok) {
        const naverData = await naverRes.json();
        const keywordList = naverData.keywordList || [];
        
        // 맵핑: AI가 생성한 키워드의 띄어쓰기를 없앤 버전으로 네이버 결과 매칭
        trends = trends.map((t: any) => {
          const rawKw = t.keyword.replace(/\s+/g, '');
          const match = keywordList.find((k: any) => k.relKeyword === rawKw);
          if (match) {
             const pc = typeof match.monthlyPcQcCnt === 'string' && match.monthlyPcQcCnt.includes('<') ? 5 : (parseInt(match.monthlyPcQcCnt) || 0);
             const mob = typeof match.monthlyMobileQcCnt === 'string' && match.monthlyMobileQcCnt.includes('<') ? 5 : (parseInt(match.monthlyMobileQcCnt) || 0);
             t.monthlyTotalCnt = pc + mob;
          } else {
             t.monthlyTotalCnt = 0; // 네이버 데이터베이스에 아직 없거나 너무 적음
          }
          return t;
        });
      }
    }

    return NextResponse.json({ trends });

  } catch (error: any) {
    console.error("Agent Trend Error:", error);
    return NextResponse.json({ error: `트렌드 마이닝 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}` }, { status: 500 });
  }
}
