// File: C:\src\luton-eng-dashboard\src\app\(main)\dashboard\kiosk\config.tsx

import type { DashboardConfig } from '@/components/dashboard/types';
import { getMarketingData } from './_components/data';

const chartWidgets = [
  {
    key: 'marketing_channel_trends',
    component: 'ChartAreaInteractive',
    title: 'Lead Trends by Channel',
    group: 'timeline',
    toggles: [
      {
        key: 'core_channels',
        title: 'Core Channels',
        fields: [
          { key: 'facebook', label: 'Facebook Ads', type: 'leads', color: 'var(--chart-1)' },
          { key: 'google', label: 'Google Ads', type: 'leads', color: 'var(--chart-2)' },
        ],
      },
      {
        key: 'social',
        title: 'Social & Email',
        fields: [
          { key: 'linkedin_ads', label: 'LinkedIn Ads', type: 'leads', color: 'var(--chart-3)' },
          { key: 'email', label: 'Email', type: 'leads', color: 'var(--chart-4)' },
        ],
      },
      {
        key: 'organic',
        title: 'Organic & YouTube',
        fields: [
          { key: 'organic', label: 'Organic Search', type: 'leads', color: 'var(--chart-5)' },
          { key: 'youtube', label: 'YouTube', type: 'leads', color: 'var(--chart-6)' },
        ],
      },
    ],
  },
];

export const marketingConfig: DashboardConfig = {
  id: 'marketing_kiosk',
  title: 'Marketing Performance (Molly Demo)',
  range: '6m',
  rowIdKey: 'date',
  fetchRecords: getMarketingData,

  filters: {
    channel: 'channel',
  },

  summary: [/* unchanged */],
  trends: [/* unchanged */],
  tiles: [],

  widgets: [
    { component: 'SummaryCards', key: 'tiles', group: 'summary' },
    { component: 'SectionCards', key: 'tiles', group: 'trends' },
    ...chartWidgets,
    {
      key: 'leads_by_channel',
      component: 'ChartBar',
      title: 'Total Leads by Channel',
      layout: 'horizontal',
      sortBy: 'value-desc',
      fields: [
        { key: 'facebook', label: 'Facebook Ads' },
        { key: 'google', label: 'Google Ads' },
        { key: 'linkedin_ads', label: 'LinkedIn Ads' },
        { key: 'organic', label: 'Organic' },
        { key: 'youtube', label: 'YouTube' },
        { key: 'linkedin_org', label: 'LinkedIn Organic' },
        { key: 'email', label: 'Email' },
      ],
    },
  ],

  tableColumns: [],
};
