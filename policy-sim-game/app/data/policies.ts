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
      { note: "High impact on bottom tail", maxLS: 4.0, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Tax burden on upper half", minLS: 5.0, affectEveryone: true, proportion: 1.0, impact: -0.15 }
    ]
  },
  {
    id: "wealth-tax",
    policyName: "Aggressive Wealth Tax",
    description: "Heavily taxes the top 10% to fund community services for the bottom 30%. Highly effective at closing the inequality gap.",
    specificRules: [
      { note: "Severe penalty to highest LS", minLS: 8.5, affectEveryone: true, proportion: 1.0, impact: -1.1 },
      { note: "Boost to lowest LS", maxLS: 4.5, affectEveryone: true, proportion: 1.0, impact: 1.1 }
    ]
  },
  {
    id: "minimum-wage-surge",
    policyName: "Statutory Minimum Wage Hike",
    description: "Forces businesses to raise baseline pay. Greatly improves the lower-middle distribution, but squeezes corporate margins at the top.",
    specificRules: [
      { note: "Boost to lower-middle", minLS: 2.0, maxLS: 5.5, affectEveryone: true, proportion: 1.0, impact: 1.2 },
      { note: "Profit penalty to top end", minLS: 7.5, affectEveryone: true, proportion: 1.0, impact: -0.6 }
    ]
  },
  {
    id: "social-housing-blitz",
    policyName: "Social Housing Expansion",
    description: "A state-funded building programme for affordable housing units, providing immense stability to those currently at the societal floor.",
    specificRules: [
      { note: "Massive security for lowest LS", maxLS: 3.5, affectEveryone: true, proportion: 1.0, impact: 1.9 },
      { note: "Minor tax penalty to upper-middle", minLS: 6.5, maxLS: 8.5, affectEveryone: true, proportion: 1.0, impact: -0.2 }
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
      { note: "Boost to middle distribution", minLS: 4.5, maxLS: 8.0, affectEveryone: true, proportion: 1.0, impact: 0.8 },
      { note: "Welfare freeze penalty to bottom", maxLS: 3.5, affectEveryone: true, proportion: 1.0, impact: -0.5 }
    ]
  },
  {
    id: "corporate-deregulation",
    policyName: "Corporate Deregulation",
    description: "Removes statutory compliance barriers to spur rapid growth. Heavily boosts the top end, mildly boosts the middle, but erodes protections for the lowest percentiles.",
    specificRules: [
      { note: "Major boost to top", minLS: 8.0, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Minor boost to middle", minLS: 5.0, maxLS: 7.9, affectEveryone: true, proportion: 0.5, impact: 0.4 },
      { note: "Protection erosion penalty to bottom", maxLS: 4.5, affectEveryone: true, proportion: 1.0, impact: -0.6 }
    ]
  },
  {
    id: "infrastructure-bonds",
    policyName: "Special Enterprise Zones",
    description: "Launches high-yield regional business zones. Drives aggregate metrics upward but causes localised disruption.",
    specificRules: [
      { note: "Gains for upper half", minLS: 6.0, affectEveryone: true, proportion: 1.0, impact: 0.9 },
      { note: "Displacement penalty to lowest segment", maxLS: 3.0, affectEveryone: true, proportion: 0.4, impact: -0.4 }
    ]
  },
  {
    id: "universal-basic-income",
    policyName: "Universal Basic Income Pilot",
    description: "A guaranteed baseline income for all citizens. Shifts the entire distribution upwards, funded by a flat penalty to the top tier.",
    specificRules: [
      { note: "Boost to bottom half", maxLS: 5.5, affectEveryone: true, proportion: 1.0, impact: 1.4 },
      { note: "Boost to middle", minLS: 5.6, maxLS: 7.5, affectEveryone: true, proportion: 1.0, impact: 0.5 },
      { note: "Penalty to top tier", minLS: 8.5, affectEveryone: true, proportion: 1.0, impact: -1.2 }
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
      { note: "Massive relief to a random 20% of the middle", minLS: 4.0, maxLS: 7.0, affectEveryone: false, proportion: 0.2, impact: 1.8 },
      { note: "Minor tax burden on top half", minLS: 6.0, affectEveryone: true, proportion: 1.0, impact: -0.15 }
    ]
  },
  {
    id: "commuter-rail-subsidies",
    policyName: "Commuter Fare Hard Caps",
    description: "Imposes strict national rail season ticket price limits. Alleviates stress for a large portion of the middle distribution.",
    specificRules: [
      { note: "Transit cost reduction for middle", minLS: 4.5, maxLS: 7.5, affectEveryone: false, proportion: 0.6, impact: 0.9 },
      { note: "Infrastructure drag for the rest", affectEveryone: true, proportion: 1.0, impact: -0.1 }
    ]
  },
  {
    id: "healthcare-backlog-blitz",
    policyName: "Elective Surgery Backlog Drive",
    description: "Surges regional hospital funding to eliminate waiting queues. Provides a massive quality of life increase to a small, randomly distributed segment.",
    specificRules: [
      { note: "Health mobility restored", affectEveryone: false, proportion: 0.15, impact: 2.2 },
      { note: "General tax cost", affectEveryone: true, proportion: 1.0, impact: -0.2 }
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
      { note: "Cost surge penalty to top", minLS: 7.5, affectEveryone: true, proportion: 1.0, impact: -0.7 },
      { note: "Environmental equity reward for bottom", maxLS: 4.5, affectEveryone: true, proportion: 1.0, impact: 0.4 }
    ]
  },
  {
    id: "community-policing-surge",
    policyName: "Neighbourhood Policing Revival",
    description: "Deploys foot-patrol officers to high-density areas. Alleviates vulnerability indexes significantly for those at the bottom of the distribution.",
    specificRules: [
      { note: "High safety value to lowest LS", maxLS: 3.5, affectEveryone: true, proportion: 1.0, impact: 1.2 },
      { note: "Minor property protection clarity for middle", minLS: 4.0, maxLS: 6.5, affectEveryone: false, proportion: 0.5, impact: 0.4 }
    ]
  },
  {
    id: "arts-funding-redirection",
    policyName: "Metropolitan Arts Council Pivot",
    description: "Defunds central opera houses to allocate micro-grants for community visual art programmes. Shifts wellbeing from the top to the lower-middle.",
    specificRules: [
      { note: "Loss of prestige events for top", minLS: 8.0, affectEveryone: true, proportion: 1.0, impact: -0.5 },
      { note: "Grassroots access for lower-middle", minLS: 3.0, maxLS: 5.5, affectEveryone: true, proportion: 1.0, impact: 0.6 }
    ]
  },
  {
    id: "prescription-charge-exemption",
    policyName: "Universal Prescription Fee Exemptions",
    description: "Bypasses all standard drug dispensing transaction charges across public pharmacies. Smooths out the lower half of the curve.",
    specificRules: [
      { note: "Immediate budget relief for bottom", maxLS: 4.0, affectEveryone: true, proportion: 1.0, impact: 0.8 },
      { note: "Regular medical budget ease for middle", minLS: 4.1, maxLS: 6.5, affectEveryone: true, proportion: 1.0, impact: 0.3 }
    ]
  }
];