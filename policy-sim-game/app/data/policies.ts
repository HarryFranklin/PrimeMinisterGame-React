// app/data/policies.ts
import { Policy } from "../utils/types";

export const availablePolicies: Policy[] = [
  {
    id: "universal-credit-uplift",
    policyName: "Universal Credit Uplift",
    description: "A substantial financial boost targeting those struggling the most.",
    politicalCost: 15,
    specificRules: [
      {
        note: "High impact on lowest LS respondents",
        minLS: 0,
        maxLS: 4,
        affectEveryone: true,
        proportion: 1.0,
        impact: 2.0
      }
    ]
  },
  {
    id: "middle-income-tax-cut",
    policyName: "Middle-Income Tax Cut",
    description: "Reduces the tax burden for the middle of the population.",
    politicalCost: 12,
    specificRules: [
      {
        note: "Moderate boost to middle LS respondents",
        minLS: 4.5,
        maxLS: 7.5,
        affectEveryone: true,
        proportion: 1.0,
        impact: 1.0
      }
    ]
  },
  {
    id: "infrastructure-spend",
    policyName: "National Infrastructure Spend",
    description: "Improves transport and local facilities. A minor, widespread boost.",
    politicalCost: 10,
    specificRules: [
      {
        note: "Small universal boost",
        minLS: 0,
        maxLS: 10,
        affectEveryone: true,
        proportion: 1.0,
        impact: 0.5
      }
    ]
  },
  {
    id: "austerity-measures",
    policyName: "Austerity Measures",
    description: "Slashing public services to regain political capital. Heavily penalises the vulnerable.",
    politicalCost: -10, // Negative cost ADDS capital to the player
    specificRules: [
      {
        note: "Severe penalty to lower LS, minor penalty to middle",
        minLS: 0,
        maxLS: 6,
        affectEveryone: true,
        proportion: 1.0,
        impact: -1.5
      }
    ]
  }
];