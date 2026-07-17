import React from 'react';
import { Policy, Respondent, TurnHistory } from '../../utils/types';
import { CardHeaderLarge, Button } from '../ui';
import PolicyDeckList from '../PolicyDeckList';
import EnactedLegislationHistory from '../EnactedLegislationHistory';

interface EnactedLegEntry extends TurnHistory {
  description?: string;
}

interface AgendaPanelProps {
  isParliamentDissolved: boolean;
  currentDeck: Policy[];
  selectedPolicy: Policy | null;
  onSelectPolicy: (policy: Policy | null) => void;
  population: Respondent[];
  detailsOpen: boolean;
  onToggleDetails: (open: boolean) => void;
  enactedLegislation: EnactedLegEntry[];
  availablePolicies: Policy[];
  hoveredEnactedId: string | null;
  onHoverEnacted: (policyId: string | null, turn: number | null) => void;
  isAgendaUnlocked: boolean;
  isEnacting: boolean;
  onApplyPolicy: () => void;
  onFaceElectorate: () => void;
}

/**
 * Right column of the dashboard: either the selectable policy deck
 * (PolicyDeckList) or, once parliament dissolves, the enacted-legislation
 * history (EnactedLegislationHistory), plus the primary action button.
 * Extracted from DashboardTab so the "which list + which CTA" branching
 * lives in one focused component instead of inside the 600-line original.
 */
export default function AgendaPanel({
  isParliamentDissolved,
  currentDeck,
  selectedPolicy,
  onSelectPolicy,
  population,
  detailsOpen,
  onToggleDetails,
  enactedLegislation,
  availablePolicies,
  hoveredEnactedId,
  onHoverEnacted,
  isAgendaUnlocked,
  isEnacting,
  onApplyPolicy,
  onFaceElectorate,
}: AgendaPanelProps) {
  return (
    <div className="col-span-4 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-visible h-full min-h-0 relative">
      <CardHeaderLarge
        title={isParliamentDissolved ? 'Enacted Legislation' : 'Legislative Agenda'}
        subtitle={
          isParliamentDissolved
            ? 'The policies enacted during your term. Hover over to see their effects.'
            : 'Select a policy to review its details.'
        }
      />

      <div
        className={`flex-1 flex flex-col gap-2 min-h-0 overflow-visible relative z-[60] ${
          isParliamentDissolved ? 'p-3' : 'p-2'
        }`}
      >
        {!isParliamentDissolved ? (
          <PolicyDeckList
            deck={currentDeck}
            selectedPolicy={selectedPolicy}
            onSelect={onSelectPolicy}
            population={population}
            detailsOpen={detailsOpen}
            onToggleDetails={onToggleDetails}
          />
        ) : (
          <EnactedLegislationHistory
            enactedLegislation={enactedLegislation}
            availablePolicies={availablePolicies}
            hoveredEnactedId={hoveredEnactedId}
            onHover={onHoverEnacted}
          />
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 bg-zinc-100 shrink-0 relative z-0">
        {isParliamentDissolved ? (
          <Button variant="danger" size="lg" shadow="lg" fullWidth pulse loud onClick={onFaceElectorate}>
            Hold Press Conference
          </Button>
        ) : (
          <Button
            variant={isEnacting ? 'accent' : 'primary'}
            fullWidth
            pulse={isEnacting}
            disabled={!selectedPolicy || !isAgendaUnlocked || isEnacting}
            onClick={onApplyPolicy}
          >
            {isEnacting ? 'Enacting Legislation...' : 'Enact Policy'}
          </Button>
        )}
      </div>
    </div>
  );
}
