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

    // 4월 30일 기준 압도적 1위~3위 실제 조회수 데이터 반영 패턴 (모든 봇 공통 적용)
    feedbackLearningGuidance += `
[🏆 4월 30일 검증된 압도적 1위~3위 타이틀 후킹 패턴 (모든 제목은 반드시 아래 3가지 패턴 중 하나로 시작해야 함) 🏆]
1. "아직도 ~ 하세요?" (무지함 찌르기 + 조롱형 FOMO)
   - 예시(실제 1위): "아직도 3%대 예금에 돈 묶어두셨나요? 5월 마감 임박!"
   - 예시(실제 1위): "아직도 국민연금 주는 대로 받으세요? 2026년 확정된 수령액 충격"
2. "구체적인 타격 액수 제시" (극단적 손실회피 본능 자극 - 특히 60대 타겟)
   - 예시(실제 3위): "60대 국민연금 '이것' 하나 안하면 월 50만원 삭감?"
   - 예시(실제 7위): "국민연금 14,314원 더 받으려다 780만원 손해? 60대 연금의 배신"
3. "'또 놓치셨나요?' + 99%가 모르는 비밀" (정보격차 및 소속감 자극)
   - 예시(전체 1위): "2026 소상공인 추경지원금, '또 놓치셨나요?' 99%가 모르는 숨은 지원금"
   - 예시(실제 2위): "4월 예금 4.1% 특판? 이미 마감! 99%가 놓친 진짜 고금리 대안"

* (절대 지시사항): 당신이 생성하는 5개의 트렌드 제목은 모두 독자를 초조하게 만드는 위 3가지 패턴("아직도~", "구체적 손실/삭감액", "99%가 모르는")에 완벽히 끼워 맞춰서 작성하세요. 평범하고 정보만 주는 제목은 0점 처리됩니다.
`;
    const bannedSection = bannedKeywords.length > 0 
      ? `\n[절대 금지 키워드 (이미 과거에 3번 이상 추출됨)]\n아래 키워드들은 절대로 다시 제안하지 마세요: ${bannedKeywords.join(', ')}\n` 
      : "";

    const creatorAdvisorData = `
[📊 네이버 크리에이터 어드바이저 공통 급상승 트렌드 (최신 데이터: 4월 30일 반영) 📊]
- 비즈니스/경제: 고유가 피해지원금, 청년미래적금, 고유가 지원금 대상, 대원전선, 신한제18호스팩, 대한전선, 고유가지원금, 금시세, 청년도약계좌, ISA 계좌, 종합소득세신고, 대우건설, 종합소득세, 2026 자녀장려금, 삼성전자 주가, 금값시세
- IT/컴퓨터: 챗로그, 클로드 ai, 케이뱅크 돈나무, 티빙 한달무료, 아이폰 폴더플폰 400만원 논란, 아이폰18 출시일, 넷플릭스 성인인증, 갤럭시 s26, 아이폰 통화녹음, 싸이월드, one ui 8.5, 갤럭시 카메라 무음, 유튜브 프리미엄 라이트, 카톡 프로필 방문자, 클로드 가격
- 사회/정치: 정재인 검사 프로필, 소득 하위 70% 금액, 박동빈 별세, 의왕 화재, 생태계 서비스 뜻, 5월 4일 공휴일, 내손동 화재, 울산 산부인과 사망, 여수 해돋이, 이춘재 화성
- 건강/의학: 꽃가루지수, 마그네슘 효능, 장기기증 타투, 대추밭백한의원, 왼쪽 옆구리 통증, 마운자로 가격, 기침 멈추는법, 알부민 효능, 간에 좋은 음식, 당뇨 초기증상, 토마토 효능, 대상포진증상, 발바닥 통증, 혈압 낮추는법, 갑상선암 증상, 아젤리아크림, 대마종자유 효능, 편평사마귀
- 상품/생활: 미스왁 후기, 코스트코 추천상품, 할리스 미피 굿즈, 촉촉한 황치즈칩, 노브랜드 순두부쫄면, 왕뚜껑 국물라볶이, 조니워커 블루라벨, 코스트코 5분 건강 샌드위치, 세븐일레븐 키티 리유저블백, 맥도날드 해피밀, 컴포즈 너티크림라떼, 베스킨라빈스 포켓몬
- 60대 시니어/이슈(남녀 종합): 박동빈 별세 명품 배우 56년, 故 박동빈 아내 이상이에 위로 메시지, 박동빈 별세 딸 심장질환 고백, 정재인 검사 프로필, 마늘쫑볶음, 오이지 담그기, 오이소박이 레시피, 이정재 임세령 12년 열애 데이트, 황산 관련주, 고양 꽃박람회, 황매산 철쭉축제, 리노공업 8600억 지분 매각 실체
* (지시사항): 블로그당 하루 10~15개씩 포스팅이 발행되므로, 위 최신 데이터(특히 [NEW] 급상승 키워드)를 베이스로 참고하여 서로 절대 중복되지 않도록 다채롭게 발굴하세요.
`;
    feedbackLearningGuidance += creatorAdvisorData;

    const botConfigs: Record<string, any> = {
      'bot1': {
        name: '"자동봇 1호기(지원금/복지 전문)"',
        target: '전국민',
        unique1: '정부 보조금, 숨은 정부 지원금, 캐시백 혜택 (예: 2026 소상공인 추경지원금, 고유가 피해지원금)',
        unique2: '지원금 마감 임박 및 미신청 시 금전적 손실 공포 자극'
      },
      'bot2': {
        name: '"자동봇 2호기(예적금/특판 전문)"',
        target: '2050 직장인 및 재테크 관심층',
        unique1: '시중은행 4% 이상 고금리 예적금 특판 및 파킹통장 (예: 청년도약계좌, 새마을금고 특판)',
        unique2: '특판 마감 임박 및 3%대 예금 유지 시의 기회비용/손실 조롱'
      },
      'bot3': {
        name: '"자동봇 3호기(국민연금/시니어 경제)"',
        target: '5060 시니어 및 은퇴 준비생',
        unique1: '국민연금 개혁, 조기수령, 기초연금 수급 자격 및 건보료 폭탄 방어',
        unique2: '은퇴자 타겟 국민연금 삭감 공포 및 "이것 모르면 매달 XX만원 손해" 프레임'
      },
      'bot4': {
        name: '"자동봇 4호기(부동산/청약 줍줍 전문)"',
        target: '유주택/무주택 영끌족',
        unique1: '서울/수도권 로또 아파트 무순위 청약(줍줍) 및 분양 일정 (예: 디에이치, 래미안)',
        unique2: '부동산 벼락거지 공포 및 수억 원의 시세차익 강조'
      },
      'bot5': {
        name: '"자동봇 5호기(도파민/이슈/인물 전문)"',
        target: '2060 전 연령 (실검/가십 소비층)',
        unique1: '화제의 정치인, 검사, 연예인 프로필, 미담, 부고, 논란 (예: 정재인 검사, 박동빈 별세)',
        unique2: '인기 드라마 결말 스포일러, 찌라시 및 대중의 관음증 자극'
      },
      'bot6': {
        name: '"자동봇 6호기(세금/절세 폭탄 방어)"',
        target: '직장인, 프리랜서, 자영업자',
        unique1: '5월 종합소득세, 연말정산, 양도소득세 등 세금 환급금 찾기 및 절세 노하우',
        unique2: '세금 신고 누락 시 발생하는 가산세 폭탄 공포 자극'
      },
      'bot7': {
        name: '"자동봇 7호기(정치/우파 시각 전문)"',
        target: '보수적 정치/사회 관심층',
        unique1: '보수/우파 정치권 주요 인물, 안보, 자유시장경제, 기업 규제 완화 이슈',
        unique2: '우파 시각에서의 사회 문제 비판 및 안보/경제 불안감 자극'
      },
      'bot8': {
        name: '"자동봇 8호기(정치/좌파 시각 전문)"',
        target: '진보적 정치/사회 관심층',
        unique1: '진보/좌파 정치권 주요 인물, 평등, 복지 확대, 노동권, 민생 지원 이슈',
        unique2: '좌파 시각에서의 정책 비판 및 서민 경제/불평등에 대한 불안감 자극'
      },
      'bot9': {
        name: '"자동봇 9호기(네이트판/온라인 썰 전문)"',
        target: '10~40대 커뮤니티 이슈/썰 소비층',
        unique1: '네이트판 톡톡, 블라인드 등 온라인 커뮤니티 레전드 썰, 고부갈등, 사이다썰, 연애상담',
        unique2: '대중의 강력한 공감/분노 도파민 유발 및 인간관계 파탄에 대한 두려움 자극'
      }
    };
    
    // 입력된 style(예: blog1, site2_bot2 등)에서 숫자만 추출하여 1~9호기로 강제 맵핑
    const numMatch = style.match(/\d+/);
    const styleNumber = numMatch ? parseInt(numMatch[0]) : 1;
    // 9호기를 초과하는 요청이 오더라도 1~9 안에서 순환하도록 처리
    const mappedNumber = styleNumber > 9 ? ((styleNumber - 1) % 9) + 1 : styleNumber; 
    const botConfig = botConfigs[`bot${mappedNumber}`] || botConfigs['bot1'];

    let prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)이자, **${botConfig.target} 타겟 블로그**를 운영하는 ${botConfig.name} 편집장입니다.
현재 이 블로그는 하루 10~15개의 포스팅을 발행하고 있으며, 각 포스팅당 **'조회수 1만 회 이상 달성'**을 목표로 합니다.
하루 글이 절대 겹치지 않도록 추천 범위를 극단적으로 넓혀 **조회수 1만 이상이 찍힐 수 있는 폭발적인 메가 트렌드 롱테일 키워드 딱 5개**를 발굴해야 합니다.
[극단적 다양성 확보 지시] 추출하는 5개의 키워드는 소재, 타겟, 접근 방식이 서로 완전히 달라야 하며, 이 봇을 연달아 10번을 실행하더라도 절대 같은 내용(주제, 소재, 인물)이 나오지 않도록 광범위한 세부 롱테일을 탐색하세요.
${bannedSection}
${feedbackLearningGuidance}

[사용자 지정 핵심 주제]
- 오늘 집중 탐색할 주제: ${coreKeyword ? `"${coreKeyword}"` : "'대중의 지갑 사정과 연결된 폭발적인 재테크/사회/정치 뉴스'"}

[🔥 크리에이터 어드바이저 실시간 데이터 최우선 활용 지침 🔥]
- 위에서 제공된 **[네이버 크리에이터 어드바이저 공통 급상승 트렌드]** 목록에 있는 실시간 검색어들을 **반드시 최우선적으로 활용**하세요.
- 5개의 키워드 중 **최소 3개 이상**은 무조건 크리에이터 어드바이저 목록에 있는 단어를 직접 사용하거나, 해당 단어와 완벽하게 일치하는 주제의 롱테일 키워드여야 합니다.
- 크리에이터 어드바이저 단어를 아래 5가지 카테고리(기본 3 + 고유 2) 성격에 맞게 창의적으로 매칭하여 추출하세요.

[🚨 ${botConfig.name} 핵심 미션: 도메인 맞춤형 100% 독립 전문화 + 돈/공포(FOMO) 결합 전략 (Cross-Domain FOMO) 🚨]
이 블로그의 전문 분야(${botConfig.unique1}, ${botConfig.unique2})에 **100% 완전히 집중**하여 5개의 키워드를 뽑습니다. 단, 단순히 정보만 전달해서는 절대 1만 뷰가 나오지 않습니다. 
반드시 5개의 키워드 **모두에 '돈(할인, 환급금, 지원금, 절약)' 또는 '공포(손실, 건강악화, 마감임박)'라는 치트키 요소를 창의적으로 결합**해야 합니다.

1. [도메인+FOMO 1] ${botConfig.unique1} + (돈/지원금/환급금 결합)
2. [도메인+FOMO 2] ${botConfig.unique1} + (마감임박/손실공포 결합)
3. [도메인+FOMO 3] ${botConfig.unique2} + (돈/지원금/초특가 결합)
4. [도메인+FOMO 4] ${botConfig.unique2} + (마감임박/사기공포/경고 결합)
5. [도메인+FOMO 5] 크리에이터 어드바이저 트렌드 중 본인 도메인과 맞는 것 1개 + (강력한 FOMO 후킹)

- 🚫 [타 영역 침범 절대 금지]: 당신은 ${botConfig.name} 담당이므로, 본인의 고유 영역이 아닌 다른 봇의 영역(예: 뷰티 봇이 주식 이야기를 하거나, 여행 봇이 대출/예적금 이야기를 하는 것)을 절대 침범하지 마세요. 공통 무기(예적금/청약)는 모두 버리고, 오직 본인 영역 안에서 돈/공포 요소를 찾아내야 합니다.
- (예시) 뷰티/건강 봇: 단순 다이어트법(X) -> "국가 무료 건강검진 받고 다이어트 지원금 챙기는 법" (O)
- (예시) 여행/핫플 봇: 지역 축제 소개(X) -> "지역 축제 가서 온누리상품권 10% 할인받고 뽕뽑는 법" (O)
- (예시) IT/테크 봇: 기기 리뷰(X) -> "아이폰18 출시 전, 숨은 통신비 미환급금 10만원 찾는 법" (O)
- 제목 후킹과 팩트: 5개 키워드 모두 사람을 초조하게(FOMO) 만들거나 강한 도파민을 유발하는 강력한 후킹을 필수 적용하세요.

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
