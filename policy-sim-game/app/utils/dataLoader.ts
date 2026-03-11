import { Respondent } from './types';
import personalData from '../data/personalUtilities.json';
import societalData from '../data/societalUtilities.json';

/**
 * A simple deterministic pseudo-random number generator.
 * By feeding it the respondent's ID, it will return the exact same 
 * "random" number between 0 and 1 every single time the game runs.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Maps the deterministic random numbers to the real-world ONS distribution.
 */
function getONSBaselineLS(id: number): number {
  const bucketSeed = seededRandom(id);       // Determines which wealth/LS bracket they fall into
  const placementSeed = seededRandom(id + 1); // Determines exactly where they sit within that bracket

  // ONS Distribution Weights:
  // 5% of population are severely struggling (LS 2-4)
  if (bucketSeed < 0.05) return 2 + (placementSeed * 2); 
  
  // 10% are struggling (LS 4-6)
  if (bucketSeed < 0.15) return 4 + (placementSeed * 2); 
  
  // 55% are doing fine (LS 6-8) - This creates the massive spike at 7
  if (bucketSeed < 0.70) return 6 + (placementSeed * 2); 
  
  // 30% are thriving (LS 8-10)
  return 8 + (placementSeed * 2);                  
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
        // Apply the ONS distribution
        currentLS: getONSBaselineLS(pData.RespondentID)
      });
    }
  }

  return population;
}