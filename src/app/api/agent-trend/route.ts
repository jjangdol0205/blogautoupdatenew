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
당신은 대한민국 상위 0.1% 네이버 블로그 메가 트래픽 마스터이자, **'IT/테크 기기 및 생활/가전/상품 꿀템'**을 전문으로 다루는 "자동봇 2호기(두 번째 바로그)" 편집장입니다.
현재 목표는 20~40대 남녀 직장인 및 주부들이 무조건 클릭하게 만드는 생활 밀착형 대박 롱테일 키워드 5개를 발굴하는 것입니다.
${bannedSection}
${feedbackLearningGuidance}

[크리에이터 어드바이저 기반 타겟 분석 (학습 데이터: 최신 4월 16일자 패턴 적용)]
- IT/컴퓨터(AI 꿀팁/디자인 유출): '아이폰18 디자인 예상/출시일(new)', '덕테이프 AI(new)', '유튜브 프리미엄 라이트', '아이폰 통화녹음/잠금화면'
- 상품리뷰(신규 굿즈/영양제/장난감): '디올뷰티 베니티(new)', '맥도날드 해피밀(new)', '티라노 골드 플러스 가격(new)', '스타벅스 신상(토이스토리, 미니텀블러(new))'

[🚨 두 번째 블로그(Blog2) 핵심 미션: 명품 뷰티 굿즈 + 해피밀/장난감 + 혁신 AI 툴 리뷰 🚨]
- 브랜드 굿즈/핫딜 사냥(50%): 여성들이 환장하는 명품 사은품인 **'디올뷰티 베니티(파우치) 대란'**, 엄마들이 줄 서는 **'맥도날드 해피밀 장난감 라인업'**, 어린이 영양제 **'티라노 골드 플러스 가격'** 등 소문난 신상과 육아템 명당 리뷰를 선점하세요.
- 혁신 AI/스마트폰 유출 정보(50%): 그림 그려주는 최신 인플루언서 툴 **'덕테이프 AI(Duct tape ai)' 사용법**이나, 애플 유저들의 심장을 뛰게 할 **'아이폰18 예상 디자인/출시 정보'**를 마치 해외 외신을 번역한 것처럼 가장 먼저 뿌리세요.
- 제목 후킹 요소: 스펙 나열이 아닌, **"결국 품절", "오전 7시 대기줄", "디올 파우치를 공짜로", "월 O만원 미친 AI앱", "유출 사진 공개"** 등의 후킹 요소를 결합하세요.

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

[크리에이터 어드바이저 건강/의학 타겟 분석 (학습 데이터: 최신 4월 16일자 패턴 적용)]
- 질환/검사/통증: '급성구획증후군(new)', '마라탕 식중독(new)', '송화가루 알레르기(new)', '갑상선암 증상', '당뇨 초기증상', '왼쪽 아랫배/오른쪽 옆구리 통증'
- 미용/다이어트 비법: '아이린 36세 몸매 비법 4가지(new)', '위너확장구멍'
- 의약품/영양제 핫이슈: '투엑스비 츄어블/가격(new)', '아젤리아크림', '올리브오일/마그네슘/알부민 효능', '몸속 염증 없애기'

[🚨 세 번째 블로그(Blog3) 핵심 미션: 급성 마비/식중독 공포 + 약국 핫템(투엑스비) 타겟팅 🚨]
- 타겟팅 포인트: 갑자기 마비가 오는 병인 **'급성구획증후군'**이나 1020 자녀들이 먹는 **'마라탕 식중독/위생 고발'** 등 엄마/가장 독자들이 가장 두려워하는 급성 질환의 공포를 자극하세요. 또한 4월 불청객 **'송화가루'** 알레르기 예방도 다루세요.
- 영양제/뷰티 핫템: 맘카페/유튜브에서 터진 새로운 피로회복제 **'투엑스비 츄어블 부작용/가격'** 정보를 낱낱이 파헤치고, **'아이린 36세 몸매 비법 4가지'**를 중년 다이어트 식단과 엮으세요.
- 제목 후킹 규칙: 반드시 **"충격적인 위생", "자녀가 먹는다면 당장 금지", "근육 괴사 주의", "약국 품절 대란", "아이린이 매일 먹는"** 식의 직관적이고 강력한 건강 썸네일용 텍스트를 기획하세요.

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

[크리에이터 어드바이저 타겟 분석 (학습 데이터: 최신 4월 16일자 패턴 적용)]
- 비즈니스/경제(충격 경제뉴스/유리기판): '과천 19억 아파트 8억 매매(new)', '장기보유 1주택 양도세 폐지 논란(new)', 'IMF 경고/5년 뒤 한국 빚폭탄(new)', '전기세 인상/개편(new)', '유리기판 관련주(new)', '양자컴퓨터/아이온큐'
- 사회/정치/사건사고(방송인성 논란): '광주 중학생 금쪽이/교사 뇌진탕(new)', '홍대 박성범 인스타(new)', '남미새 뜻(new)', '텐퍼센트 김해부원역점 논란(new)', '오선재(new)'

[🚨 첫 번째 블로그(Blog1) 핵심 미션: 방송 빌런 분노 유발 + 경제/부동산 폭락 공포 🚨]
- 80% 집중: 사회면의 압도적 1위 트래픽은 **'광주 중학생 금쪽이(교사 뇌진탕 폭행 사건)'**과 **'홍대 박성범 인스타 털기'**, **'텐퍼센트 논란'** 등 인터넷을 뜨겁게 달구는 빌런들에 대한 분노입니다. 이들의 신상이나 충격적 행동을 집중 조명하세요.
- 20% 신규 시도: 경제면의 무서운 이슈들, 즉 **'과천 19억 아파트 8억 반토막'**, **'IMF 경고 한국 빚폭탄'**, **'전기세 개편'** 등 자산 가치 하락에 대한 극강의 공포심을 자극하는 기사를 배열하세요.
- 제목 후킹과 팩트: 5개 키워드 모두 **"신상 공개/인스타", "충격적인 원본 영상", "IMF 경고", "반토막 현실", "분노 주의"** 등 공분과 공포, 경제적 손실 회피 마케팅을 필수 적용하세요.

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
