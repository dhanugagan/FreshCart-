import fs from 'fs';
import path from 'path';

export interface TestFixtures {
  demoAccount: { email: string; expectedName: string };
  googleTestUser: { email: string; fullName: string };
  invalidCredentials: { email: string; wrongEmail: string; password: string };
  priceTiers: { lowMax: number; mediumMin: number; mediumMax: number; highMin: number };
  searchTerms: { validProduct: string; sqlInjectionProbe: string };
  couponCodes: { flatDiscount: string };
  admin: { tooShortPasscode: string; validBootstrapPasscode: string };
}

export function loadTestData(): TestFixtures {
  const filePath = path.resolve(process.cwd(), 'tests/data/testData.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as TestFixtures;
}
