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

[크리에이터 어드바이저 기반 타겟 분석 (학습 데이터: 최신 4월 15일자 패턴 적용)]
- IT/컴퓨터(단기 꿀팁/플랫폼): '유튜브 프리미엄 라이트/우회(new)', '노트북lm(new)', '쿠팡 로그아웃 방법(new)', 'aka.ms/alca', '아이폰 잠금화면/통화녹음'
- 상품리뷰(이벤트 핫딜/카페 신상): '스타벅스 토이스토리 키링(new)', '바나프레소 크리미라떼(new)', '더벤티 마리오(new)', '4월 22일 유플투뿔 항공권(new)', '믹스 시가컬렉션', '발렌타인 30년산', '쿠팡 럭스 추천템'

[🚨 두 번째 블로그(Blog2) 핵심 미션: 유튜브/쿠팡 우회 및 꿀팁 + 브랜드 캐릭터 콜라보 굿즈 사냥 🚨]
- IT 생활 꿀팁/유틸(50%): 많은 사람들이 불편함을 느끼는 **'유튜브 프리미엄 라이트 전환/우회'**나 **'쿠팡 모든 기기 로그아웃 방법'**, 혁신적인 AI인 **'노트북LM 사용법'** 등 모바일 플랫폼의 숨겨진 설정법과 AI 유틸리티를 공략하세요.
- F&B/항공권 브랜드 핫딜(50%): **'스타벅스 토이스토리 키링', '더벤티 마리오'** 등 MZ세대가 줄 서는 캐릭터 콜라보 굿즈 정보와, 유플러스 멤버십 혜택인 **'유플투뿔 이스타/에어로케이 항공권 핫딜'** 등 돈이 되는 여행/쿠폰 정보를 제일 먼저 리뷰하세요.
- 제목 후킹 요소: 스펙 나열이 아닌, **"오전 품절 대란", "아이패드/TV 로그아웃 안될때", "유튜브 월 O만원 절약", "단독 콜라보 굿즈", "미친 혜택"** 등의 후킹 요소를 결합하세요.

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

[크리에이터 어드바이저 건강/의학 타겟 분석 (학습 데이터: 최신 4월 15일자 패턴 적용)]
- 국소 부위 통증/질환/산부인과: '췌장암 초기증상(new)', '임신 극초기증상(new)', '당뇨/혈압 수치', '오른쪽/왼쪽 옆구리 통증'
- 천연 식품 및 체형 관리: '아이린 36세 몸매 유지 비법(new)', '두릅/마그네슘/알부민 효능', '아보카도/머위/올리브오일 효능'
- 의약품/시술 트렌드: '위너확장구멍(new)', '제로네이트(new)', '아젤리아크림', '마운자로 가격'

[🚨 세 번째 블로그(Blog3) 핵심 미션: 고위험 질환 초기증상 + 연예인 몸매/치과 시술 타겟팅 🚨]
- 타겟팅 포인트: **'췌장암 초기증상'** 등 생존율이 낮은 무서운 암의 전조증상이나, **'임신 극초기증상', '옆구리 통증'** 등 확실한 건강의 적신호를 빠르게 짚어주세요. 
- 뷰티/다이어트 융합: 중년의 다이어트 자극을 위한 **'아이린 36세 몸매 비결'**이나 최신 무삭제 라미네이트 시술인 **'제로네이트'**, 모공 축소인 **'위너확장구멍'** 등 안티에이징/미용 트렌드를 공략하세요.
- 제목 후킹 규칙: 반드시 **"생존율 10%", "이 통증 무시하면 암", "연예인들이 늙지 않는 비밀", "부작용 없는 라미네이트"** 식의 직관적이고 강력한 건강/미용 썸네일용 텍스트를 기획하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "4060 세대의 강렬한 클릭을 유도할 건강/웰니스/통증/수치 관련 메가 롱테일 키워드",
      "reason": "왜 이 건강 키워드가 4060 사람들의 절박한 검색 니즈(결핍)를 건드리는지 분석 (1~2문장)"
    }
  ]
}
`;
    } else {
      prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)입니다.
현재 구글 검색(Google 경유)을 실시간으로 활용하여, **네이버 홈판 경제/사회/이슈 탭에 올라갈 수 있을 만큼 전국민적인 폭발력을 가진 '메가 황금 트렌드/롱테일 키워드' 딱 5개**를 능동적으로 추론하고 발굴해내세요.
${bannedSection}
${feedbackLearningGuidance}

[사용자 지정 핵심 주제]
- 오늘 집중 탐색할 주제: ${coreKeyword ? `"${coreKeyword}"` : "'대중의 지갑 사정과 연결된 폭발적인 재테크/사회/정치 뉴스'"}

[크리에이터 어드바이저 타겟 분석 (학습 데이터: 최신 4월 15일자 패턴 적용)]
- 비즈니스/경제(주식/지원금/공조): '양자/양자컴퓨터.스페이스x/아이온큐 관련주(new)', '대한전선(new)', '2026 자녀장려금(new)', '전기세 인상(new)' '출국납부금 환급/고유가 피해지원금', '청년미래적금'
- 사회/정치/사건사고(강력 핫이슈): '13세/20대 과외교사 성추행(new)', '과외교사 신상(new)', '광주 금쪽이(new)', '홍대 과외 성추행(new)', '박상용 검사 프로필(new)', '아다치 유키 실종'

[🚨 첫 번째 블로그(Blog1) 핵심 미션: 강력 미성년자 사건/사고 + 해외 주식(양자/우주) 어그로 극대화 🚨]
- 80% 집중: 사회면이 완전 뒤집혔습니다. **'13세/20대 과외교사 성추행', '과외교사 신상', '광주 금쪽이'** 등 대중의 공분을 사는 아동/교육 관련 강력 사건이 발생했습니다. 이 사건들의 신상, 전말, 충격적 사실들을 빠르게 큐레이션하여 압도적 트래픽을 당겨오세요.
- 20% 신규 시도: '양자컴퓨터/아이온큐/스페이스X' 같은 해외/미래형 주식 관련주 분석이나, '전기세 인상', '자녀장려금' 같은 생활 경제의 변화를 섞어주세요.
- 제목 후킹과 팩트: 5개 키워드 모두 **"신상 공개", "충격적인 카톡", "CCTV 영상", "99%가 물리는", "전기세 폭탄"** 등 분노, 경악, 손실 회피 심리를 찌르는 워딩을 필수 포함하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "조회수 5만뷰 이상 폭발이 예상되는 정치/사회/경제/사건사고 강력한 롱테일 키워드",
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
