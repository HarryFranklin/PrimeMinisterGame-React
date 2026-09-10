/**
 * "what do we call someone at this LS score".
 * Used anywhere we describe a citizen's starting life situation in prose
 * (Wellbeing Changes screen, Rawlsian debrief, etc) - defining these in one
 * place means the label a citizen gets is always consistent, and any text
 * built from it (e.g. "one was struggling, the other was thriving") is
 * guaranteed to match the categories shown elsewhere in the app.
 */
export function getLifeSituationLabel(ls: number): string {
  if (ls <= 3) return "Struggling";
  if (ls <= 5) return "Just Getting By";
  if (ls <= 8) return "Comfortable";
  return "Thriving";
}