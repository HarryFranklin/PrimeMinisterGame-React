import { Policy } from "../utils/types";

export const availablePolicies: Policy[] = [
  // --- WELFARE & REDISTRIBUTION ---
  {
    id: "universal-credit-uplift",
    policyName: "Universal Credit Uplift",
    description: "A substantial financial boost targeting the poorest demographics. Highly popular with Equality advocates.",
    politicalCost: 15,
    specificRules: [
      { note: "High impact on Poor demographics", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 2.0 }
    ]
  },
  {
    id: "wealth-tax",
    policyName: "Mansion & Wealth Tax",
    description: "Heavily taxes the wealthiest percentiles to fund local services. Very popular with the working class, but panics the markets.",
    politicalCost: 8,
    specificRules: [
      { note: "Severe penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -2.5 },
      { note: "Boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 1.0 },
      { note: "Slight boost to Middle Class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 0.25 }
    ]
  },
  {
    id: "universal-basic-income",
    policyName: "Universal Basic Income",
    description: "A guaranteed baseline income for all citizens. Eradicates extreme poverty but requires an astronomical tax rate.",
    politicalCost: 25,
    specificRules: [
      { note: "Massive boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 3.5 },
      { note: "Boost to Youth & Students", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: 1.0 },
      { note: "Severe penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -3.0 }
    ]
  },

  // --- ECONOMY & INFRASTRUCTURE ---
  {
    id: "middle-income-tax-cut",
    policyName: "Middle-Income Tax Cut",
    description: "Reduces the tax burden, providing immediate relief for the middle class and boosting market confidence.",
    politicalCost: 12,
    specificRules: [
      { note: "Boost to Middle wealth demographic", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 0.8 }
    ]
  },
  {
    id: "public-transport-subsidy",
    policyName: "Nationalise & Subsidise Rail",
    description: "Massive investment in public transport. Slashes ticket prices for commuters and reduces carbon emissions.",
    politicalCost: 18,
    specificRules: [
      { note: "Massive boost for Commuters", targetDemographic: { isCommuter: true }, affectEveryone: false, proportion: 0.9, impact: 0.5},
      { note: "Boost for Environmentalists", targetDemographic: { isEnvironmentalist: true }, affectEveryone: false, proportion: 1.0, impact: 0.75 }
    ]
  },
  {
    id: "green-belt-housing",
    policyName: "Bulldoze Green Belt for Housing",
    description: "Solves the housing crisis by building over protected land. Great for young families, terrible for the environment and local homeowners.",
    politicalCost: 12,
    specificRules: [
      { note: "Boost to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Boost to Parents", targetDemographic: { isParent: true }, affectEveryone: true, proportion: 1.0, impact: 1.0 },
      { note: "Severe penalty to Environmentalists", targetDemographic: { isEnvironmentalist: true }, affectEveryone: true, proportion: 1.0, impact: -2.5 },
      { note: "Penalty to Wealthy (NIMBYs)", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -1.0 }
    ]
  },

  // --- AGE DEMOGRAPHICS (YOUTH VS ELDERLY) ---
  {
    id: "abolish-tuition-fees",
    policyName: "Abolish Tuition Fees",
    description: "Erases university debt. Transformative for students and youth, but requires heavy borrowing.",
    politicalCost: 20,
    specificRules: [
      { note: "Massive boost to Students", targetDemographic: { isStudent: true }, affectEveryone: true, proportion: 1.0, impact: 2.5 },
      { note: "General boost to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: false, proportion: 0.6, impact: 0.5 },
      { note: "Tax penalty absorbed by Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -0.5 }
    ]
  },
  {
    id: "subsidised-childcare",
    policyName: "Universal Free Childcare",
    description: "Provides 30 hours of free childcare. A lifeline for working parents, boosting the youth and middle-class metrics.",
    politicalCost: 16,
    specificRules: [
      { note: "Massive boost to Parents", targetDemographic: { isParent: true }, affectEveryone: true, proportion: 1.0, impact: 2.0 }
    ]
  },
  {
    id: "triple-lock-pension",
    policyName: "State Pension Triple-Lock",
    description: "Guarantees pension increases outpace inflation. Secures the elderly vote, but frustrates the youth bearing the tax burden.",
    politicalCost: 14,
    specificRules: [
      { note: "Major boost to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Frustration penalty to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: -0.5 }
    ]
  },

  // --- ENVIRONMENT ---
  {
    id: "green-energy-transition",
    policyName: "Aggressive Green Transition",
    description: "Heavily taxes fossil fuels to subsidise renewables. Environmentalists rejoice, but driving commuters are hit hard at the petrol pump.",
    politicalCost: 10,
    specificRules: [
      { note: "Massive boost to Environmentalists", targetDemographic: { isEnvironmentalist: true }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Fuel cost penalty to Commuters", targetDemographic: { isCommuter: true }, affectEveryone: true, proportion: 1.0, impact: -1.0 }
    ]
  },
  {
    id: "subsidise-fossil-fuels",
    policyName: "Subsidise Fossil Fuels",
    description: "Artificially lowers the price of petrol and energy. Relieves the cost of living but destroys international climate goals.",
    politicalCost: 10,
    specificRules: [
      { note: "Boost to Commuters", targetDemographic: { isCommuter: true }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Boost to Middle Class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 0.5 },
      { note: "Catastrophic penalty to Environmentalists", targetDemographic: { isEnvironmentalist: true }, affectEveryone: true, proportion: 1.0, impact: -3.5 }
    ]
  },

  // --- AUSTERITY (CAPITAL GENERATION) ---
  {
    id: "austerity-measures",
    policyName: "General Austerity Measures",
    description: "Slashes public services to regain political capital. Heavily penalises the vulnerable and frustrates the middle class.",
    politicalCost: -15, 
    specificRules: [
      { note: "Severe penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -2.0 },
      { note: "Moderate penalty to Middle Class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -0.75 }
    ]
  },
  {
    id: "cut-winter-fuel",
    policyName: "Means-Test Winter Fuel",
    description: "Strips the winter fuel allowance from most pensioners to balance the books. Generates capital but enrages the elderly.",
    politicalCost: -10,
    specificRules: [
      { note: "Severe penalty to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: -1.5 },
      { note: "Extra penalty to Poor Elderly", targetDemographic: { wealth: 'Poor', age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: -1.0 }
    ]
  },
  {
    id: "privatise-nhs",
    policyName: "Privatise Healthcare Sectors",
    description: "Sells off parts of the NHS. Generates massive capital and lowers taxes, but devastates the sick and elderly.",
    politicalCost: -18,
    specificRules: [
      { note: "Severe penalty to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: -3.0 },
      { note: "Penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -1.5 },
      { note: "Boost to Wealthy (Tax Relief)", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: 1.0 }
    ]
  },
  {
    id: "inheritance-tax-hike",
    policyName: "Aggressive Inheritance Tax",
    description: "Heavily taxes generational wealth transfers to fund the treasury. Extremely unpopular with the elderly and wealthy.",
    politicalCost: -12,
    specificRules: [
      { note: "Penalty to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: -2.0 },
      { note: "Penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -1.5 },
      { note: "Mild boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 0.5 }
    ]
  }
];