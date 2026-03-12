import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { category, timeframe } = await req.json();

    if (!category || !timeframe) {
      return NextResponse.json(
        { error: "Category and timeframe are required" },
        { status: 400 }
      );
    }

    const prompt = `
당신은 네이버 블로그 생태계와 국내 검색어 트렌드 분석의 최고 전문가입니다.
사용자가 선택한 카테고리(${category})와 기간(${timeframe}) 동안 가장 사람들의 검색량이 많고 주목받는(Trending) 블로그 추천 키워드를 10개만 뽑아주세요.

[작성 가이드]
1. 단순한 1차원적 단어가 아닌, 실제 네이버 블로그 등에서 사람들이 검색할 만한 '구체적인 형태'의 키워드가 좋습니다. 
   (예: 단순 "아이폰" 보다는 "아이폰 15 프로 장단점", 단순 "카페" 보다는 "가로수길 조용한 개인 카페")
2. 상업성이 짙거나 정보성 글쓰기로 가치가 있는 고단가/고수요 키워드를 선별해주세요.
3. 기호나 번호, 설명, 따옴표 없이, 오직 키워드 자체만 한 줄에 하나씩 응답하세요. (정확히 10개의 줄이어야 함)

카테고리: ${category}
기준 기간: ${timeframe}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { 
        temperature: 0.8, // Slightly higher for variation
      },
    });

    const textResponse = response.text || "";
    
    // Split by newlines, clean up empty lines, numbers, and trim spaces
    const keywords = textResponse
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-+\s*/, '').replace(/^[*]+\s*/, '').replace(/['"]/g, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 10);

    return NextResponse.json({ keywords });
  } catch (error: unknown) {
    console.error("Gemini API Error in /api/recommend:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
