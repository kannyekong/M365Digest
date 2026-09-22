export interface HeroSlide {
  id: number;
  title: string;
  description: string;
  image: string;
}

export const heroSlides: HeroSlide[] = [
  {
    id: 1,

    title:
      "Transforming Businesses Through Cloud, Consulting & Innovative Solutions.",

    description:
      "We help businesses modernize their operations through Microsoft 365 consulting, cloud migration, cybersecurity, networking, technical support, web development, and enterprise technology solutions tailored for growth.",

    image: "/images/bg.png",
  },

  {
    id: 2,

    title:
      "Build In-Demand Cloud Skills Through Practical, Career-Focused Training.",

    description:
      "Master Microsoft 365 Administration through immersive hands-on training covering Exchange Online, SharePoint, Teams, OneDrive, Microsoft Entra ID, Defender, Copilot, Power Platform, and real-world administrative scenarios.",

    image: "/images/bg.png",
  },

  {
    id: 3,

    title: "Automate Smarter. Work Faster. Grow Without Limits.",

    description:
      "Transform repetitive business processes into intelligent automated workflows using n8n, Make, Zapier, Microsoft Power Automate, Claude AI, and modern integrations that improve productivity and reduce operational costs.",

    image: "/images/bg.png",
  },

  {
    id: 4,

    title: "Modernizing Organizations with Intelligent Cloud Transformation.",

    description:
      "From Microsoft 365 migrations and cloud modernization to collaboration, security, governance, and workflow optimization, we help organizations confidently embrace digital transformation.",

    image: "/images/bg.png",
  },
];
