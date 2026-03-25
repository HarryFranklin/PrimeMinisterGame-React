import { Policy } from "../utils/types";

export const availablePolicies: Policy[] = [
  // ==========================================
  // WELFARE & REDISTRIBUTION (High Rawlsian / Low Economy)
  // ==========================================
  {
    id: "universal-credit-uplift",
    policyName: "Universal Credit Uplift",
    description: "A substantial financial boost targeting the poorest demographics. Requires a slight increase in general taxation.",
    specificRules: [
      { note: "High impact on Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Tax burden on Middle Class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -0.2 },
      { note: "Tax burden on Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -0.5 }
    ]
  },
  {
    id: "wealth-tax",
    policyName: "Mansion & Wealth Tax",
    description: "Heavily taxes the wealthiest 10% to fund local services. Very popular with the working class, but panics the markets.",
    specificRules: [
      { note: "Severe penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -3.0 },
      { note: "Boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Slight boost to Middle Class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 0.5 }
    ]
  },
  {
    id: "universal-basic-income",
    policyName: "Universal Basic Income",
    description: "A guaranteed baseline income for all. Eradicates extreme poverty but triggers massive inflation and aggressive tax hikes on higher earners.",
    specificRules: [
      { note: "Massive boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 4.0 },
      { note: "Boost to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Inflation penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -1.0 },
      { note: "Severe tax penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -4.0 }
    ]
  },

  // ==========================================
  // ECONOMY, BUSINESS & AUSTERITY (High Economy / Low Rawlsian)
  // ==========================================
  {
    id: "middle-income-tax-cut",
    policyName: "Middle-Income Tax Cut",
    description: "Reduces the tax burden for the majority, boosting market confidence. Paid for by freezing welfare budgets.",
    specificRules: [
      { note: "Boost to Middle wealth", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 1.2 },
      { note: "Boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: 0.5 },
      { note: "Welfare freeze penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -0.8 }
    ]
  },
  {
    id: "austerity-measures",
    policyName: "General Austerity Measures",
    description: "Slashes public services to balance the national budget and cut taxes. Adored by fiscal conservatives, devastating to the vulnerable.",
    specificRules: [
      { note: "Severe penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -2.5 },
      { note: "Penalty to Elderly (Care cuts)", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: -1.0 },
      { note: "Tax relief boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Tax relief boost to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 0.5 }
    ]
  },
  {
    id: "privatise-nhs",
    policyName: "Privatise Healthcare Sectors",
    description: "Sells off parts of the NHS to private firms. Reduces wait times for those who can pay, but creates a two-tier health system.",
    specificRules: [
      { note: "Severe penalty to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: -3.0 },
      { note: "Severe penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -2.0 },
      { note: "Boost to Wealthy (Private Access)", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: 2.5 }
    ]
  },
  {
    id: "ai-deregulation",
    policyName: "AI & Tech Deregulation",
    description: "Removes red tape for tech corporations to boost GDP. Great for the economy, but creates massive job insecurity for the working classes.",
    specificRules: [
      { note: "Major boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Job insecurity penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -1.5 },
      { note: "Mild penalty to Adult workers", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 1.0, impact: -0.5 }
    ]
  },

  // ==========================================
  // AGE DEMOGRAPHICS: YOUTH VS ELDERLY
  // ==========================================
  {
    id: "abolish-tuition-fees",
    policyName: "Abolish Tuition Fees",
    description: "Erases university debt. Transformative for students and youth, but the cost is absorbed by older taxpayers.",
    specificRules: [
      { note: "Massive boost to Students", targetDemographic: { isStudent: true }, affectEveryone: true, proportion: 1.0, impact: 3.0 },
      { note: "General boost to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: false, proportion: 0.6, impact: 1.0 },
      { note: "Tax penalty to Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 1.0, impact: -0.5 },
      { note: "Tax penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -1.0 }
    ]
  },
  {
    id: "triple-lock-pension",
    policyName: "State Pension Triple-Lock",
    description: "Guarantees pension increases outpace inflation. Secures the elderly vote, but frustrates the working youth bearing the tax burden.",
    specificRules: [
      { note: "Major boost to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Frustration penalty to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: -0.8 },
      { note: "Tax penalty to working Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 1.0, impact: -0.5 }
    ]
  },
  {
    id: "national-care-service",
    policyName: "National Social Care Service",
    description: "State-funded elderly care. A lifeline for the elderly and their families, requiring a hefty national insurance hike.",
    specificRules: [
      { note: "Massive boost to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: 3.0 },
      { note: "Relief boost to Adults (carers)", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.3, impact: 1.0 }, // Helps 30% of adults who are carers
      { note: "Tax burden on Wealthy & Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -0.8 },
      { note: "Tax burden on Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -1.5 }
    ]
  },

  // ==========================================
  // INFRASTRUCTURE, ENVIRONMENT & HOUSING
  // ==========================================
  {
    id: "public-transport-subsidy",
    policyName: "Nationalise & Subsidise Rail",
    description: "Massive investment in public transport. Slashes ticket prices for commuters, paid for by general taxation.",
    specificRules: [
      { note: "Massive boost for Commuters", targetDemographic: { isCommuter: true }, affectEveryone: true, proportion: 1.0, impact: 2.0},
      { note: "Boost for Environmentalists", targetDemographic: { isEnvironmentalist: true }, affectEveryone: true, proportion: 1.0, impact: 1.0 },
      { note: "Tax penalty to Wealthy/Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -0.5 }
    ]
  },
  {
    id: "green-belt-housing",
    policyName: "Bulldoze Green Belt for Housing",
    description: "Solves the housing crisis by building over protected land. Great for young families, terrible for the environment and local property values.",
    specificRules: [
      { note: "Boost to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Boost to Parents", targetDemographic: { isParent: true }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Severe penalty to Environmentalists", targetDemographic: { isEnvironmentalist: true }, affectEveryone: true, proportion: 1.0, impact: -3.0 },
      { note: "Penalty to Wealthy (NIMBYs)", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -1.5 }
    ]
  },
  {
    id: "green-energy-transition",
    policyName: "Aggressive Green Transition",
    description: "Heavily taxes fossil fuels to subsidise renewables. Environmentalists rejoice, but driving commuters are hit hard at the petrol pump.",
    specificRules: [
      { note: "Massive boost to Environmentalists", targetDemographic: { isEnvironmentalist: true }, affectEveryone: true, proportion: 1.0, impact: 2.5 },
      { note: "Fuel cost penalty to Commuters", targetDemographic: { isCommuter: true }, affectEveryone: true, proportion: 1.0, impact: -1.5 },
      { note: "Cost of living penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -0.8 }
    ]
  },
  {
    id: "subsidise-fossil-fuels",
    policyName: "Subsidise Fossil Fuels",
    description: "Artificially lowers the price of petrol and energy. Relieves the cost of living for the masses but destroys international climate goals.",
    specificRules: [
      { note: "Boost to Commuters", targetDemographic: { isCommuter: true }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Relief boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 1.0 },
      { note: "Catastrophic penalty to Environmentalists", targetDemographic: { isEnvironmentalist: true }, affectEveryone: true, proportion: 1.0, impact: -4.0 }
    ]
  }
];