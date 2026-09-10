import { Policy } from "../utils/types";

export const availablePolicies: Policy[] = [
  // ==========================================
  // RAISING THE FLOOR (Focus: Lowest LS)
  // ==========================================
  {
    id: "universal-credit-uplift",
    policyName: "Universal Credit Uplift",
    description: "A financial boost directly targeting the most deprived citizens. Funded by a baseline taxation increase that ripples through the economy.",
    specificRules: [
      { note: "Primary welfare payment increase", maxLS: 4.5, affectEveryone: false, proportion: 0.85, impact: 1.5 },
      { note: "Secondary boost to lower-middle", minLS: 4.5, maxLS: 6.0, affectEveryone: false, proportion: 0.40, impact: 0.5 },
      { note: "Taxation burden on high earners", minLS: 7.5, affectEveryone: false, proportion: 0.70, impact: -0.4 },
      { note: "Taxation burden on middle earners", minLS: 5.5, maxLS: 7.5, affectEveryone: false, proportion: 0.50, impact: -0.2 },
      { note: "Minor inflationary drag on poorest", maxLS: 5.5, affectEveryone: false, proportion: 0.10, impact: -0.1 }
    ]
  },
  {
    id: "wealth-tax",
    policyName: "Aggressive Wealth Tax",
    description: "A progressive tax that takes proportionally more from the wealthy, redistributing the revenue to fund services for those struggling.",
    specificRules: [
      { note: "Heavy tax burden on wealthy", minLS: 7.5, affectEveryone: false, proportion: 0.50, impact: -2.0 },
      { note: "Moderate tax burden on middle", minLS: 5.0, maxLS: 7.5, affectEveryone: false, proportion: 0.30, impact: -1.0 },
      { note: "Minor tax burden on lower-middle", minLS: 3.0, maxLS: 5.0, affectEveryone: false, proportion: 0.20, impact: -0.5 },
      { note: "Minimal economic drag on lowest earners", maxLS: 3.0, affectEveryone: false, proportion: 0.10, impact: -0.5 },
      { note: "Service funding for lower earners", maxLS: 4.5, affectEveryone: false, proportion: 0.85, impact: 1.5 }
    ]
  },
  {
    id: "minimum-wage-surge",
    policyName: "Statutory Minimum Wage Hike",
    description: "Forces businesses to raise baseline pay. Greatly improves the lower distribution, but squeezes corporate margins and passes some costs to consumers.",
    specificRules: [
      { note: "Income boost for lower earners", minLS: 2.0, maxLS: 4.5, affectEveryone: false, proportion: 0.70, impact: 1.2 },
      { note: "Wage compression boost to middle", minLS: 4.5, maxLS: 6.5, affectEveryone: false, proportion: 0.40, impact: 0.5 },
      { note: "Corporate profit squeeze", minLS: 8.0, affectEveryone: false, proportion: 0.85, impact: -0.6 },
      { note: "Consumer price pass-through", minLS: 5.0, maxLS: 8.0, affectEveryone: false, proportion: 0.40, impact: -0.3 },
      { note: "Reduced hours / job losses", maxLS: 4.5, affectEveryone: false, proportion: 0.15, impact: -0.8 }
    ]
  },
  {
    id: "social-housing-blitz",
    policyName: "Social Housing Expansion",
    description: "A state-funded building programme for affordable housing units. Provides immense stability to the societal floor, funded by broad economic friction.",
    specificRules: [
      { note: "Housing security for lowest earners", maxLS: 4.0, affectEveryone: false, proportion: 0.40, impact: 1.9 },
      { note: "Reduced rent pressure on lower-middle", minLS: 4.0, maxLS: 6.0, affectEveryone: false, proportion: 0.20, impact: 0.8 },
      { note: "Tax and interest drag on upper earners", minLS: 8.0, affectEveryone: false, proportion: 0.80, impact: -0.3 },
      { note: "Tax and interest drag on middle earners", minLS: 5.0, maxLS: 8.0, affectEveryone: false, proportion: 0.60, impact: -0.15 }
    ]
  },

  // ==========================================
  // MAXIMISING THE AVERAGE (Focus: Broad / Middle LS)
  // ==========================================
  {
    id: "middle-income-tax-cut",
    policyName: "Broad Tax Cut",
    description: "Reduces the basic tax rate for the majority of the distribution, boosting average aggregate scores at the severe expense of frozen social budgets.",
    specificRules: [
      { note: "Tax reduction for middle earners", minLS: 5.0, maxLS: 8.5, affectEveryone: false, proportion: 0.95, impact: 0.8 },
      { note: "Tax reduction for highest earners", minLS: 8.5, affectEveryone: false, proportion: 0.95, impact: 0.5 },
      { note: "Frozen welfare budgets", maxLS: 4.0, affectEveryone: false, proportion: 0.85, impact: -0.7 },
      { note: "Degraded public services", minLS: 4.0, maxLS: 6.0, affectEveryone: false, proportion: 0.30, impact: -0.3 }
    ]
  },
  {
    id: "corporate-deregulation",
    policyName: "Corporate Deregulation",
    description: "Removes statutory compliance barriers to spur rapid growth. Heavily boosts the top end, mildly boosts the middle, but erodes protections for the worst off.",
    specificRules: [
      { note: "Major economic boost to top earners", minLS: 8.0, affectEveryone: false, proportion: 0.85, impact: 1.5 },
      { note: "Secondary boost from market growth", minLS: 5.5, maxLS: 8.0, affectEveryone: false, proportion: 0.60, impact: 0.5 },
      { note: "Erosion of low-income protections", maxLS: 4.5, affectEveryone: false, proportion: 0.90, impact: -0.8 },
      { note: "Localised environmental/workplace degradation", minLS: 4.5, maxLS: 7.0, affectEveryone: false, proportion: 0.40, impact: -0.4 }
    ]
  },
  {
    id: "infrastructure-bonds",
    policyName: "Special Enterprise Zones",
    description: "Launches high-yield regional business zones. Drives aggregate metrics upward but causes localised disruption and gentrification.",
    specificRules: [
      { note: "Regional economic gains", minLS: 6.0, maxLS: 9.0, affectEveryone: false, proportion: 0.75, impact: 0.9 },
      { note: "Employment spillover to lower-middle", minLS: 4.0, maxLS: 6.0, affectEveryone: false, proportion: 0.40, impact: 0.5 },
      { note: "Bond taxation drag", minLS: 8.5, affectEveryone: false, proportion: 0.50, impact: -0.3 },
      { note: "Localised disruption and gentrification", maxLS: 4.0, affectEveryone: false, proportion: 0.60, impact: -0.4 }
    ]
  },
  {
    id: "universal-basic-income",
    policyName: "Universal Basic Income Pilot",
    description: "A guaranteed monthly baseline income for all. Shifts the entire distribution upwards, funded by a heavy progressive tax hike on the top tier.",
    specificRules: [
      { note: "Transformative income for lower earners", maxLS: 4.0, affectEveryone: true, proportion: 1.0, impact: 1.8 },
      { note: "Supplemental income for middle earners", minLS: 4.0, maxLS: 7.0, affectEveryone: true, proportion: 1.0, impact: 0.7 },
      { note: "Heavy progressive tax funding", minLS: 8.5, affectEveryone: true, proportion: 1.0, impact: -1.5 },
      { note: "Moderate tax offset", minLS: 6.5, maxLS: 8.5, affectEveryone: true, proportion: 1.0, impact: -0.6 },
      { note: "Minor inflationary drag", maxLS: 5.0, affectEveryone: false, proportion: 0.50, impact: -0.4 }
    ]
  },

  // ==========================================
  // TARGETED INTERVENTIONS (Randomised Proportion Focus)
  // ==========================================
  {
    id: "tuition-fee-abolition",
    policyName: "Abolish Higher Education Fees",
    description: "Erases state university tuition debt. Highly effective for a specific cross-section of graduates, funded by general taxation.",
    specificRules: [
      { note: "Debt relief for middle-earning graduates", minLS: 4.5, maxLS: 7.5, affectEveryone: false, proportion: 0.25, impact: 1.8 },
      { note: "Debt relief for higher-earning graduates", minLS: 7.5, affectEveryone: false, proportion: 0.15, impact: 0.8 },
      { note: "General tax burden (High)", minLS: 8.0, affectEveryone: false, proportion: 0.80, impact: -0.4 },
      { note: "General tax burden (Medium)", minLS: 4.0, maxLS: 8.0, affectEveryone: false, proportion: 0.60, impact: -0.2 },
      { note: "Opportunity cost of regressive spending", maxLS: 4.0, affectEveryone: false, proportion: 0.90, impact: -0.3 }
    ]
  },
  {
    id: "commuter-rail-subsidies",
    policyName: "Commuter Fare Hard Caps",
    description: "Imposes strict national rail season ticket price limits. Alleviates stress for a large portion of the middle distribution, but diverts infrastructure funds.",
    specificRules: [
      { note: "Transit cost reduction", minLS: 5.0, maxLS: 8.0, affectEveryone: false, proportion: 0.60, impact: 0.9 },
      { note: "General tax infrastructure drag", minLS: 8.0, affectEveryone: false, proportion: 0.70, impact: -0.2 },
      { note: "Diverted local bus transit funding", maxLS: 4.5, affectEveryone: false, proportion: 0.80, impact: -0.3 }
    ]
  },
  {
    id: "healthcare-backlog-blitz",
    policyName: "Elective Surgery Backlog Drive",
    description: "Surges regional hospital funding to eliminate waiting queues. Provides a massive quality of life increase to a small, randomly distributed segment.",
    specificRules: [
      { note: "Health mobility restored", maxLS: 8.0, affectEveryone: false, proportion: 0.20, impact: 2.2 },
      { note: "General tax cost (High)", minLS: 8.0, affectEveryone: false, proportion: 0.85, impact: -0.4 },
      { note: "General tax cost (Medium)", minLS: 5.0, maxLS: 8.0, affectEveryone: false, proportion: 0.60, impact: -0.2 },
      { note: "General tax cost (Low)", maxLS: 5.0, affectEveryone: false, proportion: 0.30, impact: -0.1 }
    ]
  },

  // ==========================================
  // HYBRID & TRADE-OFF SCENARIOS
  // ==========================================
  {
    id: "green-transition-levy",
    policyName: "Carbon Emission Fuel Levy",
    description: "Imposes a direct surcharge on aviation and fossil fuels to fund decarbonisation. Penalises the highly mobile while moderately improving baseline environmental metrics.",
    specificRules: [
      { note: "Cleaner local air and home insulation", maxLS: 5.0, affectEveryone: false, proportion: 0.70, impact: 0.5 },
      { note: "Minor environmental improvements", minLS: 5.0, maxLS: 8.0, affectEveryone: false, proportion: 0.40, impact: 0.2 },
      { note: "Frequent flyer and capital costs", minLS: 8.0, affectEveryone: false, proportion: 0.85, impact: -0.8 },
      { note: "Energy transition friction", minLS: 4.0, maxLS: 8.0, affectEveryone: false, proportion: 0.60, impact: -0.4 },
      { note: "Regressive cost pass-through", maxLS: 4.0, affectEveryone: false, proportion: 0.30, impact: -0.3 }
    ]
  },
  {
    id: "community-policing-surge",
    policyName: "Neighbourhood Policing Revival",
    description: "Deploys foot-patrol officers to high-density areas. Alleviates vulnerability indexes significantly for those at the bottom, but requires general funding.",
    specificRules: [
      { note: "Increased safety for lowest earners", maxLS: 4.0, affectEveryone: false, proportion: 0.80, impact: 1.2 },
      { note: "Minor safety boost for middle earners", minLS: 4.0, maxLS: 7.0, affectEveryone: false, proportion: 0.50, impact: 0.5 },
      { note: "General tax funding", minLS: 7.0, affectEveryone: false, proportion: 0.70, impact: -0.2 },
      { note: "Friction from over-policing", maxLS: 5.0, affectEveryone: false, proportion: 0.15, impact: -0.4 }
    ]
  },
  {
    id: "arts-funding-redirection",
    policyName: "Metropolitan Arts Council Pivot",
    description: "Defunds central opera houses to allocate micro-grants for community visual art programmes. Shifts wellbeing from the top to the lower-middle.",
    specificRules: [
      { note: "Increased grassroots cultural access", maxLS: 5.5, affectEveryone: false, proportion: 0.45, impact: 0.6 },
      { note: "Reduced elite cultural funding", minLS: 8.0, affectEveryone: false, proportion: 0.65, impact: -0.5 },
      { note: "Minor tax friction", minLS: 5.0, maxLS: 8.0, affectEveryone: false, proportion: 0.30, impact: -0.1 }
    ]
  },
  {
    id: "prescription-charge-exemption",
    policyName: "Universal Prescription Fee Exemptions",
    description: "Eliminates out-of-pocket transaction charges for medication. Provides significant relief across the board, funded by general health budget reallocation.",
    specificRules: [
      { note: "Medical budget relief for lowest earners", maxLS: 4.5, affectEveryone: true, proportion: 1.0, impact: 0.8 },
      { note: "Medical budget relief for middle earners", minLS: 4.5, maxLS: 7.0, affectEveryone: true, proportion: 1.0, impact: 0.4 },
      { note: "Strain on specialist availability", minLS: 7.0, affectEveryone: false, proportion: 0.60, impact: -0.3 },
      { note: "Localised pharmacy shortages", maxLS: 5.0, affectEveryone: false, proportion: 0.20, impact: -0.2 }
    ]
  }
];