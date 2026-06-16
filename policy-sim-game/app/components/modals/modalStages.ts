export interface ModalStage {
  id: string;
  title: string;
  subtitle?: string;
  maxWidth: string;
  nextLabel?: string;
  // True meaning the stage comp. is responsible for calling onReady() before the Next button becomes active.
  // False meaning it's auto-active.
  requiresInteraction: boolean;
}

/** Build the ordered list of stages for an election sequence */
export function buildElectionStages({
  canProceed,
}: {
  canProceed: boolean;
}): ModalStage[] {
  const stages: ModalStage[] = [
    {
      id: 'summary',
      title: 'Term Summary',
      maxWidth: 'max-w-3xl',
      nextLabel: 'Continue to Verdict →',
      requiresInteraction: true, // waits for chart animation
    },
    {
      id: 'verdict',
      title: 'Election Verdict',
      maxWidth: 'max-w-xl',
      nextLabel: 'How the Population Changed →',
      requiresInteraction: true, // waits for score counter
    },
    {
      id: 'population',
      title: 'How The Population Changed',
      maxWidth: 'max-w-3xl',
      nextLabel: 'Electorate Feedback →',
      requiresInteraction: false,
    },
    {
      id: 'feedback',
      title: 'Electorate Feedback',
      maxWidth: 'max-w-5xl',
      nextLabel: 'Academic Debrief →',
      requiresInteraction: false,
    },
    {
      id: 'debrief',
      title: 'Academic Debrief',
      maxWidth: 'max-w-3xl',
      nextLabel: undefined, // last stage — shows action buttons instead
      requiresInteraction: true, // must interact with reveal cards
    },
  ];

  // If the player lost and hasn't used all attempts, gate them at verdict
  // (the parent still controls what the final action buttons render as,
  // but we remove the debrief stage so they can't skip ahead)
  if (!canProceed) {
    return stages.filter(s => s.id !== 'debrief' && s.id !== 'population' && s.id !== 'feedback');
  }

  return stages;
}