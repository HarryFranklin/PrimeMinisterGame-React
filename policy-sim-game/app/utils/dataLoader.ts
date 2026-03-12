import { Respondent, Demographics } from './types';
import personalData from '../data/personalUtilities.json';
import societalData from '../data/societalUtilities.json';

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getONSBaselineLS(id: number): number {
  const bucketSeed = seededRandom(id);       
  const placementSeed = seededRandom(id + 1); 

  if (bucketSeed < 0.05) return 2 + (placementSeed * 2); 
  if (bucketSeed < 0.15) return 4 + (placementSeed * 2); 
  if (bucketSeed < 0.70) return 6 + (placementSeed * 2); 
  return 8 + (placementSeed * 2);                  
}

/**
 * Deterministically assigns demographics based on the respondent's ID.
 * Scaled to UK ONS data (Adults 18+).
 */
function getDemographics(id: number): Demographics {
  const r1 = seededRandom(id + 10);
  const r2 = seededRandom(id + 20);
  const r3 = seededRandom(id + 30);

  // 1. Wealth: 21% Poor, 69% Middle, 10% Wealthy
  let wealth: 'Poor' | 'Middle' | 'Wealthy' = 'Middle';
  if (r1 < 0.21) wealth = 'Poor';
  else if (r1 > 0.90) wealth = 'Wealthy'; // Top 10%

  // 2. Age: Scaled to the 18+ electorate (18.6% Youth, 58.1% Adult, 23.3% Elderly)
  let age: 'Youth' | 'Adult' | 'Elderly' = 'Adult';
  if (r2 < 0.186) age = 'Youth';
  else if (r2 > 0.767) age = 'Elderly'; // Top 23.3%

  // 3. Sub-traits
  // Estimated 30% of the 18-29 bracket are students
  const isStudent = age === 'Youth' && r3 < 0.30;
  
  // UK average: ~42.3% of families have dependent children
  const isParent = age === 'Adult' && r3 < 0.423;

  // Environmentalists: ~20% of the electorate
  const isEnvironmentalist = seededRandom(id + 40) < 0.20;

  // Commuters: ~54% of working-age population. Elderly drop significantly.
  let commChance = 0.54;
  if (age === 'Elderly') commChance = 0.05;
  const isCommuter = seededRandom(id + 50) < commChance;

  return {
    wealth,
    age,
    isStudent,
    isParent,
    isEnvironmentalist,
    isCommuter
  };
}

export function loadPopulation(): Respondent[] {
  const population: Respondent[] = [];

  for (let i = 0; i < personalData.length; i++) {
    const pData = personalData[i] as any;
    const sData = societalData.find((s: any) => s.RespondentID === pData.RespondentID) as any;

    if (pData && sData) {
      population.push({
        id: pData.RespondentID,
        personalUtilities: [pData.U_Death, pData.U_2, pData.U_4, pData.U_6, pData.U_8, pData.U_10],
        societalUtilities: [sData.U_Death, sData.U_2, sData.U_4, sData.U_6, sData.U_8, sData.U_10],
        currentLS: getONSBaselineLS(pData.RespondentID),
        demographics: getDemographics(pData.RespondentID)
      });
    }
  }

  return population;
}