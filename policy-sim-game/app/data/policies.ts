import { Policy } from "../utils/types";

export const availablePolicies: Policy[] = [
  // ==========================================
  // WEALTH & REDISTRIBUTION (Rawlsian Focus)
  // ==========================================
  {
    id: "universal-credit-uplift",
    policyName: "Universal Credit Uplift",
    description: "A financial boost targeting the poorest demographics. Requires a slight increase in general taxation.",
    specificRules: [
      { note: "High impact on Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 1.5 },
      { note: "Tax burden on Middle Class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: -0.1 },
      { note: "Tax burden on Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -0.2 }
    ]
  },
  {
    id: "wealth-tax",
    policyName: "Mansion & Wealth Tax",
    description: "Heavily taxes the wealthiest 10% to fund local community services. Popular with the working class, but causes market anxiety.",
    specificRules: [
      { note: "Severe penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -1.1 },
      { note: "Boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 1.1 },
      { note: "Slight boost to Middle Class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: 0.4 }
    ]
  },
  {
    id: "capital-gains-hike",
    policyName: "Equalise Capital Gains",
    description: "Taxes wealth generation from investments at the same rate as earned income to fund local social housing initiatives.",
    specificRules: [
      { note: "Penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -0.75 },
      { note: "Housing boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.45, impact: 1.1 }
    ]
  },
  {
    id: "minimum-wage-surge",
    policyName: "Aggressive Minimum Wage Hike",
    description: "Forces businesses to significantly raise baseline statutory pay. Great for the lowest earners, but squeezes corporate margins.",
    specificRules: [
      { note: "Boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 1.6 },
      { note: "Profit penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -0.6 },
      { note: "Inflation penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: -0.15 }
    ]
  },
  {
    id: "universal-basic-income",
    policyName: "Universal Basic Income Pilot",
    description: "A guaranteed baseline income for all citizens. Directly alleviates extreme poverty but triggers aggressive tax corrections.",
    specificRules: [
      { note: "Massive boost to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 2.2 },
      { note: "Inflation penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: -0.4 },
      { note: "Severe tax penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -1.1 }
    ]
  },
  {
    id: "social-housing-blitz",
    policyName: "Social Housing Expansion",
    description: "A state-funded building programme for affordable housing units. Funded via luxury stamp duty adjustments.",
    specificRules: [
      { note: "Massive security for Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 1.9 },
      { note: "Property tax penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -0.5 }
    ]
  },
  {
    id: "energy-bill-subsidy",
    policyName: "Targeted Energy Tariffs",
    description: "Imposes price caps on domestic energy for lower-income households, subsidised by windfall taxes on energy giants.",
    specificRules: [
      { note: "Relief to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 0.9 },
      { note: "Windfall penalty to Wealthy investors", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -0.3 }
    ]
  },

  // ==========================================
  // ECONOMY & BUDGET CONTROL (Benthamite Focus)
  // ==========================================
  {
    id: "middle-income-tax-cut",
    policyName: "Middle-Income Tax Cut",
    description: "Reduces the basic tax rate for the majority of working citizens, boosting market confidence at the expense of social budgets.",
    specificRules: [
      { note: "Boost to Middle wealth", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: 1.1 },
      { note: "Boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: 0.6 },
      { note: "Welfare freeze penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: -0.4 }
    ]
  },
  {
    id: "austerity-measures",
    policyName: "General Austerity Measures",
    description: "Slashes public service spending to balance the national budget and reduce borrowing requirements.",
    specificRules: [
      { note: "Severe service cut penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: -1.1 },
      { note: "Market confidence boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: 1.5 },
      { note: "Tax reduction potential for Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: 0.6 }
    ]
  },
  {
    id: "corporate-deregulation",
    policyName: "Corporate Deregulation",
    description: "Removes red tape and statutory compliance barriers to spur rapid gross domestic product growth.",
    specificRules: [
      { note: "Major business profit boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: 1.9 },
      { note: "Protection erosion penalty to Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: -0.6 },
      { note: "Protection erosion penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: -0.2 }
    ]
  },
  {
    id: "vat-increase",
    policyName: "Increase Value Added Tax",
    description: "Raises a flat consumption tax on goods and services to aggressively pay down national debt obligations.",
    specificRules: [
      { note: "Regressive tax burden on Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: -0.75 },
      { note: "Consumption penalty to Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: -0.4 },
      { note: "Negligible penalty to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -0.1 }
    ]
  },
  {
    id: "infrastructure-bonds",
    policyName: "Special Enterprise Zones",
    description: "Launches high-yield regional business zones. Drives aggregate job metrics upward while disrupting local green spaces.",
    specificRules: [
      { note: "Investment gains for Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: 1.3 },
      { note: "Employment options for Middle", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: 0.9 },
      { note: "Displacement penalty to local Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.25, impact: -0.3 }
    ]
  },
  {
    id: "foreign-investment-incentives",
    policyName: "Foreign Investment Subsidies",
    description: "Offers tax breaks to multinational tech companies establishing headquarters in major urban centers.",
    specificRules: [
      { note: "High-paying jobs for Middle class", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.35, impact: 1.2 },
      { note: "Commercial real estate asset boost to Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: 1.0 }
    ]
  },

  // ==========================================
  // AGE DEMOGRAPHICS: YOUTH FOCUS
  // ==========================================
  {
    id: "abolish-tuition-fees",
    policyName: "Abolish Higher Education Fees",
    description: "Erases state university tuition debt caps for future students. Highly popular among younger age cohorts.",
    specificRules: [
      { note: "Massive cost relief to Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: 1.9 },
      { note: "Tax adjustments for Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: -0.2 },
      { note: "Tax adjustments for Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: -0.15 }
    ]
  },
  {
    id: "first-time-buyer-grant",
    policyName: "First-Time Buyer Equity Grants",
    description: "Provides state-backed cash deposits to help young people buy their first residential property.",
    specificRules: [
      { note: "Asset access boost for Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: 1.3 },
      { note: "Market inflation penalty to renting Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.35, impact: -0.4 },
      { note: "Portfolio valuation boost to property-owning Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.7, impact: 0.6 }
    ]
  },
  {
    id: "youth-mental-health",
    policyName: "School Mental Health Support Centres",
    description: "Establishes a dedicated resilience counsellor network across public secondary educational institutions.",
    specificRules: [
      { note: "Targeted clinical support for Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: 1.5 },
      { note: "Slight tax coverage from Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: -0.1 }
    ]
  },
  {
    id: "apprenticeship-guarantee",
    policyName: "National Apprenticeship Expansion",
    description: "Subsidises technical job placement schemes for 18-24 year olds struggling to enter competitive job pathways.",
    specificRules: [
      { note: "Career path unlock for Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: 1.3 },
      { note: "Levy cost adjustments for corporate Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.45, impact: -0.2 }
    ]
  },
  {
    id: "digital-skills-bounty",
    policyName: "Young Software Creators Grant",
    description: "Distributes software development kits and prototyping micro-grants directly to students in state code clubs.",
    specificRules: [
      { note: "Skills capital for Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: 1.0 }
    ]
  },

  // ==========================================
  // AGE DEMOGRAPHICS: WORKING ADULTS FOCUS
  // ==========================================
  {
    id: "free-childcare",
    policyName: "Universal Free Childcare Expansion",
    description: "Implements substantial state subsidies for child nursery placement, enabling parent career flexibility.",
    specificRules: [
      { note: "Workplace liberation and financial relief for Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: 1.5 },
      { note: "Fiscal burden offset via non-working Elderly asset rates", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: -0.6 }
    ]
  },
  {
    id: "commuter-rail-subsidies",
    policyName: "Commuter Fare Hard Caps",
    description: "Imposes strict national rail season ticket price limits to alleviate transit stress for daily suburban professionals.",
    specificRules: [
      { note: "Transit cost reduction for working Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: 1.1 },
      { note: "Infrastructure development drag for Youth future lines", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: -0.2 }
    ]
  },
  {
    id: "working-tax-credits",
    policyName: "Working Tax Credit Adjustments",
    description: "Boosts secondary earner allowances to support dual-income working households managing high mortgages.",
    specificRules: [
      { note: "Disposable margin boost for Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: 1.0 }
    ]
  },
  {
    id: "mid-career-retraining",
    policyName: "Mid-Career Skills Bootcamps",
    description: "Funded evening and weekend modern manufacturing workshops designed to help structural workers pivot fields.",
    specificRules: [
      { note: "Redundancy protection safety net for Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.55, impact: 1.0 }
    ]
  },
  {
    id: "flexible-working-mandate",
    policyName: "Statutory Flexible Working Rights",
    description: "Legal protections securing compressed hour requests for standard corporate office contract positions.",
    specificRules: [
      { note: "Work-life balance optimization for Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: 0.8 }
    ]
  },

  // ==========================================
  // AGE DEMOGRAPHICS: ELDERLY FOCUS
  // ==========================================
  {
    id: "triple-lock-pension",
    policyName: "State Pension Triple-Lock Protect",
    description: "Guarantees base state pension increases consistently outpace the cost of consumer product indexing metrics.",
    specificRules: [
      { note: "Protected cost insulation for Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: 1.5 },
      { note: "Opportunity cost frustration for Youth allocations", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: -0.3 },
      { note: "Tax contributions burdening working Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: -0.15 }
    ]
  },
  {
    id: "social-care-levy",
    policyName: "National Social Care Levy",
    description: "Directs a structural payroll tax adjustment exclusively toward care home support systems.",
    specificRules: [
      { note: "Substantial welfare and residency stability for Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: 1.6 },
      { note: "Net take-home cash reduction for standard Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: -0.45 },
      { note: "Net entry wage adjustment for Youth roles", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: -0.2 }
    ]
  },
  {
    id: "winter-fuel-cuts",
    policyName: "Means-Test Winter Fuel Allowance",
    description: "Strips universal winter heating allowances from wealthier retirees to reclaim baseline treasury capacity.",
    specificRules: [
      { note: "Financial utility loss for affected Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: -0.6 },
      { note: "Marginal reallocated fiscal relief for Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: 0.1 },
      { note: "Marginal reallocated fiscal relief for Youth services", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: 0.1 }
    ]
  },
  {
    id: "sheltered-housing-subsidies",
    policyName: "Sheltered Wardened Living Capital",
    description: "Invests in specialised community bungalows featuring linked on-call emergency response telemetry loops.",
    specificRules: [
      { note: "Loneliness drop and health safety for Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: 1.4 }
    ]
  },
  {
    id: "cataract-backlog-blitz",
    policyName: "Elective Surgery Backlog Drive",
    description: "Surges regional hospital theatre funding blocks exclusively to eliminate ophthalmology waiting queues.",
    specificRules: [
      { note: "Vision clarity and life mobility restored for Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.6, impact: 1.6 }
    ]
  },

  // ==========================================
  // HYBRID & TRADE-OFF SCENARIOS (Societal Utility)
  // ==========================================
  {
    id: "green-transition-levy",
    policyName: "Carbon Emission Fuel Levy",
    description: "Imposes a direct surcharge on aviation fuel to fund decarbonisation tech. Hits holidaying classes while pleasing green idealists.",
    specificRules: [
      { note: "Cost surge penalty to travel-heavy Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -0.45 },
      { note: "Cost adjustment friction for baseline Middle families", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: -0.2 },
      { note: "Air filtration environmental equity reward for Poor urban belts", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 0.6 }
    ]
  },
  {
    id: "community-policing-surge",
    policyName: "Neighbourhood Policing Revival",
    description: "Deploys foot-patrol officers to high-density council estates. Alleviates urban vulnerability indexes significantly.",
    specificRules: [
      { note: "High safety value to vulnerable urban Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 1.2 },
      { note: "Property protection clarity for urban Middle businesses", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: 0.45 }
    ]
  },
  {
    id: "rural-bus-nationalisation",
    policyName: "Rural Bus Route Subsidisation",
    description: "Restores unprofitable transit connections linking isolated towns. Vital lifeline for non-driving pensioners and youth.",
    specificRules: [
      { note: "Isolation reduction for rural Elderly", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.45, impact: 1.0 },
      { note: "Transit autonomy boost for rural Youth cohorts", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.45, impact: 1.0 }
    ]
  },
  {
    id: "arts-funding-redirection",
    policyName: "Metropolitan Arts Council Pivot",
    description: "Defunds central opera houses in major cities to allocate micro-grants for community visual art programmes across town libraries.",
    specificRules: [
      { note: "Loss of prestige luxury events for high-end Wealthy", targetDemographic: { wealth: 'Wealthy' }, affectEveryone: true, proportion: 0.9, impact: -0.4 },
      { note: "Grassroots access and local hobby groups for Poor communities", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 0.7 }
    ]
  },
  {
    id: "agricultural-tech-grants",
    policyName: "Sustainable Farm Technology Grants",
    description: "Funds high-tech vertical farming trials. Helps secure long-term food chains while causing corporate land-lease resets.",
    specificRules: [
      { note: "Farming management security for regional Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.2, impact: 0.9 }
    ]
  },
  {
    id: "leisure-centre-renovation",
    policyName: "Municipal Leisure Centre Rebuilds",
    description: "Replaces decaying council pool architecture with highly efficient multi-sport gyms available via community referral cards.",
    specificRules: [
      { note: "Affordable recreational activity for local Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 0.8 },
      { note: "Health and social mixing hub for local Middle users", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: 0.5 }
    ]
  },
  {
    id: "high-street-regeneration",
    policyName: "Town Centre High Street Reclamation",
    description: "Imposes compulsory state purchase orders on long-term derelict mega-storefronts to transform them into indoor markets.",
    specificRules: [
      { note: "Trading incubator spaces for entrepreneurial Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.25, impact: 1.1 },
      { note: "Community destination space for nearby Elderly folks", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: 0.6 }
    ]
  },
  {
    id: "clean-air-zones",
    policyName: "Low Emission Congestion Boundaries",
    description: "Charges older inner-city delivery vans a transit fee. Cleans toxic playground corridors but spikes transport fleet operating budgets.",
    specificRules: [
      { note: "Asthma risk drop for inner-city primary Youth groups", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.9, impact: 1.0 },
      { note: "Fleet overhead compliance tension for trading Adults", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.7, impact: -0.3 }
    ]
  },
  {
    id: "hospital-parking-free",
    policyName: "Abolish Hospital Visitor Parking Fees",
    description: "Makes all regional health institution vehicle space free. Removes transactional stress for visiting families, paid from core nursing staff allowances.",
    specificRules: [
      { note: "Visiting relief for treating Adults with chronic relations", targetDemographic: { age: 'Adult' }, affectEveryone: true, proportion: 0.9, impact: 0.6 },
      { note: "Frequent clinic transit savings for medical Elderly patients", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: 0.75 }
    ]
  },
  {
    id: "gig-economy-rights",
    policyName: "Gig-Worker Statutory Sick Pay Caps",
    description: "Forces fast-food distribution couriers to register structured base sick allocations. Increases courier baseline health security but raises meal ordering apps costs.",
    specificRules: [
      { note: "Safety net coverage for student-age Youth riders", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.55, impact: 1.1 },
      { note: "Ordering premium cost adjustments on takeaway Middle food items", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: -0.15 }
    ]
  },
  {
    id: "library-digital-hubs",
    policyName: "Library Network Tech Infrastructure",
    description: "Surges regional capital blocks to install modern fiber pipelines inside every community archive facility.",
    specificRules: [
      { note: "Quiet workspace and learning nodes for low-income Youth", targetDemographic: { age: 'Youth' }, affectEveryone: true, proportion: 0.7, impact: 0.9 },
      { note: "IT literacy group sessions for offline Elderly individuals", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: 0.8 }
    ]
  },
  {
    id: "cooperative-energy-grants",
    policyName: "Community Owned Solar Cooperative Grants",
    description: "Directs seed funding to let village groups collectively buy and exploit fields with solar panels.",
    specificRules: [
      { note: "Long-term localized electric billing drops for Middle owners", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.35, impact: 0.7 }
    ]
  },
  {
    id: "prescription-charge-exemption",
    policyName: "Universal Prescription Fee Exemptions",
    description: "Bypasses all standard drug dispensing transaction charges across public pharmacies completely.",
    specificRules: [
      { note: "Regular medical budget ease for low-wealth Middle layers", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: 0.45 },
      { note: "Immediate health budget relief for basic working Poor", targetDemographic: { wealth: 'Poor' }, affectEveryone: true, proportion: 0.9, impact: 0.75 }
    ]
  },
  {
    id: "heritage-site-access",
    policyName: "Free Historic Landmark Passes",
    description: "Provides zero-cost entry tokens allowing all households access to nationally managed castles and parks.",
    specificRules: [
      { note: "Weekend family travel enrichment for Middle groups", targetDemographic: { wealth: 'Middle' }, affectEveryone: true, proportion: 0.9, impact: 0.4 },
      { note: "Healthy walking activities for active Elderly retired groups", targetDemographic: { age: 'Elderly' }, affectEveryone: true, proportion: 0.9, impact: 0.5 }
    ]
  }
];