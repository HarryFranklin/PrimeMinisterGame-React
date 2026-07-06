import { useState, useCallback, useMemo, useEffect } from 'react';
import { Respondent, ElectionCycle, Policy, TurnHistory, GamePhase, TurnLedger } from '../utils/types';
import { loadPopulation, getONSBaselineLS } from '../utils/dataLoader';
import { WelfareMetrics } from '../utils/WelfareMetrics';
import { PolicyEngine } from '../utils/PolicyEngine';
import { MAOEngine } from '../utils/MAOEngine';
import { availablePolicies } from '../data/policies';
import { FRAMEWORK_RULES } from "../utils/frameworkRules";
import { MetricsEngine } from '../utils/MetricsEngine';
import { useSaveGame } from './useSaveGame';

const TURNS_PER_CYCLE = 5;

const calculateAverage = (pop: Respondent[]): number => {
  return pop.length > 0 ? pop.reduce((sum, r) => sum + r.currentLS, 0) / pop.length : 0;
};

// Helper function to append the current metrics of all citizens into their ledgers
const recordTurnState = (pop: Respondent[], cycle: ElectionCycle, turn: number, policyId: string | null, policyName: string | null): Respondent[] => {
  const allLS = pop.map(p => p.currentLS);
  const multipliers = WelfareMetrics.getPopulationCurveMultipliers(allLS);

  return pop.map(p => {
    const pu = WelfareMetrics.getCycleUtility(p, ElectionCycle.PersonalUtility, pop.length, allLS, multipliers);
    const su = WelfareMetrics.getCycleUtility(p, ElectionCycle.SocietalUtility, pop.length, allLS, multipliers);
    
    const record: TurnLedger = { turn, policyId, policyName, ls: p.currentLS, personalUtility: pu, societalUtility: su };
    
    const newLedger = [...p.historicalLedger];
    const cycleIndex = newLedger.findIndex(l => l.cycle === cycle);
    
    if (cycleIndex >= 0) {
      newLedger[cycleIndex] = { ...newLedger[cycleIndex], turns: [...newLedger[cycleIndex].turns, record] };
    } else {
      newLedger.push({ cycle, turns: [record] });
    }
    
    return { ...p, historicalLedger: newLedger };
  });
};

export function useGameEngine(setActiveTab?: (tab: any) => void) {
  const [population, setPopulation] = useState<Respondent[]>([]);
  const [initialPopulation, setInitialPopulation] = useState<Respondent[]>([]);
  const [baselinePopulation, setBaselinePopulation] = useState<Respondent[]>([]);

  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [pulsePolicy, setPulsePolicy] = useState(false);
  const [yAxisMax, setYAxisMax] = useState(100);

  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.Welcome);
  const isAgendaUnlocked = gamePhase === GamePhase.Playing;

  const [currentTurn, setCurrentTurn] = useState(1);
  const [currentCycle, setCurrentCycle] = useState<ElectionCycle>(ElectionCycle.Benthamite);
  const [cycleAttempts, setCycleAttempts] = useState(1);
  
  const [isEnacting, setIsEnacting] = useState(false);
  const [isParliamentDissolved, setIsParliamentDissolved] = useState(false);
  
  const [history, setHistory] = useState<TurnHistory[]>([]);
  const [cycleSchedule, setCycleSchedule] = useState<Policy[][]>([]);
  const [cycleMAO, setCycleMAO] = useState<number>(0);
  const [currentDeck, setCurrentDeck] = useState<Policy[]>([]);
  const [optimalPath, setOptimalPath] = useState<Policy[]>([]);

  const [dpmConsulted, setDpmConsultedState] = useState<Record<string, boolean>>({});

  const setDpmConsulted = useCallback((id: string, value: boolean) => {
    setDpmConsultedState(prev => ({ ...prev, [id]: value }));
  }, []);

  const resetDpmConsulted = useCallback(() => {
    setDpmConsultedState({});
  }, []);

  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     availablePolicies.forEach(policy => {
  //       policy.specificRules.forEach(rule => {
  //         if (!rule.affectEveryone && rule.impact >= 1.5 && rule.maxLS === undefined) {
  //           console.warn(
  //             `[Policy Design Risk] "${policy.policyName}" has a high impact (+${rule.impact}) ` +
  //             `but no maxLS ceiling. High-satisfaction citizens may absorb and waste this impact.`
  //           );
  //         }
  //       });
  //     });
  //   }
  // }, []);

  const startCycle = useCallback((cycle: ElectionCycle, basePop: Respondent[]) => {
    let popToRecord = basePop.map(p => {
      const cleanLedger = (p.historicalLedger || []).filter(l => l.cycle !== cycle);
      return { ...p, historicalLedger: cleanLedger };
    });
    
    popToRecord = recordTurnState(popToRecord, cycle, 1, null, 'Took Office');

    const schedule = MetricsEngine.generateCycleSchedule(cycle, availablePolicies, TURNS_PER_CYCLE);
    setCycleSchedule(schedule);

    const maoResult = MAOEngine.calculateMAO(popToRecord, schedule, cycle, MetricsEngine.getMetricScore);
    setCycleMAO(maoResult.maxScore);
    setOptimalPath(maoResult.optimalPath);

    setCurrentDeck(schedule[0]);
    setCurrentTurn(1);
    setCurrentCycle(cycle);
    setIsParliamentDissolved(false);
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverage: calculateAverage(popToRecord) }]);
    setSelectedPolicy(null);
    setYAxisMax(100);
    resetDpmConsulted();
    
    setPopulation(popToRecord);
    setInitialPopulation(popToRecord);
    setGamePhase(GamePhase.Briefing); 
  }, [resetDpmConsulted]);

  const handleSaveLoad = useCallback((parsed: any) => {
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
    setIsParliamentDissolved(parsed.isParliamentDissolved || false);
    setGamePhase(parsed.gamePhase || GamePhase.Playing);
  }, []);

  const handleSaveError = useCallback(() => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    setBaselinePopulation(data);
    startCycle(ElectionCycle.Benthamite, data);
    setCycleAttempts(1);
    
    setGamePhase(GamePhase.Welcome); 
  }, [startCycle]);

  const gameStateSnapshot = useMemo(() => ({
      population, initialPopulation, baselinePopulation,
      currentTurn, currentCycle, cycleAttempts, history,
      cycleSchedule, cycleMAO, currentDeck, optimalPath,
      isParliamentDissolved, gamePhase
  }), [population, initialPopulation, baselinePopulation, currentTurn, currentCycle, cycleAttempts, history, cycleSchedule, cycleMAO, currentDeck, optimalPath, isParliamentDissolved, gamePhase]);

  const { wipeSave } = useSaveGame(gameStateSnapshot, handleSaveLoad, handleSaveError);

  const previewPopulation = useMemo(() => {
    if (!selectedPolicy) return population;
    return PolicyEngine.applyPolicy(population, selectedPolicy);
  }, [population, selectedPolicy]);

  const generateHistogramData = useCallback((targetPopulation: Respondent[]) => {
    return Array.from({ length: 11 }, (_, i) => {
      const peopleInBar = targetPopulation.filter(r => Math.round(r.currentLS) === i);
      return { name: i, count: peopleInBar.length };
    });
  }, []);

  const currentHistogramData = useMemo(() => generateHistogramData(population), [population, generateHistogramData]);
  const previewHistogramData = useMemo(() => generateHistogramData(previewPopulation), [previewPopulation, generateHistogramData]);

  useEffect(() => {
    const maxCurrent = Math.max(...currentHistogramData.map(d => d.count), 0);
    setYAxisMax(prev => {
      const targetMax = Math.max(100, Math.ceil(maxCurrent / 20) * 20);
      if (targetMax > prev) {
        return targetMax;
      }
      return prev;
    });
  }, [currentHistogramData]);

  const initialMetricScore = useMemo(() => MetricsEngine.getMetricScore(initialPopulation, currentCycle), [initialPopulation, currentCycle]);
  const turnMetricScore = useMemo(() => MetricsEngine.getMetricScore(population, currentCycle), [population, currentCycle]);
  const currentMetricScore = useMemo(() => MetricsEngine.getMetricScore(previewPopulation, currentCycle), [previewPopulation, currentCycle]);

  const turnApprovalRating = useMemo(() => WelfareMetrics.calculateApprovalRating(turnMetricScore, cycleMAO, FRAMEWORK_RULES[currentCycle].winThresholdScalar), [turnMetricScore, cycleMAO, currentCycle]);

  const handleNavigateToPolicy = useCallback(() => {
    if (setActiveTab) setActiveTab('legislative');
    setPulsePolicy(true);
    setTimeout(() => setPulsePolicy(false), 1500);
  }, [setActiveTab]);

  const handleApplyPolicy = () => {
    if (!selectedPolicy || isEnacting) return;
    setIsEnacting(true);

    setTimeout(() => {
      const nextPop = recordTurnState(previewPopulation, currentCycle, currentTurn + 1, selectedPolicy.id, selectedPolicy.policyName);
      setPopulation(nextPop);
      
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
        setIsParliamentDissolved(true);
      }

      setSelectedPolicy(null);
      setIsEnacting(false);
    }, 800);
  };

  const handleFaceElectorate = useCallback(() => {
    setGamePhase(GamePhase.Election);
  }, []);

  const handleResetCycle = useCallback(() => {
    wipeSave();
    const nextPop = population.map(p => ({
      ...p,
      currentLS: getONSBaselineLS(p.id)
    }));
    startCycle(currentCycle, nextPop);
    setCycleAttempts(prev => prev + 1);
    resetDpmConsulted();
  }, [population, currentCycle, resetDpmConsulted, wipeSave, startCycle]);

  const jumpToCycle = (cycle: ElectionCycle) => {
    wipeSave();
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    startCycle(cycle, data);
    setCycleAttempts(1);
  };

  const handleProceedFromNarrative = () => {
    if (currentCycle === ElectionCycle.PersonalUtility) {
      setGamePhase(GamePhase.Debrief);
      return;
    }

    const nextCycle = currentCycle + 1;

    // Revert LS to ONS Baseline, but preserve the ledger from the completed cycle
    const nextPop = population.map(p => ({
      ...p,
      currentLS: getONSBaselineLS(p.id)
    }));
    
    startCycle(nextCycle, nextPop);
    setCycleAttempts(1);
  };

  const currentChartData = useMemo(() => {
    if (population.length === 0) return [];
    const allLS = population.map(p => p.currentLS);
    const multipliers = currentCycle === ElectionCycle.SocietalUtility ? WelfareMetrics.getPopulationCurveMultipliers(allLS) : null;
    
    return population.map(r => {
      const yVal = WelfareMetrics.getCycleUtility(r, currentCycle, population.length, allLS, multipliers);
      return { id: r.id, x: r.currentLS, y: yVal };
    });
  }, [population, currentCycle]);

  const previewChartData = useMemo(() => {
    if (previewPopulation.length === 0) return [];
    const allLS = previewPopulation.map(p => p.currentLS);
    const multipliers = currentCycle === ElectionCycle.SocietalUtility ? WelfareMetrics.getPopulationCurveMultipliers(allLS) : null;
    
    return previewPopulation.map(r => {
      const yVal = WelfareMetrics.getCycleUtility(r, currentCycle, previewPopulation.length, allLS, multipliers);
      return { id: r.id, x: r.currentLS, y: yVal };
    });
  }, [previewPopulation, currentCycle]);

  return {
    population, initialPopulation, baselinePopulation, previewPopulation,
    currentTurn, currentCycle, cycleAttempts,
    selectedPolicy, setSelectedPolicy, pulsePolicy, isEnacting,
    isParliamentDissolved, handleFaceElectorate,
    history, currentDeck, cycleMAO, optimalPath,
    turnMetricScore, initialMetricScore, currentMetricScore, turnApprovalRating,
    currentChartData, previewChartData, currentHistogramData, previewHistogramData,
    handleApplyPolicy, handleResetCycle, jumpToCycle, handleProceedFromNarrative, setCurrentTurn, handleNavigateToPolicy,
    gamePhase, setGamePhase, isAgendaUnlocked, yAxisMax,
    TURNS_PER_CYCLE,
    dpmConsulted, setDpmConsulted, resetDpmConsulted,
    wipeSave
  };
}