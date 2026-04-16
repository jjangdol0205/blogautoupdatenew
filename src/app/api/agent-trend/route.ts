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

[크리에이터 어드바이저 기반 타겟 분석 (학습 데이터: 4월 15일 최신 급상승 패턴)]
- 비즈니스/경제(지원금/금융): '2026 민생지원금', '청년미래적금', '2026 자녀장려금', '출국납부금 환급', 'ISA 계좌 단점', '청년도약계좌'
- 증시/부동산(테마주/단어): '양자 관련주', '유리기판 관련주', '광통신 관련주', '대한전선', 'sk하이닉스', '삼성전자 배당금', '임장 뜻'
- 60대 이슈/가십/스포테인먼트: '문채원 6월 결혼', '최고기 유깻잎 이혼 사유', '김혜성 LA다저스 감독 분노', '이재원 논쟁', '박수홍 딸 모델 포스', '이찬원'
- 60대 생활/레시피/관광/앱테크: '파김치 담그는법', '명이나물장아찌', '머위나물무침', '강진 남미륵사', '비슬산 참꽃축제', '군포 철쭉축제', '옆커폰 퀴즈정답', '기후동행퀴즈'

[🔥 두 번째 블로그 실제 상위 노출 증명 데이터 (4월 15일 최신 성과 반영) 🔥]
1. 온누리상품권 10% 할인 진짜 종료? 5월에 50만원 아끼... (조회수 776)
2. 온누리상품권 5월 10% 할인, 5월 10일 전 '이 앱' 모르면 ... (조회수 362)
3. 아직도 '연 5% 특판' 찾으세요? 99%가 놓치는 4%대 신... (조회수 256)
4. 2026년 국민연금, 60대에게 월 50만원 추가 지급? 팩트... (조회수 174)
5. 아직도 국민연금 주는 대로 받으세요? 2026년 확정된 수... (조회수 162)
6. 2026년 민생지원금 250만원? 가짜뉴스에 속지 마세요! ... (조회수 121)
* (핵심 분석 및 성공 패턴): 60대 타겟의 트래픽은 **[1. 온누리상품권 10% 할인(종료 임박 및 앱 사용법)], [2. 국민연금 개혁안 및 수령액 차이(손해/이득)], [3. 민생지원금 관련 팩트체크(가짜뉴스 구별)], [4. 고금리 특판 예금]** 에 절대적으로 집중되어 있습니다. 특히 제목에서 **["~진짜 종료?", "~팩트체크", "가짜뉴스에 속지 마세요!"] 같이 논란이 되는 정책/소문에 대한 의문형 팩트체크** 방식과, **["50만원 아끼...", "780만원 손해?", "월 34만원 그..."] 같이 구체적인 금전적 득실을 짚어주는 패턴**이 높은 조회수를 견인합니다.

[🚨 두 번째 블로그(Blog2) 핵심 미션: 60대 타겟 핵심 공략 + 신규 트렌드 탐색 (8대2 포트폴리오 전략) 🚨]
- 80% 집중 강화 (안전 자산 3~4개 발굴): 가장 트래픽 효율이 좋은 **'온누리상품권 및 지역화폐 할인', '연금(국민/주택) 수령액 득실 계산 및 팩트체크', '정부 복지/민생지원금 가짜뉴스 팩트체크'** 위주로 발굴하세요.
- 20% 신규 시도 (테스트 볼룬 1~2개 발굴): 최신 급상승 패턴에 기반하여, 60대가 혹할 만한 폭발력 있는 신규 정책/지원금 이슈를 1~2개 섞어 보세요.
- 제목의 기술: 5개 키워드의 추천 제목에 반드시 아래 3가지 후킹 패턴 중 하나를 강력하게 적용하세요.
  1. 의문형 팩트체크: "~진짜 종료?", "~추가 지급? 팩트체크", "가짜뉴스에 속지 마세요!"
  2. 구체적 금전 득실: "780만원 손해?", "50만원 아끼...", "월 34만원 차이"
  3. 호기심 자극(Curiosity Gap): "'이 앱' 모르면", "'이것' 모르면"
  4. 재벌/유명인 어그로(네이버 홈판 저격): "이재용도 극대노하는", "회장님 뒷목 잡는", "버리고 쓴다는 XX 수준 ㄷㄷ"

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

[🔥 첫 번째 블로그 실제 상위 노출 증명 데이터 (4월 15일 최신 성과 반영) 🔥]
1. 4월 24일 마감! 아직도 신청 안 하셨어요? 최대 1억 지원... (조회수 313회)
2. 4일 만에 500억 완판된 신협 4% 특판 놓치셨나요? 4월 ... (조회수 277회)
3. OO새마을금고 5.0% 특판? 팩트체크 후 지금 당장 가입 ... (조회수 250회)
4. 놓치면 9억 손해? 4월 서울 아파트 줍줍 딱 1곳, 청약통장... (조회수 154회)
5. 과천 디에트르 퍼스티지 줍줍, 4월 15일 단 하루! 10억 로... (조회수 133회)
* (핵심 분석 및 성공 패턴): 트래픽이 집중된 카테고리는 **[1. 신협/새마을금고 등 지점명이 포함된 특판 예적금], [2. 'N억 손해, 10억 로또' 등의 구체적 금액이 명시된 수도권 무순위 줍줍], [3. 마감 기한이 임박한 소상공인 정책자금 및 정부 지원금]** 입니다. 특히 제목에서 **[마감, 단 하루, 완판 등 긴급성/희소성 부여(FOMO)]**와 **[최대 1억, 500억, 10억 등 구체적인 숫자]**, **[~안 하셨어요?, ~손해? 등 손실회피 편향 자극]**을 동시에 활용한 패턴이 압도적인 클릭을 유도하고 있습니다.

[🚨 첫 번째 블로그(Blog1) 핵심 미션: 3대 황금 카테고리 강화 + 신규 메가이슈 발굴 (8대2 포트폴리오 전략) 🚨]
- 80% 집중 강화 (안전 자산 3~4개 발굴): 트래픽이 완전히 검증된 **'고금리 특판 예적금(지점명 명시)', '수도권 로또 아파트 줍줍/무순위 청약', '마감 임박 정부 정책자금/지원금'** 3대 분야 안에서 발굴하세요.
- 20% 신규 시도 (테스트 볼룬 1~2개 발굴): 너무 똑같은 주제만 나오면 한계가 있으므로, 3대 황금 분야 외에 전 국민이 클릭할 만한 **경제/IT/생활 이슈를 재벌(예: 이재용)이나 유명인의 키워드와 강렬하게 엮어서 제안**하세요 (네이버 홈판 저격용).
- 제목 후킹과 팩트: 5개 키워드의 제목은 반드시 아래의 4가지 패턴 중 하나 이상을 강력하게 적용하세요.
  1. FOMO/손실회피 자극: "아직도 ~안 하셨어요?", "놓치면 X억 손해?", "99%가 모르는/놓친"
  2. 긴급성/희소성 강조: "단 하루!", "4월 OO일 마감!", "마감임박", "완판된"
  3. 구체적인 숫자 마케팅: "4일 만에", "500억", "10억 로또", "최대 1억"
  4. 재벌/유명인 어그로(홈판 저격): "이재용도 극대노하는", "회장님 뒷목 잡는", "수준 ㄷㄷ"
  (가상의 정보(임의의 금리, 가짜 지원금)는 절대 지어내지 말고, 검색을 통한 실제 팩트 기반으로 도출하세요.)

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
