import { useState, useCallback, useMemo, useEffect } from 'react';
import { Respondent, ElectionCycle, Policy, TurnHistory } from '../utils/types';
import { loadPopulation } from '../utils/dataLoader';
import { WelfareMetrics } from '../utils/WelfareMetrics';
import { PolicyEngine } from '../utils/PolicyEngine';
import { MAOEngine } from '../utils/MAOEngine';
import { availablePolicies } from '../data/policies';
import { FRAMEWORK_RULES } from "../utils/frameworkRules";

const TURNS_PER_CYCLE = 5;
const SAVE_KEY = 'policy-sim-save-v1';

const calculateAverage = (pop: Respondent[]): number => {
  return pop.length > 0 ? pop.reduce((sum, r) => sum + r.currentLS, 0) / pop.length : 0;
};

const generateCycleSchedule = (cycle: ElectionCycle, available: Policy[]): Policy[][] => {
  const schedule: Policy[][] = [];
  let seed = cycle * 12345 + 1; 
  
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  
  let pool = [...available];
  for (let t = 0; t < TURNS_PER_CYCLE; t++) {
    const turnPolicies: Policy[] = [];
    for (let p = 0; p < 8; p++) {
      if (pool.length === 0) pool = [...available];
      const index = Math.floor(pseudoRandom() * pool.length);
      turnPolicies.push(pool[index]);
      pool.splice(index, 1);
    }
    schedule.push(turnPolicies);
  }
  return schedule;
};

const getMetricScore = (pop: Respondent[], cycle: ElectionCycle) => {
  if (pop.length === 0) return 0;
  if (cycle === ElectionCycle.Benthamite) return pop.reduce((s, r) => s + r.currentLS, 0) / pop.length;
  if (cycle === ElectionCycle.Rawlsian) return WelfareMetrics.calculateSocietalFloor(pop);
  
  const allLS = pop.map(p => p.currentLS);
  if (cycle === ElectionCycle.SocietalUtility) return pop.reduce((s, r) => s + WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities), 0) / pop.length;
  return pop.reduce((s, r) => s + WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities), 0) / pop.length;
};

export function useGameEngine(setActiveTab: (tab: any) => void) {
  const [population, setPopulation] = useState<Respondent[]>([]);
  const [initialPopulation, setInitialPopulation] = useState<Respondent[]>([]); 
  const [baselinePopulation, setBaselinePopulation] = useState<Respondent[]>([]);
  
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [pulsePolicy, setPulsePolicy] = useState(false);
  const [isAgendaUnlocked, setIsAgendaUnlocked] = useState(false);
  
  // NEW: Global Y-Axis tracking for minimal-shift hysteresis
  const [yAxisMax, setYAxisMax] = useState(80);
  
  const [currentTurn, setCurrentTurn] = useState(1);
  const [currentCycle, setCurrentCycle] = useState<ElectionCycle>(ElectionCycle.Benthamite);
  const [cycleAttempts, setCycleAttempts] = useState(1);
  const [showElection, setShowElection] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);
  const [showFinalDebrief, setShowFinalDebrief] = useState(false);
  
  const [history, setHistory] = useState<TurnHistory[]>([]);
  const [cycleSchedule, setCycleSchedule] = useState<Policy[][]>([]);
  const [cycleMAO, setCycleMAO] = useState<number>(0);
  const [currentDeck, setCurrentDeck] = useState<Policy[]>([]);
  const [optimalPath, setOptimalPath] = useState<Policy[]>([]); 

  const startCycle = useCallback((cycle: ElectionCycle, pop: Respondent[]) => {
    const schedule = generateCycleSchedule(cycle, availablePolicies);
    setCycleSchedule(schedule);
    
    const maoResult = MAOEngine.calculateMAO(pop, schedule, cycle, getMetricScore);
    setCycleMAO(maoResult.maxScore);
    setOptimalPath(maoResult.optimalPath);
    
    setCurrentDeck(schedule[0]);
    setCurrentTurn(1);
    setCurrentCycle(cycle);
    setIsAgendaUnlocked(false);
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverage: calculateAverage(pop) }]);
    setShowElection(false);
    setSelectedPolicy(null);
  }, []);

  useEffect(() => {
    const savedGame = localStorage.getItem(SAVE_KEY);
    
    if (savedGame) {
      try {
        const parsed = JSON.parse(savedGame);
        setPopulation(parsed.population);
        setInitialPopulation(parsed.initialPopulation);
        setBaselinePopulation(parsed.baselinePopulation || parsed.initialPopulation);
        setCurrentTurn(parsed.currentTurn);
        setCurrentCycle(parsed.currentCycle);
        setCycleAttempts(parsed.cycleAttempts);
        setHistory(parsed.history);
        setCycleSchedule(parsed.cycleSchedule);
        setCycleMAO(parsed.cycleMAO);
        setCurrentDeck(parsed.currentDeck);
        setOptimalPath(parsed.optimalPath);
        return; 
      } catch (e) {
        console.error("Failed to load save file, starting fresh.", e);
        localStorage.removeItem(SAVE_KEY);
      }
    }
    
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    setBaselinePopulation(data);
    startCycle(ElectionCycle.Benthamite, data);
    setCycleAttempts(1);
  }, [startCycle]);

  useEffect(() => {
    if (population.length === 0 || cycleSchedule.length === 0) return;
      
    const saveData = {
      population, initialPopulation, baselinePopulation,
      currentTurn, currentCycle, cycleAttempts, history,
      cycleSchedule, cycleMAO, currentDeck, optimalPath
    };
    
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  }, [population, currentTurn, currentCycle]);

  const previewPopulation = useMemo(() => {
    if (!selectedPolicy) return population;
    return PolicyEngine.applyPolicy(population, selectedPolicy);
  }, [population, selectedPolicy]);

  const generateHistogramData = useCallback((targetPopulation: Respondent[]) => {
    return Array.from({ length: 11 }, (_, i) => {
      const peopleInBar = targetPopulation.filter(r => Math.round(r.currentLS) === i);
      return {
        name: i, 
        count: peopleInBar.length
      };
    });
  }, []);

  const currentHistogramData = useMemo(() => generateHistogramData(population), [population, generateHistogramData]);
  const previewHistogramData = useMemo(() => generateHistogramData(previewPopulation), [previewPopulation, generateHistogramData]);

  // Hysteresis loop effect to calculate yAxisMax
  useEffect(() => {
    const maxCurrent = Math.max(...currentHistogramData.map(d => d.count), 0);
    const maxPreview = Math.max(...previewHistogramData.map(d => d.count), 0);
    const globalMax = Math.max(maxCurrent, maxPreview);

    setYAxisMax(prev => {
      if (globalMax > prev) {
        // Step up in intervals of 40 if exceeded
        return Math.ceil(globalMax / 40) * 40;
      } else {
        // Calculate the absolute tightest interval we could use (minimum 80)
        const tightestTier = Math.max(80, Math.ceil(globalMax / 40) * 40);
        
        // Only step down if the data drops safely below the tightest tier's boundary minus a 5-unit buffer
        if (prev > tightestTier && globalMax < tightestTier - 5) {
          return tightestTier;
        }
      }
      return prev; // Maintain current height
    });
  }, [currentHistogramData, previewHistogramData]);

  const initialMetricScore = useMemo(() => getMetricScore(initialPopulation, currentCycle), [initialPopulation, currentCycle]);
  const turnMetricScore = useMemo(() => getMetricScore(population, currentCycle), [population, currentCycle]);
  const currentMetricScore = useMemo(() => getMetricScore(previewPopulation, currentCycle), [previewPopulation, currentCycle]);
  
  const turnApprovalRating = useMemo(() => WelfareMetrics.calculateApprovalRating(turnMetricScore, cycleMAO, FRAMEWORK_RULES[currentCycle].winThresholdScalar), [turnMetricScore, cycleMAO, currentCycle]);

  const handleNavigateToPolicy = useCallback(() => {
    setActiveTab('dashboard');
    setPulsePolicy(true);
    setTimeout(() => setPulsePolicy(false), 1500);
  }, [setActiveTab]);

  const handleApplyPolicy = () => {
    if (!selectedPolicy) return;
    
    setPopulation(previewPopulation);
    setHistory(prev => [...prev, {
      turn: currentTurn + 1,
      enactedPolicyId: selectedPolicy.id,
      enactedPolicyName: selectedPolicy.policyName,
      lsAverage: calculateAverage(previewPopulation)
    }]);
    
    const updatedSchedule = cycleSchedule.map((deck, idx) => 
      idx >= currentTurn ? deck.filter(p => p.id !== selectedPolicy.id) : deck
    );
    setCycleSchedule(updatedSchedule);
    
    if (currentTurn < TURNS_PER_CYCLE) {
      setCurrentDeck(updatedSchedule[currentTurn]); 
      setCurrentTurn(prev => prev + 1);
    } else {
      setShowElection(true);
    }
    
    setSelectedPolicy(null);
  };

  const handleResetCycle = () => {
    localStorage.removeItem(SAVE_KEY); 
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    startCycle(currentCycle, data);
    setCycleAttempts(prev => prev + 1);
  };

  const jumpToCycle = (cycle: ElectionCycle) => {
    localStorage.removeItem(SAVE_KEY); 
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    startCycle(cycle, data);
    setCycleAttempts(1);
  };

  const handleProceedFromNarrative = () => {
    if (currentCycle === ElectionCycle.SocietalUtility) {
      setShowNarrative(false);
      setShowFinalDebrief(true);
      return;
    }
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    let nextCycle = ElectionCycle.Rawlsian;
    if (currentCycle === ElectionCycle.Benthamite) nextCycle = ElectionCycle.Rawlsian;
    else if (currentCycle === ElectionCycle.Rawlsian) nextCycle = ElectionCycle.PersonalUtility;
    else if (currentCycle === ElectionCycle.PersonalUtility) nextCycle = ElectionCycle.SocietalUtility;
    
    startCycle(nextCycle, data);
    setCycleAttempts(1);
    setShowNarrative(false);
  };

  const currentChartData = useMemo(() => {
    if (population.length === 0) return [];
    const allLS = population.map(p => p.currentLS);
    return population.map(r => {
      let yVal = r.currentLS; 
      if (currentCycle === ElectionCycle.SocietalUtility) yVal = WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
      else if (currentCycle === ElectionCycle.PersonalUtility) yVal = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
      return { id: r.id, x: r.currentLS, y: yVal };
    });
  }, [population, currentCycle]);

  const previewChartData = useMemo(() => {
    if (previewPopulation.length === 0) return [];
    const allLS = previewPopulation.map(p => p.currentLS);
    return previewPopulation.map(r => {
      let yVal = r.currentLS; 
      if (currentCycle === ElectionCycle.SocietalUtility) yVal = WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
      else if (currentCycle === ElectionCycle.PersonalUtility) yVal = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
      return { id: r.id, x: r.currentLS, y: yVal };
    });
  }, [previewPopulation, currentCycle]);

  return {
    population, initialPopulation, baselinePopulation, previewPopulation,
    currentTurn, currentCycle, cycleAttempts,
    selectedPolicy, setSelectedPolicy, pulsePolicy,
    showElection, setShowElection, showNarrative, setShowNarrative, showFinalDebrief, setShowFinalDebrief,
    history, currentDeck, cycleMAO, optimalPath,
    turnMetricScore, initialMetricScore, currentMetricScore, turnApprovalRating,
    currentChartData, previewChartData, currentHistogramData, previewHistogramData,
    handleApplyPolicy, handleResetCycle, jumpToCycle, handleProceedFromNarrative, setCurrentTurn, handleNavigateToPolicy,
    isAgendaUnlocked, setIsAgendaUnlocked, yAxisMax,
    TURNS_PER_CYCLE
  };
}