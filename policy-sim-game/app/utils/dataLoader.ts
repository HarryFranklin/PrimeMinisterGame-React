import { Respondent } from './types';
import personalData from '../data/personalUtilities.json';
import societalData from '../data/societalUtilities.json';

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getONSBaselineLS(id: number): number {
  const bucketSeed = seededRandom(id);
  const placementSeed = seededRandom(id + 1);

  // Distribute baseline LS with a realistic spread, capping the maximum 
  // generated start state to prevent UI rounding anomalies at 10.0
  if (bucketSeed < 0.05) return 2 + (placementSeed * 2);
  if (bucketSeed < 0.15) return 4 + (placementSeed * 2);
  if (bucketSeed < 0.70) return 6 + (placementSeed * 2);
  
  return 8 + (placementSeed * 1.8); 
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
        currentLS: getONSBaselineLS(pData.RespondentID)
      });
    }
  }

  return population;
}