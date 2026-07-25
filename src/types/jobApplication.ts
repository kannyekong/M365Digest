import type { CareerOpening } from "./careers";

export type JobApplicationStatus =
  | "new"
  | "in_review"
  | "shortlisted"
  | "interview"
  | "assessment"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

export interface JobApplication {
  id: string;
  reference: string | null;
  job_opening_id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string | null;
  portfolio_url: string | null;
  years_experience: number;
  current_company: string;
  current_job_title: string;
  cover_letter: string;
  interest_reason: string;
  notice_period: string;
  salary_expectation: string;
  work_authorization: string;
  resume_path: string;
  resume_original_name: string;
  resume_mime_type: string;
  resume_size_bytes: number;
  status: JobApplicationStatus;
  internal_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobApplicationWithOpening extends JobApplication {
  job_opening: Pick<
    CareerOpening,
    "id" | "title" | "slug" | "department" | "status"
  > | null;
}

export interface JobApplicationSubmission {
  jobOpeningId: string;
  fullName: string;
  email: string;
  phone: string;
  location?: string;

  linkedinUrl?: string;
  portfolioUrl?: string;

  yearsExperience?: number;
  currentCompany?: string;
  currentRole?: string;

  coverLetter?: string;
  interestReason?: string;
  noticePeriod?: string;
  salaryExpectation?: string;
  workAuthorization?: boolean;
}
