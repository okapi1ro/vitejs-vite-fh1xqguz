import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  MessageSquare, 
  Send, 
  ArrowRight, 
  XCircle, 
  RefreshCw, 
  FileText, 
  Loader2,
  LogIn,
  AlertCircle,
  Award,
  ChevronRight,
  Zap,
  Play
} from 'lucide-react';

// ▼▼▼ Firebase SDKの読み込み ▼▼▼
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

// ▼▼▼ ここにGoogle Apps Script (GAS) のURLを貼り付けます ▼▼▼
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw6ac7EuSmc7sXrtArnnv9Bfbby1emCjIz-inoP1O1HbxhC5H_Ng4AjG77g5fbIGoWggg/exec"; 

// ▼▼▼ Firebaseの設定情報 ▼▼▼
const firebaseConfig = {
  apiKey: "AIzaSyA6FFOlrxIlp_njiJayYCbRdgLpQzvQLi8",
  authDomain: "aidrilltest.firebaseapp.com",
  projectId: "aidrilltest",
  storageBucket: "aidrilltest.firebasestorage.app",
  messagingSenderId: "781365045188",
  appId: "1:781365045188:web:b971e424e499e6dae32691",
  measurementId: "G-MM40DYXGF3"
};

// Firebase初期化状態管理
let auth: any = null;
let configError: string | null = null;

try {
  if (firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.apiKey === "") {
    configError = "Firebaseの設定が行われていません。ソースコード内の 'firebaseConfig' を正しい値に書き換えてください。";
  } else {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
} catch (e: any) {
  console.error("Firebase initialization error:", e);
  configError = `Firebase初期化エラー: ${e.message}`;
}

// --- 型定義 ---
interface Option {
  id: number;
  label: string;
  risk: 'high' | 'medium' | 'safe';
  feedbackTitle: string;
  feedbackText: string;
}

interface Scenario {
  id: string;
  category: string;
  title: string;
  context: string;
  sourceText: string;
  aiPrompt?: string;
  options: Option[];
}

interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  text: string;
  type?: 'text' | 'feedback'; // メッセージタイプ拡張
  feedbackType?: 'success' | 'danger';
}

// --- 実践課題の定義 ---
const PRACTICE_TASK = {
  id: "practice_001",
  title: "実践演習: 機密情報の処理",
  instruction: "以下の会議メモをAIに入力して要約させたいです。\n情報漏洩を防ぐため、適切なプロンプト（指示文）を入力欄に書いて送信してください。",
  targetData: "【会議メモ】\nクライアント: 株式会社A社\n案件規模: 5,000万円\n内容: 次期システム開発における...",
  // 簡易判定ロジック用キーワード
  ngKeywords: ["A社", "株式会社A社", "5000", "5,000"], // これが含まれていたらNG
  hint: "固有名詞（社名）や具体的な数字（金額）をそのまま入力するのは危険です。「〇〇社」「〇〇円」のようにマスキングしましょう。"
};

// --- シナリオデータ（設問集） ---
const SCENARIOS: Scenario[] = [
  {
    id: "q_189_hallucination",
    category: "知識チェック 1/5",
    title: "未知の用語の確認",
    context: "業務で未知の用語について生成AIに解説を作成させました。内容の正確性を確認したいと考えています。",
    sourceText: "AI回答: 「〇〇法とは、2024年に改正された...（もっともらしい解説）...です。」",
    aiPrompt: "内容の正確性を確認するため、どのような行動をとりますか？",
    options: [
      {
        id: 1,
        label: "AIに「間違いはないですか？」と自己点検させる",
        risk: "medium",
        feedbackTitle: "自己点検だけでは不十分です",
        feedbackText: "AIは自身の生成した誤情報を「正しい」と主張し続けることがあります。自己点検は補助的な手段に留めましょう。",
      },
      {
        id: 2,
        label: "検索エンジン等で別途検索し、信頼できる情報源と照合する",
        risk: "safe",
        feedbackTitle: "正解です！",
        feedbackText: "生成AIはハルシネーション（もっともらしい嘘）を起こす可能性があります。必ず一次情報や信頼できるソースで裏取りを行いましょう。",
      },
      {
        id: 3,
        label: "解説文の論理構成に矛盾がないか確認する",
        risk: "high",
        feedbackTitle: "論理的でも嘘をつきます",
        feedbackText: "生成AIの文章は論理的に整っていても、事実関係が誤っていることが多々あります。文章の整合性だけでは判断できません。",
      }
    ]
  },
  {
    id: "q_193_calculation",
    category: "知識チェック 2/5",
    title: "数値データの集計",
    context: "生成AIに文章から数値を抽出させて集計表を作成させようとしています。",
    sourceText: "【レポート本文】...第1四半期は堅調に推移し...（数千文字のテキスト）...。",
    aiPrompt: "この作業を行う際、どのようなリスクや特性を考慮すべきですか？",
    options: [
      {
        id: 1,
        label: "表形式で出力させれば計算ミスは防げる",
        risk: "high",
        feedbackTitle: "AIは計算機ではありません",
        feedbackText: "LLMは言葉の予測確率で動いており、計算ロジックを持っているわけではありません。表形式でも計算ミスは発生します。",
      },
      {
        id: 2,
        label: "文章が長いとデータを読み飛ばすことがある",
        risk: "safe",
        feedbackTitle: "その通りです！",
        feedbackText: "入力トークンが多いと、途中を読み飛ばす（Lost in the Middle現象）ことがあります。必ず人間が元データと突き合わせて検算する必要があります。",
      },
      {
        id: 3,
        label: "AI自身に検算させれば正確性は担保される",
        risk: "medium",
        feedbackTitle: "過信は禁物です",
        feedbackText: "AIによる検算で精度は上がりますが、それでも完全ではありません。特に桁数の多い数字や複雑な集計は人間による確認が必須です。",
      }
    ]
  },
  {
    id: "q_149_email_instruction",
    category: "知識チェック 3/5",
    title: "お詫びメールの作成",
    context: "製品不具合のお詫びメールを生成AIに作成させる際、意図通りの回答を得るために指示に含めるべき情報は？",
    sourceText: "状況：製品Aに傷があった。交換対応をする。",
    aiPrompt: "どのような情報をプロンプト（指示）に含めますか？",
    options: [
      {
        id: 1,
        label: "AIに対する丁寧な挨拶やお礼",
        risk: "medium",
        feedbackTitle: "丁寧さは重要ですが...",
        feedbackText: "AIへの礼儀正しさは大切ですが、回答の精度に直結する要素ではありません。より具体的なコンテキストが必要です。",
      },
      {
        id: 2,
        label: "メールの差出人の立場や背景事情",
        risk: "safe",
        feedbackTitle: "完璧なプロンプトです！",
        feedbackText: "「誰が（役割）」「なぜ（背景）」「誰に（相手）」送るのかを明確にすることで、文脈に沿った適切なメールが生成されます。",
      },
      {
        id: 3,
        label: "AIの感性や裁量に任せる指示",
        risk: "high",
        feedbackTitle: "丸投げはNGです",
        feedbackText: "ビジネスメールにおいて「感性」に任せると、不適切な表現や過度な謝罪が含まれるリスクがあります。形式やトーンを指定しましょう。",
      }
    ]
  },
  {
    id: "q_191_few_shot",
    category: "知識チェック 4/5",
    title: "見本データの入力",
    context: "顧客からの問い合わせ返信文を作成させる際、過去の対応履歴を見本（Few-Shot）として渡そうと思います。",
    sourceText: "過去ログ：Aさんへの回答、Bさんへの回答...",
    aiPrompt: "見本データを選ぶ際のポイントは？",
    options: [
      {
        id: 1,
        label: "悪い回答例も含めて大量に入力する",
        risk: "medium",
        feedbackTitle: "混乱の元です",
        feedbackText: "悪い例を混ぜると、AIがそれを「真似すべきスタイル」と誤認する可能性があります。良い例（Best Practice）だけを厳選しましょう。",
      },
      {
        id: 2,
        label: "標準的でよくあるパターンの良い回答を選ぶ",
        risk: "safe",
        feedbackTitle: "正解です！",
        feedbackText: "特殊的すぎる事例ではなく、汎用性の高い「型」となる良質な回答例を数件提示するのが最も効果的です。",
      },
      {
        id: 3,
        label: "文章量は多ければ多いほどよい",
        risk: "high",
        feedbackTitle: "ノイズになります",
        feedbackText: "関連性の低い情報を大量に与えると、重要な指示が埋もれてしまい、逆に出力品質が下がることがあります。",
      }
    ]
  },
  {
    id: "q_183_data_privacy",
    category: "知識チェック 5/5",
    title: "機密情報の扱い",
    context: "個人契約の生成AIサービスを利用しています。業務データを入力する際のリスクについて確認します。",
    sourceText: "データ：顧客名簿、売上データ、議事録...",
    aiPrompt: "データの取り扱いについて正しい認識はどれですか？",
    options: [
      {
        id: 1,
        label: "初期設定では入力データが学習に使われることが多い",
        risk: "safe",
        feedbackTitle: "正解です！",
        feedbackText: "多くの生成AIサービス（無料版など）では、入力データがAIの学習に利用される規約になっています。オプトアウト設定か、法人契約版を利用しましょう。",
      },
      {
        id: 2,
        label: "「重要」と書けば外部に漏れない",
        risk: "high",
        feedbackTitle: "おまじないに過ぎません",
        feedbackText: "プロンプトで「秘密にして」と書いても、システム的なデータ送信や学習利用は防げません。",
      },
      {
        id: 3,
        label: "履歴を削除すれば学習されない",
        risk: "medium",
        feedbackTitle: "手遅れかもしれません",
        feedbackText: "履歴を消しても、送信した瞬間にサーバーログに残り、学習パイプラインに乗る可能性があります。最初から入力しないことが重要です。",
      }
    ]
  }
];

const SimulationApp = () => {
  // ユーザー状態
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // 画面遷移管理: 'practice'画面を追加
  const [currentScreen, setCurrentScreen] = useState<'login' | 'menu' | 'chat' | 'result' | 'practice' | 'finalResult'>('login');
  
  // クイズ状態
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{scenarioId: string, result: 'safe'|'medium'|'high'}[]>([]);

  // 実践モード状態
  const [practiceInput, setPracticeInput] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState<{status: 'success'|'danger'|null, message: string}>({status: null, message: ""});

  // チャットUI状態
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'danger' | null>(null);
  const [isSending, setIsSending] = useState(false);

  // ログイン監視
  useEffect(() => {
    if (configError || !auth) {
      setLoadingAuth(false);
      setCurrentScreen('login');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        setCurrentScreen('menu');
      } else {
        setCurrentScreen('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // ログイン処理
  const handleLogin = async () => {
    setLoginError(null);
    if (!auth) {
      setLoginError(configError || "Firebaseが初期化されていません。");
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      setLoginError(`ログイン失敗: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setCurrentScreen('login');
    resetState();
  };

  const resetState = () => {
    setCurrentScenarioIndex(0);
    setScore(0);
    setAnswers([]);
    setPracticeInput("");
    setPracticeFeedback({status: null, message: ""});
  };

  // ログ送信 (汎用)
  const sendLogToSheet = async (data: any) => {
    if (!GAS_API_URL) return;
    setIsSending(true);
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "unknown",
          userName: user?.displayName || "No Name",
          email: user?.email || "No Email",
          timestamp: new Date().toISOString(),
          ...data
        })
      });
    } catch (e) {
      console.error("送信エラー", e);
    } finally {
      setIsSending(false);
    }
  };

  // クイズ開始
  const handleStart = () => {
    resetState();
    startScenario(0);
  };

  const startScenario = (index: number) => {
    const s = SCENARIOS[index];
    setChatHistory([
      { sender: 'system', text: `【${s.category}】\n${s.title}` },
      { sender: 'system', text: `状況:\n${s.context}` },
      { sender: 'system', text: `参考資料:\n${s.sourceText}` }
    ]);
    setShowOptions(false);
    setFeedback(null);
    setCurrentScreen('chat');

    setTimeout(() => {
      setChatHistory(prev => [...prev, { sender: 'ai', text: s.aiPrompt || "どうしますか？" }]);
      setShowOptions(true);
    }, 1000);
  };

  const handleOptionSelect = (option: Option) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: option.label }]);
    setShowOptions(false);

    const currentScenario = SCENARIOS[currentScenarioIndex];
    sendLogToSheet({
      type: "quiz_answer",
      scenarioId: currentScenario.id,
      selectedOptionId: option.id,
      riskLevel: option.risk
    });

    if (option.risk === 'safe') {
      setScore(prev => prev + 1);
    }
    setAnswers(prev => [...prev, { scenarioId: currentScenario.id, result: option.risk }]);

    setTimeout(() => {
      if (option.risk === 'safe') {
        setFeedback('success');
        setChatHistory(prev => [...prev, { sender: 'ai', text: "承知しました。" }]);
      } else {
        setFeedback('danger');
        setChatHistory(prev => [...prev, { sender: 'system', text: "⚠️ リスク検知" }]);
      }
    }, 600);
  };

  const handleNext = () => {
    const nextIndex = currentScenarioIndex + 1;
    if (nextIndex < SCENARIOS.length) {
      setCurrentScenarioIndex(nextIndex);
      startScenario(nextIndex);
    } else {
      setCurrentScreen('result');
    }
  };

  // フィードバック取得
  const getFeedbackContent = (type: 'success' | 'danger') => {
    const currentScenario = SCENARIOS[currentScenarioIndex];
    if (type === 'success') {
        const opt = currentScenario.options.find(o => o.risk === 'safe');
        return opt ? { title: opt.feedbackTitle, text: opt.feedbackText } : { title: '', text: '' };
    } else {
        const opt = currentScenario.options.find(o => o.risk !== 'safe'); 
        return opt ? { 
            title: opt.feedbackTitle,
            text: opt.feedbackText 
        } : { title: '注意', text: '不適切な対応です。' };
    }
  };

  // --- 実践モードの処理 ---
  const handlePracticeStart = () => {
    // 実践モードのチャット履歴初期化
    setChatHistory([
      { sender: 'system', text: `【${PRACTICE_TASK.title}】\n${PRACTICE_TASK.instruction}` },
      { sender: 'system', text: PRACTICE_TASK.targetData },
      { sender: 'ai', text: "はい、指示を待っています。プロンプトを入力してください。" }
    ]);
    setPracticeInput("");
    setPracticeFeedback({status: null, message: ""});
    setCurrentScreen('practice');
  };

  const handlePracticeSubmit = () => {
    if (!practiceInput.trim()) return;

    // ユーザーの入力をチャットに追加
    setChatHistory(prev => [...prev, { sender: 'user', text: practiceInput }]);
    
    // 簡易判定ロジック
    // NGキーワードが含まれているかチェック
    const hitNgWords = PRACTICE_TASK.ngKeywords.filter(word => practiceInput.includes(word));
    const isSafe = hitNgWords.length === 0;

    // ログ送信
    sendLogToSheet({
      type: "practice_answer",
      taskId: PRACTICE_TASK.id,
      inputText: practiceInput,
      isSafe: isSafe,
      hitNgWords: hitNgWords.join(",")
    });

    // AIの応答シミュレーション
    setTimeout(() => {
      if (isSafe) {
        setChatHistory(prev => [...prev, 
          { sender: 'ai', text: "承知しました。情報を秘匿化した上で要約を作成します..." },
          { sender: 'system', text: "🎉 Excellent! 機密情報が適切に処理されています。", type: 'feedback', feedbackType: 'success' }
        ]);
        setPracticeFeedback({status: 'success', message: "合格！"});
      } else {
        setChatHistory(prev => [...prev, 
          { sender: 'system', text: `⚠️ 情報漏洩リスク検知: 「${hitNgWords[0]}」が含まれています。`, type: 'feedback', feedbackType: 'danger' },
          { sender: 'ai', text: "申し訳ありません。セキュリティポリシーにより、機密情報を含む処理は実行できません。" }
        ]);
        setPracticeFeedback({status: 'danger', message: PRACTICE_TASK.hint});
      }
    }, 800);
    
    setPracticeInput(""); // 入力欄クリア
  };

  // --- 画面レンダリング ---

  if (loadingAuth) return <div className="h-[800px] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  // 0. ログイン
  if (currentScreen === 'login') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden items-center justify-center p-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6">
          <ShieldCheck size={48} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">AIドライビングスクール</h1>
        <p className="text-slate-500 text-center mb-8">全社員向けAIリテラシー研修<br/>（知識5問 + 実践1問）</p>
        {(configError || loginError) && (
          <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>{configError || loginError}</div>
          </div>
        )}
        <button onClick={handleLogin} className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm mb-3">
          <LogIn size={20} /> Googleアカウントでログイン
        </button>
        {configError && (
          <button onClick={() => setCurrentScreen('menu')} className="text-xs text-slate-400 mt-4 underline hover:text-slate-600">[デバッグ用] ログインせずに進む</button>
        )}
      </div>
    );
  }

  // 1. メニュー
  if (currentScreen === 'menu') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden">
        <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
          <div>
            <h1 className="font-bold text-lg">AI Talent OS</h1>
            <p className="text-xs opacity-80">{user?.displayName || "Guest User"}</p>
          </div>
          <button onClick={handleLogout} className="text-xs bg-blue-700 px-2 py-1 rounded hover:bg-blue-800 flex items-center gap-1"><LogIn size={12} /> ログアウト</button>
        </header>
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-500 mb-2">現在のステータス</h2>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400"><ShieldCheck size={24} /></div>
              <div>
                <p className="font-bold text-slate-800">Season 1 未完了</p>
                <p className="text-xs text-slate-500 text-red-500">アクションが必要です</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2"><div className="bg-blue-500 h-2 rounded-full w-0"></div></div>
            <p className="text-right text-xs text-slate-400 mt-1">0 / {SCENARIOS.length + 1} 完了</p>
          </div>
          <div className="space-y-3">
            <h3 className="font-bold text-slate-700">本日のカリキュラム</h3>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg cursor-pointer hover:bg-blue-100 transition-colors shadow-sm" onClick={handleStart}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-blue-600 mb-1">Season 1</div>
                  <div className="font-bold text-slate-800">AI活用・防衛実戦ドリル</div>
                  <div className="text-xs text-slate-500 mt-1">知識クイズ + 実践シミュレーション</div>
                </div>
                <ArrowRight className="text-blue-400" size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. クイズチャット画面 (既存)
  if (currentScreen === 'chat') {
    const currentScenario = SCENARIOS[currentScenarioIndex];
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden">
        <header className="bg-white border-b p-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white"><MessageSquare size={16} /></div>
            <div className="text-xs font-bold text-slate-500">AI Assistant Bot<br/><span className="text-[10px] text-green-500 font-normal">● Online</span></div>
          </div>
          <div className="text-xs font-bold text-slate-400">Knowledge Q {currentScenarioIndex + 1} / {SCENARIOS.length}</div>
        </header>
        <div className="flex-1 bg-slate-100 p-4 overflow-y-auto space-y-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : msg.sender === 'system' ? 'bg-yellow-50 text-slate-600 border border-yellow-200 text-xs flex items-start' : 'bg-white text-slate-800 rounded-bl-none'}`}>
                {msg.sender === 'system' && <AlertTriangle size={14} className="inline mr-1 text-yellow-500 mt-0.5 shrink-0"/>}
                <div>{msg.text}</div>
              </div>
            </div>
          ))}
          {isSending && <div className="flex justify-end"><div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> 送信中...</div></div>}
        </div>
        <div className="bg-white border-t p-4 z-20">
          {feedback === null ? (
            showOptions ? (
              <div className="space-y-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <p className="text-xs font-bold text-slate-500 mb-2">どう返信しますか？</p>
                {currentScenario.options.map((opt) => (
                  <button key={opt.id} onClick={() => handleOptionSelect(opt)} className="w-full text-left p-3 border rounded-lg hover:bg-slate-50 text-sm text-slate-700 transition-colors flex items-center justify-between group bg-white shadow-sm">
                    <span>{opt.label}</span><Send size={14} className="text-slate-300 group-hover:text-blue-500" />
                  </button>
                ))}
              </div>
            ) : <div className="text-center text-xs text-slate-400 py-2">AIが入力中...</div>
          ) : (
            <div className={`p-4 rounded-lg border animate-in zoom-in-95 duration-200 shadow-md ${feedback === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                {feedback === 'success' ? <CheckCircle className="text-green-600 shrink-0 mt-1" /> : <XCircle className="text-red-600 shrink-0 mt-1" />}
                <div>
                  <h3 className={`font-bold ${feedback === 'success' ? 'text-green-800' : 'text-red-800'}`}>{getFeedbackContent(feedback).title}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{getFeedbackContent(feedback).text}</p>
                  <button onClick={handleNext} className={`mt-4 w-full py-2.5 rounded font-bold text-sm shadow-sm transition-transform active:scale-95 ${feedback === 'success' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                    {currentScenarioIndex < SCENARIOS.length - 1 ? '次の問題へ' : '結果を見る'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. クイズ結果画面
  if (currentScreen === 'result') {
    const isPassed = score >= SCENARIOS.length - 1; // 4問以上で合格ライン
    return (
      <div className="w-full max-w-md mx-auto bg-white h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden p-8 text-center justify-center items-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500 ${isPassed ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
          {isPassed ? <Award size={48} /> : <ShieldCheck size={48} />}
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Knowledge Check Complete</h2>
        <p className="text-slate-500 mb-8">
          正答数: <span className="text-xl font-bold text-slate-800">{score}</span> / {SCENARIOS.length}<br/>
          基礎知識の確認が完了しました。<br/>最後に「実践スキル」をチェックします。
        </p>
        <button onClick={handlePracticeStart} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md active:translate-y-0.5 animate-bounce">
          <Zap size={18} fill="currentColor" /> 実践モードへ進む
        </button>
      </div>
    );
  }

  // 4. 実践モード画面 (NEW)
  if (currentScreen === 'practice') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden">
        <header className="bg-indigo-600 text-white p-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"><Zap size={16} fill="currentColor"/></div>
            <div className="text-xs font-bold">Practice Mode<br/><span className="text-[10px] font-normal opacity-80">機密情報マスキング演習</span></div>
          </div>
        </header>

        <div className="flex-1 bg-slate-100 p-4 overflow-y-auto space-y-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm whitespace-pre-wrap 
                ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 
                  msg.type === 'feedback' ? (msg.feedbackType === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300') :
                  msg.sender === 'system' ? 'bg-yellow-50 text-slate-600 border border-yellow-200 text-xs flex items-start' : 
                  'bg-white text-slate-800 rounded-bl-none'}`}>
                {msg.sender === 'system' && !msg.type && <AlertTriangle size={14} className="inline mr-1 text-yellow-500 mt-0.5 shrink-0"/>}
                {msg.type === 'feedback' && (msg.feedbackType === 'success' ? <CheckCircle size={16} className="inline mr-1 -mt-0.5"/> : <AlertCircle size={16} className="inline mr-1 -mt-0.5"/>)}
                <div>{msg.text}</div>
              </div>
            </div>
          ))}
          <div id="scroll-bottom"></div>
        </div>

        <div className="bg-white border-t p-4 z-20">
          {practiceFeedback.status === 'success' ? (
            <button onClick={() => setCurrentScreen('finalResult')} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md">
              <Award size={18} /> 完了して結果を見る
            </button>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={practiceInput}
                onChange={(e) => setPracticeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePracticeSubmit()}
                placeholder="ここに指示を入力..."
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                disabled={isSending}
              />
              <button 
                onClick={handlePracticeSubmit}
                disabled={!practiceInput.trim() || isSending}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          )}
          {practiceFeedback.status === 'danger' && (
            <p className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1 animate-pulse">
              <AlertCircle size={12} /> {practiceFeedback.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 5. 最終結果画面
  if (currentScreen === 'finalResult') {
    return (
      <div className="w-full max-w-md mx-auto bg-white h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden p-8 text-center justify-center items-center bg-gradient-to-br from-indigo-50 to-white">
        <div className="w-28 h-28 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white mb-6 shadow-xl animate-in zoom-in duration-700">
          <Award size={56} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">Mission Complete!</h1>
        <p className="text-slate-500 mb-8 font-medium">
          Season 1 の全カリキュラムを修了しました。<br/>
          あなたは<span className="text-indigo-600 font-bold">「AI防衛エキスパート」</span>です。
        </p>
        
        <div className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8 text-left">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileText size={20}/></div>
            <div>
              <div className="text-xs text-slate-400">知識スコア</div>
              <div className="font-bold text-slate-800">{score} / {SCENARIOS.length} 問正解</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg text-green-600"><Zap size={20} fill="currentColor"/></div>
            <div>
              <div className="text-xs text-slate-400">実践スキル</div>
              <div className="font-bold text-slate-800">機密情報処理: 合格</div>
            </div>
          </div>
        </div>

        <button onClick={() => setCurrentScreen('menu')} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 shadow-lg">
          <RefreshCw size={18} /> メニューに戻る
        </button>
      </div>
    );
  }

  return null;
};

export default SimulationApp;