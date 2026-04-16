import { Policy } from "../utils/types";

export const availablePolicies: Policy[] = [
  // ==========================================
  // WEALTH & REDISTRIBUTION (Rawlsian focus)
  // ==========================================
  {
    id: "universal-credit-uplift",
    policyName: "Universal Credit Uplift",
    description: "A financial boost targeting the poorest demographics. Requires a slight increase in general taxation.",
    specificRules: [
      { note: "High impact on Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Tax burden on Middle Class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -0.1 },
      { note: "Tax burden on Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -0.3 }
    ]
  },
  {
    id: "wealth-tax",
    policyName: "Mansion & Wealth Tax",
    description: "Heavily taxes the wealthiest 10% to fund local services. Popular with the working class, but panics the markets.",
    specificRules: [
      { note: "Severe penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -1.5 },
      { note: "Boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Slight boost to Middle Class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 0.5 }
    ]
  },
  {
    id: "capital-gains-hike",
    policyName: "Equalise Capital Gains",
    description: "Taxes wealth generation at the same rate as income. Closes loopholes for the rich to fund social housing.",
    specificRules: [
      { note: "Penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -1.0 },
      { note: "Housing boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.5, impact: 1.5 }, 
    ]
  },
  {
    id: "minimum-wage-surge",
    policyName: "Aggressive Minimum Wage Hike",
    description: "Forces businesses to significantly raise baseline pay. Great for the lowest earners, but causes some business closures.",
    specificRules: [
      { note: "Boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 2.2 },
      { note: "Profit penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -0.8 },
      { note: "Inflation penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -0.2 }
    ]
  },
  {
    id: "universal-basic-income",
    policyName: "Universal Basic Income Pilot",
    description: "A guaranteed baseline income for all. Eradicates extreme poverty but triggers inflation and aggressive tax hikes.",
    specificRules: [
      { note: "Massive boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: 3.0 },
      { note: "Inflation penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -0.5 },
      { note: "Severe tax penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -1.5 }
    ]
  },

  // ==========================================
  // ECONOMY & AUSTERITY (Benthamite focus)
  // ==========================================
  {
    id: "middle-income-tax-cut",
    policyName: "Middle-Income Tax Cut",
    description: "Reduces the tax burden for the majority, boosting market confidence. Paid for by freezing welfare budgets.",
    specificRules: [
      { note: "Boost to Middle wealth", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 1.5 },
      { note: "Boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: 0.8 },
      { note: "Welfare freeze penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -0.5 }
    ]
  },
  {
    id: "austerity-measures",
    policyName: "General Austerity Measures",
    description: "Slashes public services to balance the national budget and cut taxes. Adored by fiscal conservatives, devastating to the vulnerable.",
    specificRules: [
      { note: "Severe penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -1.5 },
      { note: "Tax relief boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Tax relief boost to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: 0.8 }
    ]
  },
  {
    id: "corporate-deregulation",
    policyName: "Corporate Deregulation",
    description: "Removes red tape to spur rapid economic growth. Highly profitable for business owners, but erodes worker protections.",
    specificRules: [
      { note: "Major boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: 2.5 },
      { note: "Worker protection penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -0.8 },
      { note: "Worker protection penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -0.3 }
    ]
  },
  {
    id: "vat-increase",
    policyName: "Increase VAT",
    description: "A flat tax increase on goods and services to pay down national debt. Disproportionately affects lower earners.",
    specificRules: [
      { note: "Penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 1.0, impact: -1.0 },
      { note: "Penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 1.0, impact: -0.5 },
      { note: "Slight penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 1.0, impact: -0.1 }
    ]
  },

  // ==========================================
  // AGE DEMOGRAPHICS: YOUTH VS ADULT VS ELDERLY
  // ==========================================
  {
    id: "triple-lock-pension",
    policyName: "State Pension Triple-Lock",
    description: "Guarantees pension increases outpace inflation. Secures the elderly, but frustrates the working youth bearing the tax burden.",
    specificRules: [
      { note: "Major boost to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Frustration penalty to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: -0.4 },
      { note: "Tax penalty to working Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 1.0, impact: -0.2 }
    ]
  },
  {
    id: "abolish-tuition-fees",
    policyName: "Abolish Tuition Fees",
    description: "Erases university debt for the next generation. Transformative for youth, but the cost is absorbed by older taxpayers.",
    specificRules: [
      { note: "Massive boost to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: 2.5 },
      { note: "Tax penalty to Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 1.0, impact: -0.3 },
      { note: "Tax penalty to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: -0.2 }
    ]
  },
  {
    id: "social-care-levy",
    policyName: "National Social Care Levy",
    description: "A tax specifically on working-age adults to properly fund care homes and support for the ageing population.",
    specificRules: [
      { note: "Major boost to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: 2.2 },
      { note: "Tax penalty to Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 1.0, impact: -0.6 },
      { note: "Tax penalty to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: -0.3 }
    ]
  },
  {
    id: "free-childcare",
    policyName: "Universal Free Childcare",
    description: "Massive state subsidy for childcare. Highly liberates working-age adults, paid for by taxing pension pots.",
    specificRules: [
      { note: "Major boost to Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 1.0, impact: 2.0 },
      { note: "Pension tax penalty to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: -0.8 }
    ]
  },
  {
    id: "first-time-buyer-grant",
    policyName: "First-Time Buyer Grant",
    description: "State grants to help young people get on the property ladder. Drives up house prices, frustrating older renters.",
    specificRules: [
      { note: "Boost to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: 1.8 },
      { note: "House price penalty to renting Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.4, impact: -0.5 }, 
      { note: "Wealth boost to property-owning Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.8, impact: 0.8 }
    ]
  },
  {
    id: "winter-fuel-cuts",
    policyName: "Means-Test Winter Fuel Allowance",
    description: "Strips the winter heating subsidy from wealthier pensioners to save money for the national budget.",
    specificRules: [
      { note: "Penalty to Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 1.0, impact: -0.8 },
      { note: "Slight economic relief to Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 1.0, impact: 0.3 },
      { note: "Slight economic relief to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 1.0, impact: 0.3 }
    ]
  }
];