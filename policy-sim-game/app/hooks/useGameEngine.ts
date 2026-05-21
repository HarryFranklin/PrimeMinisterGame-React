import { useState, useCallback, useMemo, useEffect } from 'react';
import { Respondent, ElectionCycle, Policy, TurnHistory, DemographicAverages, Minister } from '../utils/types';
import { loadPopulation } from '../utils/dataLoader';
import { WelfareMetrics } from '../utils/WelfareMetrics';
import { PolicyEngine } from '../utils/PolicyEngine';
import { MAOEngine } from '../utils/MAOEngine';
import { availablePolicies } from '../data/policies';

const TURNS_PER_CYCLE = 5;

const SAVE_KEY = 'policy-sim-save-v1';

const calculateAverages = (pop: Respondent[]): DemographicAverages => {
  const getAvg = (filterFn?: (r: Respondent) => boolean) => {
    const group = filterFn ? pop.filter(filterFn) : pop;
    return group.length > 0 ? group.reduce((sum, r) => sum + r.currentLS, 0) / group.length : 0;
  };

  return {
    national: getAvg(),
    wealth: {
      poor: getAvg(r => r.demographics.wealth === 'Poor'),
      middle: getAvg(r => r.demographics.wealth === 'Middle'),
      wealthy: getAvg(r => r.demographics.wealth === 'Wealthy')
    },
    age: {
      youth: getAvg(r => r.demographics.age === 'Youth'),
      adult: getAvg(r => r.demographics.age === 'Adult'),
      elderly: getAvg(r => r.demographics.age === 'Elderly')
    }
  };
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
  const [selectedMinister, setSelectedMinister] = useState<Minister | string | null>(null);
  const [pulsePolicy, setPulsePolicy] = useState(false);
  
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
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverages: calculateAverages(pop) }]);
    setShowElection(false);
    setSelectedPolicy(null);
    setSelectedMinister(null);
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
        return; // Exit early so we don't overwrite the save!
      } catch (e) {
        console.error("Failed to load save file, starting fresh.", e);
        localStorage.removeItem(SAVE_KEY);
      }
    }

    // If no save exists (or it was corrupted), start a fresh game
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    setBaselinePopulation(data);
    startCycle(ElectionCycle.Benthamite, data);
    setCycleAttempts(1);
  }, [startCycle]);

  useEffect(() => {
    // Prevent saving before the game has properly initialised
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

  const initialMetricScore = useMemo(() => getMetricScore(initialPopulation, currentCycle), [initialPopulation, currentCycle]);
  const turnMetricScore = useMemo(() => getMetricScore(population, currentCycle), [population, currentCycle]);
  const currentMetricScore = useMemo(() => getMetricScore(previewPopulation, currentCycle), [previewPopulation, currentCycle]);
  const turnApprovalRating = useMemo(() => WelfareMetrics.calculateApprovalRating(turnMetricScore, cycleMAO), [turnMetricScore, cycleMAO]);

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
      lsAverages: calculateAverages(previewPopulation)
    }]);
    
    const updatedSchedule = cycleSchedule.map((deck, idx) => 
      idx >= currentTurn ? deck.filter(p => p.id !== selectedPolicy.id) : deck
    );
    setCycleSchedule(updatedSchedule);
    
    if (currentTurn < TURNS_PER_CYCLE) {
      // Pull the next deck from our newly filtered schedule
      setCurrentDeck(updatedSchedule[currentTurn]); 
      setCurrentTurn(prev => prev + 1);
    } else {
      setShowElection(true);
    }
    
    setSelectedPolicy(null);
    setSelectedMinister(null);
  };

  const handleResetCycle = () => {
    localStorage.removeItem(SAVE_KEY); // Wipe save
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    startCycle(currentCycle, data);
    setCycleAttempts(prev => prev + 1);
  };

  const jumpToCycle = (cycle: ElectionCycle) => {
    localStorage.removeItem(SAVE_KEY); // Wipe save
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

  // --- UI Data Generations (Moved from page.tsx) ---
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

  const generateHistogramData = useCallback((targetPopulation: Respondent[]) => {
    return Array.from({ length: 11 }, (_, i) => {
      const peopleInBar = targetPopulation.filter(r => Math.round(r.currentLS) === i);
      const total = peopleInBar.length;
      const getPct = (count: number) => (total > 0 ? (count / total) * 100 : 0);
      return {
        name: i, count: total,
        breakdown: {
          wealth: {
            Poor: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Poor').length),
            Middle: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Middle').length),
            Wealthy: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Wealthy').length),
          },
          age: {
            Youth: getPct(peopleInBar.filter(p => p.demographics.age === 'Youth').length),
            Adult: getPct(peopleInBar.filter(p => p.demographics.age === 'Adult').length),
            Elderly: getPct(peopleInBar.filter(p => p.demographics.age === 'Elderly').length),
          },
        }
      };
    });
  }, []);

  const currentHistogramData = useMemo(() => generateHistogramData(population), [population, generateHistogramData]);
  const previewHistogramData = useMemo(() => generateHistogramData(previewPopulation), [previewPopulation, generateHistogramData]);

  const ministers = useMemo(() => {
    const evalMin = (n: string, mandate: string, f: (r: Respondent) => boolean) => {
      const avg = (p: Respondent[]) => {
        const g = p.filter(f); 
        if (g.length === 0) return 0;
        return g.reduce((s, r) => s + (
          currentCycle === ElectionCycle.Benthamite || currentCycle === ElectionCycle.Rawlsian 
            ? r.currentLS 
            : currentCycle === ElectionCycle.PersonalUtility 
              ? WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities) 
              : WelfareMetrics.evaluateDistribution(p.map(x => x.currentLS), r.societalUtilities)
        ), 0) / g.length;
      };
      
      const proj = avg(previewPopulation);
      const base = avg(initialPopulation);
      const current = avg(population); 
      const delta = proj - base;
      const policyDelta = proj - current;
      
      let status: 'happy' | 'neutral' | 'angry' = 'neutral';
      if (policyDelta > 0.05) status = 'happy';
      else if (policyDelta < -0.05) status = 'angry';
      
      return { 
        name: n, mandate, status, 
        color: status === 'happy' ? "bg-emerald-500" : status === 'neutral' ? "bg-amber-400" : "bg-rose-500", 
        delta, policyDelta, currentScore: current, projectedScore: proj 
      };
    };

    return [
        evalMin("Welfare Secretary", "Low Income", r => r.demographics.wealth === 'Poor'),
        evalMin("Home Secretary", "Middle Class", r => r.demographics.wealth === 'Middle'),
        evalMin("Chancellor", "High Earners", r => r.demographics.wealth === 'Wealthy'),
        evalMin("Education Secretary", "Youth", r => r.demographics.age === 'Youth'),
        evalMin("Business Secretary", "Working Adults", r => r.demographics.age === 'Adult'),
        evalMin("Pensions Secretary", "Elderly", r => r.demographics.age === 'Elderly')
    ];
  }, [initialPopulation, population, previewPopulation, currentCycle]);

  const presentedPolicies = useMemo(() => {
    if (!selectedMinister) return [];
    const minName = typeof selectedMinister === 'string' ? selectedMinister : selectedMinister.name;
    const filterMap: Record<string, (r: Respondent) => boolean> = {
      "Welfare Secretary": r => r.demographics.wealth === 'Poor',
      "Home Secretary": r => r.demographics.wealth === 'Middle',
      "Chancellor": r => r.demographics.wealth === 'Wealthy',
      "Education Secretary": r => r.demographics.age === 'Youth',
      "Business Secretary": r => r.demographics.age === 'Adult',
      "Pensions Secretary": r => r.demographics.age === 'Elderly'
    };
    const filterFn = filterMap[minName];
    if (!filterFn) return currentDeck.slice(0, 3);
    const scoredPolicies = currentDeck.map(policy => {
      const testPop = PolicyEngine.applyPolicy(population, policy);
      const group = testPop.filter(filterFn);
      let score = 0;
      if (group.length > 0) {
        score = group.reduce((s, r) => s + (
          currentCycle === ElectionCycle.Benthamite || currentCycle === ElectionCycle.Rawlsian 
            ? r.currentLS 
            : currentCycle === ElectionCycle.PersonalUtility 
              ? WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities) 
              : WelfareMetrics.evaluateDistribution(testPop.map(x => x.currentLS), r.societalUtilities)
        ), 0) / group.length;
      }
      return { policy, score };
    });
    return scoredPolicies.sort((a, b) => b.score - a.score).slice(0, 3).map(sp => sp.policy);
  }, [selectedMinister, currentDeck, population, currentCycle]);

  return {
    population, initialPopulation, baselinePopulation, previewPopulation,
    currentTurn, currentCycle, cycleAttempts,
    selectedPolicy, setSelectedPolicy, selectedMinister, setSelectedMinister, pulsePolicy,
    showElection, setShowElection, showNarrative, setShowNarrative, showFinalDebrief, setShowFinalDebrief,
    history, currentDeck, cycleMAO, optimalPath,
    turnMetricScore, initialMetricScore, currentMetricScore, turnApprovalRating,
    currentChartData, previewChartData, currentHistogramData, previewHistogramData, ministers, presentedPolicies,
    handleApplyPolicy, handleResetCycle, jumpToCycle, handleProceedFromNarrative, setCurrentTurn, handleNavigateToPolicy,
    TURNS_PER_CYCLE
  };
}