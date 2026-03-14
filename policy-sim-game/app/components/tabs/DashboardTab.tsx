import React from "react";
import D3Chart from "../D3Chart";
import { AxisVariable, ElectionCycle, Policy } from "../../utils/types";

// Interface defining all the state and handlers passed down from page.tsx
interface DashboardTabProps {
  setActiveTab: (tab: any) => void;
  currentCycle: ElectionCycle;
  dashboardChartData: any;
  dashboardHistogramData: any;
  ministers: any[];
  setSelectedMinister: (m: any) => void;
  selectedPolicy: Policy | null;
  currentApproval: number;
  currentDeck: Policy[];
  setSelectedPolicy: React.Dispatch<React.SetStateAction<Policy | null>>;
  politicalCapital: number;
  handleApplyPolicy: () => void;
}

export default function DashboardTab(props: DashboardTabProps) {
  const { 
    setActiveTab, currentCycle, dashboardChartData, dashboardHistogramData, 
    ministers, setSelectedMinister, selectedPolicy, currentApproval, 
    currentDeck, setSelectedPolicy, politicalCapital, handleApplyPolicy 
  } = props;

  return (
    <div className="grid grid-cols-12 gap-6 h-full min-h-0 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: Mini Visualisations */}
      {/* These provide a quick glance at the distributions, acting as shortcuts to the main Graphs tab */}
      <div className="col-span-4 flex flex-col gap-6 h-full min-h-0">
        
        {/* 1D Histogram Preview */}
        <div onClick={() => setActiveTab('graphs')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group">
          <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0 group-hover:bg-zinc-100/50 transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-pink-600 transition-colors">Life Satisfaction Distribution</h3>
            <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-lg leading-none">↗</span>
          </div>
          <div className="flex-1 p-2 min-h-0">
            <D3Chart plotType="1D" chartData={dashboardChartData} histogramData={dashboardHistogramData} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.PersonalUtility} />
          </div>
        </div>

        {/* 2D Scatter Preview (Changes based on current election cycle) */}
        <div onClick={() => setActiveTab('graphs')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group">
          <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0 group-hover:bg-zinc-100/50 transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-pink-600 transition-colors">
              {currentCycle === ElectionCycle.Utilitarian ? "Personal Utility Scatter" : "Societal Fairness Scatter"}
            </h3>
            <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-lg leading-none">↗</span>
          </div>
          <div className="flex-1 p-2 min-h-0">
            <D3Chart plotType="2D" chartData={dashboardChartData} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={currentCycle === ElectionCycle.Utilitarian ? AxisVariable.PersonalUtility : AxisVariable.SocietalFairness} />
          </div>
        </div>
      </div>

      {/* MIDDLE COLUMN: Cabinet & Electorate Shortcut */}
      <div className="col-span-4 flex flex-col gap-6 h-full min-h-0">
        
        {/* The Cabinet Overview */}
        <div onClick={() => setActiveTab('ministers')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex-1 flex flex-col cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group min-h-0">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-start shrink-0 group-hover:bg-zinc-100/50 transition-colors">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 group-hover:text-pink-600 transition-colors">The Cabinet</h3>
              <p className="text-xs text-zinc-500 mt-1">Ministerial reaction to selected policy proposal.</p>
            </div>
            <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-xl leading-none mt-1">↗</span>
          </div>
          
          {/* Renders the grid of minister emojis and their status indicators */}
          <div className="p-3 lg:p-4 grid grid-cols-3 grid-rows-2 gap-3 lg:gap-4 flex-1 min-h-0">
            {ministers.map((minister, i) => (
              <div 
                key={i} 
                onClick={(e) => { e.stopPropagation(); setSelectedMinister(minister); }}
                className="flex flex-col items-center justify-between p-2 rounded-lg border border-zinc-100 bg-zinc-50 cursor-pointer hover:bg-zinc-200 hover:border-zinc-300 transition-all active:scale-95 relative group/minister h-full"
              >
                <div className="absolute top-1 left-1.5 opacity-0 group-hover/minister:opacity-100 text-zinc-400 font-black text-xs transition-opacity">⤢</div>

                <h4 className="text-[10px] lg:text-[11px] font-black text-zinc-800 uppercase tracking-widest leading-none mt-1 mb-1 lg:mb-2 text-center">
                  {minister.name}
                </h4>

                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center ${minister.color} border-2 lg:border-4 border-white shadow-md text-2xl lg:text-3xl transition-colors shrink-0`}>
                    {minister.status === 'happy' && '😊'}
                    {minister.status === 'neutral' && '😐'}
                    {minister.status === 'angry' && '😠'}
                </div>

                <div className="h-5 lg:h-6 flex items-center justify-center mt-1 lg:mt-2 shrink-0">
                  {selectedPolicy && Math.abs(minister.policyDelta) > 0.0005 ? (
                    <span className={`text-[10px] lg:text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm ${minister.policyDelta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {minister.policyDelta > 0 ? '↑' : '↓'} {(Math.abs(minister.policyDelta) * 100).toFixed(1)}%
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projected Voter Share Box (Now acts as a button to the Electorate Tab) */}
        <div 
          onClick={() => setActiveTab('electorate')}
          className="bg-zinc-900 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center shrink-0 h-48 relative overflow-hidden cursor-pointer hover:bg-black transition-colors group"
        >
          <div className="absolute top-2 right-3 opacity-0 group-hover:opacity-100 text-zinc-500 text-xl font-bold transition-opacity">↗</div>
          <div className="absolute top-0 left-0 w-full h-1 bg-pink-500" />
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Projected Voter Share</p>
          <p className={`text-6xl font-black tracking-tighter transition-colors duration-500 ${currentApproval >= 60 ? 'text-white' : 'text-red-400'}`}>
            {currentApproval.toFixed(1)}%
          </p>
          <p className="text-sm text-zinc-500 mt-2 text-center px-4">
            Target: 60% of population approves of their <strong className="text-zinc-300">{currentCycle === ElectionCycle.Utilitarian ? 'Personal Utility' : 'Societal Fairness'}</strong> trajectory. <span className="group-hover:text-pink-400 transition-colors">Click to view electorate breakdown.</span>
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: Legislative Agenda (Policy Selection) */}
      <div className="col-span-4 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full min-h-0">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Legislative Agenda</h3>
          <p className="text-xs text-zinc-500 mt-1">Select one of this turn's available policies to enact.</p>
        </div>
        
        {/* Scrollable list of currently drawn policies */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {currentDeck.map((policy) => {
            const isSelected = selectedPolicy?.id === policy.id;
            const isAffordable = politicalCapital >= policy.politicalCost;
            const isAusterity = policy.politicalCost < 0;

            return (
              <button
                key={policy.id}
                onClick={() => setSelectedPolicy(prev => prev?.id === policy.id ? null : policy)}
                className={`relative w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                  isSelected ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/20 shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white'
                } ${!isAffordable && !isSelected ? 'opacity-60 grayscale-[0.5]' : ''}`}
              >
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 rounded-l-xl" />}
                <div className="flex justify-between items-start mb-2 gap-2">
                  <p className={`font-bold text-sm leading-tight ${isSelected ? 'text-pink-900' : 'text-zinc-800'}`}>{policy.policyName}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md shrink-0 border ${
                    isAusterity ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isAffordable || isSelected ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {isAusterity ? '+' : '-'}{Math.abs(policy.politicalCost)}
                  </span>
                </div>
                <p className={`text-xs line-clamp-2 ${isSelected ? 'text-pink-700/80' : 'text-zinc-500'}`}>{policy.description}</p>
              </button>
            );
          })}
        </div>

        {/* Submission Button */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 shrink-0">
          <button 
            onClick={handleApplyPolicy}
            disabled={!selectedPolicy || (selectedPolicy && politicalCapital < selectedPolicy.politicalCost)}
            className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {selectedPolicy && politicalCapital < selectedPolicy.politicalCost ? "Cannot Afford" : "Enact Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}