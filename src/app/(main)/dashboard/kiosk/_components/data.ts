// File: C:\src\luton-eng-dashboard\src\app\(main)\dashboard\kiosk\_components\data.ts

import { subDays, formatISO } from 'date-fns';

const channels = ['facebook', 'google', 'linkedin_ads', 'organic', 'youtube', 'linkedin_org', 'email'];

export function generateMockTimelineData() {
  const data = [];

  for (let i = 180; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date: formatISO(date, { representation: 'date' }),
      facebook: Math.floor(40 + 25 * Math.sin(i / 15)),
      google: Math.floor(60 + 20 * Math.cos(i / 12)),
      linkedin_ads: Math.floor(30 + 15 * Math.sin(i / 10)),
      organic: Math.floor(50 + 10 * Math.cos(i / 20)),
      youtube: Math.floor(20 + 8 * Math.sin(i / 6)),
      linkedin_org: Math.floor(15 + 5 * Math.cos(i / 8)),
      email: Math.floor(10 + 5 * Math.sin(i / 4)),
    });
  }

  return data;
}

export async function getMarketingData() {
  return generateMockTimelineData();
}
