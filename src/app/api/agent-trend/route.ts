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

    let prompt = "";
    
    if (style === 'blog2') {
      prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터이자, **'IT/테크 기기 및 생활/가전/상품 꿀템'**을 전문으로 다루는 "자동봇 2호기(두 번째 블로그)" 편집장입니다.
현재 목표는 20~40대 남녀 직장인 및 주부들이 무조건 클릭하게 만드는 생활 밀착형 대박 롱테일 키워드 5개를 발굴하는 것입니다.
${bannedSection}
${feedbackLearningGuidance}

[크리에이터 어드바이저 기반 타겟 분석 (학습 데이터: 최신 4월 10일자 패턴)]
- IT/컴퓨터(모바일/플랫폼): '아이폰18', '클로드 ai', 'ios26.4.1', '갤럭시 s26', '아이폰 통화녹음', '유튜브 프리미엄 가격', '인스타 스토리 몰래보기', '카톡 차단 확인 방법', '티빙 한달무료', '모바일 신분증', '싸이월드'
- 상품리뷰(리빙/디바이스): '아이플라이텍 ai노트2', '테슬라 젠그레이', '룰루레몬 패스트트랙백', '스타벅스 실리콘 푸드백', '알로하생레몬라거', '코스트코 추천상품', '네고왕 생리대', '왕뚜껑 라볶이', '뉴발란스 프리들x'

[🚨 두 번째 블로그(Blog2) 핵심 미션: 실생활 결핍 해결 + 호기심 자극 🚨]
- IT 꿀팁/숨은 기능(50%): 대중이 일상에서 가장 자주 쓰지만 잘 모르는 기능들(카톡 차단 확인, 인스타 몰래보기, 아이폰 통화녹음 등)이나 OTT 구독료 절약 팁을 집중 발굴하세요.
- 최신 IT기기 & 생활 밀착템 리뷰(50%): '아이플라이텍', '테슬라 액세서리', '네고왕 핫딜', '코스트코/스타벅스 신상' 등 지금 막 떠오르는 희귀한 아이템 리뷰 트렌드를 발굴하세요.
- 제목 후킹 요소: 단순한 스펙 나열이 아닌, **"99%가 모르는", "지금 당장 써먹는", "품절 대란", "월 O만원 아끼는법"** 등의 후킹 요소를 결합하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "IT/가전/상품리뷰 카테고리의 조회수 폭발 강력한 롱테일 키워드",
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

[크리에이터 어드바이저 건강/의학 타겟 분석 (학습 데이터: 최신 4월 10일자 패턴)]
- 국소 부위 통증/질환: '사랑니 발치후 식사', '갑상선암 증상', '손톱 검은세로줄', '왼쪽/오른쪽 옆구리 통증', '왼쪽 아랫배 통증'
- 천연 식품 및 영양제: '알부민 효능', '마그네슘 효능', '올리브오일 효능', '아보카도 효능', '머위효능', '이노시톨 효능', '간에 좋은 음식'
- 다이어트 및 피부/의약품 트렌드: '김신영 요요', '마운자로 가격(비만치료제)', '아젤리아크림', '멜라논크림', '혈압 정상수치/낮추는법', '몸속 염증 없애기'

[🚨 세 번째 블로그(Blog3) 핵심 미션: 4060 건강 고민 즉각 해결 + 불안/공포 심리 타겟팅 🚨]
- 타겟팅 포인트: 건강 정보는 생명과 직결되므로 '통증의 원인을 몰라 불안한 심리'를 타겟팅하거나, '다이어트/탈모 신상 약품 가격' 같은 극한의 핫이슈를 다뤄야 합니다.
- 건강기능식품 & 식단 융합: '무릎 관절에 최악인 음식', '간에 좋은 이것 1스푼', '혈관 뚫어주는 기적의 레시피' 등 식품과 건강을 조합한 강력한 제목을 만드세요.
- 제목 후킹 규칙: 반드시 **"방치하면 큰일", "의사도 놀란", "암의 전조증상?", "약국 대란", "기적의 변화"** 식의 직관적이고 강력한 건강 썸네일용 텍스트를 기획하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "4060 세대의 강렬한 클릭을 유도할 건강/웰니스/통증 관련 메가 롱테일 키워드",
      "reason": "왜 이 건강 키워드가 4060 사람들의 절박한 검색 니즈(결핍)를 건드리는지 분석 (1~2문장)"
    }
  ]
}
`;
    } else {
      prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)입니다.
현재 구글 검색(Google Search)을 실시간으로 활용하여, **네이버 홈판 경제/사회/이슈 탭에 올라갈 수 있을 만큼 전국민적인 폭발력을 가진 '메가 황금 트렌드/롱테일 키워드' 딱 5개**를 능동적으로 추론하고 발굴해내세요.
${bannedSection}
${feedbackLearningGuidance}

[사용자 지정 핵심 주제]
- 오늘 집중 탐색할 주제: ${coreKeyword ? `"${coreKeyword}"` : "'대중의 지갑 사정과 연결된 폭발적인 재테크/사회/정치 뉴스'"}

[크리에이터 어드바이저 타겟 분석 (학습 데이터: 최신 4월 10일자 패턴)]
- 비즈니스/경제(지원금/청약/금융): '청년미래적금', '2026 민생지원금', '청년도약계좌', 'ISA 계좌', '삼성전자 배당금', '광통신 관련주', '구리/대한광통신 관련주', '강동헤리티지자이', '오티에르 반포 청약 단지'
- 사회/정치/핫이슈: '소득 하위 70% 금액', '기후동행카드', '앱스타인 게이트', '친자검사 충격', '시도그룹', '옆커폰 퀴즈', 'kfc 1+1', '박상용 검사', '대전 늑대 탈출', '원주 사설구급차'

[🚨 첫 번째 블로그(Blog1) 핵심 미션: 경제/정치/하드 뉴스 핫이슈 기반 어그로 극대화 🚨]
- 80% 집중: 위에서 분석된 바와 같이, 대중은 **'정부 정책/청년 지원금/민생지원금' (실제 돈을 받는 정보), '부동산 무순위 줍줍/특판', '최신 논란이 터진 정치인/사회 가십(친자확인 등)'** 에 미친 듯이 클릭합니다. 
- 20% 신규 시도: '옆커폰 퀴즈 정답'이나 오늘 발생한 사건사고 등 실시간 검색어 성격의 휘발성 트래픽 이슈를 섞어주세요.
- 제목 후킹과 팩트: 5개 키워드 모두 **"99%가 손해보는", "오늘 마감", "논란 주의", "월 O만원 혜택"** 등 지갑 사정이나 두려움을 강력하게 자극하는 워딩을 필수 포함하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "조회수 5만뷰 이상 폭발이 예상되는 정치/사회/경제 강력한 롱테일 키워드",
      "reason": "왜 이 키워드가 네이버 메인에 선정될 확률이 높으며 대중이 무조건 클릭할 수밖에 없는지(1~2문장)"
    }
  ]
}
`;
    }

    let response;
    // 2.5 버전이 터졌을 경우, 가장 우수하고 안정적인 gemini-pro-latest를 최우선 투입합니다
    const fallbackModels = ["gemini-2.5-flash", "gemini-pro-latest", "gemini-flash-latest"];
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
           console.warn(`[Agent-Trend] 503/429 Error on ${fallbackModels[attempt-1]}. Waiting 2.5s before fallback to ${fallbackModels[attempt]}...`);
           await new Promise(resolve => setTimeout(resolve, 2500));
           continue; 
        } else {
           if (attempt >= fallbackModels.length) {
             throw new Error('현재 구글 AI 서버에 전 세계적인 과부하가 발생하여 모든 모델이 지연되고 있습니다. 1~2분 뒤에 다시 시도해주세요.');
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
      const jsonStr = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{"trends":[]}';
      const parsed = JSON.parse(jsonStr);
      trends = parsed.trends || [];
      
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
