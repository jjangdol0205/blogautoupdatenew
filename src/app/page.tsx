"use client";

import { useState, useEffect } from "react";
import { Sparkles, Copy, CheckCircle2, PenTool, Loader2, AlertCircle, Lightbulb } from "lucide-react";

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [deviceType, setDeviceType] = useState<'desktop'|'mobile'>('desktop');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [result, setResult] = useState<{
    title: string;
    content: string;
  } | null>(null);
  
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Advanced AI Learning Features
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [goodUrl, setGoodUrl] = useState("");
  const [badUrl, setBadUrl] = useState("");

  const [recommendations, setRecommendations] = useState<{keyword: string, monthlyTotalCnt: number}[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [rcmdError, setRcmdError] = useState<string | null>(null);

  // AI 자율주행 트렌드 상태
  const [aiTrends, setAiTrends] = useState<any[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState(false);

  const handleRecommend = async (seedKeyword?: string) => {
    const targetKeyword = seedKeyword || keyword.trim();
    if (!targetKeyword) return;
    
    setIsRecommending(true);
    setRcmdError(null);
    setRecommendations([]);
    setAiTrends([]); // AI 트렌드 초기화

    try {
      const response = await fetch('/api/recommend-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: targetKeyword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '추천 키워드를 가져오는데 실패했습니다.');
      }
      setRecommendations(data.recommendations || []);
    } catch (error: any) {
      setRcmdError(error.message);
    } finally {
      setIsRecommending(false);
    }
  };

  const fetchAiTrendMiner = async () => {
    setIsTrendLoading(true);
    setRecommendations([]); // 기존 추천 초기화
    try {
      const res = await fetch('/api/agent-trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goodUrl, badUrl }),
      });
      const data = await res.json();
      if (res.ok && data.trends) {
        setAiTrends(data.trends);
      } else {
        alert(data.error || 'AI 트렌드 발굴에 실패했습니다.');
      }
    } catch (e) {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsTrendLoading(false);
    }
  };
  const handleGenerate = async (e?: React.FormEvent | null, overrideKeyword?: string) => {
    if (e) e.preventDefault();
    const currentKeyword = overrideKeyword || keyword;
    if (!currentKeyword.trim()) return;

    if (overrideKeyword) {
      setKeyword(overrideKeyword);
    }

    setIsGenerating(true);
    setResult(null);
    setErrorMsg(null);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: currentKeyword, deviceType, goodUrl, badUrl }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || '생성 중 오류가 발생했습니다.');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

      const decoder = new TextDecoder();
      let aiText = "";
      let metaData: any = null;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
           const message = buffer.substring(0, boundary);
           buffer = buffer.substring(boundary + 2);
           
           if (message.startsWith('data: ')) {
               try {
                   const data = JSON.parse(message.substring(6));
                   if (data.type === 'meta') {
                       metaData = data;
                   } else if (data.type === 'text') {
                       aiText += data.text;
                       
                       let currentTitle = "블로그 타이틀 작성 중...";
                       const titleMatch = aiText.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/i);
                       if (titleMatch) {
                           currentTitle = titleMatch[1].trim();
                       } else if (aiText.includes('[TITLE]')) {
                           currentTitle = aiText.split(/\[TITLE\]/i)[1].trim(); 
                       }

                       let currentContent = aiText;
                       if (aiText.includes('[CONTENT]')) {
                           currentContent = aiText.split(/\[CONTENT\]/i)[1] || "";
                       }
                       currentContent = currentContent.replace(/\[\/CONTENT\]/i, '').trim();

                       if (metaData) {
                           if (currentContent.includes('[THUMBNAIL]')) {
                               currentContent = currentContent.replace('[THUMBNAIL]', metaData.thumbnailHtml);
                           } else if (metaData.thumbnailHtml) {
                               currentContent = metaData.thumbnailHtml + '<br/>' + currentContent;
                           }
                           
                           if (metaData.images && metaData.images.length > 0) {
                               metaData.images.forEach((imgUrl: string, idx: number) => {
                                   const ph = `[IMAGE_${idx+1}]`;
                                   const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${imgUrl}" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
                                   if (currentContent.includes(ph)) {
                                       currentContent = currentContent.replace(ph, imgTag);
                                   }
                               });
                           }
                       }
                       
                       setResult({ title: currentTitle, content: currentContent + '<span className="inline-block w-2 h-4 ml-1 bg-[#00c73c] animate-pulse"></span>' });
                   }
               } catch(e) { console.error("SSE parse error", e, message); }
           }
           boundary = buffer.indexOf('\n\n');
        }
      }

      // 텍스트 스트리밍 완료 후 최종 구조 완성 처리
      let finalContent = aiText;
      if (finalContent.includes('[CONTENT]')) finalContent = finalContent.split(/\[CONTENT\]/i)[1] || "";
      finalContent = finalContent.replace(/\[\/CONTENT\]/i, '').trim();
      
      if (metaData) {
          if (finalContent.includes('[THUMBNAIL]')) {
              finalContent = finalContent.replace('[THUMBNAIL]', metaData.thumbnailHtml);
          } else {
              finalContent = metaData.thumbnailHtml + '<br/>' + finalContent;
          }
          
          if (metaData.images) {
              metaData.images.forEach((imgUrl: string, idx: number) => {
                  const ph = `[IMAGE_${idx+1}]`;
                  const imgTag = `<div style="text-align: center; margin: 32px 0;"><img src="${imgUrl}" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
                  if (finalContent.includes(ph)) {
                     finalContent = finalContent.replace(ph, imgTag);
                  } else {
                     finalContent += imgTag; // 누락된 사진들을 맨 밑에 추가
                  }
              });
          }
      }
      
      const finalTitle = aiText.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/i)?.[1]?.trim() || "제목 완성";
      setResult({ title: finalTitle, content: finalContent });

    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') return;
        setErrorMsg(error.message);
      } else {
        setErrorMsg('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string, isHtml: boolean = false) => {
    try {
      if (isHtml) {
        // Create a blob with HTML content to preserve formatting and images
        const blob = new Blob([text], { type: 'text/html' });
        const clipboardItem = new window.ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // Fallback for browsers that don't support ClipboardItem
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } catch (e) {
        console.error("Fallback copy failed:", e);
      }
    }
  };



  const handleSelectAllAndCopy = async (elementId: string, field: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Visual selection (so user knows what happened)
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    let copySuccess = false;

    // 모바일 환경, 특히 네이버 블로그 앱 등에서의 완벽한 호환성(표, 사진 유지)을 위해
    // 브라우저 네이티브 복사 명령어인 execCommand('copy')를 최우선으로 시도합니다.
    // 이는 브라우저가 직접 OS 클립보드 포맷(RTF 등)에 맞게 HTML을 직렬화해주기 때문입니다.
    try {
      const result = document.execCommand('copy');
      if (result) copySuccess = true;
    } catch (err) {
      console.warn('Primary execCommand failed:', err);
    }

    // 1차 시도(execCommand) 실패시 (일부 최신 PC 브라우저 등에서 제한될 때)
    // 최신 Clipboard API로 Fallback 시도 (인코딩 메타태그 추가로 한글/스타일 깨짐 방지)
    if (!copySuccess && navigator.clipboard && window.ClipboardItem) {
      try {
        // Create both HTML and Text representations to satisfy strict apps like Naver Blog
        const html = el.innerHTML;
        // Naive text extraction
        const text = el.innerText || el.textContent || '';
        
        const wrappedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
        
        const htmlBlob = new Blob([wrappedHtml], { type: 'text/html' });
        const textBlob = new Blob([text], { type: 'text/plain' });
        const clipboardItem = new window.ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        });
        
        await navigator.clipboard.write([clipboardItem]);
        copySuccess = true;
      } catch (err) {
        console.warn('Fallback Clipboard API failed:', err);
      }
    }

    if (copySuccess) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      // If all automatic copying fails, the text stays highlighted so the user can manually copy
      alert('자동 복사가 차단되었습니다. 파랗게 선택된 본문을 터치하여 나타나는 기본 [복사] 버튼을 직접 눌러주세요!');
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-green-50 to-transparent -z-10 pointer-events-none" />
      
      <main className="container pt-16 md:pt-24 animate-fade-in">
        <section className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-green-200 text-sm font-medium text-green-700 mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>AI 기반 네이버 블로그 자동 완성</span>
          </div>
          <h1 className="heading-1 mb-6">
            키워드 하나로 끝내는<br />초고속 블로그 포스팅
          </h1>
          <p className="text-xl text-muted">
            복사/붙여넣기에 최적화된 고품질 초안을 5초 만에 만들어냅니다.<br className="hidden md:block" />
            저품질 걱정 없는 완벽한 네이버 맞춤형 글쓰기를 경험해보세요.
          </p>
        </section>

        <div className="grid md:grid-cols-[1fr_1.2fr] gap-8 max-w-6xl mx-auto">
          <section className="glass-panel p-8 delay-100 h-fit">
            
            <h2 className="heading-2 mb-6 flex items-center gap-2">
              <PenTool className="w-6 h-6 text-[#00c73c]" />
              블로그 주제 입력
            </h2>
            
            <form onSubmit={handleGenerate} className="space-y-6">
              {/* 기기 타입 선택 */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="block text-sm font-semibold">
                  작성 포맷 선택 (네이버 앱 호환용) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeviceType('desktop')}
                    className={`relative px-4 py-4 rounded-xl border text-sm font-medium transition-all flex flex-col items-start gap-1 text-left ${
                      deviceType === 'desktop' 
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm ring-2 ring-blue-500 ring-offset-1' 
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {deviceType === 'desktop' && <CheckCircle2 className="w-5 h-5 absolute top-3 right-3 text-blue-600" />}
                    <span className="font-bold text-base flex items-center gap-2">💻 PC / 일반 웹용</span>
                    <span className="text-xs opacity-80">사진 최대 4장, 깔끔한 표(Table) 기본 적용</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceType('mobile')}
                    className={`relative px-4 py-4 rounded-xl border text-sm font-medium transition-all flex flex-col items-start gap-1 text-left ${
                      deviceType === 'mobile' 
                        ? 'border-[#00c73c] bg-[#f0fdf4] text-[#008f2b] shadow-sm ring-2 ring-[#00c73c] ring-offset-1' 
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {deviceType === 'mobile' && <CheckCircle2 className="w-5 h-5 absolute top-3 right-3 text-[#00c73c]" />}
                    <span className="font-bold text-base flex items-center gap-2">📱 모바일 블로그 앱용</span>
                    <span className="text-xs opacity-80">앱이 지우는 표/사진 제외, 화려한 텍스트 변주</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                  <label className="block text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    🔥 세대별/분야별 니치 트래픽 (랜덤 추천)
                  </label>
                  <p className="text-xs text-blue-700 mb-4 opacity-90 leading-relaxed">
                    단어를 직접 고민하지 마세요! 타겟 독자층을 클릭하면 <b>Naver 실제 검색 데이터</b>를 바탕으로 경쟁이 적고 트래픽이 높은 '황금 틈새 키워드'를 무작위로 계속 찾아줍니다.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { label: "🍔 20대/맛집핫플", seed: "맛집" },
                      { label: "💼 30대/재테크", seed: "투자" },
                      { label: "👶 3040/육아용품", seed: "육아" },
                      { label: "🏋️ 5060/건강기능", seed: "영양제" },
                      { label: "👴 6070/시니어", seed: "트로트" },
                      { label: "⛰️ 등산/골프", seed: "등산" },
                      { label: "🏡 은퇴/부동산", seed: "부동산" },
                      { label: "👗 뷰티/패션", seed: "패션" },
                      { label: "✈️ 주말/국내여행", seed: "가볼만한곳" },
                      { label: "💻 테크/기기리뷰", seed: "스마트폰" },
                      { label: "🎟️ 핫이슈/축제", seed: "축제" },
                      { label: "🏠 인테리어/리빙", seed: "인테리어" }
                    ].map((cat, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleRecommend(cat.seed)}
                        disabled={isRecommending}
                        className="text-[13px] font-semibold px-3.5 py-2.5 bg-white text-blue-800 border-blue-200 border rounded-xl hover:border-blue-400 hover:bg-blue-100 hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-1 active:scale-95"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* AI 자율주행 트렌드 마이너 버튼 */}
                  <div className="mt-8 pt-6 border-t border-blue-100 flex flex-col items-center">
                    <p className="text-sm text-blue-800 font-bold mb-3 flex items-center gap-1">
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                      직접 고르기 귀찮으시다면? AI가 알아서 빈집을 털어옵니다!
                    </p>
                    <button
                      type="button"
                      onClick={fetchAiTrendMiner}
                      disabled={isTrendLoading || isRecommending}
                      className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all animate-pulse hover:animate-none flex items-center justify-center gap-2"
                    >
                      {isTrendLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> 구글 & 네이버 실시간 트렌드 분석 중... (약 15초)</> : "🤖 AI 자율주행 모드 (트렌드 & 니치 자동 발굴)"}
                    </button>
                  </div>
                </div>

                {/* AI 트렌드 결과 표시 */}
                {aiTrends.length > 0 && !isTrendLoading && (
                  <div className="mt-8 bg-purple-50 p-6 rounded-2xl border border-purple-100 shadow-sm animate-fade-in">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-md">✨ AI 픽</span>
                      오늘 새롭게 터진 황금 틈새 키워드 TOP 5
                    </h3>
                    <div className="flex flex-col gap-3">
                      {aiTrends.map((trend, i) => (
                        <div 
                          key={i}
                          className="p-4 bg-white border border-purple-100 rounded-xl shadow-sm group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-extrabold text-purple-900 text-lg group-hover:text-purple-600">{trend.keyword}</span>
                            <span className="text-xs font-semibold px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-600">
                              월 조회: {trend.monthlyTotalCnt > 0 ? `${trend.monthlyTotalCnt.toLocaleString()}회` : '신규/미집계'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 p-2.5 rounded-lg leading-snug mb-3">{trend.reason}</p>
                          <button
                            type="button"
                            onClick={() => handleGenerate(null, trend.keyword)}
                            className="w-full py-2.5 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border border-purple-200 hover:border-purple-600 text-sm"
                          >
                            <PenTool className="w-4 h-4" /> 이 키워드로 즉시 자동 생성
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                  <label htmlFor="keyword" className="block text-sm font-semibold flex items-center justify-between">
                    <span>직접 핵심 키워드 검색 <span className="text-red-500">*</span></span>
                    <button 
                      type="button" 
                      onClick={() => handleRecommend()}
                      disabled={isRecommending || !keyword.trim()}
                      className="text-xs flex items-center gap-1 bg-gray-50 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors border border-gray-300 disabled:opacity-50 font-medium"
                    >
                      {isRecommending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5 text-gray-400"/>}
                      입력한 단어 연관 검색
                    </button>
                  </label>
                  <input
                    id="keyword"
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="예: 30대 여성 봄가디건, 대전 성심당 빵 추천"
                    className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#00c73c] focus:ring-1 focus:ring-[#00c73c] outline-none transition-all"
                    required
                  />
                </div>

                {/* AI 맞춤 학습 피드백 기능 */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <span>{isAdvancedOpen ? "▼" : "▶"}</span>
                    <span>🤖 AI 블로그 맞춤 학습 (레퍼런스 주소 벤치마킹) <span className="text-xs font-normal text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded ml-1">Beta</span></span>
                  </button>
                  
                  {isAdvancedOpen && (
                    <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4 animate-fade-in shadow-inner">
                      <div>
                         <label className="block text-xs font-bold text-green-700 mb-1">👍 떡상한 내 블로그 주소 (성공 사례)</label>
                         <input
                           type="url"
                           value={goodUrl}
                           onChange={(e) => setGoodUrl(e.target.value)}
                           placeholder="예: https://blog.naver.com/myblog/1234567"
                           className="w-full px-3 py-2 border rounded text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                         />
                         <p className="text-[11px] text-gray-500 mt-1">이 글의 장점(가독성, 정보량, 문체)을 철저히 분석해서 100% 흡수합니다.</p>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-red-700 mb-1">👎 폭망한 내 블로그 주소 (실패 사례)</label>
                         <input
                           type="url"
                           value={badUrl}
                           onChange={(e) => setBadUrl(e.target.value)}
                           placeholder="예: https://blog.naver.com/myblog/7654321"
                           className="w-full px-3 py-2 border rounded text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                         />
                         <p className="text-[11px] text-gray-500 mt-1">이 글의 단점(지루함, 구조적 문제)을 분석하고 절대로 따라하지 않습니다.</p>
                      </div>
                    </div>
                  )}
                </div>

                
                {rcmdError && (
                  <p className="text-xs text-red-500 mt-1">{rcmdError}</p>
                )}
                
                {recommendations.length > 0 && (
                  <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg animate-fade-in shadow-inner">
                    <p className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      원하는 황금 키워드를 클릭하여 적용하세요 (월간 검색량순 정렬)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.map((rec, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleGenerate(null, rec.keyword)}
                          className="text-sm px-3 py-1.5 bg-white border border-gray-300 rounded-full hover:border-[#00c73c] hover:bg-green-50 hover:text-[#00c73c] transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <span className="font-semibold">{rec.keyword}</span>
                          <span className="text-gray-400 text-xs text-nowrap">({rec.monthlyTotalCnt.toLocaleString()} 건)</span>
                          <PenTool className="w-3 h-3 text-[#00c73c] ml-1 opacity-0 hover:opacity-100 transition-opacity hidden sm:block" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !keyword.trim()}
                className="w-full btn btn-primary py-4 text-lg mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    포스팅 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    자동 생성 시작하기
                  </>
                )}
              </button>
            </form>
          </section>

          <section className="glass-panel p-8 delay-200">
            {result ? (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-muted">추천 제목</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleSelectAllAndCopy('generated-title', 'title')}
                        className="text-xs flex items-center gap-1 text-[#00c73c] hover:bg-green-50 px-2 py-1 rounded transition-colors border border-green-200"
                      >
                        {copiedField === 'title' ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'title' ? '복사됨' : '복사'}
                      </button>
                    </div>
                  </div>
                  <div id="generated-title" className="p-4 bg-white border border-gray-200 rounded-md shadow-sm font-semibold selection:bg-green-200 selection:text-green-900">
                    {result.title}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-muted">본문 (스마트폰 앱 호환 지원)</h3>
                    <div className="flex flex-wrap justify-end gap-2">
                       <button 
                        onClick={() => handleSelectAllAndCopy('generated-content', 'content')}
                        className="text-xs flex items-center gap-1 bg-[#00c73c] text-white hover:bg-green-600 px-3 py-1.5 rounded transition-colors shadow-sm font-medium"
                      >
                        {copiedField === 'content' ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'content' ? '완료 (붙여넣기 하세요)' : '본문 복사'}
                      </button>
                    </div>
                  </div>
                  
                  {/* 모바일 네이버 블로그 앱 붙여넣기 안내문 */}
                  <div className="bg-orange-50 border border-orange-200 text-orange-800 text-xs p-3 rounded-md mb-3 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-orange-500" />
                    <div>
                      <span className="font-bold">네이버 공식 앱 완전 호환!</span> 네이버 블로그 <span className="font-semibold underline">순정 앱</span>은 타 사이트에서 복사한 HTML의 99%를 강제로 삭제합니다.<br/>
                      하지만 상단의 <strong>[📱 모바일 앱용]</strong> 버튼을 누르시면 네이버 앱에서 허락하는 <strong>가장 순수한 포맷(&lt;p&gt;, &lt;br&gt;) 100%</strong>로 글이 생성되어, 줄바꿈과 여백이 파괴되지 않고 폰 앱에 그대로 예쁘게 붙여넣어집니다!
                    </div>
                  </div>

                  <div 
                    id="generated-content"
                    className="p-5 bg-white border border-gray-200 rounded-md shadow-sm min-h-[300px] text-gray-800 leading-relaxed text-[15px] prose max-w-none selection:bg-green-200 selection:text-green-900"
                    dangerouslySetInnerHTML={{ __html: result.content }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center text-muted p-10">
                <div className="w-16 h-16 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">아직 빈 캔버스네요!</h3>
                <p>
                  좌측에 키워드를 입력하고 생성 버튼을 누르면,<br />
                  이곳에 네이버 블로그에 최적화된 글이 나타납니다.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
