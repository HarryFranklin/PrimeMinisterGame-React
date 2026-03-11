// app/utils/dataLoader.ts
import { Respondent } from './types';

import personalData from '../data/personalUtilities.json';
import societalData from '../data/societalUtilities.json';

function getRandomBaselineLS(): number {
  const rand = Math.random();
  if (rand < 0.05) return 2 + Math.random() * 2; 
  if (rand < 0.15) return 4 + Math.random() * 2; 
  if (rand < 0.70) return 6 + Math.random() * 2; 
  return 8 + Math.random() * 2;                  
}

export function loadPopulation(): Respondent[] {
  const population: Respondent[] = [];

  for (let i = 0; i < personalData.length; i++) {
    const pData = personalData[i] as any;
    
    // Use RespondentID instead of id
    const sData = societalData.find((s: any) => s.RespondentID === pData.RespondentID) as any;

    if (pData && sData) {
      population.push({
        id: pData.RespondentID,
        // Use the exact keys from your JSON
        personalUtilities: [pData.U_Death, pData.U_2, pData.U_4, pData.U_6, pData.U_8, pData.U_10],
        societalUtilities: [sData.U_Death, sData.U_2, sData.U_4, sData.U_6, sData.U_8, sData.U_10],
        currentLS: getRandomBaselineLS()
      });
    }
  }

  return population;
}