import React, { useState, useEffect } from 'react';
import { Calculator, AlertTriangle, BellPlus, Target } from 'lucide-react';
import { RiskParams, RiskResult, StockData } from '../types';

interface Props {
  selectedStock: StockData;
  onAddAlert: (price: number, note: string) => void;
}

const RiskCalculator: React.FC<Props> = ({ selectedStock, onAddAlert }) => {
  const [params, setParams] = useState<RiskParams>({
    totalCapital: 1000000, // Default 1M TWD
    riskPercent: 1.0, // 1% risk
    entryPrice: selectedStock.lastClose,
    stopLossPrice: selectedStock.lastClose * 0.95 // Default 5% stop
  });

  const [result, setResult] = useState<RiskResult | null>(null);

  // Update entry price when stock changes, but keep capital settings
  useEffect(() => {
    setParams(prev => ({
      ...prev,
      entryPrice: selectedStock.lastClose,
      stopLossPrice: Number((selectedStock.lastClose * 0.95).toFixed(2))
    }));
  }, [selectedStock]);

  useEffect(() => {
    calculatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const calculatePosition = () => {
    const riskAmount = params.totalCapital * (params.riskPercent / 100);
    const stopGap = params.entryPrice - params.stopLossPrice;
    
    if (stopGap <= 0) {
      setResult(null);
      return;
    }

    const positionSizeShares = Math.floor(riskAmount / stopGap);
    const positionSizeLots = positionSizeShares / 1000;
    const totalCost = positionSizeShares * params.entryPrice;

    setResult({
      riskAmount,
      positionSizeShares,
      positionSizeLots,
      totalCost,
      leverageRequired: totalCost > params.totalCapital
    });
  };

  const handleParamChange = (key: keyof RiskParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-tw-panel border border-tw-border rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-slate-800/50 border-b border-tw-border flex justify-between items-center">
        <div className="flex items-center gap-2 text-tw-accent font-semibold">
          <Calculator size={20} />
          <h2>風險與部位計算</h2>
        </div>
        <div className="text-xs text-slate-500 font-mono">
           {selectedStock.code}
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Capital Section */}
        <div className="grid grid-cols-2 gap-3">
           <div className="col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">總資金 (TWD)</label>
            <input
              type="number"
              value={params.totalCapital}
              onChange={(e) => handleParamChange('totalCapital', Number(e.target.value))}
              className="w-full bg-slate-900 border border-tw-border rounded px-3 py-2 text-white focus:outline-none focus:border-tw-accent transition-colors font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">風險比例 %</label>
            <input
              type="number"
              step="0.1"
              value={params.riskPercent}
              onChange={(e) => handleParamChange('riskPercent', Number(e.target.value))}
              className="w-full bg-slate-900 border border-tw-border rounded px-3 py-2 text-white focus:outline-none focus:border-tw-accent transition-colors font-mono"
            />
          </div>
          <div>
             <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">單筆風險金額</label>
             <div className="w-full bg-slate-800/50 border border-transparent rounded px-3 py-2 text-slate-300 font-mono">
                ${(params.totalCapital * params.riskPercent / 100).toLocaleString()}
             </div>
          </div>
        </div>

        {/* Trade Setup Section */}
        <div className="pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
               <Target size={14} className="text-slate-400" />
               <h3 className="text-xs font-semibold text-slate-300">交易設定</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">進場價格</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.entryPrice}
                  onChange={(e) => handleParamChange('entryPrice', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-tw-border rounded px-3 py-2 text-white focus:outline-none focus:border-tw-accent transition-colors font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">止損價格</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.stopLossPrice}
                  onChange={(e) => handleParamChange('stopLossPrice', Number(e.target.value))}
                  className={`w-full bg-slate-900 border rounded px-3 py-2 text-white focus:outline-none transition-colors font-mono ${
                     params.stopLossPrice >= params.entryPrice ? 'border-red-500 text-red-400' : 'border-tw-border'
                  }`}
                />
              </div>
            </div>
        </div>

        {/* Results Panel */}
        {result ? (
          <div className="bg-slate-900 rounded p-4 border border-slate-700 space-y-3">
             <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 text-xs">建議張數</span>
                <span className="text-tw-accent font-bold text-xl">{result.positionSizeLots.toFixed(2)} <span className="text-sm font-normal text-slate-500">張</span></span>
             </div>
             
             <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs">股數</span>
                <span className="text-white font-mono">{result.positionSizeShares.toLocaleString()}</span>
             </div>
             
             <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs">總成本</span>
                <span className={`font-mono ${result.leverageRequired ? 'text-tw-up' : 'text-slate-300'}`}>
                  ${result.totalCost.toLocaleString()}
                </span>
             </div>

             {result.leverageRequired && (
              <div className="flex items-center gap-2 text-tw-up text-[10px] bg-red-900/10 p-2 rounded">
                <AlertTriangle size={12} />
                <span>資金不足 (需融資)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-500">
             請輸入有效的進場價與止損價 (進場 {'>'} 止損)
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-4 bg-slate-800/30 border-t border-tw-border">
         <button 
           onClick={() => onAddAlert(params.entryPrice, `觸價買進 @ ${params.entryPrice} | 止損: ${params.stopLossPrice}`)}
           className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-md transition-all active:scale-95"
         >
           <BellPlus size={16} />
           <span className="text-sm font-medium">加入監控清單</span>
         </button>
      </div>
    </div>
  );
};

export default RiskCalculator;