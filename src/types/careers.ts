export type CareerStatus = "draft" | "published" | "closed";

export type EmploymentType =
  "full_time" | "part_time" | "contract" | "internship" | "temporary";

export type WorkplaceType = "remote" | "hybrid" | "onsite";

export interface CareerOpening {
  id: string;
  title: string;
  slug: string;
  department: string | null;
  location: string | null;
  employment_type: EmploymentType;
  workplace_type: WorkplaceType;
  summary: string;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  show_salary: boolean;
  application_url: string | null;
  application_email: string | null;
  status: CareerStatus;
  featured: boolean;
  application_deadline: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareerOpeningInput {
  title: string;
  slug: string;
  department?: string | null;
  location?: string | null;
  employment_type: EmploymentType;
  workplace_type: WorkplaceType;
  summary: string;
  description: string;
  responsibilities?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  show_salary?: boolean;
  application_url?: string | null;
  application_email?: string | null;
  status: CareerStatus;
  featured?: boolean;
  application_deadline?: string | null;
  published_at?: string | null;
}
