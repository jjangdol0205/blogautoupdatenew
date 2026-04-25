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

    // 4월 25일 블로그별 성공 패턴 주입 (모든 봇 공통 적용)
    feedbackLearningGuidance += `
[🏆 검증된 1만 뷰 폭발 타이틀 후킹 패턴 (무조건 이 패턴 중 하나를 응용하여 제목을 작성할 것) 🏆]
1. FOMO/조롱형: "아직도 3%대 예금에 돈 묶어두셨나요?", "아직도 '연 5% 특판' 찾으세요?", "또 놓치셨나요?"
2. 정보격차/비밀형: "99%가 모르는 (지역) 새마을금고 5.0% 특판", "주부 9단만 아는 다이소 품절대란템"
3. 손실회피/공포형(특히 60대 타겟): "이것 하나 안하면 월 50만원 삭감?", "14,314원 더 받으려다 780만원 손해?", "놓치면 9억 손해?"
4. 긴급/마감형: "5월 마감 임박!", "온누리상품권 10% 할인 4월 종료 임박? 예산 소진 전"
5. 대박/초대형: "2026 소상공인 추경지원금 (대규모 지원)", "강남 무순위 청약 로또 9억 시세차익"
* (지시사항): 위 패턴들을 타겟 독자의 연령(2030, 60대 등)과 키워드(국민연금, 예적금, 지원금 등)에 맞춰 완벽하게 조합하세요.
`;
    const bannedSection = bannedKeywords.length > 0 
      ? `\n[절대 금지 키워드 (이미 과거에 3번 이상 추출됨)]\n아래 키워드들은 절대로 다시 제안하지 마세요: ${bannedKeywords.join(', ')}\n` 
      : "";

    const creatorAdvisorData = `
[📊 네이버 크리에이터 어드바이저 공통 급상승 트렌드 (최신 데이터: 4월 24일) 📊]
- 비즈니스/경제: sbti 테스트, 고유가 피해지원금, 청년미래적금, ISA 계좌, 신성이엔지 거래정지, 청년도약계좌, 유리기판 관련주, 2026 민생지원금, 카카오뱅크 ai퀴즈, 셋로그, 삼성전자 배당금, 삼천당제약, 전력반도체 관련주
- IT/컴퓨터: 케이뱅크 돈나무, 나무엑스 퀴즈, 인간극장 나현씨, ios26.4.2, 아이폰18 출시일, 클로드 ai, 갤럭시 s26, 신이랑법률사무소, 아이폰 통화녹음, 인스타 댓글 안보임, 티빙 한달무료, 싸이월드, 갤럭시 워치9, 갤럭시 폴드8, 요시 팝콘통
- 사회/정치: 소득 하위 70% 기준, 임우재, 여수 해든이, 티핑포인트 뜻, 유류지원금, 안성재 식당 와인 바꿔치기 논란, 5월 4일 임시공휴일, 유플투쁠 퀴즈, 정인숙 의문사, 이춘재, 김민수 최고위원, 지수 친오빠, 멘헤라 뜻, 목동 지게차
- 건강/의학: 페퍼민트차 효능, 마그네슘 효능, 간에 좋은 음식, 당뇨 초기증상, 토마토 효능, 왼쪽 아랫배 통증, 왼쪽 옆구리 통증, 모델 유경, 올리브오일 효능, 송화가루, 기침 멈추는법, 파라다이스그레인, 신장에 좋은 음식, 두릅효능, 편평사마귀
- 상품/생활: 촉촉한 황치즈칩, 투썸 다이노탱, 두근두근 1등, 스타벅스 빙수, 코스트코 추천상품, 선양 말차소주, 왕뚜껑 라볶이, 코스트코 4월 넷째주 할인, 무인양품 추천, 맥도날드 해피밀, 발렌타인 30년산 가격, 라라스윗 저당팝콘, 광주요 도자축제, 무지위크, 컴포즈 너티크림라떼
- 60대 시니어/이슈: 두근두근 1등, 송중기 아내 미모, 인간극장 나현씨, SK텔레콤 500만원 주식 부활, 유리기판 관련주, 허수아비 범인, 고양 꽃박람회, 신성이엔지 거래정지, 현대건설 이한비 배유나 삭감, 삼천당제약 주가 폭락, 기후동행퀴즈, 마늘쫑볶음, 오이지 담그기, 노홍철 건물 매입
* (지시사항): 블로그당 하루 10~15개씩 포스팅이 발행되므로, 위 최신 데이터를 베이스로 참고하여 서로 절대 중복되지 않도록 다채롭게 발굴하세요.
`;
    feedbackLearningGuidance += creatorAdvisorData;

    const botConfigs: any = {
      'site1_bot1': {
        name: '"자동봇 1호기(메인 경제/이슈)"',
        target: '전국민',
        unique1: '생활 밀착 짠테크 및 요금/세금 폭탄 방어 (예: 통신비 환급, 건강보험료, 에어컨 전기세)',
        unique2: '대국민 공분 유발 사건사고 및 빌런 (예: 진상 손님, 대기업 횡포, 정책 분노)'
      },
      'site1_bot2': {
        name: '"자동봇 2호기(시니어/건강)"',
        target: '60대 시니어',
        unique1: '60대 치명적 질병 전조증상 및 건강 공포 (예: 치매, 뇌졸중 - "이것 아프면 당장 병원가세요")',
        unique2: '시니어 타겟 신종 사기 수법 경고 (예: 신종 보이스피싱, 떴다방 사기)'
      },
      'site1_bot3': {
        name: '"자동봇 3호기(도파민/가십)"',
        target: '2040 MZ 및 직장인',
        unique1: '연예계 핫이슈 및 폭로/논란 (대중의 관음증과 호기심 자극)',
        unique2: '유명인/인플루언서 재력 및 가십 (도파민 폭발 콘텐츠)'
      },
      'site2_bot1': {
        name: '"자동봇 4호기(IT/테크 전문)"',
        target: '2030 얼리어답터 및 실속파',
        unique1: 'IT 기기 가성비 비교 및 알뜰폰 요금제 꿀팁',
        unique2: '애플/삼성 신제품 출시 루머 및 숨겨진 기능 세팅법'
      },
      'site2_bot2': {
        name: '"자동봇 5호기(주식/투자 전문)"',
        target: '3050 개인 투자자(개미)',
        unique1: '주식/코인 급등락 및 파격 투자 이슈 (비트코인, 테슬라, 밈코인)',
        unique2: '기업 오너 리스크 및 주가 폭락 사태 분석 (시장 공포 자극)'
      },
      'site2_bot3': {
        name: '"자동봇 6호기(부업/절세 전문)"',
        target: 'N잡러 및 직장인',
        unique1: '현실적인 방구석 부업 및 블로그/SNS 수익화 꿀팁',
        unique2: '직장인 연말정산 및 숨은 세금 환급액 찾기'
      },
      'site3_bot1': {
        name: '"자동봇 7호기(트렌드/핫플)"',
        target: '2030 트렌드세터',
        unique1: '신규 오픈 핫플, 팝업스토어 및 지역 축제 정보',
        unique2: '다이소/편의점 등 품절대란 한정판 아이템 리뷰'
      },
      'site3_bot2': {
        name: '"자동봇 8호기(뷰티/다이어트)"',
        target: '2040 여성',
        unique1: '초단기 다이어트 및 피부과/뷰티 시술 가성비 정보',
        unique2: '집에서 할 수 있는 홈케어 및 제철 디톡스 레시피'
      },
      'site3_bot3': {
        name: '"자동봇 9호기(여행/호캉스)"',
        target: '욜로(YOLO) 및 여행객',
        unique1: '국내외 특가 항공권 및 땡처리 여행 상품 정보',
        unique2: '프리미엄 호캉스 가성비 예약 꿀팁 및 숨겨진 여행지'
      }
    };
    
    // 호환성을 위해 기존 blog1, blog2, blog3 입력 시 site1_bot 시리즈로 맵핑
    const normalizedStyle = style.startsWith('blog') ? `site1_bot${style.replace('blog', '')}` : style;
    const botConfig = botConfigs[normalizedStyle] || botConfigs['site1_bot1'];

    let prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)이자, **${botConfig.target} 타겟 블로그**를 운영하는 ${botConfig.name} 편집장입니다.
현재 이 블로그는 하루 10~15개의 포스팅을 발행하고 있으며, 각 포스팅당 **'조회수 1만 회 이상 달성'**을 목표로 합니다.
하루 글이 절대 겹치지 않도록 추천 범위를 넓혀 **조회수 1만 이상이 찍힐 수 있는 폭발적인 메가 트렌드 롱테일 키워드 딱 5개**를 발굴해야 합니다.
${bannedSection}
${feedbackLearningGuidance}

[사용자 지정 핵심 주제]
- 오늘 집중 탐색할 주제: ${coreKeyword ? `"${coreKeyword}"` : "'대중의 지갑 사정과 연결된 폭발적인 재테크/사회/정치 뉴스'"}

[🔥 크리에이터 어드바이저 실시간 데이터 최우선 활용 지침 🔥]
- 위에서 제공된 **[네이버 크리에이터 어드바이저 공통 급상승 트렌드]** 목록에 있는 실시간 검색어들을 **반드시 최우선적으로 활용**하세요.
- 5개의 키워드 중 **최소 3개 이상**은 무조건 크리에이터 어드바이저 목록에 있는 단어를 직접 사용하거나, 해당 단어와 완벽하게 일치하는 주제의 롱테일 키워드여야 합니다.
- 크리에이터 어드바이저 단어를 아래 5가지 카테고리(기본 3 + 고유 2) 성격에 맞게 창의적으로 매칭하여 추출하세요.

[🚨 ${botConfig.name} 핵심 미션: 공통 트래픽(3) + 고유 특성(2) 하이브리드 전략 🚨]
조회수가 절대적으로 보장되는 '기본 트래픽 무기 3개'와 이 블로그만의 '고유 무기 2개'를 결합하여 발굴합니다.

1. [기본 무기 1] 고금리 특판 / 예적금 마감 임박 (예: 5% 예금 마감, 새마을금고 특판 - "아직도 3%대에 돈 묶어두셨나요?")
2. [기본 무기 2] 대형 정부 지원금 / 숨은 환급금 찾기 (예: 청년도약계좌, 소상공인 지원금 - "놓치면 100만원 손해")
3. [기본 무기 3] 부동산 로또 청약 및 무순위 줍줍 (예: 강남 무순위 줍줍 - "9억 시세차익, 당장 넣으세요")
4. [고유 특성 1] ${botConfig.unique1}
5. [고유 특성 2] ${botConfig.unique2}

- 🚫 [절대 중복 금지 규칙]: 추출하는 5개의 키워드는 반드시 **위 5가지 카테고리에서 각각 1개씩 서로 다르게 골고루 뽑아야** 합니다. 두 개 이상의 키워드가 같은 카테고리에 속하면 절대 안 됩니다.
- 제목 후킹과 팩트: 5개 키워드 모두 뻔한 정보가 아닌, 사람을 초조하게(FOMO) 만들거나 강한 도파민/공포감을 유발하는 강력한 후킹을 필수 적용하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "5대 카테고리 중 하나에 속하는 조회수 폭발 강력한 롱테일 키워드 (각 카테고리당 1개씩만 추출)",
      "reason": "왜 이 키워드가 타겟 독자의 클릭을 유발하며 1만 뷰 이상의 성과를 낼 수 있는지(1~2문장)"
    }
  ]
}
`;

    let response;
    // 2.5 버전이 터졌을 경우, 가장 우수하고 안정적인 gemini-pro를 최우선 투입합니다
    const fallbackModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"];
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
