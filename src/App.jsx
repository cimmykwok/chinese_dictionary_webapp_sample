import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';


// --------------------------------------------------------------------------------
// 1. CONFIG & MOCK DATA
// --------------------------------------------------------------------------------

// Firebase info - please update with your config !!!
const firebaseConfig = {
    apiKey: "", 
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

const COLLECTION_PATH = `idioms`;
const SEARCH_LIMIT = 50;

let db;
let auth;

// SAMPLE DATA
const MOCK_DATA = [{
    id: "mock-1",
    abbr: "yffs",
    pinyin: "yī fán fēng shùn",
    word: "一帆風順 (例)",
    source: { text: "定知一日帆，使得千里風。", book: "唐孟郊《送崔爽之湖南》" },
    quote: { text: "櫛霜沐露多勞頓，喜借得～。", book: "清·李漁《憐香伴·蹴居》" },
    explanation: "船上的帆掛起來順著風行駛。比喻事情非常順利，沒有任何阻礙。",
    story: ["這是一個關於順利啟航的故事...", "後來在海上遇到一些風浪，但最終成功抵達。"],
    example: "①朋友，在分別之際，我祝你一帆風順，事業有成。②小明一家要到海南旅遊，祝他們一帆風順，旅途平安。",
    similar: ["萬事亨通", "無往不利"],
    opposite: ["寸步難行", "一波三折"],
    usage: "常用來祝福他人旅途順利。多用於褒義。",
    notice: "「一帆風順」和「無往不利」都含有非常順利的意思。差別在於：... (詳見 Notice)",
    spelling: { right: "鉈銠必較", wrong: "鯡珠必較", text: "鱟、銖：都是古代很小的重量單位。" }
}];


// --------------------------------------------------------------------------------
// CSS STYLES
// --------------------------------------------------------------------------------

const rawStyles = {
    contentWrapper: {
        display: 'flex',
        flex: 1,
        '@media (maxWidth: 768px)': {
            flexDirection: 'column', 
            width: '100%',
            flex: 'none',
        }
    },
    container: {
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100vh', 
        fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
        backgroundColor: '#F4F7F9',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        borderRadius: '16px',
        overflow: 'hidden',
        maxWidth: '1200px',
        margin: '20px auto',
        minWidth: '320px',
        boxSizing: 'border-box',
        '@media (maxWidth: 768px)': { 
            flexDirection: 'column', 
            margin: '0',
            borderRadius: '0',
            minHeight: 'auto',
            maxWidth: '100%',
            width: '100%',
            overflow: 'visible',
            boxSizing: 'border-box',
        },
    },
    sidebar: {
        width: '350px',
        backgroundColor: '#FFFFFF',
        padding: '25px',
        boxShadow: '2px 0 5px rgba(0, 0, 0, 0.05)',
        display: 'flex', 
        flexDirection: 'column', 
        overflowY: 'visible',
        
        boxSizing: 'border-box', 
        '@media (maxWidth: 768px)': { 
            width: '100%',
            maxHeight: 'none', 
            minHeight: 'auto',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
            order: 1,
            padding: '15px',
            boxSizing: 'border-box',
        },
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: '20px',
        borderBottom: '2px solid #ECF0F1',
        paddingBottom: '10px',
        '@media (maxWidth: 768px)': { fontSize: '24px', textAlign: 'center' },
    },
    searchBox: { display: 'flex', marginBottom: '20px', gap: '10px', },
    searchInput: { flexGrow: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #BDC3C7', fontSize: '16px', outline: 'none', transition: 'border-color 0.3s', minWidth: 0, },
    searchButton: { padding: '10px 15px', borderRadius: '8px', border: 'none', backgroundColor: '#3498DB', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.3s, transform 0.1s', whiteSpace: 'nowrap', },
    resultsList: { 
        flexGrow: 1, 
        overflowY: 'auto', 
        borderTop: '1px solid #ECF0F1', 
        paddingTop: '10px', 
        '@media (maxWidth: 768px)': {
            flexGrow: 'unset', 
            maxHeight: '230px', 
            overflowY: 'auto',
        }
    },
resultItem: { 
        padding: '12px 10px', 
        cursor: 'pointer', 
        borderBottom: '1px solid #ECF0F1', 
        transition: 'background-color 0.2s', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderRadius: '4px',
        borderLeft: '4px solid transparent',
        paddingRight: '10px', 
        paddingLeft: '10px', 
    },
    
    selectedItem: { 
        backgroundColor: '#EAEFF4', 
        borderLeft: '4px solid #3498DB', 
        fontWeight: 'bold', 
    },
    resultWord: { fontSize: '18px', color: '#2C3E50', fontWeight: '500', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '65%', },
    resultPinyin: { fontSize: '14px', color: '#95A5A6', },
    noResults: { padding: '20px', color: '#7F8C8D', textAlign: 'center', fontStyle: 'italic', },
    errorMessage: { padding: '10px', backgroundColor: '#FADBD8', color: '#C0392B', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontWeight: '500', },
    
    // Main Content Styles
    mainContent: {
        flex: 1, 
        padding: '25px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        boxSizing: 'border-box',
        '@media (maxWidth: 768px)': { 
            flex: 'none', 
            width: '100%', 
            order: 2,
            padding: '15px',
            minWidth: '100%',
            boxSizing: 'border-box',
        },
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '15px', marginBottom: '20px', borderBottom: '2px dashed #D5DBDB', },
    headerTitle: { fontSize: '22px', fontWeight: 'bold', color: '#2C3E50', margin: 0, },
    detailsContent: { 
        padding: '10px 0', 
        // overflowY: 'auto', 
        flexGrow: 1, 
        '@media (max-width: 768px)': {
            flexGrow: 'unset',
        }
    },
    mainInfoCard: {
        backgroundColor: '#ECF0F1',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '30px',
        borderLeft: '5px solid #3498DB',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
        '@media (maxWidth: 768px)': { padding: '15px', },
    },
    mainWord: { fontSize: '36px', fontWeight: '900', color: '#2C3E50', margin: '0 0 5px 0', lineHeight: 1.2, '@media (maxWidth: 768px)': { fontSize: '28px' }, },
    mainPinyin: { fontSize: '20px', color: '#3498DB', fontStyle: 'italic', margin: 0, '@media (maxWidth: 768px)': { fontSize: '18px' }, },
    detailSection: {
        marginBottom: '25px',
        padding: '15px',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        borderLeft: '4px solid #ccc',
    },
    detailTitleWrapper: { display: 'flex', alignItems: 'center', marginBottom: '10px', },
    blueDivider: { width: '4px', height: '20px', backgroundColor: '#3498DB', marginRight: '10px', borderRadius: '2px', },
    detailTitle: { fontSize: '18px', fontWeight: 'bold', color: '#2C3E50', margin: 0, },
    detailContent: { fontSize: '16px', color: '#555555', lineHeight: 1.7, paddingLeft: '14px', margin: 0, '@media (maxWidth: 768px)': { fontSize: '15px' }, },
    citationContainer: {
        borderLeft: '3px solid #F1C40F',
        paddingLeft: '15px',
        margin: '10px 0',
        fontSize: '15px',
        fontStyle: 'italic',
    },
    citationText: {
        color: '#7F8C8D',
        marginBottom: '5px',
    },
    citationBook: {
        color: '#2C3E50',
        fontWeight: '500',
    },
    listItem: {
        marginBottom: '8px',
        lineHeight: 1.6,
        paddingLeft: '10px',
        position: 'relative',
    },
    spellingContainer: {
        padding: '10px',
        backgroundColor: '#F8F9F9',
        border: '1px solid #ECF0F1',
        borderRadius: '8px',
    },
    spellingItem: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '5px',
    },
    spellingLabel: {
        fontWeight: 'bold',
        marginRight: '10px',
        padding: '2px 8px',
        borderRadius: '4px',
        color: 'white',
        fontSize: '14px',
    },
    rightSpelling: { backgroundColor: '#2ECC71' },
    wrongSpelling: { backgroundColor: '#E74C3C' },
    
    levelTag: { display: 'inline-block', backgroundColor: '#F1C40F', color: '#2C3E50', padding: '5px 10px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', },
    loadingIndicator: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: '#7F8C8D', fontSize: '18px', },
    spinner: { border: '4px solid rgba(0, 0, 0, 0.1)', borderTop: '4px solid #3498DB', borderRadius: '50%', width: '40px', height: '40px', marginBottom: '10px', },

    disclaimerContainer: {
        padding: '15px 20px',
        borderTop: '2px solid #ECF0F1',
        fontSize: '0.9em',
        color: '#7F8C8D',
        lineHeight: 1.6,
        backgroundColor: '#F9F9F9',
        '@media (maxWidth: 768px)': {
            padding: '10px 15px',
            marginTop: '20px',
            fontSize: '0.85em',
            lineHeight: 1.5,
        }
    },
    
    disclaimerTitle: {
        fontSize: '1.2em',
        color: '#2C3E50',
        marginBottom: '10px',
        fontWeight: 'bold',
        '@media (maxWidth: 768px)': {
            fontSize: '1.1em',
            marginBottom: '8px',
        }
    },
    
    disclaimerLink: {
        color: '#3498DB',
        textDecoration: 'none',
    },
};

// --------------------------------------------------------------------------------
// 2. IDIOM DETAILS
// --------------------------------------------------------------------------------

const IdiomDetails = React.memo(({ idiom, styles }) => {
    if (!idiom) return null;

    const renderDetailSection = (title, content, customStyle = {}) => {
        if (!content && content !== 0) return null;
        
        if (Array.isArray(content)) {
            return (
                <div style={{...styles.detailSection, ...customStyle}}>
                    <div style={styles.detailTitleWrapper}>
                        <div style={styles.blueDivider}></div>
                        <h4 style={styles.detailTitle}>{title}</h4>
                    </div>
                    <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
                        {content.map((item, index) => (
                            <li key={index} style={styles.listItem}>
                                <span style={{ color: '#3498DB', marginRight: '5px' }}>•</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }

        if (typeof content === 'object' && content !== null && (content.text || content.book)) {
            return (
                <div style={{...styles.detailSection, ...customStyle}}>
                    <div style={styles.detailTitleWrapper}>
                        <div style={styles.blueDivider}></div>
                        <h4 style={styles.detailTitle}>{title}</h4>
                    </div>
                    <div style={styles.citationContainer}>
                        {content.text && <p style={styles.citationText}>“{content.text}”</p>}
                        {content.book && <p style={styles.citationBook}>— {content.book}</p>}
                    </div>
                </div>
            );
        }
        
        if (title.includes('正誤') && typeof content === 'object' && content !== null) {
             return (
                <div style={{...styles.detailSection, ...customStyle}}>
                    <div style={styles.detailTitleWrapper}>
                        <div style={styles.blueDivider}></div>
                        <h4 style={styles.detailTitle}>{title}</h4>
                    </div>
                    <div style={styles.spellingContainer}>
                        {content.right && (
                            <div style={styles.spellingItem}>
                                <span style={{...styles.spellingLabel, ...styles.rightSpelling}}>正確</span>
                                {content.right}
                            </div>
                        )}
                        {content.wrong && (
                            <div style={styles.spellingItem}>
                                <span style={{...styles.spellingLabel, ...styles.wrongSpelling}}>錯誤</span>
                                {content.wrong}
                            </div>
                        )}
                        {content.text && <p style={{...styles.detailContent, paddingLeft: '0', marginTop: '10px'}}>{content.text}</p>}
                    </div>
                </div>
            );
        }

        return (
            <div style={{...styles.detailSection, ...customStyle}}>
                <div style={styles.detailTitleWrapper}>
                    <div style={styles.blueDivider}></div>
                    <h4 style={styles.detailTitle}>{title}</h4>
                </div>
                <p style={styles.detailContent}>{content}</p>
            </div>
        );
    };

    return (
        <div style={styles.detailsContent}>
            <div style={styles.mainInfoCard}>
                <h2 style={styles.mainWord}>{idiom.word}</h2>
                <p style={styles.mainPinyin}>{idiom.pinyin}</p>
            </div>
            
            {renderDetailSection('釋義 (Explanation)', idiom.explanation)}
            {renderDetailSection('出處 (Source)', idiom.source)}
            {renderDetailSection('引用 (Quote)', idiom.quote)}
            {renderDetailSection('典故/故事 (Story)', idiom.story)}
            {renderDetailSection('舉例 (Example)', idiom.example)}
            
            <div style={{display: 'flex', gap: '20px', 
                '@media (maxWidth: 768px)': { flexDirection: 'column', gap: '10px' } 
            }}>
                <div style={{flex: 1}}>
                    {renderDetailSection('近義詞 (Similar)', idiom.similar)}
                </div>
                <div style={{flex: 1}}>
                    {renderDetailSection('反義詞 (Opposite)', idiom.opposite)}
                </div>
            </div>
            
            {renderDetailSection('用法 (Usage)', idiom.usage)}
            {renderDetailSection('辨析/注意事項 (Notice)', idiom.notice)}
            {renderDetailSection('正誤拼寫 (Spelling)', idiom.spelling)}
            
            {idiom.level && (
                <div style={{ ...styles.detailSection, textAlign: 'right', marginTop: '30px', borderLeft: 'none' }}>
                    <span style={styles.levelTag}>Level: {idiom.level}</span>
                </div>
            )}
        </div>
    );
});


// --------------------------------------------------------------------------------
// 3. MAIN APP
// --------------------------------------------------------------------------------

export default function App() {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIdiom, setSelectedIdiom] = useState(MOCK_DATA[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isDbReady, setIsDbReady] = useState(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    // --------------------------------------------------------------------------
    // RWD LOGIC
    // --------------------------------------------------------------------------
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handleResize);
            }
        };
    }, []);

    // Use useMemo to dynamically calculate styles for objects
    const styles = useMemo(() => {
        const isMobile = windowWidth < 768;

        const computeStyle = (styleKey) => {
            const baseStyle = rawStyles[styleKey];
            if (isMobile && baseStyle['@media (maxWidth: 768px)']) {
                return {
                    ...baseStyle,
                    ...baseStyle['@media (maxWidth: 768px)']
                };
            }
            const { '@media (maxWidth: 768px)': mediaQueryStyles, ...rest } = baseStyle;
            return rest;
        };

        const computedStyles = {};
        for (const key in rawStyles) {
            if (Object.prototype.hasOwnProperty.call(rawStyles, key)) {
                computedStyles[key] = computeStyle(key);
            }
        }
        return computedStyles;
    }, [windowWidth]); 


    // Initialize Firebase and anonymous login
    useEffect(() => {
        async function initializeFirebase() {
            try {
                // Initialize App
                const app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                auth = getAuth(app);
                
                // Anonymous login
                await signInAnonymously(auth);
                setIsDbReady(true);
                console.log("Firebase initialized and signed in anonymously.");
            } catch (e) {
                console.error("Firebase initialization failed:", e);
                setError("無法連線到資料庫。請檢查 Firebase 配置和網路連線。");
            }
        }
        initializeFirebase();
    }, []);

    const handleSearch = async (queryTerm) => {
        const term = queryTerm.trim();
        setSearchTerm(term);
        if (!term || !isDbReady) {
            setResults([]);
            setSelectedIdiom(MOCK_DATA[0]);
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);
        
        try {
            const q = query(
                collection(db, COLLECTION_PATH),
                where('word', '>=', term),
                where('word', '<=', term + '\uf8ff'),
                limit(SEARCH_LIMIT)
            );

            const querySnapshot = await getDocs(q);
            const searchResults = [];
            
            querySnapshot.forEach((doc) => {
                searchResults.push({ id: doc.id, ...doc.data() });
            });
            
            setResults(searchResults);
            
            if (searchResults.length > 0) {
                setSelectedIdiom(searchResults[0]);
            } else {
                setSelectedIdiom({ 
                    id: "no-results", 
                    word: "無結果", 
                    pinyin: "wú jié guǒ",
                    explanation: `未找到與 "${term}" 匹配的詞語。請嘗試其他關鍵詞。`,
                });
            }

        } catch (e) {
            console.error("Firestore search failed:", e);
            if (e.code === 'failed-precondition' && e.message.includes('requires an index')) {
                setError("查詢失敗：Firestore 需要一個複合索引。請查看控制台的錯誤訊息並創建它。");
            } else {
                setError("數據庫查詢發生錯誤。請檢查安全規則和必要的索引。");
            }
            setResults([]);
            setSelectedIdiom(MOCK_DATA[0]);
        } finally {
            setLoading(false);
        }
    };
    
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            handleSearch(searchTerm);
        }
    };


return (
        <div style={styles.container}>
            <div style={styles.contentWrapper}> 
            
                <div style={styles.sidebar}>
                    <h1 style={styles.title}>中文詞典</h1> 
                    <div style={styles.searchBox}>
                        <input
                            type="text"
                            placeholder="請輸入詞語..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={styles.searchInput}
                            disabled={!isDbReady}
                        />
                        <button 
                            onClick={() => handleSearch(searchTerm)}
                            style={styles.searchButton}
                            disabled={!isDbReady || loading}
                        >
                            {loading ? '搜索中...' : '搜索'}
                        </button>
                    </div>
                    
                    {error && <div style={styles.errorMessage}>{error}</div>}

                    <div style={styles.resultsList}>
                        {results.length > 0 ? (
                            results.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        ...styles.resultItem,
                                        ...(selectedIdiom?.id === item.id ? styles.selectedItem : {})
                                    }}
                                    onClick={() => setSelectedIdiom(item)}
                                >
                                    <span style={styles.resultWord}>{item.word}</span>
                                    <span style={styles.resultPinyin}>{item.pinyin}</span>
                                </div>
                            ))
                        ) : (
                            !loading && <div style={styles.noResults}>請輸入關鍵詞開始搜索。</div>
                        )}
                    </div>
                </div>
                
                <div style={styles.mainContent}>
                    <div style={styles.header}>
                        <h3 style={styles.headerTitle}>詞語詳情</h3>
                    </div>
                    {loading && results.length === 0 ? (
                        <div style={styles.loadingIndicator}>
                            <div style={styles.spinner}></div> 
                            載入中，請稍候...
                        </div>
                    ) : (
                        <IdiomDetails idiom={selectedIdiom} styles={styles} />
                    )}
                </div>

            </div> 

            <div style={styles.disclaimerContainer}>
                <h4 style={styles.disclaimerTitle}>資料來源與聲明</h4>
                
                <p>
                    本頁面所使用的所有詞語記錄，其基礎資料均源自以下開源專案：
                    <a 
                        href="https://github.com/mapull/chinese-dictionary/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={styles.disclaimerLink}
                    >
                        mapull/chinese-dictionary(GitHub)
                    </a>
                </p>

                <p>
                    <strong>專案參考資訊：</strong>
                    字庫的基礎資料來自Github開源組織。由於某些收集來的數據，無法確認數據的原始來源，使用它們可能有風險。
                </p>
            </div>

        </div>
    );
}


// --------------------------------------------------------------------------------
// 5. DOM Mounting
// --------------------------------------------------------------------------------
if (typeof document !== 'undefined') {
    const container = document.getElementById('root');
    if (container) {
        const root = createRoot(container);
        root.render(<App />);
    }
}
