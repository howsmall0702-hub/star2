import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, Time, LineStyle } from 'lightweight-charts';
import { OHLC } from '../types';

interface Props {
  data: OHLC[];
}

const StockChart: React.FC<Props> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1e293b' }, // Matches bg-tw-panel
        textColor: '#94a3b8', // Slate 400
      },
      grid: {
        vertLines: { color: '#334155' }, // Slate 700
        horzLines: { color: '#334155' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        borderColor: '#334155',
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
    });
    chartRef.current = chart;

    // 2. Add Candlestick Series (K-Line)
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#ef4444', // TW Red for UP
      downColor: '#22c55e', // TW Green for DOWN
      borderVisible: false,
      wickUpColor: '#ef4444',
      wickDownColor: '#22c55e',
    });

    const candleData = data.map((d) => ({
      time: d.date as string, // YYYY-MM-DD
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    // @ts-ignore - Lightweight charts types strictness vs string dates
    candlestickSeries.setData(candleData);

    // 3. Add Volume Series (Histogram)
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set as an overlay
      scaleMargins: {
        top: 0.8, // Push it to the bottom 20%
        bottom: 0,
      },
    });

    const volumeData = data.map((d) => ({
      time: d.date as string,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)', // Transparent Red/Green
    }));
    // @ts-ignore
    volumeSeries.setData(volumeData);

    // 4. Add Moving Averages (LineSeries)

    // 10 EMA (Blue) - Using ma10 from data
    const ma10Series = chart.addLineSeries({
      color: '#3b82f6', // Blue-500
      lineWidth: 2,
      title: '10 MA',
      crosshairMarkerVisible: false,
    });
    const ma10Data = data
      .filter((d) => d.ma10 !== null)
      .map((d) => ({ time: d.date as string, value: d.ma10! }));
    // @ts-ignore
    ma10Series.setData(ma10Data);

    // 20 MA (Orange)
    const ma20Series = chart.addLineSeries({
      color: '#f97316', // Orange-500
      lineWidth: 2,
      title: '20 MA',
      crosshairMarkerVisible: false,
    });
    const ma20Data = data
      .filter((d) => d.ma20 !== null)
      .map((d) => ({ time: d.date as string, value: d.ma20! }));
    // @ts-ignore
    ma20Series.setData(ma20Data);

    // 50 MA (Red)
    const ma50Series = chart.addLineSeries({
      color: '#ef4444', // Red-500 (Solid)
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      title: '50 MA',
      crosshairMarkerVisible: false,
    });
    const ma50Data = data
      .filter((d) => d.ma50 !== null)
      .map((d) => ({ time: d.date as string, value: d.ma50! }));
    // @ts-ignore
    ma50Series.setData(ma50Data);

    // Fit content
    chart.timeScale().fitContent();

    // 5. Handle Resizing
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data]); // Re-create chart if data structure changes completely

  return (
    <div className="relative w-full h-[500px] bg-tw-panel rounded-lg border border-tw-border overflow-hidden">
      {/* Legend Overlay */}
      <div className="absolute top-3 left-3 z-10 flex gap-4 text-xs font-mono pointer-events-none bg-slate-900/50 p-2 rounded backdrop-blur-sm border border-slate-700">
         <span className="flex items-center gap-1 text-blue-400 font-bold">
            <div className="w-2 h-0.5 bg-blue-500"></div> 10 EMA
         </span>
         <span className="flex items-center gap-1 text-orange-400 font-bold">
            <div className="w-2 h-0.5 bg-orange-500"></div> 20 MA
         </span>
         <span className="flex items-center gap-1 text-red-400 font-bold">
            <div className="w-2 h-0.5 bg-red-500"></div> 50 MA
         </span>
      </div>

      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};

export default StockChart;