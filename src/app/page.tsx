"use client";

import { useState } from "react";
import { Sparkles, Copy, CheckCircle2, PenTool, Loader2, AlertCircle, Lightbulb } from "lucide-react";

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [blogType, setBlogType] = useState("health");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [result, setResult] = useState<{
    title: string;
    content: string;
  } | null>(null);
  
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Recommendation State
  const [rcmdCategory, setRcmdCategory] = useState("선택안함");
  const [rcmdTimeframe, setRcmdTimeframe] = useState("최근 1주일");
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [rcmdError, setRcmdError] = useState<string | null>(null);

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
        body: JSON.stringify({ keyword, blogType }),
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

  const handleRecommend = async () => {
    if (rcmdCategory === "선택안함") {
      setRcmdError("카테고리를 선택해주세요.");
      return;
    }
    
    setIsRecommending(true);
    setRcmdError(null);
    setRecommendations([]);

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: rcmdCategory, timeframe: rcmdTimeframe }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '추천 키워드를 가져오는데 실패했습니다.');
      }

      setRecommendations(data.keywords || []);
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        setRcmdError(error.message);
      } else {
        setRcmdError('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsRecommending(false);
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
            
            {/* 주제 추천 상자 */}
            <div className="mb-8 p-5 bg-[#fafffb] border border-green-100 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#00c73c]" />
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-[#00c73c]" />
                <h3 className="text-sm font-bold text-gray-800">트렌딩 주제 추천받기</h3>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select
                  value={rcmdCategory}
                  onChange={(e) => setRcmdCategory(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-gray-200 text-sm focus:border-[#00c73c] focus:ring-1 focus:ring-[#00c73c] outline-none bg-white"
                >
                  <option value="선택안함">카테고리 선택</option>
                  <option value="지원금 마스터">지원금 마스터 (김쌤)</option>
                  <option value="인생 지혜와 인간관계">인생 지혜와 인간관계 (김쌤)</option>
                  <option value="은퇴 경제">은퇴 경제 (김쌤)</option>
                  <option value="기업분석 전문가">기업분석 전문가 (김쌤)</option>
                  <option value="투자 전문가">투자 전문가 (김쌤)</option>
                </select>

                <select
                  value={rcmdTimeframe}
                  onChange={(e) => setRcmdTimeframe(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-gray-200 text-sm focus:border-[#00c73c] focus:ring-1 focus:ring-[#00c73c] outline-none bg-white"
                >
                  <option value="최근 1주일">최근 1주일</option>
                  <option value="최근 1개월">최근 1개월</option>
                </select>
                
                <button
                  type="button"
                  onClick={handleRecommend}
                  disabled={isRecommending || rcmdCategory === "선택안함"}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[80px]"
                >
                  {isRecommending ? <Loader2 className="w-4 h-4 animate-spin" /> : '추천받기'}
                </button>
              </div>

              {rcmdError && (
                 <p className="text-xs text-red-500 mb-2">{rcmdError}</p>
              )}

              {recommendations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-green-50">
                  <p className="text-xs text-muted mb-2 font-medium">✨ 키워드를 클릭하면 바로 입력됩니다</p>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.map((rec, idx) => (
                      <button
                        key={idx}
                        onClick={() => setKeyword(rec)}
                        className="px-3 py-1.5 bg-white border border-green-200 text-green-700 text-sm rounded-full hover:bg-green-50 transition-colors text-left"
                      >
                        {rec}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <h2 className="heading-2 mb-6 flex items-center gap-2">
              <PenTool className="w-6 h-6 text-[#00c73c]" />
              블로그 주제 입력
            </h2>
            
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-semibold">
                  블로그 종류 (페르소나) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setBlogType('health')}
                    className={`relative px-4 py-4 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${
                      blogType === 'health' 
                        ? 'border-[#00c73c] bg-[#f0fdf4] text-[#00c73c] shadow-sm ring-2 ring-[#00c73c] ring-offset-1' 
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {blogType === 'health' && <CheckCircle2 className="w-5 h-5 absolute top-3 right-3 text-[#00c73c]" />}
                    <span className="text-2xl">🎁</span>
                    <span className={blogType === 'health' ? 'font-bold' : ''}>지원금 마스터 (김쌤)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlogType('wisdom')}
                    className={`relative px-4 py-4 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${
                      blogType === 'wisdom' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-500 ring-offset-1' 
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {blogType === 'wisdom' && <CheckCircle2 className="w-5 h-5 absolute top-3 right-3 text-blue-600" />}
                    <span className="text-2xl">📖</span>
                    <span className={blogType === 'wisdom' ? 'font-bold' : ''}>인생 지혜와 인간관계</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlogType('economy')}
                    className={`relative px-4 py-4 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${
                      blogType === 'economy' 
                        ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm ring-2 ring-purple-500 ring-offset-1' 
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {blogType === 'economy' && <CheckCircle2 className="w-5 h-5 absolute top-3 right-3 text-purple-600" />}
                    <span className="text-2xl">💰</span>
                    <span className={blogType === 'economy' ? 'font-bold' : ''}>은퇴 경제 (김쌤)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlogType('corporate')}
                    className={`relative px-4 py-4 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${
                      blogType === 'corporate' 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-500 ring-offset-1' 
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {blogType === 'corporate' && <CheckCircle2 className="w-5 h-5 absolute top-3 right-3 text-indigo-600" />}
                    <span className="text-2xl">📈</span>
                    <span className={blogType === 'corporate' ? 'font-bold' : ''}>기업분석 (김쌤)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="keyword" className="block text-sm font-semibold">
                  핵심 키워드 또는 주제 <span className="text-red-500">*</span>
                </label>
                <input
                  id="keyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 다이어트 식단 추천, 강남역 맛집 내돈내산"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#00c73c] focus:ring-1 focus:ring-[#00c73c] outline-none transition-all"
                  required
                />
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
