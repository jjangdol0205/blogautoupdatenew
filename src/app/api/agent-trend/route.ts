import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import crypto from "crypto";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { goodUrl, badUrl } = await req.json().catch(() => ({}));

    let feedbackLearningGuidance = "";
    if (goodUrl || badUrl) {
      feedbackLearningGuidance += `
[개인화된 맞춤형 타겟팅 지침]
사용자가 과거 작성한 블로그 피드백 주소입니다. 이 블로그의 톤앤매너와 주요 주제(니치)를 분석하고, 사용자의 전문 분야에 맞는 트렌드 키워드를 발굴하세요.
`;
      if (goodUrl) feedbackLearningGuidance += `- 성공 사례(이 분야 위주로 발굴): ${goodUrl}\n`;
      if (badUrl) feedbackLearningGuidance += `- 실패 사례(이 분야와 유사한 포괄적 키워드는 배제): ${badUrl}\n`;
    }

    const prompt = `
당신은 대한민국 상위 0.1% 네이버 블로그 트래픽 마스터(SEO 전문가)입니다.
현재 구글 검색(Google Search)을 실시간으로 적극 활용하여, 오늘 날짜 기준으로 네이버 블로그 생태계에서 매우 뜨거운 관심을 받고 있지만 아직 초대형 인플루언서들이 꽉 잡고 있지 않은 **'틈새(니치) 황금 롱테일 키워드' 딱 5개**를 발굴해내세요.

${feedbackLearningGuidance}

[상위노출 벤치마킹 데이터 (필수 참고)]
최근 조회수가 폭발한 실제 상위노출 블로그들을 분석한 결과, 다음과 같은 키워드들이 압도적인 유입을 만들었습니다:
- "2026 민생지원금", "4차 민생지원금", "민생지원금 신청방법" (최신 정책/지원금 이슈)
- "CMA 금리비교", "파킹통장 추천" (금융/재테크 실생활 혜택 비교)
- "통합돌봄 서비스", "부모님 노인돌봄" (생활/복지/사회적 이슈)

[키워드 발굴 절대 원칙]
1. (절대 금지): '비트코인', '장외주식', '맛집', '여자트로트가수' 같은 뻔하고 넓은 메가 키워드.
2. (강력 권장): 위 벤치마킹 데이터처럼 구체적인 정책명, 지원금, 실생활 혜택(신청방법, 자격, 비교) 등이 포함된 5글자 이상의 롱테일 키워드. (예: "2026 정부지원금 숨은 혜택", "카카오뱅크 파킹통장 이자 비교")
3. 실시간으로 사람들이 가장 불안해하거나 당장 신청/가입하지 않으면 손해를 볼 것 같은 경제/정책/복지/금융 이슈 위주로 적극 발굴하세요.

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
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      },
    });

    let trends = [];
    try {
      const jsonStr = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{"trends":[]}';
      const parsed = JSON.parse(jsonStr);
      trends = parsed.trends || [];
    } catch (e) {
      console.error("Gemini JSON parse failed, text was:", response.text);
      return NextResponse.json({ error: "AI가 트렌드를 분석하는 중 오류가 발생했습니다." }, { status: 500 });
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
    return NextResponse.json({ error: "트렌드 마이닝 중 오류가 발생했습니다." }, { status: 500 });
  }
}
