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
[📊 네이버 크리에이터 어드바이저 공통 급상승 트렌드 (최신 데이터: 4월 22일) 📊]
- 비즈니스/경제: 삼천당제약, 유플러스 장기고객, 유리기판 관련주, 2026 자녀장려금, 2026 민생지원금, 방산 관련주, 2차전지 관련주, sbti 테스트, 출국납부금 환급
- IT/컴퓨터: 나무엑스 퀴즈, sbti 테스트, 아이폰18프로, 유튜브 프리미엄 가격, 아이폰 배터리 교체 비용, 아이폰 18 출시일, 넷플릭스 성인인증
- 사회/정치: 나나 강도, 경기 컬처패스, 지수 친오빠, 임우재, 이하전 애국지사, 파주 부사관 아내, 2026 지구의 날, 엘렌 드제너러스 식인, 성심당 눅구빵, 4월 22일 유성우, 구더기 남편, 과즙세연
- 건강/의학: 급성구획증후군, 고현정 과한 화장 논란, 혈압 낮추는법, 코로나 재유행, 올리브오일 효능, 옴 증상
- 상품/생활: 유플러스 장기고객 퀴즈, 테키라 마스카라, 스타벅스 메뉴, 패션왕 박순호, px 화장품
* (지시사항): 블로그당 하루 10~15개씩 포스팅이 발행되므로, 위 최신 데이터를 베이스로 참고하여 서로 절대 중복되지 않도록 다채롭게 발굴하세요.
`;
    feedbackLearningGuidance += creatorAdvisorData;

    let prompt = "";
    
    if (style === 'blog2') {
      prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)이자, **'60대 및 비즈니스/경제 특화 메가 블로그'**를 운영하는 "자동봇 2호기(두 번째 블로그)" 편집장입니다.
현재 이 블로그(두 번째 블로그)는 하루 15개의 포스팅을 발행하고 있으며, 각 포스팅당 **'조회수 1만 회 이상 달성 (일 방문자 폭발적 증가)'**을 목표로 합니다.
이를 위해 철저히 **[크리에이터 어드바이저 데이터]**와 **[60대/경제 타겟]**에 기반하되, 하루 15개의 글이 절대 겹치지 않도록 추천 범위를 획기적으로 넓혀 한방에 **조회수 1만 이상이 찍힐 수 있는 완전히 새롭고 폭발적인 메가 트렌드 롱테일 키워드 딱 5개**를 발굴해야 합니다.
${bannedSection}
${feedbackLearningGuidance}

[크리에이터 어드바이저 기반 타겟 분석 (학습 데이터: 60대 남/녀 4월 22일 최신 급상승 패턴)]
- 비즈니스/경제(지원금/증시): '고유가 피해지원금', '채비 공모주', '유리기판 관련주', '전고체 관련주', '2차전지 대장주'
- 60대 이슈/가십 (방송/사고): '허수아비 기본정보', '기후동행퀴즈', '무명전설 투표', '임우재 근황', '패션왕 박순호', '리버스 기본정보', '김호중 친구'
- 60대 스포츠 이슈: '정호영 FA 보상선수 미리보기', '한국도로공사 박정아 영입 이유', '이정후 주루코치 실수에 분노'
- 60대 제철 레시피: '오이지 만들기', '두릅 데치기', '오이소박이 레시피', '엄나무순무침', '마늘쫑볶음', '열무김치레시피'
- 60대 관광/생활: '군포 철쭉축제', '황매산 철쭉축제', '비슬산 참꽃축제', '청주 입주청소'

[🔥 두 번째 블로그 실제 상위 노출 증명 데이터 (4월 22일 최신 성과 반영) 🔥]
1. 2026년 국민연금 60대 '이것' 모르면 수령액 30% 깎입니... (조회수 210회)
2. 60대 국민연금 '이것' 하나 안하면 월 50만원 삭감? 2026... (조회수 179회)
3. 아직도 국민연금 주는 대로 받으세요? 2026년 확정된 수... (조회수 146회)
4. 2026년 국민연금 수령, 60대 은퇴자 '이것' 모르면 매달 2... (조회수 101회)
5. 2026년 60대 1주택자 양도세, '장기보유특별공제' 모르면... (조회수 99회)
* (핵심 분석 및 성공 공식): 60대 타겟에게는 단순한 정보 전달보다 **'이것 모르면 30% 깎입니다', '월 50만원 삭감'** 같은 손실 회피(Loss Aversion) 심리를 자극하는 공포 마케팅이 압도적인 클릭률을 만듭니다. 특히 국민연금 감액, 온누리상품권 혜택, 세금 폭탄 주제가 가장 강력합니다.

[🚨 두 번째 블로그(Blog2) 핵심 미션: 60대 시니어/은퇴자 '라이프 & 생존' 특화 하이브리드 전략 🚨]
- 트래픽 치트키 비율: 기존에 뷰가 터졌던 돈/연금 방어 카테고리 3개와 60대 생존/사기에 직결된 특색 강화 카테고리 2개를 섞어 발굴합니다.
  1. [기존 유지] 국민연금/기초연금/건보료 방어 (예: 수령액 30% 삭감 피하는 법, 연금 개혁 폭탄)
  2. [기존 유지] 시니어 전용 복지/의료 지원금 (예: 임플란트, 보청기 지원금, 노인 일자리)
  3. [기존 유지] 은퇴자 절세 및 상속/증여 꿀팁 (예: 자식에게 세금 없이 5천만원 주는 법, 장기보유특별공제)
  4. [특색 강화] 60대 치명적 질병 전조증상 (건강 공포) (예: 치매, 뇌졸중, 대상포진 - "밥 먹고 '이것' 아프면 당장 병원 가세요" 식의 생존 공포 자극)
  5. [특색 강화] 시니어 타겟 신종 사기 수법 경고 (예: 신종 보이스피싱, 떴다방 사기 - "부모님 폰에 '이 앱' 깔려있으면 당장 지우세요" 식의 손실 회피 극대화)
- 🚫 [절대 중복 금지 규칙]: 추출하는 5개의 키워드는 반드시 **위 5가지 카테고리에서 각각 1개씩 서로 다르게 골고루 뽑아야** 합니다. 두 개 이상의 키워드가 같은 카테고리에 속하면 절대 안 됩니다.
- 제목 후킹과 팩트: 5개 키워드 모두 뻔한 정보가 아닌, **"'이것' 모르면 30% 깎입니다", "당장 병원 가세요!", "절대 누르지 마세요"** 등 공포감과 FOMO를 유발하는 강력한 후킹을 필수 적용하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "5대 카테고리 중 하나에 속하는 조회수 폭발 강력한 롱테일 키워드 (각 카테고리당 1개씩만 추출)",
      "reason": "이 키워드가 왜 기존과 다르게 1만 뷰 이상을 끌어올 수 있으며, 60대 타겟의 손실 회피 심리를 어떻게 사로잡을 수 있는지(1~2문장)"
    }
  ]
}
`;
    } else if (style === 'blog3') {
      prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터(SEO 전문가)이자, **'전국민 관심 집중 재테크/정부지원금/부동산 하이브리드 블로그'**를 운영하는 "자동봇 3호기(세 번째 블로그)" 편집장입니다.
현재 이 블로그는 기존의 건강/IT 주제를 버리고, 가장 트래픽 폭발력이 검증된 **[금융/특판 예적금]**과 **[시니어 정부지원금]**을 융합한 하이브리드 전략을 취합니다. 하루 10~15개의 포스팅 중 절대 겹치지 않도록 **조회수 1만 이상이 찍힐 수 있는 폭발적인 메가 트렌드 롱테일 키워드 딱 5개**를 발굴해야 합니다.
${bannedSection}
${feedbackLearningGuidance}

[🔥 세 번째 블로그 실제 상위 노출 증명 데이터 (4월 22일 최신 성과 반영) 🔥]
1. 2026 소상공인 추경지원금, '또 놓치셨나요?' 99%가 모... (조회수 751회 - 1위)
2. 변우석 아이유 '첫 동침+입맞춤' 현장, 스태프도 숨죽인 '... (조회수 92회 - 2위)
3. 신협 4% 특판 또 놓치셨나요? 99%가 모르는 3%대 후반... (조회수 44회 - 3위)
4. 강남 무순위 청약 '로또' 꿈꾸는 유주택자 주목! 2026년, 9... (조회수 41회 - 4위)
5. 강동헤리티지자이 10억 줍줍, 이미 끝났다고? 99%가 놓... (조회수 29회 - 5위)
* (핵심 분석 및 성공 공식): 가장 트래픽 폭발력이 검증된 **'부동산 로또 줍줍'**과 **'소상공인 지원금'**이 탄탄한 베이스를 이룹니다. 여기에 '변우석 아이유 동침' 처럼 대중의 도파민을 강력하게 자극하는 매운맛 연예/공분 이슈를 결합했을 때 트래픽 시너지가 폭발합니다. 철저히 2040 MZ 및 직장인의 일확천금 욕구와 도파민을 자극하세요.

[🚨 세 번째 블로그(Blog3) 핵심 미션: 2040 MZ & 직장인 '하이리스크/도파민/로또' 특화 전략 🚨]
- 트래픽 치트키 비율: 기존에 뷰가 터졌던 일확천금/로또 카테고리 3개와 도파민을 폭발시키는 가십/공분 특색 카테고리 2개를 섞어 발굴합니다.
  1. [기존 유지] 부동산 무순위 줍줍 / 로또 청약 (예: 강남 무순위 줍줍 - "9억 시세차익, 통장 없이 당장 넣으세요")
  2. [기존 유지] 2030 청년 & 소상공인 특화 지원금 (예: 청년도약계좌, 소상공인 대출 만기 연장)
  3. [기존 유지] 주식/코인 급등락 및 파격 투자 이슈 (예: 비트코인 1억 돌파, 밈코인, 테슬라 주가 - "지금 안사면 벼락거지")
  4. [특색 강화] 연예계 핫이슈 및 폭로/논란 (예: 유명인 이혼 사유, 충격 근황 등 대중의 관음증과 호기심을 자극하는 트렌디한 가십)
  5. [특색 강화] 대국민 공분 유발 사건사고 (예: 아파트 주차장 진상, 배달 거지 - 네이버 메인에서 가장 클릭률이 높은 분노 유발 블랙박스 이슈)
- 🚫 [절대 중복 금지 규칙]: 추출하는 5개의 키워드는 반드시 **위 5가지 카테고리에서 각각 1개씩 서로 다르게 골고루 뽑아야** 합니다. 두 개 이상의 키워드가 같은 카테고리에 속하면 절대 안 됩니다.
- 제목 후킹과 팩트: 5개 키워드 모두 뻔한 정보가 아닌, **"9억 시세차익 당장 넣으세요", "지금 안사면 벼락거지", "충격적인 결말"** 등 사람을 초조하게(FOMO) 만들거나 강한 도파민을 유발하는 후킹을 필수 적용하세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "5대 카테고리 중 하나에 속하는 조회수 폭발 강력한 롱테일 키워드 (각 카테고리당 1개씩만 추출)",
      "reason": "왜 이 키워드가 금융/지원금에 목마른 대중의 클릭을 유발하며 1만 뷰 이상의 성과를 낼 수 있는지(1~2문장)"
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

[크리에이터 어드바이저 타겟 분석 (학습 데이터: 최신 4월 22일자 패턴 적용)]
- 비즈니스/경제(충격 경제뉴스/주식): '삼천당제약(new)', '유리기판 관련주(new)', '2026 민생지원금(new)', '출국납부금 환급(new)', '방산 관련주', '2026 자녀장려금(new)'
- 사회/정치/사건사고(방송인성 논란): '나나 강도(new)', '지수 친오빠', '임우재(new)', '파주 부사관 아내(new)', '구더기 남편(new)', '과즙세연'
- IT/테크: '나무엑스 퀴즈(new)', '아이폰18프로(new)', '유튜브 프리미엄 가격', '아이폰 18 출시일', '넷플릭스 성인인증'

[🔥 첫 번째 블로그 실제 상위 노출 증명 데이터 (4월 22일 최신 성과 반영) 🔥]
1. 아직도 3%대 예금에 돈 묶어두셨나요? 5월 마감 임박! ... (조회수 415회)
2. 4월 24일 마감! 아직도 신청 안 하셨어요? 최대 1억 지원... (조회수 286회)
3. 4월 예금 4.1% 특판? 이미 마감! 99%가 놓친 진짜 고급... (조회수 171회)
4. 아직도 은행 가서 주담대 알아보세요? 2026년 생애최초 ... (조회수 120회)
5. 놓치면 9억 손해? 4월 서울 아파트 줍줍 딱 1곳, 청약통장... (조회수 106회)
* (핵심 분석 및 성공 공식): '아직도 OO하시나요?', '5월 마감 임박!', '놓치면 9억 손해' 등 행동을 촉구하고 FOMO(소외 불안)를 극도로 자극하는 후킹 제목이 1천 뷰 이상 폭발적인 트래픽을 견인했습니다. 특히 고금리 예적금, 숨은 지원금, 아파트 줍줍 주제가 압도적입니다.

[🚨 첫 번째 블로그(Blog1) 핵심 미션: 조회수 정체 돌파를 위한 '기존 검증(3) : 신규 폭발(2)' 하이브리드 전략 🚨]
- 트래픽 치트키 비율: 기존에 뷰가 터졌던 카테고리 3개와 폭발적인 클릭을 유발하는 신규 황금 카테고리 2개를 절반씩 섞어 발굴합니다.
  1. [기존 검증] 고금리 특판 / 예적금 마감 임박 (예: 5% 예금 마감, 새마을금고 특판 팩트체크)
  2. [기존 검증] 전국민 대형 정부 지원금 / 로또 줍줍 (예: 최대 1억 지원금 신청, 9억 손해 무순위 줍줍)
  3. [기존 검증] 사회적 분노 결합 이슈 (예: 대기업 횡포, 정책 분노, 진상 손님 등 대국민 공분 이슈)
  4. [신규 폭발] 미환급금 및 꽁돈 찾기 (예: 통신비 미환급금 조회, 건강보험료 환급금, 카드포인트 현금화 - "내 돈 찾아가세요" 자극)
  5. [신규 폭발] 여름맞이 실생활 밀착 세금/요금 방어 (예: 에어컨 제습 전기세 폭탄 방어, 한전 고효율 가전제품 환급, 과태료 폭탄 피하기)
- 🚫 [절대 중복 금지 규칙]: 추출하는 5개의 키워드는 반드시 **위 5가지 카테고리에서 각각 1개씩 서로 다르게 골고루 뽑아야** 합니다. 두 개 이상의 키워드가 같은 카테고리에 속하면 절대 안 됩니다.
- 제목 후킹과 팩트: 5개 키워드 모두 **"아직도 OO하시나요?", "내 돈 20만원 소멸 전!", "요금 폭탄 맞습니다"** 등 사람을 초조하게(FOMO) 만들고 즉각적인 행동을 촉구하는 강력한 표현을 필수 적용하세요.

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
