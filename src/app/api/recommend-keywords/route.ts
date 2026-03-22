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

    // Sort descending by total search volume
    mappedKeywords.sort((a: any, b: any) => b.monthlyTotalCnt - a.monthlyTotalCnt);

    // Return top 12 keywords
    return NextResponse.json({ recommendations: mappedKeywords.slice(0, 12) });
  } catch (error: any) {
    console.error("Recommend Keywords API Error:", error);
    return NextResponse.json(
      { error: error?.message || "연관 키워드를 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
