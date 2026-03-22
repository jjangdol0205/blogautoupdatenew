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

  const [recommendations, setRecommendations] = useState<{keyword: string, monthlyTotalCnt: number}[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [rcmdError, setRcmdError] = useState<string | null>(null);

  const handleRecommend = async (seedKeyword?: string) => {
    const targetKeyword = seedKeyword || keyword.trim();
    if (!targetKeyword) return;
    
    setIsRecommending(true);
    setRcmdError(null);
    setRecommendations([]);

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
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsGenerating(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword, deviceType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '생성 중 오류가 발생했습니다.');
      }

      setResult(data);
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
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
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    분야별 인기 유입 검색어 (추천받기)
                  </label>
                  <p className="text-xs text-blue-700 mb-3 opacity-90">아무것도 입력하지 않고 아래 관심 분야만 눌러도 네이버 실시간 트래픽 상위 키워드를 알아서 찾아옵니다.</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "맛집/카페 🍰", seed: "맛집" },
                      { label: "국내여행 ✈️", seed: "가볼만한곳" },
                      { label: "축제/행사 🎟️", seed: "축제" },
                      { label: "IT/전자기기 💻", seed: "스마트폰" },
                      { label: "주식/재테크 📈", seed: "주식" },
                      { label: "패션/뷰티 👗", seed: "패션" }
                    ].map((cat, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleRecommend(cat.seed)}
                        disabled={isRecommending}
                        className="text-xs font-semibold px-3 py-2 bg-white text-blue-800 border-blue-200 border rounded-lg hover:border-blue-400 hover:bg-blue-100 transition-all shadow-sm"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

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
                          onClick={() => setKeyword(rec.keyword)}
                          className="text-sm px-3 py-1.5 bg-white border border-gray-300 rounded-full hover:border-[#00c73c] hover:text-[#00c73c] transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <span className="font-semibold">{rec.keyword}</span>
                          <span className="text-gray-400 text-xs text-nowrap">({rec.monthlyTotalCnt.toLocaleString()} 건)</span>
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
