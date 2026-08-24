/**
 * Academy program publishing status.
 */
export type AcademyProgramStatus = "draft" | "published" | "archived";

/**
 * Supported training delivery modes.
 */
export type AcademyDeliveryMode = "online" | "onsite" | "hybrid" | "self_paced";

/**
 * Student registration status.
 */
export type AcademyRegistrationStatus =
  "pending" | "confirmed" | "enrolled" | "completed" | "cancelled";

/**
 * Payment status.
 */
export type AcademyPaymentStatus =
  "pending" | "processing" | "paid" | "failed" | "refunded" | "cancelled";

/**
 * Certificate status.
 */
export type AcademyCertificateStatus =
  "not_eligible" | "eligible" | "generated" | "revoked";

/**
 * Academy payment reconciliation status.
 */
export type AcademyPaymentReconciliationStatus =
  "pending" | "matched" | "underpaid" | "overpaid" | "resolved";

/**
 * Academy category.
 */
export interface AcademyCategory {
  id: string;

  name: string;

  slug: string;

  description: string | null;

  icon: string | null;

  display_order: number;

  is_active: boolean;

  created_at: string;

  updated_at: string;
}

/**
 * Certificate template.
 */
export interface AcademyCertificateTemplate {
  id: string;

  name: string;

  description: string | null;

  template_key: string;

  background_image_url: string | null;

  logo_url: string | null;

  signature_image_url: string | null;

  signatory_name: string | null;

  signatory_title: string | null;

  primary_color: string;

  secondary_color: string;

  text_color: string;

  orientation: "landscape" | "portrait";

  configuration: Record<string, unknown>;

  is_default: boolean;

  is_active: boolean;

  created_at: string;

  updated_at: string;
}

/**
 * Academy program.
 */
export interface AcademyProgram {
  id: string;

  category_id: string | null;

  certificate_template_id: string | null;

  title: string;

  slug: string;

  code: string | null;

  short_description: string | null;

  description: string | null;

  hero_image_url: string | null;

  thumbnail_image_url: string | null;

  banner_image_url: string | null;

  delivery_mode: AcademyDeliveryMode;

  location: string | null;

  duration_value: number | null;

  duration_unit: string | null;

  session_schedule: string | null;

  price: number;

  discount_price: number | null;

  currency: string;

  show_price: boolean;

  start_date: string | null;

  end_date: string | null;

  registration_deadline: string | null;

  maximum_students: number | null;

  registration_open: boolean;

  certificate_enabled: boolean;

  featured: boolean;

  status: AcademyProgramStatus;

  display_order: number;

  learning_outcomes: string[];

  prerequisites: string[];

  target_audience: string[];

  tools_covered: string[];

  seo_title: string | null;

  seo_description: string | null;

  published_at: string | null;

  created_at: string;

  updated_at: string;

  category?: AcademyCategory;

  certificate_template?: AcademyCertificateTemplate;
}

/**
 * An instructor assigned to an Academy program.
 */
export interface AcademyProgramInstructor {
  id: string;

  program_id: string;

  instructor_id: string;

  is_lead: boolean;

  display_order: number;

  created_at: string;

  instructor?: AcademyInstructor;

  program?: AcademyProgram;
}

/**
 * An instructor profile available across CloudTweak Academy.
 */
export interface AcademyInstructor {
  id: string;

  full_name: string;

  title: string;

  bio: string;

  image_url: string;

  skills: string[];

  linkedin_url: string;

  github_url: string;

  email: string;

  phone: string;

  website: string;

  display_order: number;

  is_active: boolean;
}

/**
 * Curriculum module.
 */
export interface AcademyModule {
  id: string;

  program_id: string;

  title: string;

  description: string | null;

  module_number: number;

  duration: string | null;

  display_order: number;

  is_preview: boolean;

  created_at: string;

  updated_at: string;
}

/**
 * Curriculum lesson.
 */
export interface AcademyLesson {
  id: string;

  module_id: string;

  title: string;

  description: string | null;

  lesson_type: "lesson" | "lab" | "project" | "assessment" | "resource";

  duration: string | null;

  display_order: number;

  created_at: string;

  updated_at: string;
}

/**
 * Student registration.
 */
export interface AcademyRegistration {
  id: string;

  program_id: string;

  first_name: string;

  last_name: string;

  email: string;

  phone: string | null;

  company: string | null;

  job_title: string | null;

  country: string | null;

  state: string | null;

  city: string | null;

  experience_level: string | null;

  learning_goal: string | null;

  referral_source: string | null;

  availability: string | null;

  registration_status: AcademyRegistrationStatus;

  payment_status: AcademyPaymentStatus;

  certificate_status: AcademyCertificateStatus;

  payment_reference: string | null;

  payment_provider: string | null;

  amount_expected: number | null;

  amount_paid: number | null;

  currency: string;

  paid_at: string | null;

  completed_at: string | null;

  source: string | null;

  external_submission_id: string | null;

  metadata: Record<string, unknown>;

  created_at: string;

  updated_at: string;

  program?: AcademyProgram;

  payment_reconciliation_status: AcademyPaymentReconciliationStatus;

  payment_difference: number;
}

/**
 * Certificate.
 */
export interface AcademyCertificate {
  id: string;

  registration_id: string;

  program_id: string;

  template_id: string | null;

  certificate_number: string;

  verification_code: string;

  recipient_name: string;

  program_title: string;

  issue_date: string;

  completion_date: string | null;

  file_url: string | null;

  status: AcademyCertificateStatus;

  generated_by: string | null;

  generated_at: string;

  revoked_at: string | null;

  revocation_reason: string | null;

  metadata: Record<string, unknown>;

  created_at: string;

  updated_at: string;

  program?: AcademyProgram;

  registration?: AcademyRegistration;

  template?: AcademyCertificateTemplate;
}

export interface AcademyInstructorWithProgramCount extends AcademyInstructor {
  assigned_program_count: number;
}
