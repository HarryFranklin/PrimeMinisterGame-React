import { useState, useEffect } from 'react';

const TUTORIAL_DATA: Record<string, { title: string; text: string; pos: string }[]> = {
  dashboard: [
    { title: 'Data & Demographics', text: 'This section visualises the life satisfaction of your electorate.', pos: 'bottom-10 right-10' },
    { title: 'The Cabinet', text: 'Your ministers represent key voting blocs. Their reactions predict policy impacts.', pos: 'bottom-10 left-10' },
    { title: 'Legislative Agenda', text: 'Here you select and enact policies. You can only pass one policy per turn.', pos: 'bottom-10 left-10' },
    { title: 'Department Overviews', text: 'To finish your onboarding, click through each of the tabs at the top to explore them.', pos: 'top-24 left-1/2 -translate-x-1/2' }
  ],
  electorate: [
    { title: 'Electorate Controls', text: 'Switch between viewing raw demographics, voting intentions, and objective wellbeing impacts.', pos: 'bottom-10 left-10' },
    { title: 'Unified Policy Header', text: 'The header now displays your active Policy Draft and consulting Minister. Hover or click the draft box to flick through alternative recommendations, or click the Minister button to jump straight to their Cabinet profile.', pos: 'bottom-10 left-10' },
    { title: 'The Chamber', text: 'Hover over individual bars to see the demographic make-up of each bar. This differs based on the toggles at the top of the page.', pos: 'bottom-10 right-10' },
    { title: 'Guided Analysis', text: 'This panel provides contextual hints about why the data looks the way it does.', pos: 'bottom-10 left-10' }
  ],
  ministers: [
    { title: 'Reading a Minister', text: 'Each minister protects a specific demographic. They will warn you if a policy disproportionately harms their constituents.', pos: 'bottom-10 right-10' },
    { title: 'Cabinet Consensus', text: 'You must balance the competing demands of the entire cabinet. Satisfying one minister often angers another.', pos: 'bottom-10 left-10' }
  ],
  graphs: [
    { title: 'Current State', text: 'This shows the life satisfaction distribution before your selected policy is enacted.', pos: 'bottom-10 right-10' },
    { title: 'Projected State', text: 'This previews the exact distribution shifts caused by your policy. Use this to ensure you are meeting the cycle mandate.', pos: 'bottom-10 left-10' }
  ]
};

export function useTutorial(activeTab: string, tabs: readonly string[], setActiveTab: (tab: any) => void) {
  const [showIntro, setShowIntro] = useState(true);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialVisitedTabs, setTutorialVisitedTabs] = useState<string[]>(['dashboard']);

  useEffect(() => {
    if (isTutorialActive) {
      setTutorialStep(0);
      setTutorialVisitedTabs(['dashboard']);
      setActiveTab('dashboard'); 
    }
  }, [isTutorialActive, setActiveTab]);

  const handleStartGame = () => {
    setShowIntro(false);
    setIsTutorialActive(true); 
  };

  const currentTutorialSequence = TUTORIAL_DATA[activeTab] || [];
  const safeTutorialStep = Math.min(tutorialStep, Math.max(0, currentTutorialSequence.length - 1));
  const currentStepData = currentTutorialSequence[safeTutorialStep];
  
  const isLastTutorialStep = safeTutorialStep === currentTutorialSequence.length - 1;
  const unvisitedTabs = tabs.filter(t => !tutorialVisitedTabs.includes(t) && t !== activeTab);
  const targetNextTab = isLastTutorialStep && unvisitedTabs.length > 0 ? unvisitedTabs[0] : null;

  return {
    showIntro,
    isTutorialActive,
    setIsTutorialActive,
    tutorialStep,
    setTutorialStep,
    tutorialVisitedTabs,
    setTutorialVisitedTabs,
    currentTutorialSequence,
    safeTutorialStep,
    currentStepData,
    isLastTutorialStep,
    targetNextTab,
    handleStartGame
  };
}