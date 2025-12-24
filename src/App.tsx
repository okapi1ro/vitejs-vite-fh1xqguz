import React, { useState, useEffect } from 'react';
import {  ShieldCheck, AlertTriangle, CheckCircle, MessageSquare, Send, ArrowRight, XCircle, RefreshCw, FileText, Loader2 } from 'lucide-react';

// ▼▼▼ ここにGoogle Apps Script (GAS) のURLを貼り付けます ▼▼▼
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw6ac7EuSmc7sXrtArnnv9Bfbby1emCjIz-inoP1O1HbxhC5H_Ng4AjG77g5fbIGoWggg/exec"; 
// 例: "https://script.google.com/macros/s/AKfycbx.../exec"

const SimulationApp = () => {
  const [currentScreen, setCurrentScreen] = useState('menu'); // menu, chat, result
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: 'こんにちは。業務アシスタントAIです。議事録の要約やメール作成など、お手伝いできることがあれば指示してください。' }
  ]);
  const [showOptions, setShowOptions] = useState(false);
  const [feedback, setFeedback] = useState(null); // null, 'success', 'danger'
  const [isSending, setIsSending] = useState(false);

  // シナリオデータ（本来は外部から取得してもよい）
  const scenario = {
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

  // ログ送信関数（張りぼての裏側）
  const sendLogToSheet = async (option) => {
    if (!GAS_API_URL) {
      console.log("GAS_API_URLが未設定のため、送信スキップ:", option);
      return; 
    }

    setIsSending(true);
    try {
      // 実際のスプレッドシートへ送信
      await fetch(GAS_API_URL, {
        method: "POST",
        mode: "no-cors", // GASへの送信にはno-corsが必要
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user_demo_001", // SSO実装後は本物のIDを入れる
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

  const handleOptionSelect = (option) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: option.label }]);
    setShowOptions(false);

    // ★ここで裏側にデータを送る
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

  // --- 画面レンダリング ---

  // 1. メニュー画面
  if (currentScreen === 'menu') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden">
        <header className="bg-blue-600 text-white p-4 text-center shadow-md">
          <h1 className="font-bold text-lg">AIドライビングスクール</h1>
          <p className="text-xs opacity-80">Season 1: 基礎防衛編</p>
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
                <p className="font-bold text-slate-800">未受講</p>
                <p className="text-xs text-slate-500 text-red-500">有効期限切れ: 今すぐ更新が必要です</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2">
              <div className="bg-blue-500 h-2 rounded-full w-0"></div>
            </div>
            <p className="text-right text-xs text-slate-400 mt-1">0% 完了</p>
          </div>

          {/* カリキュラムリスト */}
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
        
        <div className="p-4 bg-white border-t text-center text-xs text-slate-400">
           ExaWizards AI Talent OS v1.0
        </div>
      </div>
    );
  }

  // 2. チャットシミュレーション画面
  if (currentScreen === 'chat') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 h-[800px] flex flex-col font-sans border shadow-xl rounded-xl overflow-hidden">
        {/* ヘッダー */}
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

        {/* チャットエリア */}
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
          {/* 送信中のインジケータ */}
          {isSending && (
            <div className="flex justify-end">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> 送信中...
              </div>
            </div>
          )}
        </div>

        {/* 選択肢・フィードバックエリア */}
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
                    {feedback === 'success' ? scenario.options.find(o=>o.risk==='safe').feedbackTitle : scenario.options.find(o=>o.risk!=='safe').feedbackTitle}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    {feedback === 'success' ? scenario.options.find(o=>o.risk==='safe').feedbackText : "機密情報を直接入力すると、AIの学習データとして利用され、他社への回答に流出する恐れがあります。"}
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