// Represents an organisation available for procurement forms.
export interface ProcurementClientOption {
  id: string;
  display_name: string | null;
  company_name: string | null;
}

export type ProcurementContactWithClient = ProcurementContact & {
  clients: {
    display_name: string | null;
    company_name: string | null;
    client_type: string | null;
  } | null;
};

// Represents an active staff member available for procurement assignment.
export interface ProcurementStaffOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
}

// Represents a client contact available for procurement forms.
export interface ProcurementContactOption {
  id: string;
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  email: string | null;
}

export interface ProcurementContact {
  id: string;
  client_id: string;
  contact_type: string | null;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  alternative_phone: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcurementContactListItem extends ProcurementContact {
  client_name: string | null;
  company_name: string | null;
  lead_count: number;
  opportunity_count: number;
  follow_up_count: number;
}

export interface ProcurementContactFilters {
  search?: string;
  client_id?: string;
  contact_type?: string;
  department?: string;
  is_primary?: boolean;
  page?: number;
  page_size?: number;
}

export interface CreateProcurementContactInput {
  client_id: string;
  contact_type?: string | null;
  first_name: string;
  last_name?: string | null;
  job_title?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  alternative_phone?: string | null;
  is_primary?: boolean;
  notes?: string | null;
}

export interface UpdateProcurementContactInput extends Partial<CreateProcurementContactInput> {
  id: string;
}

/**
 * Procurement follow-up activity types.
 */
export type ProcurementFollowUpActivityType =
  | "call"
  | "email"
  | "meeting"
  | "follow_up"
  | "document_request"
  | "vendor_registration"
  | "rfq_follow_up"
  | "proposal_follow_up"
  | "negotiation"
  | "contract"
  | "renewal"
  | "other";

/**
 * Procurement follow-up lifecycle statuses.
 */
export type ProcurementFollowUpStatus =
  "pending" | "in_progress" | "completed" | "cancelled" | "overdue";

/**
 * Procurement follow-up priority levels.
 */
export type ProcurementFollowUpPriority = "low" | "medium" | "high" | "urgent";

/**
 * Represents a procurement follow-up/activity.
 */
export interface ProcurementFollowUp {
  id: string;

  client_id: string;
  contact_id: string | null;

  lead_id: string | null;
  opportunity_id: string | null;
  vendor_registration_id: string | null;
  rfq_id: string | null;
  proposal_id: string | null;
  negotiation_id: string | null;
  contract_id: string | null;

  assigned_to: string | null;

  follow_up_code: string;

  activity_type: ProcurementFollowUpActivityType;
  status: ProcurementFollowUpStatus;
  priority: ProcurementFollowUpPriority;

  subject: string;
  description: string | null;

  due_at: string | null;
  completed_at: string | null;
  next_follow_up_at: string | null;

  outcome: string | null;
  notes: string | null;

  metadata: Record<string, unknown>;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Represents a follow-up with related display information.
 */
export interface ProcurementFollowUpListItem extends ProcurementFollowUp {
  client_name: string | null;
  contact_name: string | null;
  assigned_to_name: string | null;

  lead_title: string | null;
  opportunity_name: string | null;
  vendor_registration_code: string | null;
  rfq_reference: string | null;
  proposal_code: string | null;
  negotiation_code: string | null;
  contract_code: string | null;
}

/**
 * Input used to create a procurement follow-up.
 */
export interface CreateProcurementFollowUpInput {
  client_id: string;
  contact_id?: string | null;

  lead_id?: string | null;
  opportunity_id?: string | null;
  vendor_registration_id?: string | null;
  rfq_id?: string | null;
  proposal_id?: string | null;
  negotiation_id?: string | null;
  contract_id?: string | null;

  assigned_to?: string | null;

  activity_type?: ProcurementFollowUpActivityType;
  status?: ProcurementFollowUpStatus;
  priority?: ProcurementFollowUpPriority;

  subject: string;
  description?: string | null;

  due_at?: string | null;
  completed_at?: string | null;
  next_follow_up_at?: string | null;

  outcome?: string | null;
  notes?: string | null;

  metadata?: Record<string, unknown>;
}

/**
 * Input used to update an existing procurement follow-up.
 */
export interface UpdateProcurementFollowUpInput extends Partial<CreateProcurementFollowUpInput> {
  id: string;
}

/**
 * Filters used by the procurement follow-up workspace.
 */
export interface ProcurementFollowUpFilters {
  search?: string;

  activity_type?: ProcurementFollowUpActivityType;
  status?: ProcurementFollowUpStatus;
  priority?: ProcurementFollowUpPriority;

  client_id?: string;
  assigned_to?: string;

  lead_id?: string;
  opportunity_id?: string;
  vendor_registration_id?: string;
  rfq_id?: string;
  proposal_id?: string;
  negotiation_id?: string;
  contract_id?: string;

  due_from?: string;
  due_to?: string;

  page?: number;
  page_size?: number;
}

/**
 * Procurement portal categories supported by CloudTweak.
 */
export type ProcurementPortalType =
  | "corporate"
  | "government"
  | "energy"
  | "banking"
  | "telecoms"
  | "international"
  | "supplier_network"
  | "tender"
  | "other";

/**
 * Vendor registration lifecycle states.
 */
export type VendorRegistrationStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired";

/**
 * Represents an external procurement portal.
 */
export interface ProcurementPortal {
  id: string;
  name: string;
  organisation_name: string;
  portal_type: ProcurementPortalType;
  url: string | null;
  registration_url: string | null;
  country: string;
  state: string | null;
  description: string | null;
  login_required: boolean;
  active: boolean;
  last_checked_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Represents an organisation requirement within a vendor registration.
 */
export interface VendorRegistrationRequirement {
  name: string;
  required: boolean;
  completed: boolean;
  completed_at?: string | null;
  notes?: string | null;
}

/**
 * Represents a vendor registration against an organisation or portal.
 */
export interface VendorRegistration {
  id: string;
  client_id: string;
  portal_id: string | null;
  registration_code: string;
  status: VendorRegistrationStatus;
  assigned_to: string | null;
  registration_number: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  expiry_date: string | null;
  next_action_at: string | null;
  requirements: VendorRegistrationRequirement[];
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Represents a portal with the organisation's registration context.
 */
export interface ProcurementPortalListItem extends ProcurementPortal {
  registrations_count: number;
  approved_registrations_count: number;
}

/**
 * Represents a vendor registration with related organisation information.
 */
export interface VendorRegistrationListItem extends VendorRegistration {
  client_name: string | null;
  portal_name: string | null;
  assigned_to_name: string | null;
}

/**
 * Input used to create a procurement portal.
 */
export interface CreateProcurementPortalInput {
  name: string;
  organisation_name: string;
  portal_type: ProcurementPortalType;
  url?: string | null;
  registration_url?: string | null;
  country?: string;
  state?: string | null;
  description?: string | null;
  login_required?: boolean;
  active?: boolean;
  notes?: string | null;
}

/**
 * Input used to update a procurement portal.
 */
export interface UpdateProcurementPortalInput extends Partial<CreateProcurementPortalInput> {
  id: string;
}

/**
 * Input used to create a vendor registration.
 */
export interface CreateVendorRegistrationInput {
  client_id: string;
  portal_id?: string | null;
  status?: VendorRegistrationStatus;
  assigned_to?: string | null;
  registration_number?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  expiry_date?: string | null;
  next_action_at?: string | null;
  requirements?: VendorRegistrationRequirement[];
  notes?: string | null;
}

/**
 * Input used to update a vendor registration.
 */
export interface UpdateVendorRegistrationInput extends Partial<CreateVendorRegistrationInput> {
  id: string;
}

/**
 * Filters supported by the procurement portal workspace.
 */
export interface ProcurementPortalFilters {
  search?: string;
  portal_type?: ProcurementPortalType;
  active?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Filters supported by the vendor registration workspace.
 */
export interface VendorRegistrationFilters {
  search?: string;
  status?: VendorRegistrationStatus;
  client_id?: string;
  portal_id?: string;
  assigned_to?: string;
  page?: number;
  page_size?: number;
}

/**
 * Defines the available procurement lead sources.
 */
export type ProcurementLeadSource =
  | "website"
  | "referral"
  | "linkedin"
  | "cold_outreach"
  | "procurement_portal"
  | "tender"
  | "rfq"
  | "event"
  | "existing_client"
  | "partner"
  | "other";

/**
 * Defines the lifecycle status of a procurement lead.
 */
export type ProcurementLeadStatus =
  | "new"
  | "contacted"
  | "engaged"
  | "qualified"
  | "unqualified"
  | "converted"
  | "lost";

/**
 * Defines the priority assigned to a procurement lead.
 */
export type ProcurementLeadPriority = "low" | "medium" | "high" | "urgent";

/**
 * Represents a procurement lead stored in the database.
 */
export interface ProcurementLead {
  id: string;
  client_id: string | null;
  contact_id: string | null;
  assigned_to: string | null;
  lead_code: string;
  title: string;
  description: string | null;
  source: ProcurementLeadSource;
  source_reference: string | null;
  status: ProcurementLeadStatus;
  priority: ProcurementLeadPriority;
  estimated_value: number | null;
  currency: string;
  industry: string | null;
  service_interest: string | null;
  first_contact_at: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  qualification_notes: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Represents an opportunity stage in the procurement pipeline.
 */
export type ProcurementOpportunityStage =
  | "qualified"
  | "assessment"
  | "vendor_registration"
  | "opportunity"
  | "rfq_rfp"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

/**
 * Represents the current status of a procurement opportunity.
 */
export type ProcurementOpportunityStatus =
  "open" | "on_hold" | "won" | "lost" | "cancelled";

/**
 * Represents a procurement opportunity stored in the database.
 */
export interface ProcurementOpportunity {
  id: string;
  client_id: string;
  primary_contact_id: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  opportunity_code: string;
  name: string;
  description: string | null;
  stage: ProcurementOpportunityStage;
  status: ProcurementOpportunityStatus;
  service_type: string | null;
  source: string | null;
  estimated_value: number | null;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  vendor_registration_required: boolean;
  rfq_required: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a procurement lead together with its related client information.
 */
export interface ProcurementLeadListItem extends ProcurementLead {
  client_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  assigned_to_name: string | null;
}

/**
 * Represents an opportunity together with its related client information.
 */
export interface ProcurementOpportunityListItem extends ProcurementOpportunity {
  client_name: string | null;
  contact_name: string | null;
  assigned_to_name: string | null;
}

/**
 * Represents the payload required to create a procurement lead.
 */
export interface CreateProcurementLeadInput {
  client_id?: string | null;
  contact_id?: string | null;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  source: ProcurementLeadSource;
  source_reference?: string | null;
  status?: ProcurementLeadStatus;
  priority?: ProcurementLeadPriority;
  estimated_value?: number | null;
  currency?: string;
  industry?: string | null;
  service_interest?: string | null;
  first_contact_at?: string | null;
  next_follow_up_at?: string | null;
  qualification_notes?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Represents the payload required to update a procurement lead.
 */
export interface UpdateProcurementLeadInput extends Partial<CreateProcurementLeadInput> {
  id: string;
}

/**
 * Represents the payload required to create a procurement opportunity.
 */
export interface CreateProcurementOpportunityInput {
  client_id: string;
  primary_contact_id?: string | null;
  lead_id?: string | null;
  assigned_to?: string | null;
  name: string;
  description?: string | null;
  stage?: ProcurementOpportunityStage;
  status?: ProcurementOpportunityStatus;
  service_type?: string | null;
  source?: string | null;
  estimated_value?: number | null;
  currency?: string;
  probability?: number;
  expected_close_date?: string | null;
  vendor_registration_required?: boolean;
  rfq_required?: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Represents the payload required to update a procurement opportunity.
 */
export interface UpdateProcurementOpportunityInput extends Partial<CreateProcurementOpportunityInput> {
  id: string;
}

/**
 * Represents filters used when retrieving procurement leads.
 */
export interface ProcurementLeadFilters {
  search?: string;
  status?: ProcurementLeadStatus;
  priority?: ProcurementLeadPriority;
  source?: ProcurementLeadSource;
  assigned_to?: string;
  client_id?: string;
  page?: number;
  page_size?: number;
}

/**
 * Represents filters used when retrieving procurement opportunities.
 */
export interface ProcurementOpportunityFilters {
  search?: string;
  stage?: ProcurementOpportunityStage;
  status?: ProcurementOpportunityStatus;
  assigned_to?: string;
  client_id?: string;
  page?: number;
  page_size?: number;
}

/**
 * Represents procurement dashboard summary statistics.
 */
export interface ProcurementStatistics {
  active_leads: number;
  qualified_leads: number;
  open_opportunities: number;
  pipeline_value: number;
  weighted_pipeline_value: number;
  opportunities_won: number;
  opportunities_lost: number;
}

// Defines the procurement request type.
export type ProcurementRfqType = "rfq" | "rfp" | "tender";

// Defines the operational lifecycle of an RFQ/RFP.
export type ProcurementRfqStatus =
  | "received"
  | "reviewing"
  | "qualification"
  | "preparing"
  | "submitted"
  | "under_evaluation"
  | "clarification"
  | "awarded"
  | "not_awarded"
  | "cancelled"
  | "expired";

// Defines the urgency level of an RFQ/RFP.
export type ProcurementRfqPriority = "low" | "medium" | "high" | "urgent";

// Represents an individual RFQ/RFP submission requirement.
export interface ProcurementRfqRequirement {
  name: string;
  required: boolean;
  completed: boolean;
  completed_at?: string | null;
  notes?: string | null;
}

// Represents an RFQ/RFP record.
export interface ProcurementRfq {
  id: string;
  client_id: string;
  opportunity_id: string | null;
  contact_id: string | null;
  portal_id: string | null;
  assigned_to: string | null;

  reference_code: string;
  request_type: ProcurementRfqType;
  title: string;
  description: string | null;

  status: ProcurementRfqStatus;
  priority: ProcurementRfqPriority;

  estimated_value: number | null;
  currency: string;

  issue_date: string | null;
  clarification_deadline: string | null;
  submission_deadline: string | null;
  evaluation_date: string | null;
  award_date: string | null;

  source: string | null;
  source_reference: string | null;

  requirements: ProcurementRfqRequirement[];
  submission_instructions: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// Represents an RFQ/RFP with related display information.
export interface ProcurementRfqListItem extends ProcurementRfq {
  client_name: string | null;
  contact_name: string | null;
  opportunity_name: string | null;
  portal_name: string | null;
  assigned_to_name: string | null;
}

// Defines data accepted when creating an RFQ/RFP.
export interface CreateProcurementRfqInput {
  client_id: string;
  opportunity_id?: string | null;
  contact_id?: string | null;
  portal_id?: string | null;
  assigned_to?: string | null;

  request_type: ProcurementRfqType;
  title: string;
  description?: string | null;

  status?: ProcurementRfqStatus;
  priority?: ProcurementRfqPriority;

  estimated_value?: number | null;
  currency?: string;

  issue_date?: string | null;
  clarification_deadline?: string | null;
  submission_deadline?: string | null;
  evaluation_date?: string | null;
  award_date?: string | null;

  source?: string | null;
  source_reference?: string | null;

  requirements?: ProcurementRfqRequirement[];
  submission_instructions?: string | null;
  notes?: string | null;
}

// Defines data accepted when updating an RFQ/RFP.
export interface UpdateProcurementRfqInput extends Partial<CreateProcurementRfqInput> {
  id: string;
}

// Defines RFQ/RFP filtering options.
export interface ProcurementRfqFilters {
  search?: string;
  request_type?: ProcurementRfqType;
  status?: ProcurementRfqStatus;
  priority?: ProcurementRfqPriority;
  client_id?: string;
  opportunity_id?: string;
  assigned_to?: string;
  portal_id?: string;
  page?: number;
  page_size?: number;
}

// Represents an opportunity available for RFQ/RFP forms.
export interface ProcurementOpportunityOption {
  id: string;
  opportunity_code: string;
  name: string;
  client_id: string;
  stage: string;
  status: string;
}

// Defines the lifecycle states of a procurement proposal.
export type ProcurementProposalStatus =
  | "draft"
  | "internal_review"
  | "approved"
  | "submitted"
  | "under_evaluation"
  | "clarification"
  | "negotiation"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

// Represents an individual proposal requirement.
export interface ProcurementProposalRequirement {
  name: string;
  required: boolean;
  completed: boolean;
  completed_at?: string | null;
  notes?: string | null;
}

// Represents a procurement proposal.
export interface ProcurementProposal {
  id: string;
  client_id: string;
  opportunity_id: string | null;
  rfq_id: string | null;
  contact_id: string | null;
  assigned_to: string | null;

  proposal_code: string;
  title: string;
  version: number;

  status: ProcurementProposalStatus;

  quoted_value: number | null;
  currency: string;

  submission_date: string | null;
  valid_until: string | null;
  expected_decision_date: string | null;

  executive_summary: string | null;
  scope_summary: string | null;
  commercial_notes: string | null;
  submission_instructions: string | null;
  internal_notes: string | null;

  requirements: ProcurementProposalRequirement[];

  source_reference: string | null;
  metadata: Record<string, unknown>;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// Represents a proposal with related display information.
export interface ProcurementProposalListItem extends ProcurementProposal {
  client_name: string | null;
  opportunity_name: string | null;
  rfq_reference: string | null;
  contact_name: string | null;
  assigned_to_name: string | null;
}

// Defines data accepted when creating a proposal.
export interface CreateProcurementProposalInput {
  client_id: string;
  opportunity_id?: string | null;
  rfq_id?: string | null;
  contact_id?: string | null;
  assigned_to?: string | null;

  title: string;

  status?: ProcurementProposalStatus;

  quoted_value?: number | null;
  currency?: string;

  submission_date?: string | null;
  valid_until?: string | null;
  expected_decision_date?: string | null;

  executive_summary?: string | null;
  scope_summary?: string | null;
  commercial_notes?: string | null;
  submission_instructions?: string | null;
  internal_notes?: string | null;

  requirements?: ProcurementProposalRequirement[];

  source_reference?: string | null;
}

// Defines data accepted when updating a proposal.
export interface UpdateProcurementProposalInput extends Partial<CreateProcurementProposalInput> {
  id: string;
}

// Defines proposal filtering options.
export interface ProcurementProposalFilters {
  search?: string;
  status?: ProcurementProposalStatus;
  client_id?: string;
  opportunity_id?: string;
  rfq_id?: string;
  assigned_to?: string;
  page?: number;
  page_size?: number;
}

// Represents an RFQ/RFP available for proposal forms.
export interface ProcurementRfqOption {
  id: string;
  client_id: string;
  opportunity_id: string | null;
  reference_code: string;
  request_type: ProcurementRfqType;
  title: string;
  status: ProcurementRfqStatus;
}

/**
 * Represents a lightweight RFQ option used by procurement forms.
 */
export interface ProcurementRfqOption {
  id: string;
  client_id: string;
  opportunity_id: string | null;
  reference_code: string;
  request_type: ProcurementRfqType;
  title: string;
  status: ProcurementRfqStatus;
}

/**
 * Defines the lifecycle states of a procurement negotiation.
 */
export type ProcurementNegotiationStatus =
  | "not_started"
  | "active"
  | "client_review"
  | "counter_offer"
  | "internal_approval"
  | "agreed"
  | "contract"
  | "closed"
  | "cancelled";

/**
 * Defines the urgency of a procurement negotiation.
 */
export type ProcurementNegotiationPriority =
  "low" | "medium" | "high" | "urgent";

/**
 * Represents a single negotiation requirement or action item.
 */
export interface ProcurementNegotiationRequirement {
  name: string;
  required: boolean;
  completed: boolean;
  completed_at?: string | null;
  notes?: string | null;
}

/**
 * Represents a procurement negotiation record.
 */
export interface ProcurementNegotiation {
  id: string;

  client_id: string;
  opportunity_id: string | null;
  proposal_id: string | null;
  contact_id: string | null;
  assigned_to: string | null;

  negotiation_code: string;
  title: string;

  status: ProcurementNegotiationStatus;
  priority: ProcurementNegotiationPriority;

  starting_value: number | null;
  current_value: number | null;
  agreed_value: number | null;
  currency: string;

  negotiation_start_date: string | null;
  target_close_date: string | null;
  agreed_date: string | null;

  last_activity_at: string | null;

  next_action: string | null;
  next_action_at: string | null;

  client_requests: string | null;
  concessions: string | null;
  agreed_terms: string | null;
  internal_notes: string | null;
  outcome: string | null;

  requirements: ProcurementNegotiationRequirement[];

  metadata: Record<string, unknown>;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Represents a negotiation with display information from related records.
 */
export interface ProcurementNegotiationListItem extends ProcurementNegotiation {
  client_name: string | null;
  opportunity_name: string | null;
  proposal_code: string | null;
  proposal_title: string | null;
  contact_name: string | null;
  assigned_to_name: string | null;
}

/**
 * Represents the payload required to create a negotiation.
 */
export interface CreateProcurementNegotiationInput {
  client_id: string;
  opportunity_id?: string | null;
  proposal_id?: string | null;
  contact_id?: string | null;
  assigned_to?: string | null;

  title: string;

  status?: ProcurementNegotiationStatus;
  priority?: ProcurementNegotiationPriority;

  starting_value?: number | null;
  current_value?: number | null;
  agreed_value?: number | null;
  currency?: string;

  negotiation_start_date?: string | null;
  target_close_date?: string | null;
  agreed_date?: string | null;

  last_activity_at?: string | null;

  next_action?: string | null;
  next_action_at?: string | null;

  client_requests?: string | null;
  concessions?: string | null;
  agreed_terms?: string | null;
  internal_notes?: string | null;
  outcome?: string | null;

  requirements?: ProcurementNegotiationRequirement[];

  metadata?: Record<string, unknown>;
}

/**
 * Represents an update to an existing negotiation.
 */
export interface UpdateProcurementNegotiationInput extends Partial<CreateProcurementNegotiationInput> {
  id: string;
}

/**
 * Represents the filters supported by the negotiation workspace.
 */
export interface ProcurementNegotiationFilters {
  search?: string;
  status?: ProcurementNegotiationStatus;
  priority?: ProcurementNegotiationPriority;
  client_id?: string;
  opportunity_id?: string;
  proposal_id?: string;
  assigned_to?: string;
  page?: number;
  page_size?: number;
}

/**
 * Represents a proposal option used by procurement forms.
 */
export interface ProcurementProposalOption {
  id: string;
  client_id: string;
  proposal_code: string;
  title: string;
  version: number;
  status: string;
}

/**
 * Represents the lifecycle state of a procurement contract.
 */
export type ProcurementContractStatus =
  | "draft"
  | "internal_review"
  | "client_review"
  | "negotiation"
  | "pending_signature"
  | "signed"
  | "active"
  | "suspended"
  | "completed"
  | "expired"
  | "terminated"
  | "cancelled";

/**
 * Represents the business priority assigned to a procurement contract.
 */
export type ProcurementContractPriority = "low" | "medium" | "high" | "urgent";

/**
 * Represents a structured requirement or contract checklist item.
 */
export interface ProcurementContractRequirement {
  name: string;
  required: boolean;
  completed: boolean;
  completed_at?: string | null;
  notes?: string | null;
}

/**
 * Represents a procurement contract stored in the database.
 */
export interface ProcurementContract {
  id: string;

  client_id: string;
  opportunity_id: string | null;
  proposal_id: string | null;
  negotiation_id: string | null;
  contact_id: string | null;
  assigned_to: string | null;

  contract_code: string;
  title: string;

  status: ProcurementContractStatus;
  priority: ProcurementContractPriority;

  contract_value: number | null;
  currency: string;

  contract_date: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;

  payment_terms: string | null;
  billing_frequency: string | null;

  scope_summary: string | null;
  deliverables: string | null;
  service_level_terms: string | null;
  termination_terms: string | null;
  renewal_terms: string | null;

  next_action: string | null;
  next_action_at: string | null;

  internal_notes: string | null;
  client_notes: string | null;
  outcome: string | null;

  requirements: ProcurementContractRequirement[];
  metadata: Record<string, unknown>;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Represents a contract row enriched with related procurement names.
 */
export interface ProcurementContractListItem extends ProcurementContract {
  client_name: string | null;
  opportunity_name: string | null;
  proposal_code: string | null;
  proposal_title: string | null;
  negotiation_code: string | null;
  negotiation_title: string | null;
  contact_name: string | null;
  assigned_to_name: string | null;
}

/**
 * Represents the payload required to create a procurement contract.
 */
export interface CreateProcurementContractInput {
  client_id: string;

  opportunity_id?: string | null;
  proposal_id?: string | null;
  negotiation_id?: string | null;
  contact_id?: string | null;
  assigned_to?: string | null;

  title: string;

  status?: ProcurementContractStatus;
  priority?: ProcurementContractPriority;

  contract_value?: number | null;
  currency?: string;

  contract_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  renewal_date?: string | null;

  payment_terms?: string | null;
  billing_frequency?: string | null;

  scope_summary?: string | null;
  deliverables?: string | null;
  service_level_terms?: string | null;
  termination_terms?: string | null;
  renewal_terms?: string | null;

  next_action?: string | null;
  next_action_at?: string | null;

  internal_notes?: string | null;
  client_notes?: string | null;
  outcome?: string | null;

  requirements?: ProcurementContractRequirement[];
  metadata?: Record<string, unknown>;
}

/**
 * Represents the payload used to update an existing procurement contract.
 */
export interface UpdateProcurementContractInput extends Partial<CreateProcurementContractInput> {
  id: string;
}

/**
 * Represents the available filters for the contracts workspace.
 */
export interface ProcurementContractFilters {
  search?: string;
  status?: ProcurementContractStatus;
  priority?: ProcurementContractPriority;
  client_id?: string;
  opportunity_id?: string;
  proposal_id?: string;
  negotiation_id?: string;
  assigned_to?: string;
  page?: number;
  page_size?: number;
}
/**
 * Represents the headline procurement report metrics.
 */
export interface ProcurementReportSummary {
  total_leads: number;
  active_leads: number;
  qualified_leads: number;
  converted_leads: number;
  total_opportunities: number;
  open_opportunities: number;
  won_opportunities: number;
  lost_opportunities: number;
  pipeline_value: number;
  weighted_pipeline_value: number;
  won_value: number;
  active_vendor_registrations: number;
  approved_vendor_registrations: number;
  pending_rfqs: number;
  submitted_rfqs: number;
  awarded_rfqs: number;
  active_proposals: number;
  accepted_proposals: number;
  active_negotiations: number;
  agreed_negotiations: number;
  active_contracts: number;
  expiring_contracts: number;
  pending_follow_ups: number;
  overdue_follow_ups: number;
}

/**
 * Represents an aggregated procurement pipeline stage.
 */
export interface ProcurementPipelineReportItem {
  stage: string;
  count: number;
  value: number;
  weighted_value: number;
}

/**
 * Represents procurement lead performance by source.
 */
export interface ProcurementLeadSourceReportItem {
  source: string;
  count: number;
  qualified: number;
  converted: number;
}

/**
 * Represents RFQ/RFP performance by status.
 */
export interface ProcurementRfqReportItem {
  status: string;
  count: number;
  estimated_value: number;
}

/**
 * Represents proposal performance by status.
 */
export interface ProcurementProposalReportItem {
  status: string;
  count: number;
  quoted_value: number;
}

/**
 * Represents contract performance by status.
 */
export interface ProcurementContractReportItem {
  status: string;
  count: number;
  contract_value: number;
}

/**
 * Represents procurement activity assigned to a staff member.
 */
export interface ProcurementStaffPerformanceReportItem {
  staff_id: string;
  staff_name: string;
  leads: number;
  opportunities: number;
  follow_ups: number;
  contracts: number;
}

/**
 * Represents the complete procurement reporting payload.
 */
export interface ProcurementReport {
  summary: ProcurementReportSummary;
  pipeline: ProcurementPipelineReportItem[];
  lead_sources: ProcurementLeadSourceReportItem[];
  rfqs: ProcurementRfqReportItem[];
  proposals: ProcurementProposalReportItem[];
  contracts: ProcurementContractReportItem[];
  staff_performance: ProcurementStaffPerformanceReportItem[];
}
/**
 * Represents an organisation/company in the procurement workspace.
 */
export interface ProcurementCompany {
  id: string;
  client_code: string | null;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  tax_identification_number: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Represents an organisation/company enriched with procurement activity.
 */
export interface ProcurementCompanyListItem extends ProcurementCompany {
  contact_count: number;
  lead_count: number;
  opportunity_count: number;
  vendor_registration_count: number;
  active_contract_count: number;
  follow_up_count: number;
}

/**
 * Filters available in the procurement companies workspace.
 */
export interface ProcurementCompanyFilters {
  search?: string;
  industry?: string;
  status?: string;
  page?: number;
  page_size?: number;
}
