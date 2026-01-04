import axios from 'axios';
import { StockData, OHLC, StockSymbol } from '../types';

// Helper to calculate SMA
const calculateSMA = (data: number[], window: number): number | null => {
  if (data.length < window) return null;
  const slice = data.slice(data.length - window);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / window;
};

// Advanced Pattern Detection
const detectPatterns = (data: OHLC[]): OHLC[] => {
  let keyLevel = 0;
  if (data.length > 50) {
    keyLevel = Math.max(...data.slice(0, 50).map(d => d.high));
  }

  return data.map((curr, i) => {
    if (i === 0) return curr;
    const prev = data[i - 1];
    
    // 1. Pin Bar (Hammer)
    const range = curr.high - curr.low;
    const body = Math.abs(curr.open - curr.close);
    const upperWick = curr.high - Math.max(curr.open, curr.close);
    const lowerWick = Math.min(curr.open, curr.close) - curr.low;
    
    const isPinBar = range > 0 && 
                     lowerWick > (range * 0.6) && 
                     body < (range * 0.25) &&      
                     upperWick < (range * 0.15);   

    // 2. Bullish Engulfing
    const isEngulfing = prev.close < prev.open && 
                        curr.close > curr.open && 
                        curr.open < prev.close && 
                        curr.close > prev.open;   

    // 3. R/S Flip
    const nearKeyLevel = Math.abs(curr.low - keyLevel) / keyLevel < 0.02; 
    const isRSFlip = nearKeyLevel && (isPinBar || isEngulfing);

    let signalType: 'BUY' | 'SELL' | null = null;
    if (isRSFlip || (isPinBar && nearKeyLevel) || (isEngulfing && nearKeyLevel)) {
        signalType = 'BUY';
    }

    return {
      ...curr,
      isPinBar,
      isEngulfing,
      isRSFlip,
      signalType
    };
  });
};

const TARGET_STOCKS = [
  { code: '2330', name: '台積電', industry: '半導體' },
  { code: '2317', name: '鴻海', industry: '電子代工' },
  { code: '2454', name: '聯發科', industry: 'IC設計' },
  { code: '2603', name: '長榮', industry: '航運' },
  { code: '3231', name: '緯創', industry: 'AI伺服器' },
  { code: '3008', name: '大立光', industry: '光電' },
  { code: '3661', name: '世芯-KY', industry: 'IC設計' },
  { code: '3035', name: '智原', industry: 'IC設計' }
];

interface FinMindData {
  date: string;
  stock_id: string;
  Trading_Volume: number;
  Trading_money: number;
  open: number;
  max: number;
  min: number;
  close: number;
  spread: number;
  Trading_turnover: number;
}

interface FinMindTick {
  date: string;
  stock_id: string;
  deal_price: number;
  deal_trading_volume: number;
}

export const fetchMarketData = async (): Promise<StockData[]> => {
  // Calculate start date: 300 days ago to ensure 200MA can be calculated
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 300);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Get "Today" in Taiwan time for snapshot comparison
  const twNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
  const todayStr = twNow.toISOString().split('T')[0];

  // Parallel Fetching using Promise.all
  const stockPromises = TARGET_STOCKS.map(async (stock) => {
    try {
      // 1. Fetch History (TaiwanStockPrice)
      const response = await axios.get('https://api.finmindtrade.com/api/v4/data', {
        params: {
          dataset: 'TaiwanStockPrice',
          data_id: stock.code,
          start_date: startDateStr,
        }
      });

      if (response.data.msg === 'success' && response.data.data.length > 0) {
        let rawData: FinMindData[] = response.data.data;
        const lastDataPoint = rawData[rawData.length - 1];

        // 2. Real-time Snapshot Logic
        // If the last available data is NOT today, try to fetch real-time ticks
        if (lastDataPoint.date !== todayStr) {
          try {
            const tickResponse = await axios.get('https://api.finmindtrade.com/api/v4/data', {
              params: {
                dataset: 'TaiwanStockTick',
                data_id: stock.code,
                date: todayStr
              }
            });
            
            const ticks: FinMindTick[] = tickResponse.data.data;
            if (ticks && ticks.length > 0) {
              // Construct a Candle from Ticks
              const open = ticks[0].deal_price;
              const close = ticks[ticks.length - 1].deal_price;
              let high = open;
              let low = open;
              let volume = 0;

              // Use reduce for performance on large arrays, or simple loop
              for (let i = 0; i < ticks.length; i++) {
                const p = ticks[i].deal_price;
                if (p > high) high = p;
                if (p < low) low = p;
                volume += ticks[i].deal_trading_volume;
              }

              // Append "Today's" Candle
              rawData.push({
                date: todayStr,
                stock_id: stock.code,
                Trading_Volume: volume,
                Trading_money: 0, // Not needed for chart
                open: open,
                max: high,
                min: low,
                close: close,
                spread: close - lastDataPoint.close,
                Trading_turnover: 0
              });
            }
          } catch (snapshotError) {
            // If snapshot fails (e.g. market closed, no data yet), just use historical data
            // console.warn(`Snapshot failed for ${stock.code}, using EOD data.`);
          }
        }
        
        // 3. Process Data and Calculate Indicators
        const prices: number[] = [];
        const volumes: number[] = [];
        const processedData: OHLC[] = [];

        rawData.forEach((d) => {
          prices.push(d.close);
          volumes.push(d.Trading_Volume);

          const ma5 = calculateSMA(prices, 5);
          const ma10 = calculateSMA(prices, 10);
          const ma20 = calculateSMA(prices, 20);
          const ma50 = calculateSMA(prices, 50);
          const ma200 = calculateSMA(prices, 200);
          const volMa5 = calculateSMA(volumes, 5);

          processedData.push({
            date: d.date,
            open: d.open,
            high: d.max,
            low: d.min,
            close: d.close,
            volume: d.Trading_Volume,
            ma5,
            ma10,
            ma20,
            ma50,
            ma200,
            volMa5
          });
        });

        // 4. Apply Pattern Detection
        const analyzedData = detectPatterns(processedData);

        // Get latest values
        const lastCandle = analyzedData[analyzedData.length - 1];
        const prevCandle = analyzedData.length > 1 ? analyzedData[analyzedData.length - 2] : lastCandle;

        // Calculate Year High based on actual fetched data
        const yearHigh = Math.max(...analyzedData.map(d => d.high));

        // Simulated Metrics (Preserved as requested)
        const ADR_Percent = Number((Math.random() * 4 + 1.5).toFixed(2));
        const RS_Score = Math.floor(Math.random() * 40) + 55;

        return {
          code: stock.code,
          name: stock.name,
          industry: stock.industry,
          data: analyzedData,
          lastClose: lastCandle.close,
          change: lastCandle.close - prevCandle.close,
          changePercent: ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100,
          isAbove200MA: lastCandle.ma200 ? lastCandle.close > lastCandle.ma200 : false,
          isVolAbove5MA: lastCandle.volMa5 ? lastCandle.volume > lastCandle.volMa5 : false,
          ADR_Percent,
          RS_Score,
          yearHigh
        } as StockData;

      } else {
        console.warn(`No data found for ${stock.code}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching data for ${stock.code}:`, error);
      return null;
    }
  });

  // Execute all requests in parallel and filter out failures
  const results = await Promise.all(stockPromises);
  return results.filter((item): item is StockData => item !== null);
};