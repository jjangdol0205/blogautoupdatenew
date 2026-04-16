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

[크리에이터 어드바이저 기반 타겟 분석 (학습 데이터: 최신 4월 12일자 패턴 적용)]
- IT/컴퓨터(단기 꿀팁/플랫폼): '오즈모 포켓4(new)', '구라제거기(new)', '갤럭시 에어드랍(new)', '홀로코스트 뜻(new)', '살목지 해석', '아이폰18/18출시일', '클로드 ai', '웨이브/티빙 한달무료'
- 상품리뷰(연예인템/신상 먹거리): '김신영의 모든 것(도마, 그릇, 고구마칩, 미역국, 청소기)(new)', '두근두근 1등(new)', '스모크 비프립 와퍼(new)', '요시 팝콘통', '테키라 마스카라', '스타벅스 신상(토이스토리, 푸드백, 메뉴)', '코스트코 추천상품'

[🚨 두 번째 블로그(Blog2) 핵심 미션: 연예인 방송템 사냥 + 필수 PC/IT 유틸리티 소개 🚨]
- 방송 아이템 & F&B 리뷰(50%): 대중은 방송에 한 번 탄 연예인의 실생활 아이템에 열광합니다. **'김신영 도마/그릇/청소기'**, **'스모크 비프립 와퍼(버거킹 신상)'**, **'테키라 마스카라'** 등 방금 방송이나 이벤트로 뜬 핫딜/셀럽 아이템을 집중 발굴하세요.
- IT 유틸리티/숨은 기능(50%): '구라제거기 다운로드 및 사용법', '갤럭시 에어드랍(퀵쉐어) 사용법', '오즈모 포켓4 출시정보' 등 PC/스마트폰 작업 효율을 10배 높여주는 필수 유틸리티 및 신규 하드웨어 출시 정보를 발굴하세요.
- 제목 후킹 요소: 스펙 나열이 아닌, **"결국 품절", "방송에 나온 그 제품", "PC 속도 200% 빨라지는", "월 O만원 아끼는법", "출시일/가격 유출"** 등의 후킹 요소를 결합하세요.

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

[크리에이터 어드바이저 건강/의학 타겟 분석 (학습 데이터: 최신 4월 12일자 패턴 적용)]
- 국소 부위 통증/질환/검사: '중국(발) 눈병(new)', '노다바이러스(new)', '허리 삐끗했을때(new)', '당뇨 초기증상', '대장내시경 전 음식', '갑상선암 증상', '손톱 검은세로줄', '왼쪽 아랫배 통증'
- 천연 식품 및 영양제: '알부민 효능', '마그네슘 효능', '올리브오일/아보카도/머위 효능', '간에 좋은 음식'
- 다이어트 및 질환예방 트렌드: '마운자로 가격(비만약)', '김신영 요요', '아젤리아/멜라논크림', '몸속 염증 없애기'

[🚨 세 번째 블로그(Blog3) 핵심 미션: 4060 건강 고민 즉각 해결 + 신종 바이러스 공포 심리 타겟팅 🚨]
- 타겟팅 포인트: 건강 정보는 생명과 직결되므로 최근 유행하기 시작한 **'노다바이러스', '중국발 눈병' 등 감염병 및 신종 바이러스 공포**를 타겟팅하거나, **'허리 삐끗했을때 파스/찜질 대처법'**과 같은 실생활 즉시 응급 처치 정보를 다뤄야 합니다.
- 건강기능식품 & 식단 융합: '무릎 관절에 최악인 음식', '대장내시경 전 절대 먹으면 안 되는 음식', '혈관 뚫어주는 기적의 레시피' 등 식품과 건강을 조합한 강력한 제목을 만드세요.
- 제목 후킹 규칙: 반드시 **"방치하면 큰일", "전염성 경고", "초기증상 무시했다가", "검사 전 필수 확인", "약국 품절"** 식의 직관적이고 강력한 건강 썸네일용 텍스트를 기획하세요.

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
현재 구글 검색(Google 경유)을 실시간으로 활용하여, **네이버 홈판 경제/사회/이슈 탭에 올라갈 수 있을 만큼 전국민적인 폭발력을 가진 '메가 황금 트렌드/롱테일 키워드' 딱 5개**를 능동적으로 추론하고 발굴해내세요.
${bannedSection}
${feedbackLearningGuidance}

[사용자 지정 핵심 주제]
- 오늘 집중 탐색할 주제: ${coreKeyword ? `"${coreKeyword}"` : "'대중의 지갑 사정과 연결된 폭발적인 재테크/사회/정치 뉴스'"}

[크리에이터 어드바이저 타겟 분석 (학습 데이터: 최신 4월 12일자 패턴 적용)]
- 비즈니스/경제(지원금/앱테크/금융): '고유가 피해지원금(new)', '2026 민생지원금', '신생아 특례대출', '출국납부금 환급', '유플투뿔(new)', '테슬라 350 붕괴/주가 전망(new)', '청년도약계좌', '카카오뱅크 ai퀴즈/옆커폰 퀴즈', '강동헤리티지자이' 
- 사회/정치/사건사고(핫이슈): '완도 화재(new)', '경주 교통사고(new)', '시흥 j교회 이목사(new)', '시흥 제자비전교회(new)', '홀로코스트 뜻(new)', '5월1일 공휴일', '여수 해든이(new)' 

[🚨 첫 번째 블로그(Blog1) 핵심 미션: 경제/정치/사건사고 핫이슈 기반 어그로 극대화 🚨]
- 80% 집중: 대중은 **'고유가 피해지원금/신생아 특례대출' 등 새로운 형태의 정부 지원 금융 혜택**과 **오늘 발생한 최신 화보/교통사고/교회 논란 (완도 화재, 경주 교통사고, 시흥 j교회 등)**과 같은 휘발성이 매우 강한 실시간 사건사고에 미친 듯이 클릭합니다.
- 20% 신규 시도: '테슬라 350 붕괴' 같은 자극적인 주식 시황이나 '유플투뿔' 같은 앱테크 통신사 이벤트를 다뤄보세요.
- 제목 후킹과 팩트: 5개 키워드 모두 **"99%가 손해보는", "오늘 마감", "블랙박스 영상", "논란 주의", "충격적인 문자"** 등 재난/사고에 대한 호기심이나 지갑 사정에 대한 두려움을 강력하게 자극하는 워딩을 필수 포함하세요.

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
