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
  AlertCircle
} from 'lucide-react';

// ▼▼▼ Firebase SDKの読み込み ▼▼▼
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";

// ▼▼▼ ここにGoogle Apps Script (GAS) のURLを貼り付けます ▼▼▼
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw6ac7EuSmc7sXrtArnnv9Bfbby1emCjIz-inoP1O1HbxhC5H_Ng4AjG77g5fbIGoWggg/exec"; 
// 例: "https://script.google.com/macros/s/AKfycbx.../exec"aaa

// ▼▼▼ Firebaseの設定情報（Firebaseコンソールから取得して貼り付け） ▼▼▼
// ※StackBlitzで試す場合は、ご自身のFirebaseプロジェクトの設定値を入れてください
const firebaseConfig = {
    apiKey: "AIzaSyA6FFOlrxIlp_njiJayYCbRdgLpQzvQLi8",
    authDomain: "aidrilltest.firebaseapp.com",
    projectId: "aidrilltest",
    storageBucket: "aidrilltest.firebasestorage.app",
    messagingSenderId: "781365045188",
    appId: "1:781365045188:web:b971e424e499e6dae32691",
    measurementId: "G-MM40DYXGF3"
  };

// Firebase初期化状態
let auth: any = null;
let initError: string | null = null;

try {
  // 設定値が書き換えられているかチェック
  if (firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.apiKey === "") {
    initError = "Firebaseの設定が行われていません。コード内のfirebaseConfigを正しい値に書き換えてください。";
  } else {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
} catch (e: any) {
  console.error("Firebase initialization error:", e);
  initError = `Firebase初期化エラー: ${e.message}`;
}

// 型定義
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
  sourceText: string;
  options: Option[];
}

interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  text: string;
}

const SimulationApp = () => {
  // ユーザー状態管理
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<'login' | 'menu' | 'chat' | 'result'>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // チャット状態管理
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: 'ai', text: 'こんにちは。業務アシスタントAIです。議事録の要約やメール作成など、お手伝いできることがあれば指示してください。' }
  ]);
  const [showOptions, setShowOptions] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'danger' | null>(null);
  const [isSending, setIsSending] = useState(false);

  // ログイン状態の監視
  useEffect(() => {
    if (!auth) {
      setLoadingAuth(false);
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
      setLoginError(initError || "Firebaseが初期化されていません。");
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // 成功すると onAuthStateChanged が発火して画面遷移します
    } catch (error: any) {
      console.error("Login failed", error);
      // エラーメッセージの整形
      let msg = "ログインに失敗しました。";
      if (error.code === 'auth/popup-closed-by-user') {
        msg = "ログイン画面が閉じられました。";
      } else if (error.code === 'auth/cancelled-popup-request') {
        msg = "ポップアップ処理が競合しています。もう一度お試しください。";
      } else if (error.code === 'auth/popup-blocked') {
        msg = "ポップアップがブロックされました。ブラウザの設定を確認してください。";
      } else {
        msg += ` (${error.message})`;
      }
      setLoginError(msg);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setCurrentScreen('login');
  };

  // シナリオデータ
  const scenario: Scenario = {
    id: "case_001",
    title: "Case 1: 議事録の要約",
    context: "あなたは顧客との会議議事録（録音データ）を持っています。要約して上司に報告する必要があります。",
    sourceText: "【会議録】\n日時：2025/12/24\n参加者：山田太郎様(A社)、鈴木一郎(当社)\n内容：A社の次期システム開発案件（予算5,000万円）について...",
    options: [
      {
        id: 1,
        label: "そのまま貼り付けて要約を指示",
        risk: "high",
        feedbackTitle: "情報漏洩リスク！",
        feedbackText: "顧客名（A社、山田様）や予算額などの機密情報をそのまま外部AIに入力してはいけません。学習データとして利用されるリスクがあります。",
      },
      {
        id: 2,
        label: "「これは機密情報です」と注釈をつけて入力",
        risk: "medium",
        feedbackTitle: "不十分な対策です",
        feedbackText: "プロンプトで「機密」と書いても、入力データ自体がサーバーに送信されるリスクは変わりません。AI側の学習設定に依存する危険な行為です。",
      },
      {
        id: 3,
        label: "固有名詞を伏せ字にしてから入力",
        risk: "safe",
        feedbackTitle: "ナイス判断！",
        feedbackText: "正解です。「A社→某社」「5,000万円→予算規模」のように匿名化・マスキングしてから入力するのが、AI利用の基本マナーです。",
      }
    ]
  };

  // ログ送信関数
  const sendLogToSheet = async (option: Option) => {
    if (!GAS_API_URL) {
      console.log("GAS_API_URLが未設定のため、送信スキップ:", option);
      return; 
    }

    setIsSending(true);
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "unknown_user", // FirebaseのUID
          userName: user?.displayName || "No Name", // ユーザー名
          email: user?.email || "No Email", // メールアドレス
          timestamp: new Date().toISOString(),
          scenarioId: scenario.id,
          selectedOptionId: option.id,
          riskLevel: option.risk
        })
      });
      console.log("送信完了");
    } catch (e) {
      console.error("送信エラー", e);
    } finally {
      setIsSending(false);
    }
  };

  const handleStart = () => {
    setCurrentScreen('chat');
    setTimeout(() => {
      setChatHistory(prev => [...prev, { sender: 'system', text: scenario.context }]);
      setTimeout(() => {
        setChatHistory(prev => [...prev, { sender: 'ai', text: "要約するテキストを入力してください。" }]);
        setShowOptions(true);
      }, 1000);
    }, 500);
  };

  const handleOptionSelect = (option: Option) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: option.label }]);
    setShowOptions(false);

    sendLogToSheet(option);

    setTimeout(() => {
      if (option.risk === 'safe') {
        setFeedback('success');
        setChatHistory(prev => [...prev, { sender: 'ai', text: "承知しました。匿名化されたデータを元に要約を作成します..." }]);
      } else {
        setFeedback('danger');
        setChatHistory(prev => [...prev, { sender: 'system', text: "⚠️ セキュリティアラート検知" }]);
      }
    }, 800);
  };

  const handleNext = () => {
    if (feedback === 'success') {
      setCurrentScreen('result');
    } else {
      setChatHistory([
        { sender: 'ai', text: '気を取り直して、もう一度最適な指示を選んでください。' }
      ]);
      setFeedback(null);
      setShowOptions(true);
    }
  };

  // 安全な取得用ヘルパー（undefined対策）
  const getFeedbackContent = (type: 'success' | 'danger') => {
    if (type === 'success') {
        const opt = scenario.options.find(o => o.risk === 'safe');
        return opt ? { title: opt.feedbackTitle, text: opt.feedbackText } : { title: '', text: '' };
    } else {
        const opt = scenario.options.find(o => o.risk !== 'safe'); 
        return opt ? { 
            title: opt.feedbackTitle,
            text: "機密情報を直接入力すると、AIの学習データとして利用され、他社への回答に流出する恐れがあります。" 
        } : { title: '', text: '' };
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
          （所要時間：約15分）
        </p>
        
        {/* エラーメッセージ表示エリア */}
        {(initError || loginError) && (
          <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>{initError || loginError}</div>
          </div>
        )}

        {/* Googleログインボタン */}
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

        {/* 開発中用のデバッグボタン */}
        <button 
          onClick={() => setCurrentScreen('menu')}
          className="text-xs text-slate-400 mt-4 underline hover:text-slate-600"
        >
          [デバッグ用] ログインせずに進む
        </button>
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
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-500 mb-2">現在のステータス</h2>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-800">未受講</p>
                <p className="text-xs text-slate-500 text-red-500">有効期限切れ: 今すぐ更新が必要です</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2">
              <div className="bg-blue-500 h-2 rounded-full w-0"></div>
            </div>
            <p className="text-right text-xs text-slate-400 mt-1">0% 完了</p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-slate-700">本日のカリキュラム (15分)</h3>
            
            <div 
              className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg cursor-pointer hover:bg-blue-100 transition-colors shadow-sm" 
              onClick={handleStart}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-blue-600 mb-1">CASE 1</div>
                  <div className="font-bold text-slate-800">機密情報の入力マナー</div>
                  <div className="text-xs text-slate-500 mt-1">所要時間: 3分</div>
                </div>
                <ArrowRight className="text-blue-400" size={20} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg opacity-60">
              <div className="text-xs font-bold text-slate-400 mb-1">CASE 2</div>
              <div className="font-bold text-slate-800">嘘(ハルシネーション)の見抜き方</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg opacity-60">
              <div className="text-xs font-bold text-slate-400 mb-1">CASE 3</div>
              <div className="font-bold text-slate-800">著作権と生成物の利用</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. チャットシミュレーション画面
  if (currentScreen === 'chat') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden">
        <header className="bg-white border-b p-3 flex items-center gap-2 shadow-sm z-10">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">
            <MessageSquare size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">AI Assistant Bot</div>
            <div className="text-[10px] text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
            </div>
          </div>
        </header>

        <div className="flex-1 bg-slate-100 p-4 overflow-y-auto space-y-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm ${
                msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 
                msg.sender === 'system' ? 'bg-yellow-50 text-slate-600 border border-yellow-200 text-xs flex items-start' :
                'bg-white text-slate-800 rounded-bl-none'
              }`}>
                {msg.sender === 'system' && <AlertTriangle size={14} className="inline mr-1 text-yellow-500 mt-0.5 shrink-0"/>}
                <div>
                  {msg.text.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                </div>
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
                {scenario.options.map((opt) => (
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
                    {feedback === 'success' ? '次のシナリオへ' : 'もう一度やり直す'}
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
    return (
      <div className="w-full max-w-md mx-auto bg-white h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden p-8 text-center justify-center items-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-in zoom-in duration-500">
          <ShieldCheck size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Simulation Clear!</h2>
        <p className="text-slate-500 mb-8">Case 1: 情報セキュリティ判定<br/>「安全」</p>
        
        <div className="bg-slate-50 p-4 rounded-lg border w-full text-left mb-8 shadow-inner">
          <div className="text-xs text-slate-400 font-bold mb-2">獲得バッジ</div>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded text-yellow-600">
               <FileText size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-700">秘匿化マスター</div>
              <div className="text-xs text-slate-500">機密情報を適切にマスクしました</div>
            </div>
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