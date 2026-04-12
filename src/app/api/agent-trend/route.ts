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
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)이자, **'60대 및 비즈니스/경제 특화 메가 블로그'**를 운영하는 총괄 편집장입니다.
현재 이 블로그(두 번째 블로그)의 궁극적인 목표는 **'일 방문자 5만 명 이상 달성 (네이버 메인/홈판 장악)'**입니다.
이를 위해 철저히 **[크리에이터 어드바이저 데이터]**와 **[60대/경제 타겟]**에 기반하되, 매번 나오는 비슷한 키워드는 배제하고 추천 범위를 획기적으로 넓혀 한방에 **조회수 5만 이상이 찍힐 수 있는 완전히 새롭고 폭발적인 메가 트렌드 롱테일 키워드 5개**를 발굴해야 합니다.
${bannedSection}
${feedbackLearningGuidance}

[사용자 지정 핵심 주제]
- 오늘 집중 탐색할 주제: ${coreKeyword ? `"${coreKeyword}"` : "'60대 은퇴자용 실질적 복지/연금/수입 극대화'"}

[크리에이터 어드바이저 기반 타겟 분석 (학습 데이터: 4월 12일 최신 급상승 패턴)]
- 비즈니스/경제(지원금/금융): '고유가 피해지원금', '2026 민생지원금', '소득 하위 70% 금액', '소득 하위 70% 기준', '신생아 특례대출', 'ISA 계좌', '청년도약계좌'
- 증시/부동산: '테슬라 350 붕괴, 주가 전망', '광통신 관련주', '삼성전자 배당금', '2차전지 코스닥 대장주 정리', '강동헤리티지자이', '임장 뜻'
- 60대 이슈/가십 (남/여 공통): '이범수 이윤진 폭로', '김진 앵커', '백일섭별세', '홀로코스트 뜻', '이효리 부친상 눈물 고백'
- 60대 생활/레시피/관광: '파김치 담그는법', '머위나물무침', '오이소박이 레시피', '방풍나물 무침', '쑥국 레시피', '이수도 1박3식 가격', '비슬산 참꽃축제'

[🔥 두 번째 블로그 실제 상위 노출 증명 데이터 (4월 11일~12일 최근 성과 반영) 🔥]
1. 아직도 '연 5% 특판' 찾으세요? 99%가 놓치는 4%대 신... (조회수 583)
2. 국민연금 14,314원 더 받으려다 780만원 손해? 60대 연... (조회수 555)
3. 2026년 국민연금 개혁 확정, 60대 수령액 역대급 인상? (조회수 352)
4. 온누리상품권 10% 할인 4월 종료 임박? 예산 소진 전 60... (조회수 288)
5. 국민연금 5년 일찍 받으면 평생 30% 손해? 2026년 196... (조회수 276)
6. 주택연금 4월 개편안 확정? 60대 월 수령액 50만원 더 받... (조회수 189)
7. 2026년 차상위계층, '이것' 안하면 월 128만원 손해! (조회수 165)
* (핵심 분석 및 실패 피드백): 토요일부터 발굴 범위를 넓혀 포괄적이고 다양한 주제를 시도했으나 오히려 조회수가 하락했습니다. 60대 타겟은 오직 **[연금(국민/주택/기초)], [온누리상품권 할인], [차상위, 노인일자리 등 정부 복지], [특판 예금]** 등 본인의 지갑 굵기와 직결되는 아주 구체적인 '재정/복지 이슈'에만 열광적으로 클릭합니다.

[🚨 두 번째 블로그(Blog2) 핵심 미션: 60대 타겟 핵심 공략 + 신규 트렌드 탐색 (8대2 포트폴리오 전략) 🚨]
- 80% 집중 강화 (안전 자산 3~4개 발굴): 가장 트래픽 효율이 좋은 **'연금(국민/주택)', '정부 지원금/복지(차상위/노인일자리)', '온누리상품권', '고금리 특판'** 위주로, 매주 앵글을 바꿔가며('조기수령 페널티', '개혁안 통과 전후 수령액 비교' 등) 타겟팅을 더욱 뾰족하게 다듬으세요.
- 20% 신규 시도 (테스트 볼룬 1~2개 발굴): 핵심 범위를 너무 벗어나지 않으면서도, 최근 최신 급상승 패턴(예: 배당금, 소득 하위 70% 혜택, 고유가 지원 등)에 기반하여 60대가 새롭게 클릭할 만한 폭발력 있는 신규 이슈를 1~2개 섞어서 발굴해 보세요.
- 제목의 기술: 뻔한 정보가 아닌, **'수령액 차이, 손해/이득 액수(ex. 780만원 손해), 팩트체크, 예산 소진 임박'** 등 숫자가 포함된 자극적이고 공포감(FOMO)을 유발하는 후킹(Hook)을 반드시 5개 모두에 적용하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "조회수 5만 이상이 가능한 새롭고 넓은 범위의 폭발적 롱테일 키워드",
      "reason": "이 키워드가 왜 기존과 다르게 5만 뷰 이상을 끌어올 수 있으며, 60대/경제 타겟을 강렬하게 사로잡을 수 있는지(1~2문장)"
    }
  ]
}
`;
    } else {
      prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)입니다.
현재 이 블로그(첫 번째 블로그)는 일 방문자 7,000~8,000명 수준이며, 우리의 새로운 목표는 **'일 방문자 5만 명 이상 (네이버 메인/홈판 노출)'**이라는 압도적인 트래픽을 달성하는 것입니다.
현재 구글 검색(Google Search)을 실시간으로 활용하여, **네이버 홈판 경제/사회/생활 탭에 올라갈 수 있을 만큼 전국민적인 폭발력을 가진 '메가 황금 트렌드/롱테일 키워드' 딱 5개**를 능동적으로 추론하고 발굴해내세요.
${bannedSection}
${feedbackLearningGuidance}

[🔥 첫 번째 블로그 실제 상위 노출 증명 데이터 (4월 11일~12일 성과 반영) 🔥]
1. 4월 24일 마감! 아직도 신청 안 하셨어요? 최대 1억 지원금... (조회수 1,058회)
2. OO새마을금고 5.0% 특판? 팩트체크 후 지금 당장 가입... (조회수 937회)
3. 아직도 3%대 예금 찾으세요? 99%가 모르는 송파구 새마을금고... (조회수 397회)
4. 수원 신분당선 역세권 줍줍 떴다! 두산위브 더센트럴 25... (조회수 300회)
5. 4월 20일 마감! 신용취약 소상공인 정책자금, '이것'... (조회수 196회)
* (핵심 분석 및 실패 피드백): 다루는 주제의 범위를 억지로 넓히려고 다른 포괄적 경제/생활 이슈를 다뤄보았으나 조회수가 늘지 않았습니다. 대중은 오직 **[1. 소상공인/서민 대상 정부 정책자금 및 지원금], [2. 새마을금고/신협 등 4~5%대 고금리 특판], [3. 수억 원 시세차익이 보장되는 아파트 무순위 줍줍]** 이 3가지 황금 카테고리에만 폭발적으로 클릭합니다.

[🚨 첫 번째 블로그(Blog1) 핵심 미션: 3대 황금 카테고리 강화 + 신규 메가이슈 발굴 (8대2 포트폴리오 전략) 🚨]
- 80% 집중 강화 (안전 자산 3~4개 발굴): 트래픽이 완전히 검증된 **'정부 정책자금/지원금(최대 1억 등)', '고금리 특판 예적금', '로또 아파트 줍줍/무순위 청약'** 3대 분야 안에서, 기존보다 더 강력한 팩트와 압도적인 후킹 요소를 더하여 깊게 파고드세요.
- 20% 신규 시도 (테스트 볼룬 1~2개 발굴): 너무 똑같은 주제만 나오면 블로그 지수에 안 좋을 수 있으니, 3대 황금 분야 외에 전 국민이 몰려들 만한 **전혀 새로운 관점의 초대형 경제/정책/생활 이슈(예: 신설 환급금, 파격 혜택 등)**를 과감하게 한두 개 섞어서 제안해 보세요.
- 제목 후킹과 팩트: 5개 키워드 모두 **"4월 OO일 마감", "최대 1억", "99%가 모르는", "놓치면 X억 손해"** 처럼 사람을 초조하게(FOMO) 만드는 자극적인 숫자/기한을 필수 포함하되, 가상의 정보(임의의 금리 5%, 가짜 지원금)는 절대 지어내지 마세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "3대 황금 카테고리(지원금/특판/줍줍) 중 조회수 폭발이 예상되는 강력한 롱테일 키워드",
      "reason": "왜 이 키워드가 5만 뷰 이상을 달성할 수 있는지(어떤 후킹 요소와 팩트를 잡았는지) 1~2문장 분석"
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
