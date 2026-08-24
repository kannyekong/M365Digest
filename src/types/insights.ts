/* Defines how submission data should be grouped on the timeline. */
export type InsightsGrouping = "day" | "week" | "month";

/* Defines the date range applied to every analytics calculation. */
export interface InsightsDateRange {
  startDate: string;
  endDate: string;
  grouping: InsightsGrouping;
}

/* Stores the count for each form module. */
export interface InsightsCounts {
  contacts: number;
  academy_registrations: number;
  reviews: number;
  quotes: number;
  total: number;
}

/* Represents one point on the submissions timeline. */
export interface InsightsTrendPoint {
  period: string;
  contacts: number;
  registrations: number;
  reviews: number;
  quotes: number;
  total: number;
}

/* Represents one form category in the distribution chart. */
export interface InsightsDistributionItem {
  name: "Contacts" | "Registrations" | "Reviews" | "Quotes";
  value: number;
}

/* Represents one recent submission across the four forms. */
export interface InsightsRecentActivity {
  id: string;
  type: "contact" | "registration" | "review" | "quote";
  title: string;
  subtitle: string;
  created_at: string;
  href: string;
}

/* Stores payment-status statistics from bootcamp registrations. */
export interface RegistrationPaymentBreakdown {
  status: string;
  count: number;
}

/* Stores the calculated activity highlights. */
export interface InsightsActivitySummary {
  busiestDay: string;
  peakHour: string;
  averageDaily: number;
}

/* Represents the complete response consumed by the Insights page. */
export interface CommunicationsInsights {
  counts: InsightsCounts;
  trend: InsightsTrendPoint[];
  distribution: InsightsDistributionItem[];
  activity: InsightsActivitySummary;
  recentActivity: InsightsRecentActivity[];
  registrationPayments: RegistrationPaymentBreakdown[];
  reviewRatings: ReviewRatingBreakdown[];
}

/* Represents one question and its response totals from review ratings. */
export interface ReviewRatingBreakdown {
  question: string;
  great: number;
  average: number;
  bad: number;
  other: number;
}
