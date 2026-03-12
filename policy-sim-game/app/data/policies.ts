import { Policy } from "../utils/types";

export const availablePolicies: Policy[] = [
  // --- WELFARE & REDISTRIBUTION ---
  {
    id: "universal-credit-uplift",
    policyName: "Universal Credit Uplift",
    description: "A substantial financial boost targeting the poorest demographics. Highly popular with Equality advocates.",
    politicalCost: 15,
    specificRules: [
      {
        note: "High impact on Poor demographics",
        targetDemographic: { wealth: 'Poor' },
        affectEveryone: true,
        proportion: 1.0,
        impact: 2.0
      }
    ]
  },
  {
    id: "wealth-tax",
    policyName: "Mansion & Wealth Tax",
    description: "Heavily taxes the wealthiest percentiles to fund local services. Very popular with the working class, but panics the markets.",
    politicalCost: 8,
    specificRules: [
      {
        note: "Severe penalty to Wealthy",
        targetDemographic: { wealth: 'Wealthy' },
        affectEveryone: true,
        proportion: 1.0,
        impact: -2.5
      },
      {
        note: "Boost to Poor",
        targetDemographic: { wealth: 'Poor' },
        affectEveryone: true,
        proportion: 1.0,
        impact: 1.0
      },
      {
        note: "Slight boost to Middle Class",
        targetDemographic: { wealth: 'Middle' },
        affectEveryone: true,
        proportion: 1.0,
        impact: 0.25
      }
    ]
  },

  // --- ECONOMY & INFRASTRUCTURE ---
  {
    id: "middle-income-tax-cut",
    policyName: "Middle-Income Tax Cut",
    description: "Reduces the tax burden, providing immediate relief for the middle class and boosting market confidence.",
    politicalCost: 12,
    specificRules: [
      {
        note: "Boost to Middle wealth demographic",
        targetDemographic: { wealth: 'Middle' },
        affectEveryone: true,
        proportion: 1.0,
        impact: 1.0
      }
    ]
  },
  {
    id: "public-transport-subsidy",
    policyName: "Nationalise & Subsidise Rail",
    description: "Massive investment in public transport. Slashes ticket prices for commuters and reduces carbon emissions.",
    politicalCost: 18,
    specificRules: [
      {
        note: "Massive boost for Commuters",
        targetDemographic: { isCommuter: true },
        affectEveryone: true,
        proportion: 1.0,
        impact: 1.5
      },
      {
        note: "Boost for Environmentalists",
        targetDemographic: { isEnvironmentalist: true },
        affectEveryone: true,
        proportion: 1.0,
        impact: 0.75
      }
    ]
  },

  // --- AGE DEMOGRAPHICS (YOUTH VS ELDERLY) ---
  {
    id: "abolish-tuition-fees",
    policyName: "Abolish Tuition Fees",
    description: "Erases university debt. Transformative for students and youth, but requires heavy borrowing.",
    politicalCost: 20,
    specificRules: [
      {
        note: "Massive boost to Students",
        targetDemographic: { isStudent: true },
        affectEveryone: true,
        proportion: 1.0,
        impact: 3.0
      },
      {
        note: "General boost to Youth",
        targetDemographic: { age: 'Youth' },
        affectEveryone: true,
        proportion: 1.0,
        impact: 0.5
      },
      {
        note: "Tax penalty absorbed by Wealthy",
        targetDemographic: { wealth: 'Wealthy' },
        affectEveryone: true,
        proportion: 1.0,
        impact: -0.5
      }
    ]
  },
  {
    id: "subsidised-childcare",
    policyName: "Universal Free Childcare",
    description: "Provides 30 hours of free childcare. A lifeline for working parents, boosting the youth and middle-class metrics.",
    politicalCost: 16,
    specificRules: [
      {
        note: "Massive boost to Parents",
        targetDemographic: { isParent: true },
        affectEveryone: true,
        proportion: 1.0,
        impact: 2.0
      }
    ]
  },
  {
    id: "triple-lock-pension",
    policyName: "State Pension Triple-Lock",
    description: "Guarantees pension increases outpace inflation. Secures the elderly vote, but frustrates the youth bearing the tax burden.",
    politicalCost: 14,
    specificRules: [
      {
        note: "Major boost to Elderly",
        targetDemographic: { age: 'Elderly' },
        affectEveryone: true,
        proportion: 1.0,
        impact: 1.5
      },
      {
        note: "Frustration penalty to Youth",
        targetDemographic: { age: 'Youth' },
        affectEveryone: true,
        proportion: 1.0,
        impact: -0.5
      }
    ]
  },

  // --- ENVIRONMENT ---
  {
    id: "green-energy-transition",
    policyName: "Aggressive Green Transition",
    description: "Heavily taxes fossil fuels to subsidise renewables. Environmentalists rejoice, but driving commuters are hit hard at the petrol pump.",
    politicalCost: 10,
    specificRules: [
      {
        note: "Massive boost to Environmentalists",
        targetDemographic: { isEnvironmentalist: true },
        affectEveryone: true,
        proportion: 1.0,
        impact: 2.0
      },
      {
        note: "Fuel cost penalty to Commuters",
        targetDemographic: { isCommuter: true },
        affectEveryone: true,
        proportion: 1.0,
        impact: -1.0
      }
    ]
  },

  // --- AUSTERITY (CAPITAL GENERATION) ---
  {
    id: "austerity-measures",
    policyName: "General Austerity Measures",
    description: "Slashes public services to regain political capital. Heavily penalises the vulnerable and frustrates the middle class.",
    politicalCost: -15, 
    specificRules: [
      {
        note: "Severe penalty to Poor",
        targetDemographic: { wealth: 'Poor' },
        affectEveryone: true,
        proportion: 1.0,
        impact: -2.0
      },
      {
        note: "Moderate penalty to Middle Class",
        targetDemographic: { wealth: 'Middle' },
        affectEveryone: true,
        proportion: 1.0,
        impact: -0.75
      }
    ]
  },
  {
    id: "cut-winter-fuel",
    policyName: "Means-Test Winter Fuel",
    description: "Strips the winter fuel allowance from most pensioners to balance the books. Generates capital but enrages the elderly.",
    politicalCost: -10,
    specificRules: [
      {
        note: "Severe penalty to Elderly",
        targetDemographic: { age: 'Elderly' },
        affectEveryone: true,
        proportion: 1.0,
        impact: -1.5
      },
      {
        note: "Extra penalty to Poor Elderly",
        targetDemographic: { wealth: 'Poor', age: 'Elderly' },
        affectEveryone: true,
        proportion: 1.0,
        impact: -1.0
      }
    ]
  }
];