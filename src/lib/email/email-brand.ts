/* Centralizes CloudTweak email branding used by transactional emails. */
export const EMAIL_BRAND = {
  companyName: "CloudTweak Technologies Limited",
  academyName: "CloudTweak Academy",

  academySender: "CloudTweak Academy <academy@cloudtweak.net>",

  certificateSender: "CloudTweak Academy <certificates@cloudtweak.net>",

  replyTo: "academy@cloudtweak.net",

  websiteUrl: "https://cloudtweak.net",

  /*
   * Replace this with the exact absolute URL of the production
   * CloudTweak logo image.
   */
  logoUrl: "https://cloudtweak.net/logos/cloudtweaklogo.png",
} as const;
