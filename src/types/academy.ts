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
/**
 * Supported Academy resource types.
 *
 * A resource is supporting material attached to an existing
 * curriculum lesson.
 */
export type AcademyResourceType =
  "video" | "pdf" | "document" | "spreadsheet" | "zip" | "link";

/**
 * Supported external resource providers.
 */
export type AcademyResourceProvider =
  | "sharepoint"
  | "onedrive"
  | "youtube"
  | "vimeo"
  | "supabase_storage"
  | "external";

/**
 * Academy curriculum resource.
 */
export interface AcademyResource {
  id: string;
  lesson_id: string;

  title: string;
  description: string | null;

  resource_type: AcademyResourceType;
  provider: AcademyResourceProvider | null;

  external_url: string | null;
  storage_path: string | null;

  thumbnail_url: string | null;

  mime_type: string | null;
  file_name: string | null;
  file_size: number | null;

  duration_seconds: number | null;

  is_required: boolean;
  is_published: boolean;

  available_from: string | null;
  available_until: string | null;

  display_order: number;

  created_at: string;
  updated_at: string;
}

/**
 * Input used when creating an Academy resource.
 */
export interface AcademyResourceInput {
  lesson_id: string;

  title: string;
  description?: string | null;

  resource_type: AcademyResourceType;
  provider?: AcademyResourceProvider | null;

  external_url?: string | null;
  storage_path?: string | null;

  thumbnail_url?: string | null;

  mime_type?: string | null;
  file_name?: string | null;
  file_size?: number | null;

  duration_seconds?: number | null;

  is_required?: boolean;
  is_published?: boolean;

  available_from?: string | null;
  available_until?: string | null;

  display_order?: number;
}

/**
 * Supported live-class platforms.
 */
export type AcademyLiveSessionPlatform =
  "teams" | "zoom" | "google_meet" | "other";

/**
 * Current state of an Academy live class.
 */
export type AcademyLiveSessionStatus = "scheduled" | "cancelled" | "completed";

/**
 * Academy live class/session.
 */
export interface AcademyLiveSession {
  id: string;

  program_id: string;
  module_id: string | null;
  lesson_id: string | null;
  resource_id: string | null;

  title: string;
  description: string | null;

  platform: AcademyLiveSessionPlatform;
  meeting_url: string;

  start_at: string;
  end_at: string | null;

  is_published: boolean;
  status: AcademyLiveSessionStatus;

  created_at: string;
  updated_at: string;
}

/**
 * Input used when creating an Academy live class.
 */
export interface AcademyLiveSessionInput {
  program_id: string;

  module_id?: string | null;
  lesson_id?: string | null;
  resource_id?: string | null;

  title: string;
  description?: string | null;

  platform: AcademyLiveSessionPlatform;
  meeting_url: string;

  start_at: string;
  end_at?: string | null;

  is_published?: boolean;
  status?: AcademyLiveSessionStatus;
}

/**
 * Student progress for an individual Academy resource.
 */
export type StudentResourceProgressStatus =
  "not_started" | "in_progress" | "completed";

/**
 * Tracks a student's progress through an Academy resource.
 */
export interface StudentResourceProgress {
  id: string;

  student_id: string;
  enrollment_id: string;
  resource_id: string;

  status: StudentResourceProgressStatus;

  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface UpcomingSession {
  id: string;
  title: string;
  description?: string | null;
  platform: AcademyLiveSessionPlatform;
  meetingUrl: string;
  startAt: string;
  endAt?: string | null;
}

/**
 * Supported Academy quiz question types.
 */
export type AcademyQuizQuestionType =
  "single_choice" | "multiple_choice" | "true_false";

/** Represents an Academy quiz configuration. */
export interface AcademyQuiz {
  id: string;
  program_id: string;
  module_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number | null;
  is_required: boolean;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Represents an individual quiz question. */
export interface AcademyQuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: AcademyQuizQuestionType;
  points: number;
  explanation: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Represents an answer option belonging to a quiz question. */
export interface AcademyQuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Represents the metadata for a student quiz attempt. */
export interface StudentQuizAttempt {
  id: string;
  student_id: string;
  enrollment_id: string;
  quiz_id: string;
  attempt_number: number;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

/** Represents a sanitized answer option returned to the student. */
export interface StudentQuizOption {
  id: string;
  optionText: string;
}

/** Represents a randomized question returned for a specific student attempt. */
export interface StudentQuizAttemptQuestion {
  questionId: string;
  questionText: string;
  questionType: AcademyQuizQuestionType;
  points: number;
  questionPosition: number;
  options: StudentQuizOption[];
  selectedOptionIds: string[];
}

/** Represents the complete quiz payload used by the student quiz player. */
export interface StudentQuizAttemptPayload {
  attemptId: string;
  attemptNumber: number;
  quizId: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number | null;
  isRequired: boolean;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  questions: StudentQuizAttemptQuestion[];
}

/** Represents the safe response returned when a student starts or resumes a quiz attempt. */
export interface StudentQuizStartResponse {
  attemptId: string;
  attemptNumber: number;
  quizId: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number | null;
  isRequired: boolean;
  startedAt: string;
  completedAt: string | null;
  resumed: boolean;
}

/** Represents the answer submitted for one quiz question. */
export interface StudentQuizSubmissionAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

/** Represents the result returned after server-side grading. */
export interface StudentQuizResult {
  attemptId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passingScore: number;
  passed: boolean;
  completedAt: string;
}

/** Represents one option during historical quiz review. */
export interface StudentQuizReviewOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  selected: boolean;
}

/** Represents one question during historical quiz review. */
export interface StudentQuizReviewQuestion {
  questionId: string;
  questionText: string;
  questionType: AcademyQuizQuestionType;
  points: number;
  explanation: string | null;
  questionPosition: number;
  isCorrect: boolean;
  pointsAwarded: number;
  options: StudentQuizReviewOption[];
}

/** Represents the complete historical review of a quiz attempt. */
export interface StudentQuizReview {
  attemptId: string;
  attemptNumber: number;
  quizId: string;
  title: string;
  passingScore: number;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  startedAt: string;
  completedAt: string;
  questions: StudentQuizReviewQuestion[];
}

/** Represents the data needed to create a quiz. */
export interface AcademyQuizInput {
  program_id: string;
  module_id?: string | null;
  lesson_id?: string | null;
  title: string;
  description?: string | null;
  passing_score?: number;
  max_attempts?: number | null;
  is_required?: boolean;
  is_published?: boolean;
  display_order?: number;
}

/** Represents the data needed to create a quiz question. */
export interface AcademyQuizQuestionInput {
  quiz_id: string;
  question_text: string;
  question_type: AcademyQuizQuestionType;
  points?: number;
  explanation?: string | null;
  display_order?: number;
}

/** Represents the data needed to create a quiz option. */
export interface AcademyQuizOptionInput {
  question_id: string;
  option_text: string;
  is_correct?: boolean;
  display_order?: number;
}

/**
 * Represents a sanitized answer option returned to the student.
 *
 * Correct-answer information is intentionally excluded from this type.
 */
export interface StudentQuizOption {
  id: string;
  optionText: string;
}

/**
 * Represents one randomized question in an active student quiz attempt.
 */
export interface StudentQuizAttemptQuestion {
  questionId: string;
  questionText: string;
  questionType: AcademyQuizQuestionType;
  points: number;
  questionPosition: number;
  options: StudentQuizOption[];
  selectedOptionIds: string[];
}

/**
 * Represents the complete sanitized payload used by the student quiz player.
 */
export interface StudentQuizAttemptPayload {
  attemptId: string;
  attemptNumber: number;
  quizId: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number | null;
  isRequired: boolean;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  questions: StudentQuizAttemptQuestion[];
}

/**
 * Represents one answer submitted by the student.
 */
export interface StudentQuizSubmissionAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

/**
 * Represents the result returned after server-side quiz grading.
 */
export interface StudentQuizResult {
  attemptId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passingScore: number;
  passed: boolean;
  completedAt: string;
}

/**
 * Represents one option during historical quiz review.
 *
 * Correct-answer information is only exposed after the attempt is completed.
 */
export interface StudentQuizReviewOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  selected: boolean;
}

/**
 * Represents one question during historical quiz review.
 */
export interface StudentQuizReviewQuestion {
  questionId: string;
  questionText: string;
  questionType: AcademyQuizQuestionType;
  points: number;
  explanation: string | null;
  questionPosition: number;
  isCorrect: boolean;
  pointsAwarded: number;
  options: StudentQuizReviewOption[];
}

/**
 * Represents the complete historical review of a completed quiz attempt.
 */
export interface StudentQuizReview {
  attemptId: string;
  attemptNumber: number;
  quizId: string;
  title: string;
  passingScore: number;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  startedAt: string;
  completedAt: string;
  questions: StudentQuizReviewQuestion[];
}
