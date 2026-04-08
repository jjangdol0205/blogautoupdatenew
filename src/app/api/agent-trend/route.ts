import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import crypto from "crypto";

const ai = new GoogleGenAI({});

export const maxDuration = 300; // Vercel Pro 서버리스 함수 타임아웃 300초로 연장

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
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)이자, **'60대 및 비즈니스/경제 특화 메가 블로그'**를 운영하는 총괄 편집장입니다.
현재 이 블로그(두 번째 블로그)의 궁극적인 목표는 **'일 방문자 3만 명 이상 달성 (네이버 메인/홈판 장악)'**입니다.
이를 위해 철저히 **[크리에이터 어드바이저 데이터]**와 **[60대/경제 타겟]**에 기반하되, 자잘한 조회수가 아닌 한방에 **수십만 명이 검색할 초대형 메가 트렌드 롱테일 키워드 5개**를 발굴해야 합니다.
${bannedSection}
${feedbackLearningGuidance}

[사용자 지정 핵심 주제]
- 오늘 집중 탐색할 주제: ${coreKeyword ? `"${coreKeyword}"` : "'60대 관심사 및 비즈니스/경제'"}

[크리에이터 어드바이저 기반 타겟 분석 (학습 데이터: 4월 7일 최신 급상승 패턴)]
- 경제/증시/부동산: 'sk증권 거래정지/병합', '삼천당제약', '삼성전자 주가/배당금', '광통신 관련주', '루닛57r', '샤오아이', '강동헤리티지자이 (청약)'
- 경제/생활/할인가: '기후동행카드', '롯데리아 50%'
- 비즈니스/계좌/대출: 'ISA 계좌', '신생아 특례대출', '청년도약계좌'
- 정부 정책/지원금(가장 강력한 후킹): '2026 자녀장려금', '2026 민생지원금', '청년미래적금'
- 앱테크/퀴즈/기타: '카카오뱅크 ai퀴즈', '두근두근 1등 / 두근두근1등찍기4월7일', 'ㄷㄱㅅ'
- 60대 라이프스타일/이슈: 
  1. 이슈/방송/가십: 고현정 50대 핑크 공항패션/논란, 혼후순결 뜻, 유튜브, 현역가왕3 순위, 가요무대/출연진
  2. 인물: 김창민감독, 박상용 검사 프로필, 손현희 프로필, 서명숙, 윤하 프로필/결혼식, 김정태 아들 지후 아스퍼거 진단, 김희애 숏컷 고집하는 이유
  3. 트로트 가수: 이찬원, 김호중 친구
  4. 시즈널/레시피 (폭발적 인기): 파김치/쪽파김치 담그는법, 머위나물무침, 쑥국 레시피, 오이소박이, 방풍나물 무침
  5. 스포츠/나들이/기타: 두산 김재환 잡지 않은 선택, 홍성 죽도 민박, 왕사남 관객수

[🚨 두 번째 블로그(Blog2) 핵심 미션: 일방문 3만 달성을 위한 60대/경제 분야 메가 트래픽 능동 추론 🚨]
- 방향성: 좁고 깊은 매니아 타겟뿐만 아니라, **네이버 홈판(메인)에 걸릴 수 있는 폭발력을 가진 대국민적(혹은 수백만 60대가 동시 접속할) 메가 트렌드**를 타겟팅합니다.
- 능동적 추론: 제공된 크리에이터 어드바이저 흐름을 읽고, **오늘(현재 날짜) 혹은 내일 당장 메인 포털을 장식할 만한 '예측 메가 키워드'**를 추론하세요.
- 단, 상상으로 지어내는 것은 금지입니다. 추론된 아이디어를 반드시 구글 검색을 통해 '최근 실시간으로 강력한 트래픽이 올락내리락 하는지' 검증하고 최종 5개를 엄선하세요.
- 정보 검색량이 애매한 단순 레시피나 뻔한 프로필은 버리고, 경제 타겟과 60대가 "당장 클릭 안 하면 손해!"라며 미친 듯이 누를 수밖에 없는 **자극적이고 거대한 롱테일 5개**를 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "발굴한 롱테일 키워드",
      "reason": "이 키워드가 타겟(60대/경제)의 클릭을 유발하여 네이버 홈판 진입 등 일방문 3만을 터트릴 폭발력이 있는 이유 분석 (1~2문장)"
    }
  ]
}
`;
    } else {
      prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)입니다.
현재 이 블로그(첫 번째 블로그)는 일 방문자 3,000명 수준이며, 우리의 새로운 목표는 **'일 방문자 3만 명 이상 (네이버 메인/홈판 노출)'**이라는 압도적인 트래픽을 달성하는 것입니다.
현재 구글 검색(Google Search)을 실시간으로 활용하여, **네이버 홈판 경제/사회/생활 탭에 올라갈 수 있을 만큼 전국민적인 폭발력을 가진 '메가 황금 트렌드/롱테일 키워드' 딱 5개**를 능동적으로 추론하고 발굴해내세요.
${bannedSection}
${feedbackLearningGuidance}

[🚨 첫 번째 블로그(Blog1) 핵심 미션: 일방문 3만 달성을 위한 초강대국급 네이버 메인 타겟팅 🚨]
- 방향성: 자잘한 100~300따리 정보는 쳐다보지도 않습니다. 하루 포스팅 20개로 3만 뷰를 뽑아야 합니다. 즉, **포스팅 1개당 평균 1,500회 ~ 3,000회 이상을 터트릴 수 있는 전 국민적 관심사(메가 어그로, 초대형 정책, 로또 청약, 미친 특판, 속보성 재난/지원금)**만 발굴합니다.
- 능동적 추론 (홈판 선점): 단순히 오늘 뻔한 이슈를 찾는 걸 넘어, 내일이나 모레 **네이버 홈판 메인에 무조건 걸릴 수밖에 없는 이슈(예: 전 국민 대상 대형 정책 발표 전날, 대기업 충격적 실적 발표 직전, 역대급 줍줍 청약 당일)**를 스스로 추론하고 검색으로 팩트체크하여 먼저 선점하세요.
- 절대 가상의 지점명, 존재하지 않는 금리(%), 종목명, 상상 속의 청약 일정을 지어내서는 안 됩니다. 100% 팩트이면서 '메가 트래픽'을 물어올 놈만 골라옵니다.

[🔥 첫 번째 블로그 - 일방문 3만 보장형 메시브(Massive) 트래픽 성공 패턴 (2026.4 최신 검증) 🔥]
다음은 최근 대표님 블로그에서 이미 강력한 조회수(건당 150~300방 이상)를 증명한 '메가 트래픽' 패턴입니다.
1. **(압도적 1순위) 수백만 명이 달려드는 고금리 특판 (조회수 최상위):**
   - 대박 사례: "새마을금고 4% 비대면 특판 예금 막차 타는 법" (핵심 타겟)
   - 집중 타겟: **실존하는 특정 지점의 'OO신협/새마을금고 미친 특판(비대면)' 정보**. (예금/적금)
2. **(압도적 2순위) 전 국민 로또 / 수도권 초대형 무순위 줍줍 (조회수 최상위):**
   - 대박 사례: "과천 지정타 줍줍, 이 아파트 6가구", "서울 9억 로또 줍줍 터졌다!"
   - 집중 타겟: **정확한 지역명과 구체적인 세대수/차익이 명시된 수도권 알짜 무순위/분양(줍줍)** 단지. 원론적인 청약 설명 절대 금지.

[❌ 절대 금지: 실무에서 완벽히 실패한 폭망 키워드 (조회수 10 이하) ❌]
- 최근 성적표 분석 결과, **'정부지원금', '육아 환급금', '긴급생계비 지원', '가전 환급금', '청년 전세대출'** 등 정부 복지/지원금 류의 키워드는 트래픽이 완전히 죽어버렸습니다. 절대 발굴하지 마세요.
- 오로지 독자가 "당장 내 현금이 들어가서 이자를 먹거나 수억을 번다"고 직관적으로 느끼는 **'특정 은행 예적금 특판 / 특정 단지 로또 줍줍'** 두 가지 카테고리만 엄선하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "발굴한 롱테일 예측 키워드",
      "reason": "왜 이 키워드가 네이버 홈판에 실릴 만큼 1,500방 이상의 폭발적인 트래픽을 당길 수 있는지(어떤 추론을 거쳤는지) 1~2문장 분석"
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
           temperature: 0.8,
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
           const waitMs = is429 ? 10000 : 3000;
           console.warn(`[Agent-Trend] 503/429 Error on ${fallbackModels[attempt-1]}. Waiting ${waitMs}ms before fallback to ${fallbackModels[attempt]}...`);
           await new Promise(resolve => setTimeout(resolve, waitMs));
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
