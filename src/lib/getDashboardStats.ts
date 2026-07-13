import { supabase } from "./superbase";

export async function getDashboardStats() {
  const [
    contacts,
    registrations,
    quotes,
    reviews,
  ] = await Promise.all([
    supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("bootcamp_registrations")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("quote_submissions")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("review_submissions")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
  contacts: contacts.count ?? 0,
  registrations: registrations.count ?? 0,
  quotes: quotes.count ?? 0,
  reviews: reviews.count ?? 0,

  totalEngagement:
    (contacts.count ?? 0) +
    (registrations.count ?? 0) +
    (quotes.count ?? 0) +
    (reviews.count ?? 0),


};
}

// return {
//   contacts: contactCount,
//   registrations: registrationCount,
//   quotes: quoteCount,
//   reviews: reviewCount,

//   totalEngagement:
//     contactCount +
//     registrationCount +
//     quoteCount +
//     reviewCount,

//   engagementBreakdown: {
//     contacts: contactCount,
//     registrations: registrationCount,
//     quotes: quoteCount,
//     reviews: reviewCount,
//   },
// };