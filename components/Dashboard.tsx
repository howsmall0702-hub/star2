import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StockData, AIAnalysisResult, AnalysisStatus, WatchlistItem, NotificationItem } from '../types';
import { fetchMarketData } from '../services/stockService';
import { analyzeChartPattern } from '../services/geminiService';
import StockChart from './StockChart';
import RiskCalculator from './RiskCalculator';
import { LayoutDashboard, TrendingUp, Filter, RefreshCw, BrainCircuit, CheckCircle, XCircle, Bell, Trash2, Smartphone, List, LineChart, ShieldAlert, Zap, BarChart3 } from 'lucide-react';

const WATCHLIST_STORAGE_KEY = 'tw-quant-watchlist';

const Dashboard: React.FC = () => {
  // Use React Query for data fetching with polling
  const { data: stocks = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['marketData'],
    queryFn: fetchMarketData,
    refetchInterval: 5000, // Auto-update every 5 seconds
    staleTime: 2000,
  });

  const [filterEnabled, setFilterEnabled] = useState(true);
  
  // Store only the selected Code, so when `stocks` updates, `selectedStock` automatically updates
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  
  // Mobile Navigation State
  const [activeTab, setActiveTab] = useState<'market' | 'chart' | 'plan'>('market');

  // Watchlist State with LocalStorage Persistence
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Failed to load watchlist from local storage:", error);
      return [];
    }
  });

  // Persist Watchlist changes
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch (error) {
      console.error("Failed to save watchlist to local storage:", error);
    }
  }, [watchlist]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  // AI State
  const [aiStatus, setAiStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  // Derived filtered list
  const filteredStocks = useMemo(() => {
    return filterEnabled
      ? stocks.filter(s => 
          s.isAbove200MA && 
          s.isVolAbove5MA && 
          s.ADR_Percent > 3.5 && 
          s.RS_Score > 80 && 
          s.lastClose >= s.yearHigh * 0.85
        )
      : stocks;
  }, [stocks, filterEnabled]);

  // Derived selected stock object
  const selectedStock = useMemo(() => {
    return stocks.find(s => s.code === selectedCode) || null;
  }, [stocks, selectedCode]);

  // Set initial selection when data first loads
  useEffect(() => {
    if (!selectedCode && stocks.length > 0) {
      // Prefer a match from the filtered list if possible
      const initialStock = filteredStocks.length > 0 ? filteredStocks[0] : stocks[0];
      setSelectedCode(initialStock.code);
    }
  }, [stocks, filteredStocks, selectedCode]);

  // Reset AI when selecting a different stock (not when stock data updates for the same code)
  useEffect(() => {
    setAiStatus(AnalysisStatus.IDLE);
    setAiResult(null);
  }, [selectedCode]);

  // Push Notification Simulation
  const pushNotification = (title: string, message: string, type: 'info' | 'success' | 'alert' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, title, message, type }]);
    
    // Auto dismiss
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleAddToWatchlist = (price: number, note: string) => {
    if (!selectedStock) return;
    
    const newItem: WatchlistItem = {
      id: Date.now().toString(),
      code: selectedStock.code,
      name: selectedStock.name,
      targetPrice: price,
      note,
      triggered: false
    };

    setWatchlist(prev => [...prev, newItem]);
    pushNotification("已加入清單", `${selectedStock.name} 警示設定於 $${price}`, 'success');
  };

  const handleRemoveWatchlist = (id: string) => {
    setWatchlist(prev => prev.filter(item => item.id !== id));
  };

  // Simulate "Price Hit" Logic
  const simulateMarketMove = () => {
    // Randomly trigger one item in watchlist for demo purposes
    if (watchlist.length === 0) {
      pushNotification("模擬測試", "清單是空的，請先加入警示。", 'info');
      return;
    }

    const updatedWatchlist = watchlist.map(item => {
      if (!item.triggered && Math.random() > 0.5) {
        pushNotification("股價警示!", `${item.name} (${item.code}) 觸及回測地板價 $${item.targetPrice}`, 'alert');
        return { ...item, triggered: true };
      }
      return item;
    });
    setWatchlist(updatedWatchlist);
    
    // Trigger immediate refetch
    refetch();
  };

  const handleStockSelect = (code: string) => {
    setSelectedCode(code);
    // On mobile, auto-switch to chart
    if (window.innerWidth < 1024) {
      setActiveTab('chart');
    }
  };

  const handleAiAnalysis = async () => {
    if (!selectedStock) return;
    setAiStatus(AnalysisStatus.LOADING);
    const result = await analyzeChartPattern(selectedStock.name, selectedStock.data);
    setAiResult(result);
    setAiStatus(AnalysisStatus.SUCCESS);
  };

  const getSentimentLabel = (sentiment: string) => {
    if (sentiment === 'Bullish') return '多頭';
    if (sentiment === 'Bearish') return '空頭';
    return '盤整/中立';
  };

  return (
    <div className="flex flex-col h-screen bg-tw-bg text-slate-200 font-sans overflow-hidden">
      
      {/* Notifications Toast Container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`pointer-events-auto min-w-[300px] p-4 rounded-lg shadow-xl border-l-4 transform transition-all animate-slide-in bg-slate-800 text-white ${
            n.type === 'alert' ? 'border-tw-up' : n.type === 'success' ? 'border-green-500' : 'border-tw-accent'
          }`}>
             <h4 className="font-bold text-sm">{n.title}</h4>
             <p className="text-xs text-slate-300 mt-1">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex-none bg-tw-bg/95 backdrop-blur border-b border-tw-border px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="bg-tw-accent/20 p-2 rounded-lg text-tw-accent hidden sm:block">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide leading-tight">TW-Quant <span className="text-tw-accent text-xs font-normal align-top">PRO</span></h1>
            <p className="text-[10px] text-slate-500 hidden sm:block">台股動能交易儀表板 (Qullamaggie 策略)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Simulation Button for Demo */}
           <button 
            onClick={simulateMarketMove}
            className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-yellow-500 border border-slate-700 px-3 py-1.5 rounded transition-colors"
          >
            <Bell size={14} />
            <span className="hidden sm:inline">模擬警示</span>
          </button>

          <div className="flex items-center gap-2 bg-tw-panel border border-tw-border px-2 py-1 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isRefetching ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {isRefetching ? '更新中...' : '即時報價'}
            </span>
            <button 
              onClick={() => refetch()}
              className="ml-1 text-slate-400 hover:text-white"
            >
              <RefreshCw size={12} className={isRefetching ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Responsive Layout */}
      <div className="flex-1 overflow-hidden relative lg:grid lg:grid-cols-12 lg:gap-6 lg:p-6">
        
        {/* Mobile Tab View Controller */}
        <div className={`lg:col-span-3 h-full flex flex-col ${activeTab === 'market' ? 'block' : 'hidden lg:flex'}`}>
          <div className="bg-tw-panel rounded-lg border border-tw-border flex flex-col h-full overflow-hidden">
             {/* Scanner Header */}
             <div className="p-3 border-b border-tw-border flex justify-between items-center bg-slate-800/50">
               <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
                 <Filter size={16} className="text-tw-accent"/>
                 市場掃描
               </h2>
               <button
                 onClick={() => setFilterEnabled(!filterEnabled)}
                 className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${filterEnabled ? 'bg-tw-accent text-white border-tw-accent' : 'bg-transparent text-slate-500 border-slate-600'}`}
               >
                 {filterEnabled ? '嚴格' : '全部'}
               </button>
             </div>
             
             {/* List */}
             <div className="flex-1 overflow-y-auto">
                {isLoading && stocks.length === 0 ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tw-accent"></div>
                  </div>
                ) : (
                  filteredStocks.map(stock => (
                    <div 
                      key={stock.code}
                      onClick={() => handleStockSelect(stock.code)}
                      className={`p-3 border-b border-slate-700/50 cursor-pointer transition-colors ${
                        selectedCode === stock.code ? 'bg-tw-accent/10 border-l-4 border-l-tw-accent' : 'hover:bg-slate-700/30 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white text-sm">{stock.code} <span className="text-slate-400 font-normal text-xs ml-1">{stock.name}</span></span>
                        <span className={`text-sm font-mono font-bold ${stock.change >= 0 ? 'text-tw-up' : 'text-tw-down'}`}>
                          {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center text-[10px] text-slate-500 mt-2">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded">{stock.industry}</span>
                        <span className="font-mono flex items-center gap-1">
                           <Zap size={10} className="text-yellow-500"/> ADR {stock.ADR_Percent}%
                        </span>
                        <span className="font-mono flex items-center gap-1">
                           <BarChart3 size={10} className="text-purple-500"/> RS {stock.RS_Score}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {!isLoading && filteredStocks.length === 0 && filterEnabled && (
                  <div className="p-4 text-center text-xs text-slate-500">
                    <p>沒有符合嚴格條件的股票。</p>
                    <p className="mt-1">條件: ADR&gt;3.5%, RS&gt;80, Price&gt;85% High</p>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className={`lg:col-span-6 h-full flex flex-col space-y-4 overflow-y-auto pb-20 lg:pb-0 ${activeTab === 'chart' ? 'block p-4' : 'hidden lg:flex'}`}>
           {selectedStock ? (
             <>
               {/* Stock Info Card */}
               <div className="bg-tw-panel p-4 rounded-lg border border-tw-border">
                  <div className="flex justify-between items-start">
                     <div>
                       <h2 className="text-xl font-bold text-white">{selectedStock.name}</h2>
                       <div className="text-3xl font-mono text-tw-accent mt-1">${selectedStock.lastClose.toFixed(2)}</div>
                     </div>
                     <div className="text-right space-y-1">
                        <div className={`inline-block px-2 py-1 rounded text-xs font-bold ${selectedStock.change >= 0 ? 'bg-tw-up/20 text-tw-up' : 'bg-tw-down/20 text-tw-down'}`}>
                           {selectedStock.change >= 0 ? '▲' : '▼'} {Math.abs(selectedStock.change).toFixed(2)} ({Math.abs(selectedStock.changePercent).toFixed(2)}%)
                        </div>
                        <div className="flex gap-1 justify-end flex-wrap">
                           {selectedStock.isAbove200MA && <span className="text-[10px] px-1.5 py-0.5 border border-green-500 text-green-500 rounded">200MA</span>}
                           {selectedStock.isVolAbove5MA && <span className="text-[10px] px-1.5 py-0.5 border border-blue-500 text-blue-500 rounded">爆量</span>}
                           {selectedStock.RS_Score > 80 && <span className="text-[10px] px-1.5 py-0.5 border border-purple-500 text-purple-500 rounded">RS {selectedStock.RS_Score}</span>}
                           {selectedStock.ADR_Percent > 3.5 && <span className="text-[10px] px-1.5 py-0.5 border border-yellow-500 text-yellow-500 rounded">ADR {selectedStock.ADR_Percent}%</span>}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Chart */}
               <div className="flex-none">
                 <StockChart data={selectedStock.data} />
               </div>

               {/* AI Analysis */}
               <div className="bg-tw-panel border border-tw-border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                      <BrainCircuit size={16} className="text-purple-400"/>
                      AI 型態辨識
                    </h3>
                    <button 
                      onClick={handleAiAnalysis}
                      disabled={aiStatus === AnalysisStatus.LOADING}
                      className="text-xs bg-slate-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      {aiStatus === AnalysisStatus.LOADING ? '分析中...' : '開始分析'}
                    </button>
                  </div>
                  
                  {aiResult ? (
                    <div className="text-sm bg-slate-900/50 p-3 rounded border border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                          aiResult.sentiment === 'Bullish' ? 'bg-tw-up text-white' : 
                          aiResult.sentiment === 'Bearish' ? 'bg-tw-down text-white' : 'bg-slate-600'
                        }`}>{getSentimentLabel(aiResult.sentiment)}</span>
                        <span className="text-slate-300 font-medium">{aiResult.pattern}</span>
                        <span className="ml-auto text-purple-400 font-mono text-xs">評分: {aiResult.score}</span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{aiResult.explanation}</p>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-500">
                      執行 AI 分析以偵測盤整 (Coiling) 或回檔 (Pullback) 型態。
                    </div>
                  )}
               </div>
             </>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-500">
               {isLoading ? (
                 <div className="flex flex-col items-center gap-2">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tw-accent"></div>
                   <p className="text-xs">載入市場數據中...</p>
                 </div>
               ) : (
                 <>
                   <TrendingUp size={48} className="opacity-20 mb-4" />
                   <p>請選擇一檔股票以檢視詳情</p>
                 </>
               )}
             </div>
           )}
        </div>

        {/* Right Sidebar: Risk & Watchlist */}
        <div className={`lg:col-span-3 h-full flex flex-col gap-4 overflow-y-auto pb-20 lg:pb-0 ${activeTab === 'plan' ? 'block p-4' : 'hidden lg:flex'}`}>
           
           {/* Risk Calculator */}
           <div className="flex-none">
              {selectedStock ? (
                <RiskCalculator selectedStock={selectedStock} onAddAlert={handleAddToWatchlist} />
              ) : (
                <div className="bg-tw-panel border border-tw-border rounded-lg p-8 text-center text-slate-500 text-sm">
                   請先選擇股票以使用風險計算器
                </div>
              )}
           </div>

           {/* Watchlist */}
           <div className="flex-1 bg-tw-panel border border-tw-border rounded-lg flex flex-col overflow-hidden min-h-[300px]">
              <div className="p-3 border-b border-tw-border bg-slate-800/50 flex items-center justify-between">
                 <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                    <ShieldAlert size={16} className="text-yellow-500" />
                    監控清單 & 警示
                 </h3>
                 <span className="bg-slate-700 text-xs px-2 py-0.5 rounded-full text-slate-300">{watchlist.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                 {watchlist.length === 0 ? (
                   <div className="text-center py-10 text-xs text-slate-500">
                      尚無警示。 <br/> 請從計算器加入。
                   </div>
                 ) : (
                   watchlist.map(item => (
                     <div key={item.id} className={`p-3 rounded border relative group ${
                        item.triggered ? 'bg-red-900/20 border-tw-up' : 'bg-slate-800/50 border-slate-700'
                     }`}>
                        <div className="flex justify-between items-start mb-1">
                           <span className="font-bold text-sm text-white">{item.code}</span>
                           <span className="font-mono text-yellow-500 text-xs">目標價: ${item.targetPrice}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-2 pr-6">
                           {item.note}
                        </div>
                        {item.triggered && (
                           <div className="mt-2 flex items-center gap-1 text-[10px] text-tw-up font-bold animate-pulse">
                              <Bell size={10} /> 觸及回測地板價
                           </div>
                        )}
                        <button 
                          onClick={() => handleRemoveWatchlist(item.id)}
                          className="absolute right-2 top-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           <Trash2 size={14} />
                        </button>
                     </div>
                   ))
                 )}
              </div>
           </div>

        </div>

      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-tw-panel border-t border-tw-border flex justify-around p-2 z-50 pb-safe">
        <button 
          onClick={() => setActiveTab('market')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${activeTab === 'market' ? 'text-tw-accent bg-slate-800' : 'text-slate-500'}`}
        >
          <List size={20} />
          <span className="text-[10px] font-medium">掃描</span>
        </button>
        <button 
          onClick={() => setActiveTab('chart')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${activeTab === 'chart' ? 'text-tw-accent bg-slate-800' : 'text-slate-500'}`}
        >
          <LineChart size={20} />
          <span className="text-[10px] font-medium">圖表</span>
        </button>
        <button 
          onClick={() => setActiveTab('plan')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${activeTab === 'plan' ? 'text-tw-accent bg-slate-800' : 'text-slate-500'}`}
        >
          <ShieldAlert size={20} />
          <span className="text-[10px] font-medium">計畫</span>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;