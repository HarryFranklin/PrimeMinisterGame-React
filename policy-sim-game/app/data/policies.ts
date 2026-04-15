import { Policy } from "../utils/types";

export const availablePolicies: Policy[] = [
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
    description: "A guaranteed baseline income for all. Eradicates extreme poverty but triggers inflation and aggressive tax hikes.",
    specificRules: [
      { note: "Massive boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 4.0 },
      { note: "Inflation penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -1.0 },
      { note: "Severe tax penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -4.0 }
    ]
  },
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
      { note: "Tax relief boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Tax relief boost to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 0.5 }
    ]
  },
  {
    id: "triple-lock-pension",
    policyName: "State Pension Triple-Lock",
    description: "Guarantees pension increases outpace inflation. Secures the elderly, but frustrates the working youth bearing the tax burden.",
    specificRules: [
      { note: "Major boost to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Frustration penalty to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: -0.8 },
      { note: "Tax penalty to working Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 1.0, impact: -0.5 }
    ]
  }
];