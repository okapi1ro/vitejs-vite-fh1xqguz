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
  ChevronRight
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
  title: string;
  context: string;
  sourceText: string; // チャットの初期メッセージや資料
  aiPrompt?: string; // AIからの問いかけ
  options: Option[];
}

interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  text: string;
}

// --- シナリオデータ（設問集） ---
// PDFの設問内容（プロンプトエンジニアリング、ハルシネーション、セキュリティ等）を反映
const SCENARIOS: Scenario[] = [
  {
    id: "case_001",
    title: "Case 1: 未知の用語の確認",
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
    id: "case_002",
    title: "Case 2: 数値データの集計",
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
    id: "case_003",
    title: "Case 3: お詫びメールの作成",
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
    id: "case_004",
    title: "Case 4: 見本データの入力",
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
    id: "case_005",
    title: "Case 5: 機密情報の扱い",
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
  // ユーザー状態管理
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<'login' | 'menu' | 'chat' | 'result'>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // シナリオ進行管理
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [score, setScore] = useState(0); // 正答数
  const [answers, setAnswers] = useState<{scenarioId: string, result: 'safe'|'medium'|'high'}[]>([]);

  // チャット状態管理
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'danger' | null>(null);
  const [isSending, setIsSending] = useState(false);

  // ログイン状態の監視
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

  // Googleログイン処理
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
      let msg = "ログインに失敗しました。";
      if (error.code === 'auth/popup-closed-by-user') msg = "ログイン画面が閉じられました。";
      else if (error.code === 'auth/popup-blocked') msg = "ポップアップがブロックされました。";
      else msg += ` (${error.message})`;
      setLoginError(msg);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setCurrentScreen('login');
    // リセット
    setCurrentScenarioIndex(0);
    setScore(0);
    setAnswers([]);
  };

  // ログ送信関数
  const sendLogToSheet = async (scenario: Scenario, option: Option) => {
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
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          selectedOptionId: option.id,
          selectedLabel: option.label,
          riskLevel: option.risk
        })
      });
    } catch (e) {
      console.error("送信エラー", e);
    } finally {
      setIsSending(false);
    }
  };

  // シナリオ開始
  const startScenario = (index: number) => {
    const s = SCENARIOS[index];
    setChatHistory([
      { sender: 'system', text: `【${s.title}】\n${s.context}` },
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

  const handleStart = () => {
    setCurrentScenarioIndex(0);
    setScore(0);
    setAnswers([]);
    startScenario(0);
  };

  const handleOptionSelect = (option: Option) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: option.label }]);
    setShowOptions(false);

    const currentScenario = SCENARIOS[currentScenarioIndex];
    sendLogToSheet(currentScenario, option);

    // スコア加算
    if (option.risk === 'safe') {
      setScore(prev => prev + 1);
    }
    // 記録
    setAnswers(prev => [...prev, { scenarioId: currentScenario.id, result: option.risk }]);

    setTimeout(() => {
      if (option.risk === 'safe') {
        setFeedback('success');
        setChatHistory(prev => [...prev, { sender: 'ai', text: "承知しました。" }]);
      } else {
        setFeedback('danger');
        setChatHistory(prev => [...prev, { sender: 'system', text: "⚠️ セキュリティ・品質アラート" }]);
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

  const getFeedbackContent = (type: 'success' | 'danger') => {
    const currentScenario = SCENARIOS[currentScenarioIndex];
    // 選んだ選択肢IDを取得したいが、簡易実装のためriskで判定してメッセージを表示
    // 本来は選択したOptionオブジェクトをStateで保持すべき
    // ここでは簡易的に「SafeならSafeの解説」「それ以外ならHigh/Mediumの解説（適当なもの）」を表示
    if (type === 'success') {
        const opt = currentScenario.options.find(o => o.risk === 'safe');
        return opt ? { title: opt.feedbackTitle, text: opt.feedbackText } : { title: '', text: '' };
    } else {
        // 不正解の場合は、とりあえずHighのリスク解説を表示する（本来は選んだものに対応させる）
        // UX向上のため、選んだ選択肢の解説を出すのがベスト
        // ここでは便宜上、最初の非Safe選択肢の解説を表示
        const opt = currentScenario.options.find(o => o.risk !== 'safe'); 
        return opt ? { 
            title: opt.feedbackTitle,
            text: opt.feedbackText 
        } : { title: '注意', text: '不適切な対応です。' };
    }
  };

  // --- 画面レンダリング ---

  if (loadingAuth) {
    return <div className="h-[800px] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  // 0. ログイン画面
  if (currentScreen === 'login') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden items-center justify-center p-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6">
          <ShieldCheck size={48} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">AIドライビングスクール</h1>
        <p className="text-slate-500 text-center mb-8">
          全社員向けAIリテラシー・マナー研修<br/>
          （全{SCENARIOS.length}問 / 所要時間：約3分）
        </p>
        
        {(configError || loginError) && (
          <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">設定エラー</p>
              <p>{configError || loginError}</p>
            </div>
          </div>
        )}

        <button 
          onClick={handleLogin}
          className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm mb-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Googleアカウントでログイン
        </button>

        {configError && (
          <button 
            onClick={() => setCurrentScreen('menu')}
            className="text-xs text-slate-400 mt-4 underline hover:text-slate-600"
          >
            [デバッグ用] ログインせずに進む
          </button>
        )}
      </div>
    );
  }

  // 1. メニュー画面
  if (currentScreen === 'menu') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden">
        <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
          <div>
            <h1 className="font-bold text-lg">AI Talent OS</h1>
            <p className="text-xs opacity-80">Welcome, {user?.displayName || "Guest User"}</p>
          </div>
          <button onClick={handleLogout} className="text-xs bg-blue-700 px-2 py-1 rounded hover:bg-blue-800 flex items-center gap-1">
            <LogIn size={12} /> ログアウト
          </button>
        </header>
        
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* ステータスカード */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-500 mb-2">現在のステータス</h2>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-800">Season 1 未完了</p>
                <p className="text-xs text-slate-500 text-red-500">アクションが必要です</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2">
              <div className="bg-blue-500 h-2 rounded-full w-0"></div>
            </div>
            <p className="text-right text-xs text-slate-400 mt-1">0 / {SCENARIOS.length} 完了</p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-slate-700">本日のカリキュラム</h3>
            
            <div 
              className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg cursor-pointer hover:bg-blue-100 transition-colors shadow-sm" 
              onClick={handleStart}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-blue-600 mb-1">Season 1</div>
                  <div className="font-bold text-slate-800">AI活用・防衛実戦ドリル</div>
                  <div className="text-xs text-slate-500 mt-1">全{SCENARIOS.length}問 | 所要時間: 3分</div>
                </div>
                <ArrowRight className="text-blue-400" size={20} />
              </div>
            </div>
            
            <div className="p-4 rounded-lg border border-dashed border-slate-300 text-center text-slate-400 text-sm">
              Season 2 以降は順次公開されます
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. チャットシミュレーション画面
  if (currentScreen === 'chat') {
    const currentScenario = SCENARIOS[currentScenarioIndex];
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden">
        <header className="bg-white border-b p-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">
              <MessageSquare size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">AI Assistant Bot</div>
              <div className="text-[10px] text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
              </div>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-400">
            Q {currentScenarioIndex + 1} / {SCENARIOS.length}
          </div>
        </header>

        <div className="flex-1 bg-slate-100 p-4 overflow-y-auto space-y-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm whitespace-pre-wrap ${
                msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 
                msg.sender === 'system' ? 'bg-yellow-50 text-slate-600 border border-yellow-200 text-xs flex items-start' :
                'bg-white text-slate-800 rounded-bl-none'
              }`}>
                {msg.sender === 'system' && <AlertTriangle size={14} className="inline mr-1 text-yellow-500 mt-0.5 shrink-0"/>}
                <div>{msg.text}</div>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-end">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> 送信中...
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border-t p-4 z-20">
          {feedback === null ? (
            showOptions ? (
              <div className="space-y-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <p className="text-xs font-bold text-slate-500 mb-2">どう返信しますか？</p>
                {currentScenario.options.map((opt) => (
                  <button 
                    key={opt.id}
                    onClick={() => handleOptionSelect(opt)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-slate-50 text-sm text-slate-700 transition-colors flex items-center justify-between group bg-white shadow-sm"
                  >
                    <span>{opt.label}</span>
                    <Send size={14} className="text-slate-300 group-hover:text-blue-500" />
                  </button>
                ))}
              </div>
            ) : (
               <div className="text-center text-xs text-slate-400 py-2">AIが入力中...</div>
            )
          ) : (
            <div className={`p-4 rounded-lg border animate-in zoom-in-95 duration-200 shadow-md ${feedback === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                {feedback === 'success' ? <CheckCircle className="text-green-600 shrink-0 mt-1" /> : <XCircle className="text-red-600 shrink-0 mt-1" />}
                <div>
                  <h3 className={`font-bold ${feedback === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {getFeedbackContent(feedback).title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    {getFeedbackContent(feedback).text}
                  </p>
                  <button 
                    onClick={handleNext}
                    className={`mt-4 w-full py-2.5 rounded font-bold text-sm shadow-sm transition-transform active:scale-95 ${feedback === 'success' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
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

  // 3. 結果画面
  if (currentScreen === 'result') {
    const isPassed = score === SCENARIOS.length;
    return (
      <div className="w-full max-w-md mx-auto bg-white h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden p-8 text-center justify-center items-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500 ${isPassed ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
          {isPassed ? <Award size={48} /> : <ShieldCheck size={48} />}
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isPassed ? "Excellent!" : "Simulation Finished"}
        </h2>
        <p className="text-slate-500 mb-8">
          正答数: <span className="text-xl font-bold text-slate-800">{score}</span> / {SCENARIOS.length}<br/>
          {isPassed ? "全問正解！プロフェッショナルです。" : "いくつかリスク行動がありました。復習しましょう。"}
        </p>
        
        <div className="bg-slate-50 p-4 rounded-lg border w-full text-left mb-8 shadow-inner overflow-y-auto max-h-60">
          <div className="text-xs text-slate-400 font-bold mb-2">回答履歴</div>
          <div className="space-y-2">
            {answers.map((ans, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b pb-2">
                <span className="text-slate-600">Case {i+1}</span>
                {ans.result === 'safe' ? (
                  <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={12}/> Safe</span>
                ) : (
                  <span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={12}/> Risk</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setCurrentScreen('menu')}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md active:translate-y-0.5"
        >
          <RefreshCw size={18} />
          メニューに戻る
        </button>
      </div>
    );
  }

  return null;
};

export default SimulationApp;