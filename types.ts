export interface OHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  volMa5: number | null;
  // Signal Fields
  isPinBar?: boolean;
  isEngulfing?: boolean;
  isRSFlip?: boolean; // Resistance turned Support
  signalType?: 'BUY' | 'SELL' | null;
}

export interface StockSymbol {
  code: string;
  name: string;
  industry: string;
}

export interface StockData extends StockSymbol {
  data: OHLC[];
  lastClose: number;
  change: number;
  changePercent: number;
  isAbove200MA: boolean;
  isVolAbove5MA: boolean;
  // New Momentum Metrics
  ADR_Percent: number; // Average Daily Range %
  RS_Score: number;    // Relative Strength 0-99
  yearHigh: number;    // 52-week High (simulated)
}

export interface RiskParams {
  totalCapital: number;
  riskPercent: number;
  entryPrice: number;
  stopLossPrice: number;
}

export interface RiskResult {
  riskAmount: number;
  positionSizeShares: number;
  positionSizeLots: number; // For Taiwan (1000 shares)
  totalCost: number;
  leverageRequired: boolean;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface AIAnalysisResult {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  pattern: string;
  explanation: string;
  score: number; // 0-100 quality of setup
}

export interface WatchlistItem {
  id: string;
  code: string;
  name: string;
  targetPrice: number; // The "Retest Floor" price
  note: string;
  triggered: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert';
}