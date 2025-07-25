'use client';
import React, { useState, useEffect, useRef, ReactNode } from 'react';

// --- Type Definitions ---
interface IntersectionObserverOptions {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
}

interface AnimatedElementProps {
    children: ReactNode;
    delay?: string;
}

interface FeatureCardProps {
    icon: ReactNode;
    title: string;
    description: string;
}

interface HeroSectionProps {
    productInfo: string;
    setProductInfo: (value: string) => void;
}

interface FeaturesSectionProps {
    productInfo: string;
}

interface Feature {
    icon: ReactNode;
    title: string;
    description: string;
}

interface GeminiResponse {
    candidates?: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
}

interface HeadlineData {
    headline: string;
    subheadline: string;
}

// --- Helper Components & Hooks ---

/**
 * ID: FR-4 (스크롤 애니메이션)
 * 설명: Intersection Observer API를 사용하는 커스텀 훅 (globals.css의 scroll-animate 클래스 사용)
 */
const useIntersectionObserver = (options: IntersectionObserverOptions): [React.RefObject<HTMLDivElement | null>, boolean] => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState<boolean>(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, options);

        const currentRef = containerRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [containerRef, options]);

    return [containerRef, isVisible];
};

/**
 * 설명: 스크롤 애니메이션을 적용할 요소를 감싸는 래퍼 컴포넌트 (globals.css 스타일 사용)
 */
const AnimatedElement: React.FC<AnimatedElementProps> = ({ children, delay = '' }) => {
    const [ref, isVisible] = useIntersectionObserver({
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    });

    return (
        <div
            ref={ref}
            className={`scroll-animate ${isVisible ? 'is-visible' : ''} ${delay}`}
        >
            {children}
        </div>
    );
};


// --- UI Components ---

/**
 * ID: FR-3 (서비스 소개 섹션)의 개별 카드 컴포넌트
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-white border-opacity-20 h-full">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-500 text-white mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-300">{description}</p>
    </div>
);

/**
 * ID: FR-2 (메인 히어로 섹션) + Gemini API 연동 + globals.css 애니메이션 적용
 * 설명: 제품/서비스에 대한 간단한 설명을 입력하면 Gemini API가 매력적인 헤드라인과 부연 설명을 생성합니다.
 */
const HeroSection: React.FC<HeroSectionProps> = ({ productInfo, setProductInfo }) => {
    const [headline, setHeadline] = useState<string>("당신의 아이디어를 위한\n최상의 시작점");
    const [subheadline, setSubheadline] = useState<string>('Project "Velocity"는 최신 기술 스택과 아름다운 애니메이션으로 무장한 랜딩 페이지 템플릿입니다. 이제 비즈니스 로직에만 집중하세요.');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Gemini API를 호출하여 헤드라인과 부연 설명을 생성하는 함수
    const generateHeadline = async (): Promise<void> => {
        if (!productInfo.trim()) {
            setError("제품/서비스에 대한 설명을 입력해주세요.");
            return;
        }
        setIsLoading(true);
        setError(null);

        const prompt = `다음은 새로운 제품/서비스에 대한 설명입니다: "${productInfo}". 이 설명을 바탕으로, 사용자의 시선을 사로잡을 매우 강력하고 간결한 마케팅 헤드라인(headline)과, 그 헤드라인을 보충하는 1-2문장의 부연 설명(subheadline)을 생성해주세요. JSON 형식으로 응답해주세요.`;
        
        try {
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            headline: { type: "STRING" },
                            subheadline: { type: "STRING" }
                        },
                        required: ["headline", "subheadline"]
                    }
                }
            };
            const apiKey = process.env.GEMINI_API_KEY;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API 요청 실패: ${response.statusText}`);
            }

            const result: GeminiResponse = await response.json();
            
            if (result.candidates && result.candidates.length > 0) {
                const generatedText = result.candidates[0].content.parts[0].text;
                const parsedJson: HeadlineData = JSON.parse(generatedText);
                setHeadline(parsedJson.headline.replace(/\\n/g, '\n'));
                setSubheadline(parsedJson.subheadline);
            } else {
                throw new Error("API로부터 유효한 응답을 받지 못했습니다.");
            }
        } catch (e) {
            console.error("Gemini API 호출 오류:", e);
            setError("콘텐츠 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="relative min-h-screen flex items-center justify-center text-center text-white p-4 overflow-hidden">
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1554147090-e1221a04a025?q=80&w=2070&auto=format&fit=crop"
                    alt="추상적인 배경"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full">
                {/* globals.css의 fadeIn 애니메이션 적용 */}
                <div className="animate-fade-in-down">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4 whitespace-pre-line">
                        {headline.split('\n').map((line, index) => (
                            <React.Fragment key={index}>
                                {line.includes("최상의 시작점") || line.includes("가장 빠른 길") ? <span className="text-indigo-400">{line}</span> : line}
                                <br/>
                            </React.Fragment>
                        ))}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto mb-8">
                        {subheadline}
                    </p>
                </div>
                
                {/* Gemini API 연동 UI - globals.css의 fadeInUp 애니메이션 적용 */}
                <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white border-opacity-20 animate-fade-in-up">
                    <label htmlFor="productInfo" className="block text-lg font-semibold text-white mb-2">
                        어떤 제품이나 서비스를 위한 랜딩페이지인가요?
                    </label>
                    <textarea
                        id="productInfo"
                        value={productInfo}
                        onChange={(e) => setProductInfo(e.target.value)}
                        placeholder="예: AI 기반의 업무 자동화 툴, 초보자를 위한 온라인 코딩 부트캠프"
                        className="w-full p-3 rounded-lg bg-gray-800 bg-opacity-50 text-white border border-gray-600 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                        rows={2}
                    />
                    <button 
                        onClick={generateHeadline}
                        disabled={isLoading}
                        className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center"
                    >
                        {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : '✨'}
                        {isLoading ? '헤드라인 생성 중...' : 'AI로 헤드라인 생성하기'}
                    </button>
                    {error && <p className="text-red-400 mt-2">{error}</p>}
                </div>
            </div>
        </section>
    );
};

/**
 * ID: FR-3 (서비스 소개 섹션) + Gemini API 연동 + 스크롤 애니메이션 적용
 * 설명: 제품/서비스 설명을 바탕으로 Gemini API가 핵심 기능 3가지를 자동으로 생성합니다.
 */
const FeaturesSection: React.FC<FeaturesSectionProps> = ({ productInfo }) => {
    const initialFeatures: Feature[] = [
        { icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>, title: "압도적인 개발 속도", description: "Next.js와 Tailwind CSS 기반으로, 랜딩 페이지 개발 시간을 70% 이상 단축시킵니다. 핵심에만 집중하세요." },
        { icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><line x1="3" x2="21" y1="9"/><line x1="9" x2="9" y1="21"/></svg>, title: "최적화된 성능", description: "Lighthouse 90점 이상을 보장합니다. 빠른 로딩 속도로 사용자 이탈을 방지하고 SEO 점수를 높이세요." },
        { icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/><path d="M18 7.5a2.5 2.5 0 0 1 0 5c-.63.1-1.25-.3-1.5-1-1-2.5-1-5 .5-6.5.3-.2.6-.4.9-.5"/><path d="m14.5 9.5 1-1"/><path d="M12 15h.01"/></svg>, title: "쉬운 커스터마이징", description: "직관적인 코드 구조와 CSS 클래스 기반의 애니메이션으로, 디자이너도 쉽게 디자인을 수정할 수 있습니다." }
    ];
    
    const [features, setFeatures] = useState<Feature[]>(initialFeatures);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Gemini API를 호출하여 핵심 기능 3가지를 생성하는 함수
    const generateFeatures = async (): Promise<void> => {
        if (!productInfo.trim()) {
            setError("먼저 상단에서 제품/서비스에 대한 설명을 입력해주세요.");
            return;
        }
        setIsLoading(true);
        setError(null);

        const prompt = `다음은 새로운 제품/서비스에 대한 설명입니다: "${productInfo}". 이 설명을 바탕으로, 사용자들이 가장 매력적으로 느낄만한 핵심 기능 3가지를 설명해주세요. 각 기능은 'title'(기능명)과 'description'(기능에 대한 1-2문장의 간결한 설명)을 포함해야 합니다. 반드시 3개의 기능 목록을 JSON 배열 형식으로 응답해주세요.`;
        
        try {
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "STRING" },
                                description: { type: "STRING" }
                            },
                            required: ["title", "description"]
                        }
                    }
                }
            };
            const apiKey = process.env.GEMINI_API_KEY; // API 키는 비워둡니다.
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API 요청 실패: ${response.statusText}`);
            }

            const result: GeminiResponse = await response.json();

            if (result.candidates && result.candidates.length > 0) {
                const generatedText = result.candidates[0].content.parts[0].text;
                const parsedJson: Array<{ title: string; description: string }> = JSON.parse(generatedText);
                if (Array.isArray(parsedJson) && parsedJson.length === 3) {
                    // 생성된 텍스트와 기존 아이콘을 결합합니다.
                    const newFeatures: Feature[] = parsedJson.map((feature, index) => ({
                        ...initialFeatures[index], // 기존 아이콘 재사용
                        title: feature.title,
                        description: feature.description
                    }));
                    setFeatures(newFeatures);
                } else {
                    throw new Error("API가 올바른 형식의 데이터를 반환하지 않았습니다.");
                }
            } else {
                throw new Error("API로부터 유효한 응답을 받지 못했습니다.");
            }
        } catch (e) {
            console.error("Gemini API 호출 오류:", e);
            setError("기능 설명 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="py-20 sm:py-32 bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* 제목 섹션에 스크롤 애니메이션 적용 */}
                <AnimatedElement>
                    <div className="text-center">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">왜 &quot;Velocity&quot;를 선택해야 할까요?</h2>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
                            우리는 복잡한 과정 없이도 최고의 결과물을 만들 수 있어야 한다고 믿습니다.
                        </p>
                    </div>
                </AnimatedElement>

                {/* 버튼에 스크롤 애니메이션 적용 */}
                <AnimatedElement delay="transition-delay-200">
                    <div className="text-center my-12">
                         <button 
                            onClick={generateFeatures}
                            disabled={isLoading}
                            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center mx-auto"
                        >
                            {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : '✨'}
                            {isLoading ? '핵심 기능 생성 중...' : 'AI로 핵심 기능 3가지 생성하기'}
                        </button>
                        {error && <p className="text-red-400 mt-2">{error}</p>}
                    </div>
                </AnimatedElement>

                {/* 기능 카드들에 스크롤 애니메이션 적용 */}
                <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <AnimatedElement key={index} delay={`transition-delay-${(index + 1) * 150}`}>
                            <FeatureCard {...feature} />
                        </AnimatedElement>
                    ))}
                </div>
            </div>
        </section>
    );
};

/**
 * ID: FR-6 (푸터 섹션)
 */
const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-900 border-t border-gray-800">
            <AnimatedElement>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-500">
                        &copy; {new Date().getFullYear()} Project &quot;Velocity&quot;. All rights reserved.
                    </p>
                </div>
            </AnimatedElement>
        </footer>
    );
};


/**
 * 메인 앱 컴포넌트
 * 설명: 모든 섹션을 통합하고, 여러 컴포넌트에서 공유될 상태(productInfo)를 관리합니다.
 */
const App: React.FC = () => {
    // Hero와 Features 섹션에서 공통으로 사용할 제품 정보 상태
    const [productInfo, setProductInfo] = useState<string>('');

    return (
        <main className="bg-gray-900 font-sans antialiased">
            <HeroSection productInfo={productInfo} setProductInfo={setProductInfo} />
            <FeaturesSection productInfo={productInfo} />
            <Footer />
        </main>
    );
};

export default App;
