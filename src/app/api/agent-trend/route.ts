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

[상위노출 벤치마킹 데이터 (조회수 100~1000회 폭발 사례 분석)]
최근 신생 블로그에서도 즉각적인 폭발(100회 이상)을 일으킨 황금 키워드의 특징은 다음과 같습니다:
- "신협 4% 특판 예금", "새마을금고 고금리 적금", "비과세 종합저축 막차" (한정된 기간, 선착순 고수익 금융상품)
- "무순위 줍줍 청약", "로또 청약 거주지 제한" (수십만 명이 몰리는 시세차익 확정 부동산 이슈)
- "청년도약계좌 일시납", "ISA 계좌 만기 활용법" (특정 세대가 당장 돈을 아끼거나 불리는 절세/재테크 실전 팁)

[키워드 발굴 절대 원칙]
1. (절대 금지): '파킹통장 추천', 'CMA 금리비교', '의료급여', '교육급여', '돌봄서비스'처럼 너무 경쟁률이 심한 레드오션이거나, 반대로 극소수 대상의 복지 정책은 철저히 배제하세요. (조회수 10~20회에 그칩니다.)
2. (강력 권장): 구체적인 '은행명/상품명'이 포함된 기간 한정/선착순 고수익 금융 정보 (예: "2026년 OO신협 8% 특판 적금 가입방법") 또는 당장 실현 가능한 수백만 원 단위의 세금 혜택 (예: "ISA 계좌 서민형 500만원 비과세 조건").
3. 독자가 "지금 당장 가입(신청) 안 하면 나만 손해 본다"는 극도의 불안감(FOMO)을 느낄 수 있는, '시의성'과 '수익성'이 가장 강력한 경제/재테크/부동산 실전 꿀팁 위주로 발굴하세요.

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
