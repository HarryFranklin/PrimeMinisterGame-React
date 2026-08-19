import { useState, useCallback, useMemo, useEffect } from 'react';
import { Respondent, ElectionCycle, Policy, TurnHistory, GamePhase, TurnLedger, CompletedRun, CycleLedger } from '../utils/types';
import { loadPopulation, getONSBaselineLS } from '../utils/dataLoader';
import { WelfareMetrics } from '../utils/WelfareMetrics';
import { PolicyEngine } from '../utils/PolicyEngine';
import { MAOEngine } from '../utils/MAOEngine';
import { availablePolicies } from '../data/policies';
import { MetricsEngine } from '../utils/MetricsEngine';
import { useSaveGame } from './useSaveGame';
import { DifficultyEngine } from '../utils/DifficultyEngine'; 
import { track, setParticipantData, setContext, startLevelAttempt, startTimer, stopTimer } from '../client/telemetry';

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
  const [hasSeenUtilityIntervention, setHasSeenUtilityIntervention] = useState(false);
  const [pendingDebriefAction, setPendingDebriefAction] = useState<{ type: 'restart' | 'complete'; outcome: 'win' | 'lose' } | null>(null);

  const [participantId, setParticipantId] = useState<string>('');
  const [difficultySeed, setDifficultySeed] = useState<number>(0);
  const [winScalars, setWinScalars] = useState<Record<ElectionCycle, number>>({} as any);
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.Setup);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const isAgendaUnlocked = gamePhase === GamePhase.Playing;
  
  const [currentTurn, setCurrentTurn] = useState(1);
  const [currentCycle, setCurrentCycle] = useState<ElectionCycle>(ElectionCycle.Benthamite);
  const [cycleAttempts, setCycleAttempts] = useState(1);
  const [isEnacting, setIsEnacting] = useState(false);
  const [lastTurnSummary, setLastTurnSummary] = useState<{ policyName: string; scoreBefore: number; scoreAfter: number; turn: number } | null>(null);
  const [pressConferenceModifier, setPressConferenceModifier] = useState(0);
  const [isParliamentDissolved, setIsParliamentDissolved] = useState(false);
  const [history, setHistory] = useState<TurnHistory[]>([]);
  const [cycleSchedule, setCycleSchedule] = useState<Policy[][]>([]);
  const [cycleMAO, setCycleMAO] = useState<number>(0);
  const [currentDeck, setCurrentDeck] = useState<Policy[]>([]);
  const [optimalPath, setOptimalPath] = useState<Policy[]>([]);
  
  const [completedRuns, setCompletedRuns] = useState<CompletedRun[]>([]);
  const [dpmConsulted, setDpmConsultedState] = useState<Record<string, boolean>>({});

  const setDpmConsulted = useCallback((id: string, value: boolean) => {
    setDpmConsultedState(prev => ({ ...prev, [id]: value }));
  }, []);

  const resetDpmConsulted = useCallback(() => {
    setDpmConsultedState({});
  }, []);

  const startCycle = useCallback((cycle: ElectionCycle) => {
    let freshPop: Respondent[] = loadPopulation().map(p => ({
      ...p,
      currentLS: getONSBaselineLS(p.id),
      historicalLedger: [] as CycleLedger[]
    }));
    
    freshPop = recordTurnState(freshPop, cycle, 1, null, 'Took Office');

    const schedule = MetricsEngine.generateCycleSchedule(cycle, availablePolicies, TURNS_PER_CYCLE, difficultySeed);
    setCycleSchedule(schedule);

    const maoResult = MAOEngine.calculateMAO(freshPop, schedule, cycle, MetricsEngine.getMetricScore);
    setCycleMAO(maoResult.maxScore);
    setOptimalPath(maoResult.optimalPath);

    const levelId = ElectionCycle[cycle];
    startLevelAttempt(levelId); 
    setContext({ levelId, turn: 1 });
    setCurrentDeck(schedule[0]);
    setCurrentTurn(1);
    setCurrentCycle(cycle);
    setIsParliamentDissolved(false);
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverage: calculateAverage(freshPop) }]);
    setSelectedPolicy(null);
    setYAxisMax(100);
    setLastTurnSummary(null);
    setPressConferenceModifier(0);
    resetDpmConsulted();
    
    setPopulation(freshPop);
    setInitialPopulation(freshPop);
    setBaselinePopulation(freshPop);
    
    setGamePhase(GamePhase.Briefing);
  }, [resetDpmConsulted, difficultySeed]);

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
    if (!parsed.winScalars || Object.keys(parsed.winScalars).length === 0) {
      setGamePhase(GamePhase.Setup);
    } else {
      setGamePhase(parsed.gamePhase || GamePhase.Intro);
    }
    setCompletedRuns(parsed.completedRuns || []);
    setHasSeenUtilityIntervention(parsed.hasSeenUtilityIntervention || false);
    setParticipantId(parsed.participantId || '');
    setDifficultySeed(parsed.difficultySeed || 0);
    setWinScalars(parsed.winScalars || {});
}, []);

  const handleSaveError = useCallback(() => {
    setGamePhase(GamePhase.Setup); 
  }, []);

  const handleSetupComplete = async (id: string) => {
    setParticipantId(id);
    setIsCalculating(true);

    await new Promise(resolve => setTimeout(resolve, 50));

    const numericSeed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    setDifficultySeed(numericSeed);

    const initialPop = loadPopulation();
    const scalars = DifficultyEngine.calculateDynamicScalars(numericSeed, initialPop, 500);
    setWinScalars(scalars);

    // 1. Lock the data into global telemetry state
    setParticipantData(id, numericSeed, scalars);

    // 2. Track the submission (this instantly fires the networkSink /participant update!)
    track("setup_submitted", { 
      prolific_pid: id,
      difficulty_seed: numericSeed, 
      win_threshold_scalars: scalars 
    });

    setIsCalculating(false);
    setGamePhase(GamePhase.Intro);
  };

  const gameStateSnapshot = useMemo(() => ({
    population, initialPopulation, baselinePopulation,
    currentTurn, currentCycle, cycleAttempts, history,
    cycleSchedule, cycleMAO, currentDeck, optimalPath,
    isParliamentDissolved, gamePhase, completedRuns, hasSeenUtilityIntervention,
    participantId, difficultySeed, winScalars
  }), [population, initialPopulation, baselinePopulation, currentTurn, currentCycle, 
    cycleAttempts, history, cycleSchedule, cycleMAO, currentDeck, optimalPath, isParliamentDissolved, 
    gamePhase, completedRuns, hasSeenUtilityIntervention, participantId, difficultySeed, winScalars]);

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
  
  const turnApprovalRating = useMemo(() => {
    const base = WelfareMetrics.calculateApprovalRating(turnMetricScore, cycleMAO, winScalars[currentCycle]);
    return Math.max(0, Math.min(100, base + pressConferenceModifier));
  }, [turnMetricScore, cycleMAO, currentCycle, pressConferenceModifier]);

  const applyPressConferenceDelta = useCallback((delta: number) => {
    setPressConferenceModifier(prev => prev + delta);
  }, []);

  const handleNavigateToPolicy = useCallback(() => {
    if (setActiveTab) setActiveTab('legislative');
    setPulsePolicy(true);
    setTimeout(() => setPulsePolicy(false), 1500);
  }, [setActiveTab]);

  const handleApplyPolicy = () => {
    if (!selectedPolicy || isEnacting) return;

    const timeOnTurnMs = stopTimer('turn_active');

    const enactedTurn = currentTurn;
    const enactedPolicy = selectedPolicy;
    const levelId = ElectionCycle[currentCycle];
    const nextPop = recordTurnState(previewPopulation, currentCycle, enactedTurn + 1, enactedPolicy.id, enactedPolicy.policyName);
    const scoreBefore = MetricsEngine.getMetricScore(population, currentCycle);
    const scoreAfter = MetricsEngine.getMetricScore(nextPop, currentCycle);
    const populationBefore = calculateAverage(population);
    const populationAfter = calculateAverage(nextPop);

    track("policy_selected", {
      turn: enactedTurn,
      level_id: levelId,
      policy_id: enactedPolicy.id,
      options_available: currentDeck.map(p => p.id),
      score_before: scoreBefore,
      score_after: scoreAfter,
      population_before: populationBefore,
      population_after: populationAfter,
    });
    track("turn_completed", {
      turn: enactedTurn,
      level_id: levelId,
      score: scoreAfter,
      population: populationAfter,
      time_on_turn_ms: timeOnTurnMs,
    });

    setIsEnacting(true);

    setTimeout(() => {
      setLastTurnSummary({ policyName: enactedPolicy.policyName, scoreBefore, scoreAfter, turn: enactedTurn });
      setPopulation(nextPop);

      setHistory(prev => [...prev, {
        turn: enactedTurn + 1,
        enactedPolicyId: enactedPolicy.id,
        enactedPolicyName: enactedPolicy.policyName,
        lsAverage: calculateAverage(previewPopulation)
      }]);

      const updatedSchedule = cycleSchedule.map((deck, idx) =>
        idx >= enactedTurn ? deck.filter(p => p.id !== enactedPolicy.id) : deck
      );
      setCycleSchedule(updatedSchedule);

      if (enactedTurn < TURNS_PER_CYCLE) {
        const nextTurn = enactedTurn + 1;
        setCurrentDeck(updatedSchedule[enactedTurn]);
        setCurrentTurn(nextTurn);
        setContext({ turn: nextTurn });
        track("turn_started", { turn: nextTurn, level_id: levelId, score: scoreAfter, population: populationAfter });
        track("policy_options_presented", { turn: nextTurn, level_id: levelId, options: updatedSchedule[enactedTurn].map(p => p.id) });
        startTimer('turn_active');
      } else {
        setIsParliamentDissolved(true);
      }

      setSelectedPolicy(null);
      setIsEnacting(false);
    }, 800);
  };

  const handleBriefingAcknowledged = useCallback(() => {
    const levelId = ElectionCycle[currentCycle];
    setContext({ levelId, turn: 1 });
    track("turn_started", {
      turn: 1,
      level_id: levelId,
      score: MetricsEngine.getMetricScore(population, currentCycle),
      population: calculateAverage(population),
    });
    track("policy_options_presented", {
      turn: 1,
      level_id: levelId,
      options: currentDeck.map(p => p.id),
    });
    startTimer('turn_active');
    setGamePhase(GamePhase.Playing);
  }, [currentCycle, population, currentDeck]);

  const handleFaceElectorate = useCallback(() => {
    setLastTurnSummary(null);
    setGamePhase(GamePhase.Election);
  }, []);

  const handleResetCycle = useCallback((outcome: "win" | "lose" = "lose") => {
    // Determine the exact outcome. If they ran out of retries (>=3), it's a final loss.
    const cycleOutcome = outcome === 'win' ? 'won' : (cycleAttempts >= 3 ? 'lost_final' : 'lost_retry');
    
    // Fire the cycle_ended telemetry ONLY once the cycle is truly concluded
    track("cycle_ended", { 
      cycle: ElectionCycle[currentCycle], 
      outcome: cycleOutcome 
    });

    track("level_attempt_ended", {
      level_id: ElectionCycle[currentCycle],
      attempt_number: cycleAttempts,
      outcome,
      turns_taken: currentTurn,
    });
    wipeSave();
    startCycle(currentCycle);
    setCycleAttempts(prev => prev + 1);
  }, [currentCycle, currentTurn, cycleAttempts, wipeSave, startCycle]);

  const jumpToCycle = (cycle: ElectionCycle) => {
    wipeSave();
    startCycle(cycle);
    setCycleAttempts(1);
  };

  const startLevel = useCallback((cycle: ElectionCycle) => {
    if (cycle === ElectionCycle.SocietalUtility && !hasSeenUtilityIntervention) {
      setCurrentCycle(cycle); 
      setGamePhase(GamePhase.UtilityIntervention);
      return;
    }
    startCycle(cycle);
    setCycleAttempts(1);
  }, [startCycle, hasSeenUtilityIntervention]);

  const handleCompleteTerm = useCallback(() => {
    const targetScore = cycleMAO * winScalars[currentCycle];

    // Fire the cycle_ended telemetry ONLY once the cycle is truly concluded
    track("cycle_ended", { 
      cycle: ElectionCycle[currentCycle], 
      outcome: 'won' 
    });

    track("level_completed", {
      level_id: ElectionCycle[currentCycle],
      outcome: turnMetricScore >= targetScore ? "win" : "lose",
      turns_taken: currentTurn,
      final_score: turnMetricScore,
    });

    const run: CompletedRun = {
      cycle: currentCycle,
      finalPopulation: [...population],
      finalScore: turnMetricScore,
      targetScore,
      approvalRating: turnApprovalRating,
      enactedLegislation: [...history]
    };

    setCompletedRuns(prev => {
      const clone = [...prev];
      const idx = clone.findIndex(r => r.cycle === currentCycle);
      if (idx >= 0) {
        clone[idx] = run;
      } else {
        clone.push(run);
      }
      return clone;
    });

    setGamePhase(GamePhase.LevelSelect);
  }, [currentCycle, population, turnMetricScore, cycleMAO, turnApprovalRating, history, currentTurn, winScalars]);

  const requestAcademicDebrief = useCallback((type: 'restart' | 'complete', outcome: 'win' | 'lose') => {
    setPendingDebriefAction({ type, outcome });
    setGamePhase(GamePhase.AcademicDebrief);
  }, []);

  const resolveAcademicDebrief = useCallback(() => {
    setPendingDebriefAction(pending => {
      if (!pending) return pending;
      if (pending.type === 'restart') {
        handleResetCycle(pending.outcome);
      } else {
        handleCompleteTerm();
      }
      return null;
    });
  }, [handleResetCycle, handleCompleteTerm]);

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
    handleApplyPolicy, handleResetCycle, jumpToCycle, handleCompleteTerm, setCurrentTurn, handleNavigateToPolicy,
    handleBriefingAcknowledged,
    startLevel,
    gamePhase, setGamePhase, isAgendaUnlocked, yAxisMax,
    TURNS_PER_CYCLE,
    completedRuns,
    dpmConsulted, setDpmConsulted, resetDpmConsulted,
    wipeSave,
    lastTurnSummary, clearLastTurnSummary: () => setLastTurnSummary(null),
    applyPressConferenceDelta,
    setHasSeenUtilityIntervention, startCycle,
    requestAcademicDebrief, resolveAcademicDebrief,
    isCalculating, 
    handleSetupComplete, 
    winScalars, 
    difficultySeed
  };
}