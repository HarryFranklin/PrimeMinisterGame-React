'use client';

import React from 'react';
import D3Chart from '@/components/D3Chart';
import { AxisVariable } from '@/utils/types';
import { StudyGate, type RenderChart } from '@study';

// Build commit (set by Cloudflare Pages via next.config.ts), saved with every sync.
const APP_VERSION = (process.env.NEXT_PUBLIC_CF_PAGES_COMMIT_SHA ?? 'dev').slice(0, 8);

// Question charts in the study screens – the same faces chart as the game.
const renderChart: RenderChart = ({ counts, yMax }) => (
  <D3Chart
    plotType="1D"
    chartData={[]}
    histogramData={counts.map((count, name) => ({ name, count }))}
    xAxisType={AxisVariable.LifeSatisfaction}
    yAxisType={AxisVariable.LifeSatisfaction}
    color="#818cf8"
    visualStyle="faces"
    faceCols={1}
    yAxisMax={yMax}
    theme="dark"
  />
);

/** Information sheet → consent → baseline questions, then the wiki
 * (children), then the post-test and thank-you screen. */
export default function WikiStudyGate({ children }: { children: React.ReactNode }) {
  return (
    <StudyGate condition="wiki" accent="indigo" appVersion={APP_VERSION} renderChart={renderChart}>
      {children}
    </StudyGate>
  );
}
