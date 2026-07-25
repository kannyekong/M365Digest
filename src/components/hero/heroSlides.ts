export interface HeroSlide {
  id: number;
  title: string;
  description: string;
  image: string;

  primaryButton: {
    text: string;
    href: string;
    color: string;
  };

  secondaryButton: {
    text: string;
    href: string;
    color: string;
  };
}

export const heroSlides: HeroSlide[] = [
  {
    id: 1,
    title:
      "Transforming businesses through Cloud, Consulting & Innovative Solutions.",

    description:
      "We help businesses and professionals unlock the full potential of technology through Microsoft 365 cloud consulting, migration services, technical support, networking solutions, modern web development, and hands-on Microsoft 365 training.",

    image: "/images/blue.png",

    primaryButton: {
      text: "Request a quote",
      href: "/bootcamp",
      color: "bg-pink-600",
    },

    secondaryButton: {
      text: "Explore our Solutions",
      href: "/solutions",
      color: "bg-primary",
    },
  },

  {
    id: 2,

    title:
      "Accelerate your career with practical, hands-on training and get a recognized certificate.",

    description:
      "Master Microsoft 365 Administration through real-world labs covering Exchange Online, SharePoint, Teams, OneDrive, Entra ID and Microsoft Copilot.",

    image: "/images/blue.png",

    primaryButton: {
      text: "Enroll Today",
      href: "/bootcamp",
      color: "bg-pink-600",
    },

    secondaryButton: {
      text: "View Curriculum",
      href: "/bootcamp",
      color: "bg-primary",
    },
  },
];
