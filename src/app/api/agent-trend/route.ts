import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import crypto from "crypto";

const ai = new GoogleGenAI({});

export const maxDuration = 60; // Vercel 서버리스 함수 타임아웃 최대 연장

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch(e) {}
    const { goodUrl, badUrl, bannedKeywords = [] } = body;

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

    const prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 트래픽 마스터(SEO 전문가)입니다.
현재 구글 검색(Google Search)을 실시간으로 적극 활용하여, 오늘 날짜 기준으로 네이버 블로그 생태계에서 매우 뜨거운 관심을 받고 있지만 아직 초대형 인플루언서들이 꽉 잡고 있지 않은 **'틈새(니치) 황금 롱테일 키워드' 딱 5개**를 발굴해내세요.
${bannedSection}

${feedbackLearningGuidance}

[🚨 핵심 미션: 할루시네이션(거짓 정보) 절대 금지 및 100% 실존 데이터 발굴 🚨]
- 가장 트래픽이 잘 나오는 황금 키워드는 "특판 예금/적금" (예: "OO신협 8% 특판") 입니다. 그러나 **절.대.로 가상의 지점명이나 존재하지 않는 금리(%)를 상상해서 지어내지 마세요.**
- 반드시 **현재 구글 검색(Google Search Tool)**을 먼저 실행하여, 최근 1~2주 내에 실제 기사나 커뮤니티(뽐뿌, 블로그 등)에 올라온 **"현재 진행 중이거나 곧 시작하는 100% 실존하는 특판 상품"**만 찾아내야 합니다.

[상위노출 벤치마킹 데이터 (조회수 100~1000회 폭발 사례 분석)]
최근 신생 블로그에서도 즉각적인 폭발(100회 이상)을 일으킨 황금 키워드의 특징은 다음과 같습니다:
- **(가장 강력한 강력 추천 1순위)** "신협 4% 특판 예금", "새마을금고 고금리 적금" 등 한정된 기간, 선착순 고수익 금융상품 (무조건 검색 검증된 실존 상품만!!!!)
- "무순위 줍줍 청약", "로또 청약 거주지 제한" (수십만 명이 몰리는 실제 시세차익 확정 부동산 이슈)
- "청년도약계좌 일시납", "ISA 계좌 만기 활용법" (절세/재테크 실전 팁)
- "FOMC 미국 기준금리 인하", "엔비디아 실적 발표치" (파급력 큰 거시경제/증시 핫이슈)

[키워드 발굴 절대 원칙]
1. (절대 금지): 가상의 특판 상품(예: 아무렇게나 지어낸 "더뱅크신협 9% 특판")은 절대 발굴 목록에 넣지 마세요. 무조건 실제 구글 검색 결과에서 확인된 팩트 기반 상품명(지점명+이율)만 키워드로 도출해야 합니다.
2. (절대 금지): '파킹통장 추천', 'CMA 금리비교', '의료급여'처럼 너무 경쟁이 심하거나 타겟이 좁은 키워드는 철저히 배제하세요.
3. 독자가 "이건 지금 당장 가입(행동) 안 하면 무조건 손해다"라는 극도의 불안감(FOMO)을 느낄 수 있는 **구체적인 실전 특판/청약/이슈를 5개** 섞어서 발굴하세요. 확신이 없다면 차라리 안전한 글로벌 경제 핫이슈로 빈자리를 채우세요.

반드시 아래 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 추가하지 마세요.
{
  "trends": [
    {
      "keyword": "발굴한 롱테일 키워드",
      "reason": "왜 이 키워드가 지금 트래픽을 당길 수 있는 황금 빈집인지에 대한 아주 짧은 분석 (1~2문장)"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        tools: [{ googleSearch: {} }]
      },
    });

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
