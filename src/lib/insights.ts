import { supabase } from "./superbase";
import type {
  CommunicationsInsights,
  InsightsActivitySummary,
  InsightsDateRange,
  InsightsDistributionItem,
  InsightsRecentActivity,
  InsightsTrendPoint,
  RegistrationPaymentBreakdown,
  ReviewRatingBreakdown,
} from "../types/insights";

/* Represents the shared fields required from every form submission. */
interface SubmissionRecord {
  id: string;
  created_at: string | null;
}

/* Represents a contact submission used by the Insights service. */
interface ContactRecord extends SubmissionRecord {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

/* Represents a bootcamp registration used by the Insights service. */
interface RegistrationRecord extends SubmissionRecord {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  payment_status: string | null;
}

/* Represents a review submission used by the Insights service. */
interface ReviewRecord extends SubmissionRecord {
  email: string | null;
  referral_source: string | null;
  ratings: Record<string, string> | null;
}

/* Represents a quote submission used by the Insights service. */
interface QuoteRecord extends SubmissionRecord {
  name: string | null;
  email: string | null;
  organization: string | null;
}

/* Returns a readable full name while handling missing values. */
function getFullName(
  firstName: string | null,
  lastName: string | null,
  fallback: string
) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || fallback;
}

/* Returns the Monday that begins the supplied date's week. */
function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const distanceFromMonday = day === 0 ? -6 : 1 - day;

  weekStart.setDate(weekStart.getDate() + distanceFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

/* Creates a stable grouping key for a submission date. */
function getPeriodKey(
  dateValue: string,
  grouping: InsightsDateRange["grouping"]
) {
  const date = new Date(dateValue);

  if (grouping === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  }

  if (grouping === "week") {
    return getWeekStart(date).toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

/* Formats a grouped period for display on the timeline chart. */
function formatPeriodLabel(
  period: string,
  grouping: InsightsDateRange["grouping"]
) {
  const date =
    grouping === "month"
      ? new Date(`${period}-01T00:00:00`)
      : new Date(`${period}T00:00:00`);

  if (grouping === "month") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  }

  if (grouping === "week") {
    return `Week of ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date)}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/* Builds the timeline data shared by the charts. */
function buildTrend(
  contacts: ContactRecord[],
  registrations: RegistrationRecord[],
  reviews: ReviewRecord[],
  quotes: QuoteRecord[],
  grouping: InsightsDateRange["grouping"]
): InsightsTrendPoint[] {
  const periodMap = new Map<
    string,
    {
      contacts: number;
      registrations: number;
      reviews: number;
      quotes: number;
    }
  >();

  /* Adds one submission to its matching timeline period. */
  function addSubmission(
    createdAt: string | null,
    type: "contacts" | "registrations" | "reviews" | "quotes"
  ) {
    if (!createdAt) {
      return;
    }

    const periodKey = getPeriodKey(createdAt, grouping);

    const currentPeriod = periodMap.get(periodKey) ?? {
      contacts: 0,
      registrations: 0,
      reviews: 0,
      quotes: 0,
    };

    currentPeriod[type] += 1;
    periodMap.set(periodKey, currentPeriod);
  }

  contacts.forEach((record) => addSubmission(record.created_at, "contacts"));

  registrations.forEach((record) =>
    addSubmission(record.created_at, "registrations")
  );

  reviews.forEach((record) => addSubmission(record.created_at, "reviews"));

  quotes.forEach((record) => addSubmission(record.created_at, "quotes"));

  return [...periodMap.entries()]
    .sort(([firstPeriod], [secondPeriod]) =>
      firstPeriod.localeCompare(secondPeriod)
    )
    .map(([period, values]) => ({
      period: formatPeriodLabel(period, grouping),
      contacts: values.contacts,
      registrations: values.registrations,
      reviews: values.reviews,
      quotes: values.quotes,
      total:
        values.contacts + values.registrations + values.reviews + values.quotes,
    }));
}

/* Calculates the busiest weekday, peak hour, and average daily volume. */
function buildActivitySummary(
  submissionDates: string[],
  startDate: string,
  endDate: string
): InsightsActivitySummary {
  if (!submissionDates.length) {
    return {
      busiestDay: "No activity",
      peakHour: "No activity",
      averageDaily: 0,
    };
  }

  const weekdayCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();

  submissionDates.forEach((dateValue) => {
    const date = new Date(dateValue);

    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(date);

    weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);

    const hour = date.getHours();

    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  });

  const busiestDay =
    [...weekdayCounts.entries()].sort(
      (first, second) => second[1] - first[1]
    )[0]?.[0] ?? "No activity";

  const peakHourValue =
    [...hourCounts.entries()].sort(
      (first, second) => second[1] - first[1]
    )[0]?.[0] ?? 0;

  const peakHour = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
  }).format(new Date(2026, 0, 1, peakHourValue));

  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);

  const totalDays = Math.max(
    1,
    Math.floor(
      (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  return {
    busiestDay,
    peakHour,
    averageDaily: Number((submissionDates.length / totalDays).toFixed(1)),
  };
}

/* Builds the latest activity feed from all four form tables. */
function buildRecentActivity(
  contacts: ContactRecord[],
  registrations: RegistrationRecord[],
  reviews: ReviewRecord[],
  quotes: QuoteRecord[]
): InsightsRecentActivity[] {
  const activity: InsightsRecentActivity[] = [];

  contacts.forEach((record) => {
    if (!record.created_at) {
      return;
    }

    const name = getFullName(
      record.first_name,
      record.last_name,
      record.email || "Contact submission"
    );

    activity.push({
      id: record.id,
      type: "contact",
      title: name,
      subtitle: "Submitted a contact enquiry",
      created_at: record.created_at,
      href: "/admin/contacts",
    });
  });

  registrations.forEach((record) => {
    if (!record.created_at) {
      return;
    }

    const name = getFullName(
      record.first_name,
      record.last_name,
      record.email || "Bootcamp registration"
    );

    activity.push({
      id: record.id,
      type: "registration",
      title: name,
      subtitle: `Bootcamp registration · ${record.payment_status || "Pending"}`,
      created_at: record.created_at,
      href: "/admin/registrations",
    });
  });

  reviews.forEach((record) => {
    if (!record.created_at) {
      return;
    }

    activity.push({
      id: record.id,
      type: "review",
      title: record.email || "Anonymous reviewer",
      subtitle: record.referral_source
        ? `Submitted a review · ${record.referral_source}`
        : "Submitted a review",
      created_at: record.created_at,
      href: "/admin/reviews",
    });
  });

  quotes.forEach((record) => {
    if (!record.created_at) {
      return;
    }

    activity.push({
      id: record.id,
      type: "quote",
      title:
        record.name || record.organization || record.email || "Quote request",
      subtitle: record.organization
        ? `Requested a quote · ${record.organization}`
        : "Requested a quote",
      created_at: record.created_at,
      href: "/admin/quotes",
    });
  });

  return activity
    .sort(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime()
    )
    .slice(0, 10);
}

/* Builds the payment-status chart for bootcamp registrations. */
function buildPaymentBreakdown(
  registrations: RegistrationRecord[]
): RegistrationPaymentBreakdown[] {
  const statusCounts = new Map<string, number>();

  registrations.forEach((registration) => {
    const normalizedStatus = registration.payment_status?.trim() || "Unknown";

    statusCounts.set(
      normalizedStatus,
      (statusCounts.get(normalizedStatus) ?? 0) + 1
    );
  });

  return [...statusCounts.entries()]
    .map(([status, count]) => ({
      status,
      count,
    }))
    .sort((first, second) => second.count - first.count);
}

/* Aggregates the categorical answers stored in review rating objects. */
function buildReviewRatingBreakdown(
  reviews: ReviewRecord[]
): ReviewRatingBreakdown[] {
  const questionMap = new Map<
    string,
    {
      great: number;
      average: number;
      bad: number;
      other: number;
    }
  >();

  // Loop through every review record.
  reviews.forEach((review) => {
    // Skip reviews without a valid ratings object.
    if (!review.ratings || typeof review.ratings !== "object") {
      return;
    }

    // Count each response under its matching review question.
    Object.entries(review.ratings).forEach(([question, response]) => {
      const currentCounts = questionMap.get(question) ?? {
        great: 0,
        average: 0,
        bad: 0,
        other: 0,
      };

      const normalizedResponse = String(response).trim().toLowerCase();

      if (normalizedResponse === "great") {
        currentCounts.great += 1;
      } else if (normalizedResponse === "average") {
        currentCounts.average += 1;
      } else if (normalizedResponse === "bad") {
        currentCounts.bad += 1;
      } else {
        currentCounts.other += 1;
      }

      questionMap.set(question, currentCounts);
    });
  });

  // Convert the grouped map into chart-friendly objects.
  return [...questionMap.entries()].map(([question, counts]) => ({
    question,
    great: counts.great,
    average: counts.average,
    bad: counts.bad,
    other: counts.other,
  }));
}

/* Retrieves and aggregates analytics from all four form tables. */
export async function getCommunicationsInsights(
  range: InsightsDateRange
): Promise<CommunicationsInsights> {
  const startDate = new Date(range.startDate).toISOString();
  const endDateValue = new Date(range.endDate);

  endDateValue.setHours(23, 59, 59, 999);

  const endDate = endDateValue.toISOString();

  const [
    contactsResponse,
    registrationsResponse,
    reviewsResponse,
    quotesResponse,
  ] = await Promise.all([
    supabase
      .from("contact_submissions")
      .select("id, first_name, last_name, email, created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate),

    supabase
      .from("academy_registrations")
      .select("id, first_name, last_name, email, payment_status, created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate),

    supabase
      .from("review_submissions")
      .select("id, email, referral_source, created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate),

    supabase
      .from("quote_submissions")
      .select("id, name, email, organization, created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate),
  ]);

  const databaseError =
    contactsResponse.error ||
    registrationsResponse.error ||
    reviewsResponse.error ||
    quotesResponse.error;

  if (databaseError) {
    throw new Error(databaseError.message);
  }

  const contacts = (contactsResponse.data ?? []) as ContactRecord[];

  const registrations = (registrationsResponse.data ??
    []) as RegistrationRecord[];

  const reviews = (reviewsResponse.data ?? []) as ReviewRecord[];

  const quotes = (quotesResponse.data ?? []) as QuoteRecord[];

  const total =
    contacts.length + registrations.length + reviews.length + quotes.length;

  const distribution: InsightsDistributionItem[] = [
    {
      name: "Contacts",
      value: contacts.length,
    },
    {
      name: "Registrations",
      value: registrations.length,
    },
    {
      name: "Reviews",
      value: reviews.length,
    },
    {
      name: "Quotes",
      value: quotes.length,
    },
  ];

  const submissionDates = [...contacts, ...registrations, ...reviews, ...quotes]
    .map((record) => record.created_at)
    .filter((date): date is string => Boolean(date));

  return {
    counts: {
      contacts: contacts.length,
      academy_registrations: registrations.length,
      reviews: reviews.length,
      quotes: quotes.length,
      total,
    },

    trend: buildTrend(contacts, registrations, reviews, quotes, range.grouping),

    distribution,

    activity: buildActivitySummary(
      submissionDates,
      range.startDate,
      range.endDate
    ),

    recentActivity: buildRecentActivity(
      contacts,
      registrations,
      reviews,
      quotes
    ),

    registrationPayments: buildPaymentBreakdown(registrations),

    reviewRatings: buildReviewRatingBreakdown(reviews),
  };
}
