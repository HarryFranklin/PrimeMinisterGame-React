import { Policy } from "../utils/types";

export const availablePolicies: Policy[] = [
  // ==========================================
  // RAISING THE FLOOR (Focus: Lowest LS)
  // ==========================================
  {
    id: "universal-credit-uplift",
    policyName: "Universal Credit Uplift",
    description: "A financial boost directly targeting the most deprived citizens. Funded by a slight baseline taxation increase on the upper half of the distribution.",
    specificRules: [
      { note: "Welfare payment increase", maxLS: 4.0, affectEveryone: false, proportion: 0.85, impact: 1.5 },
      { note: "Taxation on upper half", minLS: 5.0, affectEveryone: false, proportion: 0.90, impact: -0.15 }
    ]
  },
  {
    id: "wealth-tax",
    policyName: "Aggressive Wealth Tax",
    description: "Heavily taxes the top 10% to fund community services for the bottom 30%. Highly effective at closing the inequality gap.",
    specificRules: [
      { note: "Severe taxation on top earners", minLS: 8.5, affectEveryone: false, proportion: 0.75, impact: -1.1 },
      { note: "Service funding for lowest earners", maxLS: 4.5, affectEveryone: false, proportion: 0.90, impact: 1.1 }
    ]
  },
  {
    id: "minimum-wage-surge",
    policyName: "Statutory Minimum Wage Hike",
    description: "Forces businesses to raise baseline pay. Greatly improves the lower-middle distribution, but squeezes corporate margins at the top.",
    specificRules: [
      { note: "Income boost for lower earners", minLS: 2.0, maxLS: 5.5, affectEveryone: false, proportion: 0.65, impact: 1.2 },
      { note: "Corporate profit squeeze", minLS: 7.5, affectEveryone: false, proportion: 0.85, impact: -0.6 }
    ]
  },
  {
    id: "social-housing-blitz",
    policyName: "Social Housing Expansion",
    description: "A state-funded building programme for affordable housing units, providing immense stability to those currently at the societal floor.",
    specificRules: [
      { note: "Housing security for lowest earners", maxLS: 3.5, affectEveryone: false, proportion: 0.40, impact: 1.9 },
      { note: "Minor tax on upper-middle earners", minLS: 6.5, maxLS: 8.5, affectEveryone: false, proportion: 0.95, impact: -0.2 }
    ]
  },

  // ==========================================
  // MAXIMISING THE AVERAGE (Focus: Broad / Middle LS)
  // ==========================================
  {
    id: "middle-income-tax-cut",
    policyName: "Broad Tax Cut",
    description: "Reduces the basic tax rate for the majority of the distribution, boosting average aggregate scores at the expense of frozen social budgets.",
    specificRules: [
      { note: "Tax reduction for middle earners", minLS: 4.5, maxLS: 8.0, affectEveryone: false, proportion: 0.95, impact: 0.8 },
      { note: "Frozen welfare budgets", maxLS: 3.5, affectEveryone: false, proportion: 0.85, impact: -0.5 }
    ]
  },
  {
    id: "corporate-deregulation",
    policyName: "Corporate Deregulation",
    description: "Removes statutory compliance barriers to spur rapid growth. Heavily boosts the top end, mildly boosts the middle, but erodes protections for the lowest percentiles.",
    specificRules: [
      { note: "Major economic boost to top earners", minLS: 8.0, maxLS: 9.5, affectEveryone: false, proportion: 0.85, impact: 1.5 },
      { note: "Minor economic boost to middle earners", minLS: 5.0, maxLS: 7.9, affectEveryone: false, proportion: 0.50, impact: 0.4 },
      { note: "Erosion of low-income protections", maxLS: 4.5, affectEveryone: false, proportion: 0.90, impact: -0.6 }
    ]
  },
  {
    id: "infrastructure-bonds",
    policyName: "Special Enterprise Zones",
    description: "Launches high-yield regional business zones. Drives aggregate metrics upward but causes localised disruption.",
    specificRules: [
      { note: "Regional economic gains", minLS: 6.0, affectEveryone: false, proportion: 0.75, impact: 0.9 },
      { note: "Localised disruption for lowest earners", maxLS: 3.0, affectEveryone: false, proportion: 0.40, impact: -0.4 }
    ]
  },
  {
    id: "universal-basic-income",
    policyName: "Universal Basic Income Pilot",
    description: "A guaranteed monthly baseline income for all. Shifts the entire distribution upwards, funded by a flat progressive tax hike on the top tier.",
    specificRules: [
      { note: "Guaranteed income for lower earners", maxLS: 5.5, affectEveryone: true, proportion: 1.0, impact: 1.4 },
      { note: "Guaranteed income for middle earners", minLS: 5.6, maxLS: 7.5, affectEveryone: true, proportion: 1.0, impact: 0.5 },
      { note: "Tax funding from top earners", minLS: 8.5, affectEveryone: true, proportion: 1.0, impact: -1.2 }
    ]
  },

  // ==========================================
  // TARGETED INTERVENTIONS (Randomised Proportion Focus)
  // ==========================================
  {
    id: "tuition-fee-abolition",
    policyName: "Abolish Higher Education Fees",
    description: "Erases state university tuition debt. Highly effective for a specific cross-section of the population, funded by general taxation.",
    specificRules: [
      { note: "Debt relief for eligible graduates", minLS: 4.0, maxLS: 7.0, affectEveryone: false, proportion: 0.2, impact: 1.8 },
      { note: "General tax burden", minLS: 6.0, affectEveryone: false, proportion: 0.95, impact: -0.15 }
    ]
  },
  {
    id: "commuter-rail-subsidies",
    policyName: "Commuter Fare Hard Caps",
    description: "Imposes strict national rail season ticket price limits. Alleviates stress for a large portion of the middle distribution.",
    specificRules: [
      { note: "Transit cost reduction", minLS: 4.5, maxLS: 7.5, affectEveryone: false, proportion: 0.6, impact: 0.9 },
      { note: "Infrastructure budget drag", affectEveryone: false, proportion: 0.90, impact: -0.1 }
    ]
  },
  {
    id: "healthcare-backlog-blitz",
    policyName: "Elective Surgery Backlog Drive",
    description: "Surges regional hospital funding to eliminate waiting queues. Provides a massive quality of life increase to a small, randomly distributed segment.",
    specificRules: [
      { note: "Health mobility restored", maxLS: 7.8, affectEveryone: false, proportion: 0.15, impact: 2.2 },
      { note: "General tax cost", affectEveryone: false, proportion: 0.95, impact: -0.2 }
    ]
  },

  // ==========================================
  // HYBRID & TRADE-OFF SCENARIOS
  // ==========================================
  {
    id: "green-transition-levy",
    policyName: "Carbon Emission Fuel Levy",
    description: "Imposes a direct surcharge on aviation fuel to fund decarbonisation. Penalises the highly mobile upper distribution while slightly improving baseline environmental metrics for the lower distribution.",
    specificRules: [
      { note: "Increased travel costs", minLS: 7.5, affectEveryone: false, proportion: 0.85, impact: -0.7 },
      { note: "Environmental improvements", maxLS: 4.5, affectEveryone: false, proportion: 0.70, impact: 0.4 }
    ]
  },
  {
    id: "community-policing-surge",
    policyName: "Neighbourhood Policing Revival",
    description: "Deploys foot-patrol officers to high-density areas. Alleviates vulnerability indexes significantly for those at the bottom of the distribution.",
    specificRules: [
      { note: "Increased safety for lowest earners", maxLS: 3.5, affectEveryone: false, proportion: 0.80, impact: 1.2 },
      { note: "Minor safety boost for middle earners", minLS: 4.0, maxLS: 6.5, affectEveryone: false, proportion: 0.50, impact: 0.4 }
    ]
  },
  {
    id: "arts-funding-redirection",
    policyName: "Metropolitan Arts Council Pivot",
    description: "Defunds central opera houses to allocate micro-grants for community visual art programmes. Shifts wellbeing from the top to the lower-middle.",
    specificRules: [
      { note: "Reduced elite cultural funding", minLS: 8.0, affectEveryone: false, proportion: 0.60, impact: -0.5 },
      { note: "Increased grassroots access", minLS: 3.0, maxLS: 5.5, affectEveryone: false, proportion: 0.40, impact: 0.6 }
    ]
  },
  {
    id: "prescription-charge-exemption",
    policyName: "Universal Prescription Fee Exemptions",
    description: "Eliminates all out-of-pocket transaction charges for medication. Provides significant relief for those with chronic health needs, funded by general health budget reallocation.",
    specificRules: [
      { note: "Medical budget relief for lowest earners", maxLS: 4.0, affectEveryone: true, proportion: 1.0, impact: 0.8 },
      { note: "Medical budget relief for middle earners", minLS: 4.1, maxLS: 6.5, affectEveryone: true, proportion: 1.0, impact: 0.3 },
      { note: "Strain on specialist availability", minLS: 7.0, affectEveryone: true, proportion: 1.0, impact: -0.15 }
    ]
  }
];