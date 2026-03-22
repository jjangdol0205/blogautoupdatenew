import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { keyword } = await req.json();

    if (!keyword || keyword.trim() === '') {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    const customerId = process.env.NAVER_AD_CUSTOMER_ID;
    const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
    const secretKey = process.env.NAVER_AD_SECRET_KEY;

    if (!customerId || !accessLicense || !secretKey) {
      return NextResponse.json(
        { error: "네이버 검색광고 API 키가 설정되지 않았습니다. .env.local 파일에 NAVER_AD_CUSTOMER_ID, NAVER_AD_ACCESS_LICENSE, NAVER_AD_SECRET_KEY를 추가해주세요." },
        { status: 500 }
      );
    }

    const timestamp = Date.now().toString();
    const method = "GET";
    const path = "/keywordstool";

    const message = `${timestamp}.${method}.${path}`;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(message)
      .digest("base64");

    // hintKeywords accepts up to 5 comma-separated keywords, but we just pass the first word of user input to get broader results
    const seedKeyword = keyword.trim().split(' ')[0];
    const apiUrl = `https://api.naver.com${path}?hintKeywords=${encodeURIComponent(seedKeyword)}&showDetail=1`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": accessLicense,
        "X-Customer": customerId,
        "X-Signature": signature,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Naver Ad API Error:", response.status, errText);
      return NextResponse.json(
        { error: `네이버 검색광고 API 호출 실패: ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const keywordList = data.keywordList || [];
    
    // Parse numeric counts (Naver sometimes returns "< 10" for low volume)
    const parseCnt = (val: any) => {
        if (typeof val === 'string' && val.includes('<')) return 5;
        return parseInt(val) || 0;
    };

    const mappedKeywords = keywordList.map((k: any) => {
        const pc = parseCnt(k.monthlyPcQcCnt);
        const mobile = parseCnt(k.monthlyMobileQcCnt);
        const total = pc + mobile;
        return {
            keyword: k.relKeyword,
            monthlyTotalCnt: total,
            pcCnt: pc,
            mobileCnt: mobile,
        };
    });

    // [니치 트래픽 고도화] 너무 거대한 키워드(초경쟁)와 너무 작은 키워드를 제외
    // 황금 키워드 조건: 월간 검색량 500 ~ 50,000 사이
    const nicheKeywords = mappedKeywords.filter((k: any) => {
      return k.monthlyTotalCnt >= 500 && k.monthlyTotalCnt <= 50000;
    });

    // 필터링 결과가 너무 적으면 전체 키워드 풀 사용
    const targetArray = nicheKeywords.length >= 12 ? nicheKeywords : mappedKeywords;

    // [랜덤성 부여] 조회할 때마다 새로운 키워드가 나타나도록 무작위 셔플 후 상위 12개 추출
    const shuffled = targetArray.sort(() => 0.5 - Math.random());

    // Return top 12 keywords
    return NextResponse.json({ recommendations: shuffled.slice(0, 12) });
  } catch (error: any) {
    console.error("Recommend Keywords API Error:", error);
    return NextResponse.json(
      { error: error?.message || "연관 키워드를 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
