import { createSupabaseAdminClient } from "./supabase/server";
import type {
  CreateProcurementLeadInput,
  CreateProcurementOpportunityInput,
  ProcurementLead,
  ProcurementLeadFilters,
  ProcurementLeadListItem,
  ProcurementOpportunity,
  ProcurementOpportunityFilters,
  ProcurementOpportunityListItem,
  ProcurementStatistics,
  UpdateProcurementLeadInput,
  UpdateProcurementOpportunityInput,
  CreateProcurementPortalInput,
  CreateVendorRegistrationInput,
  ProcurementPortalFilters,
  ProcurementPortalListItem,
  UpdateProcurementPortalInput,
  UpdateVendorRegistrationInput,
  VendorRegistrationFilters,
  VendorRegistrationListItem,
  VendorRegistrationStatus,
  ProcurementRfq,
  ProcurementRfqFilters,
  ProcurementRfqListItem,
  ProcurementRfqRequirement,
  CreateProcurementRfqInput,
  UpdateProcurementRfqInput,
  ProcurementRfqStatus,
  ProcurementOpportunityOption,
  ProcurementProposal,
  ProcurementProposalFilters,
  ProcurementProposalListItem,
  ProcurementProposalRequirement,
  ProcurementProposalStatus,
  CreateProcurementProposalInput,
  UpdateProcurementProposalInput,
  ProcurementRfqOption,
  ProcurementNegotiation,
  ProcurementNegotiationFilters,
  ProcurementNegotiationListItem,
  ProcurementNegotiationStatus,
  CreateProcurementNegotiationInput,
  UpdateProcurementNegotiationInput,
  ProcurementProposalOption,
  ProcurementContract,
  ProcurementContractFilters,
  ProcurementContractListItem,
  ProcurementContractPriority,
  ProcurementContractRequirement,
  ProcurementContractStatus,
  CreateProcurementContractInput,
  UpdateProcurementContractInput,
  CreateProcurementFollowUpInput,
  ProcurementFollowUp,
  ProcurementFollowUpFilters,
  ProcurementFollowUpListItem,
  ProcurementFollowUpPriority,
  ProcurementFollowUpStatus,
  UpdateProcurementFollowUpInput,
  ProcurementReport,
  ProcurementStaffPerformanceReportItem,
  ProcurementCompanyFilters,
  ProcurementCompanyListItem,
  ProcurementCompany,
  ProcurementContact,
  ProcurementContactFilters,
  ProcurementContactListItem,
  CreateProcurementContactInput,
  ProcurementContactWithClient,
  UpdateProcurementContactInput,
} from "../types/procurement";

/**
 * Represents the minimal vendor registration data returned
 * by the procurement portal relationship query.
 */
type ProcurementPortalRegistrationSummary = {
  id: string;
  status: VendorRegistrationStatus;
};

/**
 * Retrieves active procurement contacts and their procurement activity counts.
 *
 * Contacts are sourced from the existing client_contacts table and are
 * linked to organisations through clients.client_id.
 */
export async function getProcurementContacts(
  filters: ProcurementContactFilters = {}
): Promise<{
  data: ProcurementContactListItem[];
  count: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("client_contacts")
    .select(
      `
        id,
        client_id,
        contact_type,
        first_name,
        last_name,
        job_title,
        department,
        email,
        phone,
        alternative_phone,
        is_primary,
        notes,
        created_at,
        updated_at,
        clients!inner(
          display_name,
          company_name,
          client_type
        )
      `,
      { count: "exact" }
    )
    .is("archived_at", null)
    .eq("clients.client_type", "organisation")
    .order("first_name", { ascending: true })
    .range(from, to);

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  if (filters.contact_type) {
    query = query.eq("contact_type", filters.contact_type);
  }

  if (filters.department) {
    query = query.ilike("department", `%${filters.department}%`);
  }

  if (filters.is_primary !== undefined) {
    query = query.eq("is_primary", filters.is_primary);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      [
        `first_name.ilike.%${search}%`,
        `last_name.ilike.%${search}%`,
        `email.ilike.%${search}%`,
        `job_title.ilike.%${search}%`,
        `department.ilike.%${search}%`,
      ].join(",")
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Unable to load procurement contacts: ${error.message}`);
  }

  /**
   * Treats the verified Supabase relationship response as the
   * object shape returned by the client_contacts relationship.
   */
  const contacts = (data ?? []) as unknown as ProcurementContactWithClient[];

  if (!contacts.length) {
    return {
      data: [],
      count: count ?? 0,
    };
  }

  const contactIds = contacts.map((contact) => contact.id);

  const [
    { data: leads, error: leadsError },
    { data: opportunities, error: opportunitiesError },
    { data: followUps, error: followUpsError },
  ] = await Promise.all([
    supabase
      .from("procurement_leads")
      .select("contact_id")
      .in("contact_id", contactIds)
      .is("archived_at", null),

    supabase
      .from("procurement_opportunities")
      .select("primary_contact_id")
      .in("primary_contact_id", contactIds)
      .is("archived_at", null),

    supabase
      .from("procurement_follow_ups")
      .select("contact_id")
      .in("contact_id", contactIds)
      .is("archived_at", null),
  ]);

  if (leadsError) {
    throw new Error(
      `Unable to load contact lead counts: ${leadsError.message}`
    );
  }

  if (opportunitiesError) {
    throw new Error(
      `Unable to load contact opportunity counts: ${opportunitiesError.message}`
    );
  }

  if (followUpsError) {
    throw new Error(
      `Unable to load contact follow-up counts: ${followUpsError.message}`
    );
  }

  const leadCounts = new Map<string, number>();
  const opportunityCounts = new Map<string, number>();
  const followUpCounts = new Map<string, number>();

  for (const lead of leads ?? []) {
    if (!lead.contact_id) continue;

    leadCounts.set(lead.contact_id, (leadCounts.get(lead.contact_id) ?? 0) + 1);
  }

  for (const opportunity of opportunities ?? []) {
    if (!opportunity.primary_contact_id) continue;

    opportunityCounts.set(
      opportunity.primary_contact_id,
      (opportunityCounts.get(opportunity.primary_contact_id) ?? 0) + 1
    );
  }

  for (const followUp of followUps ?? []) {
    if (!followUp.contact_id) continue;

    followUpCounts.set(
      followUp.contact_id,
      (followUpCounts.get(followUp.contact_id) ?? 0) + 1
    );
  }

  return {
    data: contacts.map((contact) => ({
      id: contact.id,
      client_id: contact.client_id,
      contact_type: contact.contact_type,
      first_name: contact.first_name,
      last_name: contact.last_name,
      job_title: contact.job_title,
      department: contact.department,
      email: contact.email,
      phone: contact.phone,
      alternative_phone: contact.alternative_phone,
      is_primary: contact.is_primary,
      notes: contact.notes,
      created_at: contact.created_at,
      updated_at: contact.updated_at,

      // Supabase returns the related client as an array.
      client_name: contact.clients?.display_name ?? null,
      company_name: contact.clients?.company_name ?? null,

      lead_count: leadCounts.get(contact.id) ?? 0,
      opportunity_count: opportunityCounts.get(contact.id) ?? 0,
      follow_up_count: followUpCounts.get(contact.id) ?? 0,
    })),
    count: count ?? 0,
  };
}

/**
 * Creates a procurement contact under an existing organisation.
 */
export async function createProcurementContact(
  input: CreateProcurementContactInput,
  staffId?: string | null
): Promise<ProcurementContact> {
  const supabase = getSupabase();

  const firstName = input.first_name.trim();

  if (!input.client_id) {
    throw new Error("Company is required.");
  }

  if (!firstName) {
    throw new Error("First name is required.");
  }

  const { data: company, error: companyError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", input.client_id)
    .eq("client_type", "organisation")
    .is("archived_at", null)
    .maybeSingle();

  if (companyError) {
    throw new Error(`Unable to validate company: ${companyError.message}`);
  }

  if (!company) {
    throw new Error("The selected company could not be found.");
  }

  const { data, error } = await supabase
    .from("client_contacts")
    .insert({
      client_id: input.client_id,
      contact_type: input.contact_type?.trim() || "general",
      first_name: firstName,
      last_name: input.last_name?.trim() || null,
      job_title: input.job_title?.trim() || null,
      department: input.department?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      alternative_phone: input.alternative_phone?.trim() || null,
      is_primary: input.is_primary ?? false,
      notes: input.notes?.trim() || null,
    })
    .select(
      `
        id,
        client_id,
        contact_type,
        first_name,
        last_name,
        job_title,
        department,
        email,
        phone,
        alternative_phone,
        is_primary,
        notes,
        created_at,
        updated_at
      `
    )
    .single();

  if (error) {
    throw new Error(`Unable to create contact: ${error.message}`);
  }

  return data as ProcurementContact;
}

/**
 * Updates an existing procurement contact.
 */
export async function updateProcurementContact(
  input: UpdateProcurementContactInput,
  staffId?: string | null
): Promise<ProcurementContact> {
  const supabase = getSupabase();

  if (!input.id) {
    throw new Error("Contact ID is required.");
  }

  if (input.first_name !== undefined && !input.first_name.trim()) {
    throw new Error("First name is required.");
  }

  if (input.client_id !== undefined) {
    const { data: company, error: companyError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", input.client_id)
      .eq("client_type", "organisation")
      .is("archived_at", null)
      .maybeSingle();

    if (companyError) {
      throw new Error(`Unable to validate company: ${companyError.message}`);
    }

    if (!company) {
      throw new Error("The selected company could not be found.");
    }
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.client_id !== undefined) {
    payload.client_id = input.client_id;
  }

  if (input.contact_type !== undefined) {
    payload.contact_type = input.contact_type?.trim() || null;
  }

  if (input.first_name !== undefined) {
    payload.first_name = input.first_name.trim();
  }

  if (input.last_name !== undefined) {
    payload.last_name = input.last_name?.trim() || null;
  }

  if (input.job_title !== undefined) {
    payload.job_title = input.job_title?.trim() || null;
  }

  if (input.department !== undefined) {
    payload.department = input.department?.trim() || null;
  }

  if (input.email !== undefined) {
    payload.email = input.email?.trim() || null;
  }

  if (input.phone !== undefined) {
    payload.phone = input.phone?.trim() || null;
  }

  if (input.alternative_phone !== undefined) {
    payload.alternative_phone = input.alternative_phone?.trim() || null;
  }

  if (input.is_primary !== undefined) {
    payload.is_primary = input.is_primary;
  }

  if (input.notes !== undefined) {
    payload.notes = input.notes?.trim() || null;
  }

  const { data, error } = await supabase
    .from("client_contacts")
    .update(payload)
    .eq("id", input.id)
    .is("archived_at", null)
    .select(
      `
        id,
        client_id,
        contact_type,
        first_name,
        last_name,
        job_title,
        department,
        email,
        phone,
        alternative_phone,
        is_primary,
        notes,
        created_at,
        updated_at
      `
    )
    .single();

  if (error) {
    throw new Error(`Unable to update contact: ${error.message}`);
  }

  return data as ProcurementContact;
}

/**
 * Archives a procurement contact while preserving its
 * historical procurement relationships.
 */
export async function archiveProcurementContact(
  id: string,
  staffId?: string | null
): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("client_contacts")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("archived_at", null);

  if (error) {
    throw new Error(`Unable to archive contact: ${error.message}`);
  }

  return true;
}
/**
 * Generates the next client code for a procurement company.
 *
 * The code follows the existing client convention:
 * CLT-YYYY-NNNNNN
 */
export async function generateProcurementCompanyCode(): Promise<string> {
  const supabase = getSupabase();
  const year = new Date().getFullYear();

  const { count, error } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Unable to generate company code: ${error.message}`);
  }

  const sequence = (count ?? 0) + 1;

  return `CLT-${year}-${String(sequence).padStart(6, "0")}`;
}

/**
 * Retrieves organisations from the existing clients master and enriches
 * them with procurement relationship counts.
 */
export async function getProcurementCompanies(
  filters: ProcurementCompanyFilters = {}
): Promise<{
  data: ProcurementCompanyListItem[];
  total: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 20, 1), 100);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("clients")
    .select(
      `
        id,
        client_code,
        display_name,
        company_name,
        email,
        phone,
        website,
        industry,
        tax_identification_number,
        status,
        source,
        notes,
        created_at,
        updated_at
      `,
      { count: "exact" }
    )
    .eq("client_type", "organisation")
    .is("archived_at", null)
    .order("display_name", { ascending: true })
    .range(from, to);

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `display_name.ilike.%${search}%,company_name.ilike.%${search}%,client_code.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (filters.industry) {
    query = query.eq("industry", filters.industry);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(
      `Unable to retrieve procurement companies: ${error.message}`
    );
  }

  const companies = data ?? [];

  if (!companies.length) {
    return {
      data: [],
      total: count ?? 0,
    };
  }

  const companyIds = companies.map((company) => company.id);

  const [
    contactsResult,
    leadsResult,
    opportunitiesResult,
    registrationsResult,
    contractsResult,
    followUpsResult,
  ] = await Promise.all([
    supabase
      .from("client_contacts")
      .select("id,client_id")
      .in("client_id", companyIds)
      .is("archived_at", null),

    supabase
      .from("procurement_leads")
      .select("id,client_id")
      .in("client_id", companyIds)
      .is("archived_at", null),

    supabase
      .from("procurement_opportunities")
      .select("id,client_id")
      .in("client_id", companyIds)
      .is("archived_at", null),

    supabase
      .from("vendor_registrations")
      .select("id,client_id")
      .in("client_id", companyIds)
      .is("archived_at", null),

    supabase
      .from("procurement_contracts")
      .select("id,client_id,status")
      .in("client_id", companyIds)
      .is("archived_at", null),

    supabase
      .from("procurement_follow_ups")
      .select("id,client_id")
      .in("client_id", companyIds)
      .is("archived_at", null),
  ]);

  if (contactsResult.error) {
    throw new Error(
      `Unable to retrieve company contacts: ${contactsResult.error.message}`
    );
  }

  if (leadsResult.error) {
    throw new Error(
      `Unable to retrieve company leads: ${leadsResult.error.message}`
    );
  }

  if (opportunitiesResult.error) {
    throw new Error(
      `Unable to retrieve company opportunities: ${opportunitiesResult.error.message}`
    );
  }

  if (registrationsResult.error) {
    throw new Error(
      `Unable to retrieve vendor registrations: ${registrationsResult.error.message}`
    );
  }

  if (contractsResult.error) {
    throw new Error(
      `Unable to retrieve company contracts: ${contractsResult.error.message}`
    );
  }

  if (followUpsResult.error) {
    throw new Error(
      `Unable to retrieve company follow-ups: ${followUpsResult.error.message}`
    );
  }

  const countByClient = <T extends { client_id: string }>(
    records: T[]
  ): Map<string, number> => {
    const result = new Map<string, number>();

    for (const record of records) {
      result.set(record.client_id, (result.get(record.client_id) ?? 0) + 1);
    }

    return result;
  };

  const contactCounts = countByClient(contactsResult.data ?? []);
  const leadCounts = countByClient(leadsResult.data ?? []);
  const opportunityCounts = countByClient(opportunitiesResult.data ?? []);
  const registrationCounts = countByClient(registrationsResult.data ?? []);
  const followUpCounts = countByClient(followUpsResult.data ?? []);

  const activeContractCounts = new Map<string, number>();

  for (const contract of contractsResult.data ?? []) {
    if (
      !["completed", "expired", "terminated", "cancelled"].includes(
        contract.status
      )
    ) {
      activeContractCounts.set(
        contract.client_id,
        (activeContractCounts.get(contract.client_id) ?? 0) + 1
      );
    }
  }

  const result: ProcurementCompanyListItem[] = companies.map((company) => ({
    ...(company as ProcurementCompany),
    contact_count: contactCounts.get(company.id) ?? 0,
    lead_count: leadCounts.get(company.id) ?? 0,
    opportunity_count: opportunityCounts.get(company.id) ?? 0,
    vendor_registration_count: registrationCounts.get(company.id) ?? 0,
    active_contract_count: activeContractCounts.get(company.id) ?? 0,
    follow_up_count: followUpCounts.get(company.id) ?? 0,
  }));

  return {
    data: result,
    total: count ?? 0,
  };
}

/**
 * Creates a procurement company using the existing clients master.
 *
 * Companies are represented as organisation clients so that they remain
 * compatible with the existing client, contact, quotation, invoice,
 * project, and procurement relationships.
 */
/**
 * Creates a procurement company using the existing clients master.
 *
 * Companies are represented as organisation clients so they remain
 * compatible with the existing client, contact, and procurement
 * relationships.
 */
export async function createProcurementCompany(
  input: {
    display_name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    industry?: string | null;
    tax_identification_number?: string | null;
    status?: string | null;
    source?: string | null;
    notes?: string | null;
  },
  staffId?: string | null
): Promise<ProcurementCompany> {
  const supabase = getSupabase();

  const displayName = input.company_name?.trim() || input.display_name?.trim();

  if (!displayName) {
    throw new Error("Company name is required.");
  }

  const clientCode = await generateProcurementCompanyCode();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      client_code: clientCode,
      client_type: "organisation",
      display_name: displayName,
      company_name: input.company_name?.trim() || displayName,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      website: input.website?.trim() || null,
      industry: input.industry?.trim() || null,
      tax_identification_number:
        input.tax_identification_number?.trim() || null,
      status: input.status || "active",
      source: input.source?.trim() || "procurement",
      notes: input.notes?.trim() || null,
      account_manager_id: staffId || null,
    })
    .select(
      "id, client_code, display_name, company_name, email, phone, website, industry, tax_identification_number, status, source, notes, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new Error(`Unable to create company: ${error.message}`);
  }

  return data as ProcurementCompany;
}

/**
 * Updates an existing procurement company in the clients master.
 *
 * Only fields that currently exist in the clients schema are updated.
 */
export async function updateProcurementCompany(
  input: {
    id: string;
    display_name?: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    industry?: string | null;
    tax_identification_number?: string | null;
    status?: string | null;
    source?: string | null;
    notes?: string | null;
  },
  staffId?: string | null
): Promise<ProcurementCompany> {
  const supabase = getSupabase();

  if (input.display_name !== undefined && !input.display_name.trim()) {
    throw new Error("Company name is required.");
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.display_name !== undefined) {
    payload.display_name = input.display_name.trim();
  }

  if (input.company_name !== undefined) {
    payload.company_name = input.company_name?.trim() || null;
  }

  if (input.email !== undefined) {
    payload.email = input.email?.trim() || null;
  }

  if (input.phone !== undefined) {
    payload.phone = input.phone?.trim() || null;
  }

  if (input.website !== undefined) {
    payload.website = input.website?.trim() || null;
  }

  if (input.industry !== undefined) {
    payload.industry = input.industry?.trim() || null;
  }

  if (input.tax_identification_number !== undefined) {
    payload.tax_identification_number =
      input.tax_identification_number?.trim() || null;
  }

  if (input.status !== undefined) {
    payload.status = input.status;
  }

  if (input.source !== undefined) {
    payload.source = input.source?.trim() || null;
  }

  if (input.notes !== undefined) {
    payload.notes = input.notes?.trim() || null;
  }

  if (staffId) {
    payload.account_manager_id = staffId;
  }

  const { data, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", input.id)
    .eq("client_type", "organisation")
    .is("archived_at", null)
    .select(
      "id, client_code, display_name, company_name, email, phone, website, industry, tax_identification_number, status, source, notes, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new Error(`Unable to update company: ${error.message}`);
  }

  return data as ProcurementCompany;
}

/**
 * Archives a procurement company without deleting its client record.
 *
 * The company is excluded from active procurement listings while
 * preserving its historical procurement relationships.
 */
export async function archiveProcurementCompany(
  id: string,
  staffId?: string | null
): Promise<boolean> {
  const supabase = getSupabase();

  const payload: Record<string, unknown> = {
    archived_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (staffId) {
    payload.account_manager_id = staffId;
  }

  const { error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
    .eq("client_type", "organisation")
    .is("archived_at", null);

  if (error) {
    throw new Error(`Unable to archive company: ${error.message}`);
  }

  return true;
}
/**
 * Generates the next procurement follow-up reference code.
 *
 * The current implementation uses the number of existing records for
 * sequence generation. A database sequence/RPC can replace this later
 * when concurrency hardening is performed across the procurement module.
 */
export async function generateProcurementFollowUpCode(): Promise<string> {
  const supabase = getSupabase();

  const year = new Date().getFullYear();

  const { count, error } = await supabase
    .from("procurement_follow_ups")
    .select("id", {
      count: "exact",
      head: true,
    })
    .gte("created_at", `${year}-01-01T00:00:00.000Z`);

  if (error) {
    throw new Error(
      `Unable to generate procurement follow-up code: ${error.message}`
    );
  }

  const sequence = (count ?? 0) + 1;

  return `FU-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Retrieves active procurement follow-ups using the supplied filters.
 *
 * Related procurement entities are loaded so the workspace can display
 * useful context without requiring additional requests for each row.
 */
export async function getProcurementFollowUps(
  filters: ProcurementFollowUpFilters = {}
): Promise<{
  data: ProcurementFollowUpListItem[];
  count: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 20, 1), 100);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("procurement_follow_ups")
    .select(
      `
        *,
        clients (
          display_name,
          company_name
        ),
        client_contacts (
          first_name,
          last_name
        ),
        procurement_leads (
          title
        ),
        procurement_opportunities (
          name
        ),
        vendor_registrations (
          registration_code
        ),
        procurement_rfqs (
          reference_code
        ),
        procurement_proposals (
          proposal_code
        ),
        procurement_negotiations (
          negotiation_code
        ),
        procurement_contracts (
          contract_code
        ),
        staff:assigned_to (
          first_name,
          last_name
        )
      `,
      {
        count: "exact",
      }
    )
    .is("archived_at", null)
    .order("due_at", {
      ascending: true,
      nullsFirst: false,
    })
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `follow_up_code.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (filters.activity_type) {
    query = query.eq("activity_type", filters.activity_type);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters.lead_id) {
    query = query.eq("lead_id", filters.lead_id);
  }

  if (filters.opportunity_id) {
    query = query.eq("opportunity_id", filters.opportunity_id);
  }

  if (filters.vendor_registration_id) {
    query = query.eq("vendor_registration_id", filters.vendor_registration_id);
  }

  if (filters.rfq_id) {
    query = query.eq("rfq_id", filters.rfq_id);
  }

  if (filters.proposal_id) {
    query = query.eq("proposal_id", filters.proposal_id);
  }

  if (filters.negotiation_id) {
    query = query.eq("negotiation_id", filters.negotiation_id);
  }

  if (filters.contract_id) {
    query = query.eq("contract_id", filters.contract_id);
  }

  if (filters.due_from) {
    query = query.gte("due_at", filters.due_from);
  }

  if (filters.due_to) {
    query = query.lte("due_at", filters.due_to);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(
      `Unable to retrieve procurement follow-ups: ${error.message}`
    );
  }

  const followUps: ProcurementFollowUpListItem[] = (data ?? []).map((item) => {
    const client = Array.isArray(item.clients) ? item.clients[0] : item.clients;

    const contact = Array.isArray(item.client_contacts)
      ? item.client_contacts[0]
      : item.client_contacts;

    const lead = Array.isArray(item.procurement_leads)
      ? item.procurement_leads[0]
      : item.procurement_leads;

    const opportunity = Array.isArray(item.procurement_opportunities)
      ? item.procurement_opportunities[0]
      : item.procurement_opportunities;

    const vendorRegistration = Array.isArray(item.vendor_registrations)
      ? item.vendor_registrations[0]
      : item.vendor_registrations;

    const rfq = Array.isArray(item.procurement_rfqs)
      ? item.procurement_rfqs[0]
      : item.procurement_rfqs;

    const proposal = Array.isArray(item.procurement_proposals)
      ? item.procurement_proposals[0]
      : item.procurement_proposals;

    const negotiation = Array.isArray(item.procurement_negotiations)
      ? item.procurement_negotiations[0]
      : item.procurement_negotiations;

    const contract = Array.isArray(item.procurement_contracts)
      ? item.procurement_contracts[0]
      : item.procurement_contracts;

    const staff = Array.isArray(item.staff) ? item.staff[0] : item.staff;

    return {
      ...(item as unknown as ProcurementFollowUp),

      client_name: client?.display_name ?? client?.company_name ?? null,

      contact_name: contact
        ? `${contact.first_name} ${contact.last_name}`.trim()
        : null,

      assigned_to_name: staff
        ? `${staff.first_name} ${staff.last_name}`.trim()
        : null,

      lead_title: lead?.title ?? null,
      opportunity_name: opportunity?.name ?? null,

      vendor_registration_code: vendorRegistration?.registration_code ?? null,

      rfq_reference: rfq?.reference_code ?? null,
      proposal_code: proposal?.proposal_code ?? null,
      negotiation_code: negotiation?.negotiation_code ?? null,

      contract_code: contract?.contract_code ?? null,
    };
  });

  return {
    data: followUps,
    count: count ?? 0,
  };
}

/**
 * Creates a new procurement follow-up/activity.
 */
export async function createProcurementFollowUp(
  input: CreateProcurementFollowUpInput,
  staffId?: string | null
): Promise<ProcurementFollowUp> {
  const supabase = getSupabase();

  const followUpCode = await generateProcurementFollowUpCode();

  const { data, error } = await supabase
    .from("procurement_follow_ups")
    .insert({
      client_id: input.client_id,
      contact_id: input.contact_id ?? null,

      lead_id: input.lead_id ?? null,
      opportunity_id: input.opportunity_id ?? null,
      vendor_registration_id: input.vendor_registration_id ?? null,
      rfq_id: input.rfq_id ?? null,
      proposal_id: input.proposal_id ?? null,
      negotiation_id: input.negotiation_id ?? null,
      contract_id: input.contract_id ?? null,

      assigned_to: input.assigned_to ?? null,

      follow_up_code: followUpCode,

      activity_type: input.activity_type ?? "follow_up",

      status: input.status ?? "pending",

      priority: input.priority ?? "medium",

      subject: input.subject.trim(),

      description: input.description?.trim() || null,

      due_at: input.due_at ?? null,

      completed_at: input.completed_at ?? null,

      next_follow_up_at: input.next_follow_up_at ?? null,

      outcome: input.outcome?.trim() || null,

      notes: input.notes?.trim() || null,

      metadata: input.metadata ?? {},

      created_by: staffId ?? null,
      updated_by: staffId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create procurement follow-up: ${error.message}`);
  }

  return data as ProcurementFollowUp;
}

/**
 * Updates an existing procurement follow-up/activity.
 */
export async function updateProcurementFollowUp(
  input: UpdateProcurementFollowUpInput,
  staffId?: string | null
): Promise<ProcurementFollowUp> {
  const supabase = getSupabase();

  const { id, ...updates } = input;

  const payload = {
    ...(updates.client_id !== undefined && {
      client_id: updates.client_id,
    }),

    ...(updates.contact_id !== undefined && {
      contact_id: updates.contact_id ?? null,
    }),

    ...(updates.lead_id !== undefined && {
      lead_id: updates.lead_id ?? null,
    }),

    ...(updates.opportunity_id !== undefined && {
      opportunity_id: updates.opportunity_id ?? null,
    }),

    ...(updates.vendor_registration_id !== undefined && {
      vendor_registration_id: updates.vendor_registration_id ?? null,
    }),

    ...(updates.rfq_id !== undefined && {
      rfq_id: updates.rfq_id ?? null,
    }),

    ...(updates.proposal_id !== undefined && {
      proposal_id: updates.proposal_id ?? null,
    }),

    ...(updates.negotiation_id !== undefined && {
      negotiation_id: updates.negotiation_id ?? null,
    }),

    ...(updates.contract_id !== undefined && {
      contract_id: updates.contract_id ?? null,
    }),

    ...(updates.assigned_to !== undefined && {
      assigned_to: updates.assigned_to ?? null,
    }),

    ...(updates.activity_type !== undefined && {
      activity_type: updates.activity_type,
    }),

    ...(updates.status !== undefined && {
      status: updates.status,
    }),

    ...(updates.priority !== undefined && {
      priority: updates.priority,
    }),

    ...(updates.subject !== undefined && {
      subject: updates.subject.trim(),
    }),

    ...(updates.description !== undefined && {
      description: updates.description?.trim() || null,
    }),

    ...(updates.due_at !== undefined && {
      due_at: updates.due_at ?? null,
    }),

    ...(updates.completed_at !== undefined && {
      completed_at: updates.completed_at ?? null,
    }),

    ...(updates.next_follow_up_at !== undefined && {
      next_follow_up_at: updates.next_follow_up_at ?? null,
    }),

    ...(updates.outcome !== undefined && {
      outcome: updates.outcome?.trim() || null,
    }),

    ...(updates.notes !== undefined && {
      notes: updates.notes?.trim() || null,
    }),

    ...(updates.metadata !== undefined && {
      metadata: updates.metadata ?? {},
    }),

    updated_by: staffId ?? null,
  };

  const { data, error } = await supabase
    .from("procurement_follow_ups")
    .update(payload)
    .eq("id", id)
    .is("archived_at", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update procurement follow-up: ${error.message}`);
  }

  return data as ProcurementFollowUp;
}

/**
 * Updates the lifecycle status of a procurement follow-up.
 *
 * Completing a follow-up automatically records completed_at.
 */
export async function updateProcurementFollowUpStatus(
  id: string,
  status: ProcurementFollowUpStatus,
  staffId?: string | null
): Promise<ProcurementFollowUp> {
  const supabase = getSupabase();

  const payload: {
    status: ProcurementFollowUpStatus;
    completed_at?: string | null;
    updated_by: string | null;
  } = {
    status,
    updated_by: staffId ?? null,
  };

  if (status === "completed") {
    payload.completed_at = new Date().toISOString();
  } else {
    payload.completed_at = null;
  }

  const { data, error } = await supabase
    .from("procurement_follow_ups")
    .update(payload)
    .eq("id", id)
    .is("archived_at", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to update procurement follow-up status: ${error.message}`
    );
  }

  return data as ProcurementFollowUp;
}

/**
 * Archives a procurement follow-up without permanently deleting it.
 */
export async function archiveProcurementFollowUp(
  id: string,
  staffId?: string | null
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("procurement_follow_ups")
    .update({
      archived_at: new Date().toISOString(),
      updated_by: staffId ?? null,
    })
    .eq("id", id)
    .is("archived_at", null);

  if (error) {
    throw new Error(
      `Unable to archive procurement follow-up: ${error.message}`
    );
  }
}

/**
 * Generates the next procurement contract code.
 *
 * Contract codes follow the format:
 * CON-YYYY-0001
 *
 * The generated value is intended for normal application use.
 * Database uniqueness remains the final protection against duplicates.
 */
export async function generateProcurementContractCode(): Promise<string> {
  const supabase = getSupabase();

  const year = new Date().getFullYear();

  const { count, error } = await supabase
    .from("procurement_contracts")
    .select("id", {
      count: "exact",
      head: true,
    })
    .gte("created_at", `${year}-01-01T00:00:00.000Z`)
    .lt("created_at", `${year + 1}-01-01T00:00:00.000Z`);

  if (error) {
    throw new Error(
      `Unable to generate procurement contract code: ${error.message}`
    );
  }

  const sequence = (count ?? 0) + 1;

  return `CON-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Loads procurement contracts with their related client,
 * opportunity, proposal, negotiation, contact, and staff names.
 */
export async function getProcurementContracts(
  filters: ProcurementContractFilters = {}
): Promise<{
  data: ProcurementContractListItem[];
  count: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 15, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("procurement_contracts")
    .select(
      `
        *,
        clients (
          display_name,
          company_name
        ),
        procurement_opportunities (
          name
        ),
        procurement_proposals (
          proposal_code,
          title
        ),
        procurement_negotiations (
          negotiation_code,
          title
        ),
        client_contacts (
          first_name,
          last_name
        ),
        staff:assigned_to (
          first_name,
          last_name
        )
      `,
      { count: "exact" }
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      [
        `contract_code.ilike.%${search}%`,
        `title.ilike.%${search}%`,
        `internal_notes.ilike.%${search}%`,
      ].join(",")
    );
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  if (filters.opportunity_id) {
    query = query.eq("opportunity_id", filters.opportunity_id);
  }

  if (filters.proposal_id) {
    query = query.eq("proposal_id", filters.proposal_id);
  }

  if (filters.negotiation_id) {
    query = query.eq("negotiation_id", filters.negotiation_id);
  }

  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Unable to load procurement contracts: ${error.message}`);
  }

  const contracts = (data ?? []).map((contract) => {
    const client = Array.isArray(contract.clients)
      ? contract.clients[0]
      : contract.clients;

    const opportunity = Array.isArray(contract.procurement_opportunities)
      ? contract.procurement_opportunities[0]
      : contract.procurement_opportunities;

    const proposal = Array.isArray(contract.procurement_proposals)
      ? contract.procurement_proposals[0]
      : contract.procurement_proposals;

    const negotiation = Array.isArray(contract.procurement_negotiations)
      ? contract.procurement_negotiations[0]
      : contract.procurement_negotiations;

    const contact = Array.isArray(contract.client_contacts)
      ? contract.client_contacts[0]
      : contract.client_contacts;

    const assignedTo = Array.isArray(contract.staff)
      ? contract.staff[0]
      : contract.staff;

    const contactName =
      contact?.first_name || contact?.last_name
        ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
        : null;

    const assignedToName =
      assignedTo?.first_name || assignedTo?.last_name
        ? `${assignedTo.first_name ?? ""} ${assignedTo.last_name ?? ""}`.trim()
        : null;

    return {
      ...contract,
      client_name: client?.display_name ?? client?.company_name ?? null,
      opportunity_name: opportunity?.name ?? null,
      proposal_code: proposal?.proposal_code ?? null,
      proposal_title: proposal?.title ?? null,
      negotiation_code: negotiation?.negotiation_code ?? null,
      negotiation_title: negotiation?.title ?? null,
      contact_name: contactName,
      assigned_to_name: assignedToName,
    } as ProcurementContractListItem;
  });

  return {
    data: contracts,
    count: count ?? 0,
  };
}

/**
 * Creates a procurement contract.
 *
 * The contract code is generated automatically when one is not supplied
 * by an upstream workflow.
 */
export async function createProcurementContract(
  input: CreateProcurementContractInput,
  staffId?: string | null
): Promise<ProcurementContract> {
  const supabase = getSupabase();

  const contractCode = await generateProcurementContractCode();

  const payload = {
    client_id: input.client_id,
    opportunity_id: input.opportunity_id ?? null,
    proposal_id: input.proposal_id ?? null,
    negotiation_id: input.negotiation_id ?? null,
    contact_id: input.contact_id ?? null,
    assigned_to: input.assigned_to ?? null,

    contract_code: contractCode,
    title: input.title,

    status: input.status ?? "draft",
    priority: input.priority ?? "medium",

    contract_value: input.contract_value ?? null,
    currency: input.currency ?? "NGN",

    contract_date: input.contract_date ?? null,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    renewal_date: input.renewal_date ?? null,

    payment_terms: input.payment_terms ?? null,
    billing_frequency: input.billing_frequency ?? null,

    scope_summary: input.scope_summary ?? null,
    deliverables: input.deliverables ?? null,
    service_level_terms: input.service_level_terms ?? null,
    termination_terms: input.termination_terms ?? null,
    renewal_terms: input.renewal_terms ?? null,

    next_action: input.next_action ?? null,
    next_action_at: input.next_action_at ?? null,

    internal_notes: input.internal_notes ?? null,
    client_notes: input.client_notes ?? null,
    outcome: input.outcome ?? null,

    requirements: input.requirements ?? [],
    metadata: input.metadata ?? {},

    created_by: staffId ?? null,
    updated_by: staffId ?? null,
  };

  const { data, error } = await supabase
    .from("procurement_contracts")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create procurement contract: ${error.message}`);
  }

  return data as ProcurementContract;
}

/**
 * Updates an existing procurement contract.
 *
 * Identity fields such as contract_code are deliberately excluded
 * from the update payload so contract identity remains stable.
 */
export async function updateProcurementContract(
  input: UpdateProcurementContractInput,
  staffId?: string | null
): Promise<ProcurementContract> {
  const supabase = getSupabase();

  const {
    id,
    client_id,
    opportunity_id,
    proposal_id,
    negotiation_id,
    contact_id,
    assigned_to,
    title,
    status,
    priority,
    contract_value,
    currency,
    contract_date,
    start_date,
    end_date,
    renewal_date,
    payment_terms,
    billing_frequency,
    scope_summary,
    deliverables,
    service_level_terms,
    termination_terms,
    renewal_terms,
    next_action,
    next_action_at,
    internal_notes,
    client_notes,
    outcome,
    requirements,
    metadata,
  } = input;

  const payload: Record<string, unknown> = {};

  if (client_id !== undefined) payload.client_id = client_id;
  if (opportunity_id !== undefined) {
    payload.opportunity_id = opportunity_id;
  }
  if (proposal_id !== undefined) {
    payload.proposal_id = proposal_id;
  }
  if (negotiation_id !== undefined) {
    payload.negotiation_id = negotiation_id;
  }
  if (contact_id !== undefined) {
    payload.contact_id = contact_id;
  }
  if (assigned_to !== undefined) {
    payload.assigned_to = assigned_to;
  }
  if (title !== undefined) payload.title = title;
  if (status !== undefined) payload.status = status;
  if (priority !== undefined) payload.priority = priority;
  if (contract_value !== undefined) {
    payload.contract_value = contract_value;
  }
  if (currency !== undefined) payload.currency = currency;
  if (contract_date !== undefined) {
    payload.contract_date = contract_date;
  }
  if (start_date !== undefined) payload.start_date = start_date;
  if (end_date !== undefined) payload.end_date = end_date;
  if (renewal_date !== undefined) {
    payload.renewal_date = renewal_date;
  }
  if (payment_terms !== undefined) {
    payload.payment_terms = payment_terms;
  }
  if (billing_frequency !== undefined) {
    payload.billing_frequency = billing_frequency;
  }
  if (scope_summary !== undefined) {
    payload.scope_summary = scope_summary;
  }
  if (deliverables !== undefined) {
    payload.deliverables = deliverables;
  }
  if (service_level_terms !== undefined) {
    payload.service_level_terms = service_level_terms;
  }
  if (termination_terms !== undefined) {
    payload.termination_terms = termination_terms;
  }
  if (renewal_terms !== undefined) {
    payload.renewal_terms = renewal_terms;
  }
  if (next_action !== undefined) {
    payload.next_action = next_action;
  }
  if (next_action_at !== undefined) {
    payload.next_action_at = next_action_at;
  }
  if (internal_notes !== undefined) {
    payload.internal_notes = internal_notes;
  }
  if (client_notes !== undefined) {
    payload.client_notes = client_notes;
  }
  if (outcome !== undefined) payload.outcome = outcome;
  if (requirements !== undefined) {
    payload.requirements = requirements;
  }
  if (metadata !== undefined) payload.metadata = metadata;

  if (staffId !== undefined) {
    payload.updated_by = staffId;
  }

  const { data, error } = await supabase
    .from("procurement_contracts")
    .update(payload)
    .eq("id", id)
    .is("archived_at", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update procurement contract: ${error.message}`);
  }

  return data as ProcurementContract;
}

/**
 * Updates the lifecycle status of a procurement contract.
 *
 * Contract status changes are timestamped through updated_at.
 */
export async function updateProcurementContractStatus(
  id: string,
  status: ProcurementContractStatus,
  staffId?: string | null
): Promise<ProcurementContract> {
  const supabase = getSupabase();

  const payload: Record<string, unknown> = {
    status,
  };

  if (staffId) {
    payload.updated_by = staffId;
  }

  const { data, error } = await supabase
    .from("procurement_contracts")
    .update(payload)
    .eq("id", id)
    .is("archived_at", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to update procurement contract status: ${error.message}`
    );
  }

  return data as ProcurementContract;
}

/**
 * Archives a procurement contract without physically deleting it.
 */
export async function archiveProcurementContract(
  id: string,
  staffId?: string | null
): Promise<ProcurementContract> {
  const supabase = getSupabase();

  const payload: Record<string, unknown> = {
    archived_at: new Date().toISOString(),
  };

  if (staffId) {
    payload.updated_by = staffId;
  }

  const { data, error } = await supabase
    .from("procurement_contracts")
    .update(payload)
    .eq("id", id)
    .is("archived_at", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to archive procurement contract: ${error.message}`);
  }

  return data as ProcurementContract;
}

/**
 * Creates a contract from an existing procurement negotiation.
 *
 * This carries forward the agreed commercial information so the user
 * does not have to manually re-enter the negotiation data.
 *
 * If the negotiation already has an active contract, that contract
 * is returned instead of creating a duplicate.
 */
export async function createProcurementContractFromNegotiation(
  negotiationId: string,
  staffId?: string | null
): Promise<ProcurementContract> {
  const supabase = getSupabase();

  const { data: existingContract, error: existingContractError } =
    await supabase
      .from("procurement_contracts")
      .select("*")
      .eq("negotiation_id", negotiationId)
      .is("archived_at", null)
      .maybeSingle();

  if (existingContractError) {
    throw new Error(
      `Unable to check for an existing procurement contract: ${existingContractError.message}`
    );
  }

  if (existingContract) {
    return existingContract as ProcurementContract;
  }

  const { data: negotiation, error: negotiationError } = await supabase
    .from("procurement_negotiations")
    .select("*")
    .eq("id", negotiationId)
    .is("archived_at", null)
    .maybeSingle();

  if (negotiationError) {
    throw new Error(
      `Unable to load procurement negotiation: ${negotiationError.message}`
    );
  }

  if (!negotiation) {
    throw new Error("Procurement negotiation not found.");
  }

  if (negotiation.status !== "agreed" && negotiation.status !== "contract") {
    throw new Error(
      "A contract can only be created from a negotiation that has reached the agreed or contract stage."
    );
  }

  const contract = await createProcurementContract(
    {
      client_id: negotiation.client_id,
      opportunity_id: negotiation.opportunity_id ?? null,
      proposal_id: negotiation.proposal_id ?? null,
      negotiation_id: negotiation.id,
      contact_id: negotiation.contact_id ?? null,
      assigned_to: negotiation.assigned_to ?? null,

      title: negotiation.title,

      status: "draft",
      priority: negotiation.priority,

      contract_value:
        negotiation.agreed_value ??
        negotiation.current_value ??
        negotiation.starting_value ??
        null,

      currency: negotiation.currency ?? "NGN",

      contract_date: new Date().toISOString().slice(0, 10),

      start_date: null,
      end_date: null,
      renewal_date: null,

      payment_terms: null,
      billing_frequency: null,

      scope_summary: null,
      deliverables: null,
      service_level_terms: null,
      termination_terms: null,
      renewal_terms: null,

      next_action: "Prepare contract for internal review",
      next_action_at: null,

      internal_notes: negotiation.internal_notes ?? null,
      client_notes: negotiation.client_requests ?? null,

      outcome: negotiation.outcome ?? null,

      requirements: negotiation.requirements ?? [],

      metadata: {
        source: "negotiation",
        negotiation_status: negotiation.status,
        negotiation_code: negotiation.negotiation_code,
      },
    },
    staffId
  );

  return contract;
}

// Retrieves active procurement proposals with related display information.
export async function getProcurementProposals(
  filters: ProcurementProposalFilters = {}
): Promise<{
  data: ProcurementProposalListItem[];
  count: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 20, 1), 100);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("procurement_proposals")
    .select(
      `
        *,
        clients (
          display_name,
          company_name
        ),
        procurement_opportunities (
          name
        ),
        procurement_rfqs (
          reference_code
        ),
        client_contacts (
          first_name,
          last_name
        ),
        staff:assigned_to (
          first_name,
          last_name
        )
      `,
      { count: "exact" }
    )
    .is("archived_at", null)
    .range(from, to)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  if (filters.opportunity_id) {
    query = query.eq("opportunity_id", filters.opportunity_id);
  }

  if (filters.rfq_id) {
    query = query.eq("rfq_id", filters.rfq_id);
  }

  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `proposal_code.ilike.%${search}%,title.ilike.%${search}%,source_reference.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(
      `Unable to retrieve procurement proposals: ${error.message}`
    );
  }

  const proposals = (data ?? []).map((proposal) => {
    const client = Array.isArray(proposal.clients)
      ? proposal.clients[0]
      : proposal.clients;

    const opportunity = Array.isArray(proposal.procurement_opportunities)
      ? proposal.procurement_opportunities[0]
      : proposal.procurement_opportunities;

    const rfq = Array.isArray(proposal.procurement_rfqs)
      ? proposal.procurement_rfqs[0]
      : proposal.procurement_rfqs;

    const contact = Array.isArray(proposal.client_contacts)
      ? proposal.client_contacts[0]
      : proposal.client_contacts;

    const staff = Array.isArray(proposal.staff)
      ? proposal.staff[0]
      : proposal.staff;

    const contactName = contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
      : null;

    const assignedToName = staff
      ? [staff.first_name, staff.last_name].filter(Boolean).join(" ")
      : null;

    return {
      ...proposal,
      client_name: client?.display_name ?? client?.company_name ?? null,
      opportunity_name: opportunity?.name ?? null,
      rfq_reference: rfq?.reference_code ?? null,
      contact_name: contactName || null,
      assigned_to_name: assignedToName || null,
    } as ProcurementProposalListItem;
  });

  return {
    data: proposals,
    count: count ?? 0,
  };
}

/**
 * Generates the next human-readable procurement negotiation code.
 *
 * The generated code follows the format:
 * NEG-YYYY-0001
 */
async function generateProcurementNegotiationCode(): Promise<string> {
  const supabase = getSupabase();

  const year = new Date().getFullYear();

  /**
   * Count negotiation records created for the current year's code prefix.
   */
  const { count, error } = await supabase
    .from("procurement_negotiations")
    .select("id", {
      count: "exact",
      head: true,
    })
    .like("negotiation_code", `NEG-${year}-%`);

  if (error) {
    throw new Error(`Unable to generate negotiation code: ${error.message}`);
  }

  const sequence = (count ?? 0) + 1;

  return `NEG-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Retrieves procurement negotiations using the supplied filters and pagination.
 */
export async function getProcurementNegotiations(
  filters: ProcurementNegotiationFilters = {}
): Promise<{
  data: ProcurementNegotiationListItem[];
  count: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 20, 1), 100);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  /**
   * Build the negotiation query with related organisation,
   * opportunity, proposal, contact and assigned staff information.
   */
  let query = supabase
    .from("procurement_negotiations")
    .select(
      `
        *,
        clients (
          display_name,
          company_name
        ),
        procurement_opportunities (
          name
        ),
        procurement_proposals (
          proposal_code,
          title
        ),
        client_contacts (
          first_name,
          last_name
        ),
        staff:assigned_to (
          first_name,
          last_name
        )
      `,
      { count: "exact" }
    )
    .is("archived_at", null)
    .range(from, to)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  if (filters.opportunity_id) {
    query = query.eq("opportunity_id", filters.opportunity_id);
  }

  if (filters.proposal_id) {
    query = query.eq("proposal_id", filters.proposal_id);
  }

  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `negotiation_code.ilike.%${search}%,title.ilike.%${search}%,next_action.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(
      `Unable to retrieve procurement negotiations: ${error.message}`
    );
  }

  /**
   * Transform Supabase relationship data into the flattened
   * structure expected by the procurement workspace.
   */
  const negotiations = (data ?? []).map((negotiation) => {
    const client = Array.isArray(negotiation.clients)
      ? negotiation.clients[0]
      : negotiation.clients;

    const opportunity = Array.isArray(negotiation.procurement_opportunities)
      ? negotiation.procurement_opportunities[0]
      : negotiation.procurement_opportunities;

    const proposal = Array.isArray(negotiation.procurement_proposals)
      ? negotiation.procurement_proposals[0]
      : negotiation.procurement_proposals;

    const contact = Array.isArray(negotiation.client_contacts)
      ? negotiation.client_contacts[0]
      : negotiation.client_contacts;

    const staff = Array.isArray(negotiation.staff)
      ? negotiation.staff[0]
      : negotiation.staff;

    const contactName = contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
      : null;

    const assignedToName = staff
      ? [staff.first_name, staff.last_name].filter(Boolean).join(" ")
      : null;

    return {
      ...negotiation,
      client_name: client?.display_name ?? client?.company_name ?? null,
      opportunity_name: opportunity?.name ?? null,
      proposal_code: proposal?.proposal_code ?? null,
      proposal_title: proposal?.title ?? null,
      contact_name: contactName || null,
      assigned_to_name: assignedToName || null,
    } as ProcurementNegotiationListItem;
  });

  return {
    data: negotiations,
    count: count ?? 0,
  };
}

/**
 * Creates a new procurement negotiation.
 */
export async function createProcurementNegotiation(
  input: CreateProcurementNegotiationInput,
  staffId?: string | null
): Promise<ProcurementNegotiation> {
  const supabase = getSupabase();

  const negotiationCode = await generateProcurementNegotiationCode();

  /**
   * Create the negotiation record using the supplied
   * commercial and relationship information.
   */
  const { data, error } = await supabase
    .from("procurement_negotiations")
    .insert({
      client_id: input.client_id,
      opportunity_id: input.opportunity_id ?? null,
      proposal_id: input.proposal_id ?? null,
      contact_id: input.contact_id ?? null,
      assigned_to: input.assigned_to ?? null,

      negotiation_code: negotiationCode,
      title: input.title,

      status: input.status ?? "not_started",
      priority: input.priority ?? "medium",

      starting_value: input.starting_value ?? null,
      current_value: input.current_value ?? input.starting_value ?? null,
      agreed_value: input.agreed_value ?? null,
      currency: input.currency ?? "NGN",

      negotiation_start_date: input.negotiation_start_date ?? null,
      target_close_date: input.target_close_date ?? null,
      agreed_date: input.agreed_date ?? null,

      last_activity_at: input.last_activity_at ?? null,

      next_action: input.next_action?.trim() || null,
      next_action_at: input.next_action_at ?? null,

      client_requests: input.client_requests?.trim() || null,
      concessions: input.concessions?.trim() || null,
      agreed_terms: input.agreed_terms?.trim() || null,
      internal_notes: input.internal_notes?.trim() || null,
      outcome: input.outcome?.trim() || null,

      requirements: input.requirements ?? [],
      metadata: input.metadata ?? {},

      created_by: staffId ?? null,
      updated_by: staffId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to create procurement negotiation: ${error.message}`
    );
  }

  return data as ProcurementNegotiation;
}

/**
 * Updates an existing procurement negotiation.
 */
export async function updateProcurementNegotiation(
  input: UpdateProcurementNegotiationInput,
  staffId?: string | null
): Promise<ProcurementNegotiation> {
  const supabase = getSupabase();

  const { id, ...changes } = input;

  /**
   * Build the update payload while normalising optional
   * nullable and text fields.
   */
  /**
   * Build the update payload while preserving explicitly supplied
   * activity timestamps.
   */
  const payload = {
    ...changes,

    opportunity_id: changes.opportunity_id ?? null,
    proposal_id: changes.proposal_id ?? null,
    contact_id: changes.contact_id ?? null,
    assigned_to: changes.assigned_to ?? null,

    starting_value: changes.starting_value ?? null,
    current_value: changes.current_value ?? null,
    agreed_value: changes.agreed_value ?? null,
    currency: changes.currency ?? "NGN",

    negotiation_start_date: changes.negotiation_start_date ?? null,

    target_close_date: changes.target_close_date ?? null,

    agreed_date: changes.agreed_date ?? null,

    last_activity_at: changes.last_activity_at ?? new Date().toISOString(),

    next_action: changes.next_action?.trim() || null,

    next_action_at: changes.next_action_at ?? null,

    client_requests: changes.client_requests?.trim() || null,

    concessions: changes.concessions?.trim() || null,

    agreed_terms: changes.agreed_terms?.trim() || null,

    internal_notes: changes.internal_notes?.trim() || null,

    outcome: changes.outcome?.trim() || null,

    requirements: changes.requirements ?? [],

    metadata: changes.metadata ?? {},

    updated_by: staffId ?? null,
  };

  const { data, error } = await supabase
    .from("procurement_negotiations")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to update procurement negotiation: ${error.message}`
    );
  }

  return data as ProcurementNegotiation;
}

/**
 * Updates the lifecycle status of a procurement negotiation.
 */
export async function updateProcurementNegotiationStatus(
  id: string,
  status: ProcurementNegotiationStatus,
  staffId?: string | null
): Promise<ProcurementNegotiation> {
  const supabase = getSupabase();

  const now = new Date().toISOString();

  /**
   * Record the status change and update the activity timestamp.
   */
  const { data, error } = await supabase
    .from("procurement_negotiations")
    .update({
      status,
      last_activity_at: now,
      updated_by: staffId ?? null,
      ...(status === "agreed"
        ? {
            agreed_date: now.slice(0, 10),
          }
        : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update negotiation status: ${error.message}`);
  }

  return data as ProcurementNegotiation;
}

/**
 * Archives a procurement negotiation without permanently deleting it.
 */
export async function archiveProcurementNegotiation(
  id: string,
  staffId?: string | null
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("procurement_negotiations")
    .update({
      archived_at: new Date().toISOString(),
      updated_by: staffId ?? null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Unable to archive procurement negotiation: ${error.message}`
    );
  }
}

// Generates the next proposal reference code.
async function generateProcurementProposalCode(): Promise<string> {
  const supabase = getSupabase();

  const year = new Date().getFullYear();

  const { count, error } = await supabase
    .from("procurement_proposals")
    .select("id", {
      count: "exact",
      head: true,
    })
    .like("proposal_code", `PROP-${year}-%`);

  if (error) {
    throw new Error(`Unable to generate proposal code: ${error.message}`);
  }

  const sequence = (count ?? 0) + 1;

  return `PROP-${year}-${String(sequence).padStart(4, "0")}`;
}

// Creates a new procurement proposal.
export async function createProcurementProposal(
  input: CreateProcurementProposalInput
): Promise<ProcurementProposal> {
  const supabase = getSupabase();

  const proposalCode = await generateProcurementProposalCode();

  const payload = {
    client_id: input.client_id,
    opportunity_id: input.opportunity_id ?? null,
    rfq_id: input.rfq_id ?? null,
    contact_id: input.contact_id ?? null,
    assigned_to: input.assigned_to ?? null,

    proposal_code: proposalCode,
    title: input.title,

    version: 1,

    status: input.status ?? "draft",

    quoted_value: input.quoted_value ?? null,
    currency: input.currency ?? "NGN",

    submission_date: input.submission_date ?? null,
    valid_until: input.valid_until ?? null,
    expected_decision_date: input.expected_decision_date ?? null,

    executive_summary: input.executive_summary ?? null,

    scope_summary: input.scope_summary ?? null,

    commercial_notes: input.commercial_notes ?? null,

    submission_instructions: input.submission_instructions ?? null,

    internal_notes: input.internal_notes ?? null,

    requirements: input.requirements ?? [],

    source_reference: input.source_reference ?? null,
  };

  const { data, error } = await supabase
    .from("procurement_proposals")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create procurement proposal: ${error.message}`);
  }

  return data as ProcurementProposal;
}

// Updates an existing procurement proposal.
export async function updateProcurementProposal(
  input: UpdateProcurementProposalInput
): Promise<ProcurementProposal> {
  const supabase = getSupabase();

  const { id, ...changes } = input;

  const payload = {
    ...changes,

    opportunity_id: changes.opportunity_id ?? null,

    rfq_id: changes.rfq_id ?? null,

    contact_id: changes.contact_id ?? null,

    assigned_to: changes.assigned_to ?? null,

    quoted_value: changes.quoted_value ?? null,

    currency: changes.currency ?? "NGN",

    submission_date: changes.submission_date ?? null,

    valid_until: changes.valid_until ?? null,

    expected_decision_date: changes.expected_decision_date ?? null,

    executive_summary: changes.executive_summary ?? null,

    scope_summary: changes.scope_summary ?? null,

    commercial_notes: changes.commercial_notes ?? null,

    submission_instructions: changes.submission_instructions ?? null,

    internal_notes: changes.internal_notes ?? null,

    requirements: changes.requirements ?? [],

    source_reference: changes.source_reference ?? null,
  };

  const { data, error } = await supabase
    .from("procurement_proposals")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to update procurement proposal: ${error.message}`);
  }

  return data as ProcurementProposal;
}

// Updates the lifecycle status of a proposal.
export async function updateProcurementProposalStatus(
  id: string,
  status: ProcurementProposalStatus
): Promise<ProcurementProposal> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("procurement_proposals")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to update proposal status: ${error.message}`);
  }

  return data as ProcurementProposal;
}

// Archives a proposal without permanently deleting it.
export async function archiveProcurementProposal(id: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("procurement_proposals")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to archive procurement proposal: ${error.message}`);
  }
}

/**
 * Creates the next version of an existing procurement proposal.
 *
 * The existing proposal is preserved and the new record receives the
 * next version number for the same proposal code.
 *
 * Optional changes can be supplied to update the new version without
 * modifying the previous proposal version.
 */
export async function createProcurementProposalVersion(
  id: string,
  changes: Partial<CreateProcurementProposalInput> = {}
): Promise<ProcurementProposal> {
  const supabase = getSupabase();

  /**
   * Retrieve the source proposal that will be versioned.
   */
  const { data: sourceProposal, error: sourceError } = await supabase
    .from("procurement_proposals")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .single();

  if (sourceError || !sourceProposal) {
    throw new Error(
      sourceError?.message ?? "The procurement proposal could not be found."
    );
  }

  /**
   * Find the highest existing version for this proposal code.
   *
   * Multiple versions are intentionally allowed to share the same RFQ.
   */
  const { data: latestVersion, error: latestVersionError } = await supabase
    .from("procurement_proposals")
    .select("version")
    .eq("proposal_code", sourceProposal.proposal_code)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestVersionError) {
    throw new Error(
      `Unable to determine the latest proposal version: ${latestVersionError.message}`
    );
  }

  const nextVersion = Number(latestVersion?.version ?? 0) + 1;

  /**
   * Build the new proposal from the previous version first.
   *
   * The supplied changes are then applied to the new version only.
   */
  const newProposal = {
    client_id: sourceProposal.client_id,
    opportunity_id: sourceProposal.opportunity_id,
    rfq_id: sourceProposal.rfq_id,
    contact_id: sourceProposal.contact_id,
    assigned_to: sourceProposal.assigned_to,
    title: sourceProposal.title,
    quoted_value: sourceProposal.quoted_value,
    currency: sourceProposal.currency,
    submission_date: null,
    valid_until: sourceProposal.valid_until,
    expected_decision_date: sourceProposal.expected_decision_date,
    executive_summary: sourceProposal.executive_summary,
    scope_summary: sourceProposal.scope_summary,
    commercial_notes: sourceProposal.commercial_notes,
    submission_instructions: sourceProposal.submission_instructions,
    internal_notes: sourceProposal.internal_notes,
    requirements: sourceProposal.requirements ?? [],
    source_reference: sourceProposal.source_reference,
    metadata: sourceProposal.metadata ?? {},
    created_by: sourceProposal.created_by,
    updated_by: sourceProposal.updated_by,

    ...changes,

    /**
     * These fields are protected and always belong to the newly created revision.
     */
    proposal_code: sourceProposal.proposal_code,
    version: nextVersion,
    status: "draft",
  };

  /**
   * Create the new proposal version.
   */
  const { data, error } = await supabase
    .from("procurement_proposals")
    .insert(newProposal)
    .select("*")
    .single();

  if (error) {
    /**
     * The database uniqueness constraint protects the proposal code/version
     * combination if another request creates the same version concurrently.
     */
    if (error.code === "23505") {
      throw new Error(
        `Proposal version ${nextVersion} was created by another request. Please refresh the proposal and try again.`
      );
    }

    throw new Error(
      `Unable to create procurement proposal version: ${error.message}`
    );
  }

  return data as ProcurementProposal;
}
// Retrieves RFQs/RFPs using the supplied filters and pagination.
export async function getProcurementRfqs(
  filters: ProcurementRfqFilters = {}
): Promise<{
  data: ProcurementRfqListItem[];
  count: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("procurement_rfqs")
    .select(
      `
        *,
        clients (
          display_name,
          company_name
        ),
        client_contacts (
          first_name,
          last_name
        ),
        procurement_opportunities (
          name
        ),
        procurement_portals (
          name
        ),
        staff:assigned_to (
          first_name,
          last_name
        )
      `,
      { count: "exact" }
    )
    .is("archived_at", null)
    .range(from, to)
    .order("submission_deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.request_type) {
    query = query.eq("request_type", filters.request_type);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  if (filters.opportunity_id) {
    query = query.eq("opportunity_id", filters.opportunity_id);
  }

  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters.portal_id) {
    query = query.eq("portal_id", filters.portal_id);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `reference_code.ilike.%${search}%,title.ilike.%${search}%,source_reference.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Unable to retrieve procurement RFQs: ${error.message}`);
  }

  const rfqs = (data ?? []).map((rfq) => {
    const client = Array.isArray(rfq.clients) ? rfq.clients[0] : rfq.clients;

    const contact = Array.isArray(rfq.client_contacts)
      ? rfq.client_contacts[0]
      : rfq.client_contacts;

    const opportunity = Array.isArray(rfq.procurement_opportunities)
      ? rfq.procurement_opportunities[0]
      : rfq.procurement_opportunities;

    const portal = Array.isArray(rfq.procurement_portals)
      ? rfq.procurement_portals[0]
      : rfq.procurement_portals;

    const staff = Array.isArray(rfq.staff) ? rfq.staff[0] : rfq.staff;

    const contactName = contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
      : null;

    const assignedToName = staff
      ? [staff.first_name, staff.last_name].filter(Boolean).join(" ")
      : null;

    return {
      ...rfq,
      client_name: client?.display_name ?? client?.company_name ?? null,
      contact_name: contactName || null,
      opportunity_name: opportunity?.name ?? null,
      portal_name: portal?.name ?? null,
      assigned_to_name: assignedToName || null,
    } as ProcurementRfqListItem;
  });

  return {
    data: rfqs,
    count: count ?? 0,
  };
}

/**
 * Creates a privileged Supabase client for procurement operations.
 */
function getSupabase() {
  return createSupabaseAdminClient();
}

// Generates the next human-readable RFQ/RFP reference code.
async function generateProcurementRfqCode(): Promise<string> {
  const supabase = getSupabase();

  const year = new Date().getFullYear();

  const { count, error } = await supabase
    .from("procurement_rfqs")
    .select("id", {
      count: "exact",
      head: true,
    })
    .like("reference_code", `RFQ-${year}-%`);

  if (error) {
    throw new Error(
      `Unable to generate procurement RFQ code: ${error.message}`
    );
  }

  const sequence = (count ?? 0) + 1;

  return `RFQ-${year}-${String(sequence).padStart(4, "0")}`;
}

// Creates a new procurement RFQ/RFP.
export async function createProcurementRfq(
  input: CreateProcurementRfqInput
): Promise<ProcurementRfq> {
  const supabase = getSupabase();

  const referenceCode = await generateProcurementRfqCode();

  const payload = {
    client_id: input.client_id,
    opportunity_id: input.opportunity_id ?? null,
    contact_id: input.contact_id ?? null,
    portal_id: input.portal_id ?? null,
    assigned_to: input.assigned_to ?? null,

    reference_code: referenceCode,
    request_type: input.request_type,
    title: input.title,
    description: input.description ?? null,

    status: input.status ?? "received",
    priority: input.priority ?? "medium",

    estimated_value: input.estimated_value ?? null,
    currency: input.currency ?? "NGN",

    issue_date: input.issue_date ?? null,
    clarification_deadline: input.clarification_deadline ?? null,
    submission_deadline: input.submission_deadline ?? null,
    evaluation_date: input.evaluation_date ?? null,
    award_date: input.award_date ?? null,

    source: input.source ?? null,
    source_reference: input.source_reference ?? null,

    requirements: input.requirements ?? [],
    submission_instructions: input.submission_instructions ?? null,
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from("procurement_rfqs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create procurement RFQ: ${error.message}`);
  }

  return data as ProcurementRfq;
}

// Updates an existing procurement RFQ/RFP.
export async function updateProcurementRfq(
  input: UpdateProcurementRfqInput
): Promise<ProcurementRfq> {
  const supabase = getSupabase();

  const { id, ...changes } = input;

  const payload = {
    ...changes,
    opportunity_id: changes.opportunity_id ?? null,
    contact_id: changes.contact_id ?? null,
    portal_id: changes.portal_id ?? null,
    assigned_to: changes.assigned_to ?? null,
    description: changes.description ?? null,
    estimated_value: changes.estimated_value ?? null,
    currency: changes.currency ?? "NGN",
    issue_date: changes.issue_date ?? null,
    clarification_deadline: changes.clarification_deadline ?? null,
    submission_deadline: changes.submission_deadline ?? null,
    evaluation_date: changes.evaluation_date ?? null,
    award_date: changes.award_date ?? null,
    source: changes.source ?? null,
    source_reference: changes.source_reference ?? null,
    requirements: changes.requirements ?? [],
    submission_instructions: changes.submission_instructions ?? null,
    notes: changes.notes ?? null,
  };

  const { data, error } = await supabase
    .from("procurement_rfqs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to update procurement RFQ: ${error.message}`);
  }

  return data as ProcurementRfq;
}

// Archives an RFQ/RFP without permanently deleting the record.
export async function archiveProcurementRfq(id: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("procurement_rfqs")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to archive procurement RFQ: ${error.message}`);
  }
}

// Updates the operational status of an RFQ/RFP.
export async function updateProcurementRfqStatus(
  id: string,
  status: ProcurementRfqStatus
): Promise<ProcurementRfq> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("procurement_rfqs")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Unable to update procurement RFQ status: ${error.message}`
    );
  }

  return data as ProcurementRfq;
}
/**
 * Retrieves procurement portals using the supplied filters.
 */
export async function getProcurementPortals(
  filters: ProcurementPortalFilters = {}
): Promise<{
  data: ProcurementPortalListItem[];
  total: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 25, 1), 100);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("procurement_portals")
    .select(
      `
        *,
        vendor_registrations (
          id,
          status
        )
      `,
      { count: "exact" }
    )
    .is("archived_at", null);

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `name.ilike.%${search}%,organisation_name.ilike.%${search}%`
    );
  }

  if (filters.portal_type) {
    query = query.eq("portal_type", filters.portal_type);
  }

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active);
  }

  const { data, error, count } = await query
    .order("organisation_name", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Unable to retrieve procurement portals: ${error.message}`);
  }

  const portals = (data ?? []).map((portal) => {
    const registrations: ProcurementPortalRegistrationSummary[] = Array.isArray(
      portal.vendor_registrations
    )
      ? (portal.vendor_registrations as ProcurementPortalRegistrationSummary[])
      : [];

    return {
      ...portal,
      registrations_count: registrations.length,
      approved_registrations_count: registrations.filter(
        (registration) => registration.status === "approved"
      ).length,
      vendor_registrations: undefined,
    } as ProcurementPortalListItem;
  });

  return {
    data: portals,
    total: count ?? 0,
  };
}

/**
 * Creates a procurement portal.
 */
export async function createProcurementPortal(
  input: CreateProcurementPortalInput
) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("procurement_portals")
    .insert({
      name: input.name.trim(),
      organisation_name: input.organisation_name.trim(),
      portal_type: input.portal_type,
      url: input.url?.trim() || null,
      registration_url: input.registration_url?.trim() || null,
      country: input.country?.trim() || "Nigeria",
      state: input.state?.trim() || null,
      description: input.description?.trim() || null,
      login_required: input.login_required ?? false,
      active: input.active ?? true,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create procurement portal: ${error.message}`);
  }

  return data;
}

/**
 * Updates a procurement portal.
 */
export async function updateProcurementPortal(
  input: UpdateProcurementPortalInput
) {
  const supabase = getSupabase();

  const { id, ...changes } = input;

  const payload = {
    ...changes,
    name: changes.name?.trim(),
    organisation_name: changes.organisation_name?.trim(),
    url: changes.url?.trim() || null,
    registration_url: changes.registration_url?.trim() || null,
    state: changes.state?.trim() || null,
    description: changes.description?.trim() || null,
    notes: changes.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("procurement_portals")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to update procurement portal: ${error.message}`);
  }

  return data;
}

/**
 * Archives a procurement portal.
 */
export async function archiveProcurementPortal(id: string) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("procurement_portals")
    .update({
      archived_at: new Date().toISOString(),
      active: false,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to archive procurement portal: ${error.message}`);
  }
}

/**
 * Retrieves vendor registrations using the supplied filters.
 */
export async function getVendorRegistrations(
  filters: VendorRegistrationFilters = {}
): Promise<{
  data: VendorRegistrationListItem[];
  total: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 25, 1), 100);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("vendor_registrations")
    .select(
      `
        *,
        clients (
          display_name
        ),
        procurement_portals (
          name
        ),
        staff:assigned_to (
          first_name,
          last_name
        )
      `,
      { count: "exact" }
    )
    .is("archived_at", null);

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `registration_code.ilike.%${search}%,registration_number.ilike.%${search}%`
    );
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  if (filters.portal_id) {
    query = query.eq("portal_id", filters.portal_id);
  }

  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(
      `Unable to retrieve vendor registrations: ${error.message}`
    );
  }

  const registrations = (data ?? []).map((registration) => {
    const client = Array.isArray(registration.clients)
      ? registration.clients[0]
      : registration.clients;

    const portal = Array.isArray(registration.procurement_portals)
      ? registration.procurement_portals[0]
      : registration.procurement_portals;

    const assignedStaff = Array.isArray(registration.staff)
      ? registration.staff[0]
      : registration.staff;

    return {
      ...registration,
      client_name: client?.display_name ?? null,
      portal_name: portal?.name ?? null,
      assigned_to_name: assignedStaff
        ? `${assignedStaff.first_name} ${assignedStaff.last_name}`
        : null,
      clients: undefined,
      procurement_portals: undefined,
      staff: undefined,
    } as VendorRegistrationListItem;
  });

  return {
    data: registrations,
    total: count ?? 0,
  };
}

/**
 * Generates the next human-readable vendor registration code.
 */
async function generateVendorRegistrationCode() {
  const supabase = getSupabase();

  const year = new Date().getFullYear();

  const { count, error } = await supabase
    .from("vendor_registrations")
    .select("id", {
      count: "exact",
      head: true,
    })
    .like("registration_code", `VR-${year}-%`);

  if (error) {
    throw new Error(
      `Unable to generate vendor registration code: ${error.message}`
    );
  }

  return `VR-${year}-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

/**
 * Creates a vendor registration.
 */
export async function createVendorRegistration(
  input: CreateVendorRegistrationInput
) {
  const supabase = getSupabase();

  const registrationCode = await generateVendorRegistrationCode();

  const { data, error } = await supabase
    .from("vendor_registrations")
    .insert({
      client_id: input.client_id,
      portal_id: input.portal_id || null,
      registration_code: registrationCode,
      status: input.status ?? "not_started",
      assigned_to: input.assigned_to || null,
      registration_number: input.registration_number?.trim() || null,
      submitted_at: input.submitted_at || null,
      approved_at: input.approved_at || null,
      rejected_at: input.rejected_at || null,
      expiry_date: input.expiry_date || null,
      next_action_at: input.next_action_at || null,
      requirements: input.requirements ?? [],
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create vendor registration: ${error.message}`);
  }

  return data;
}

/**
 * Updates a vendor registration.
 */
export async function updateVendorRegistration(
  input: UpdateVendorRegistrationInput
) {
  const supabase = getSupabase();

  const { id, ...changes } = input;

  const payload = {
    ...changes,
    registration_number: changes.registration_number?.trim() || null,
    notes: changes.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("vendor_registrations")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to update vendor registration: ${error.message}`);
  }

  return data;
}

/**
 * Archives a vendor registration.
 */
export async function archiveVendorRegistration(id: string) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("vendor_registrations")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to archive vendor registration: ${error.message}`);
  }
}

/**
 * Generates the next human-readable procurement lead code.
 */
async function generateLeadCode() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("procurement_leads")
    .select("lead_code")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to generate lead code: ${error.message}`);
  }

  const currentYear = new Date().getFullYear();
  const match = data?.lead_code?.match(/(\d+)$/);
  const nextNumber = match ? Number(match[1]) + 1 : 1;

  return `PL-${currentYear}-${String(nextNumber).padStart(5, "0")}`;
}

/**
 * Generates the next human-readable procurement opportunity code.
 */
async function generateOpportunityCode() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("procurement_opportunities")
    .select("opportunity_code")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to generate opportunity code: ${error.message}`);
  }

  const currentYear = new Date().getFullYear();
  const match = data?.opportunity_code?.match(/(\d+)$/);
  const nextNumber = match ? Number(match[1]) + 1 : 1;

  return `OP-${currentYear}-${String(nextNumber).padStart(5, "0")}`;
}

/**
 * Creates a new procurement lead.
 */
export async function createProcurementLead(
  input: CreateProcurementLeadInput,
  staffId?: string | null
): Promise<ProcurementLead> {
  const supabase = getSupabase();
  const leadCode = await generateLeadCode();

  const { data, error } = await supabase
    .from("procurement_leads")
    .insert({
      client_id: input.client_id ?? null,
      contact_id: input.contact_id ?? null,
      assigned_to: input.assigned_to ?? null,
      lead_code: leadCode,
      title: input.title,
      description: input.description ?? null,
      source: input.source,
      source_reference: input.source_reference ?? null,
      status: input.status ?? "new",
      priority: input.priority ?? "medium",
      estimated_value: input.estimated_value ?? null,
      currency: input.currency ?? "NGN",
      industry: input.industry ?? null,
      service_interest: input.service_interest ?? null,
      first_contact_at: input.first_contact_at ?? null,
      next_follow_up_at: input.next_follow_up_at ?? null,
      qualification_notes: input.qualification_notes ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      created_by: staffId ?? null,
      updated_by: staffId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create procurement lead: ${error.message}`);
  }

  return data as ProcurementLead;
}

/**
 * Retrieves procurement leads using the supplied filters.
 */
export async function getProcurementLeads(
  filters: ProcurementLeadFilters = {}
): Promise<{
  data: ProcurementLeadListItem[];
  total: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 25, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("procurement_leads")
    .select(
      `
        *,
        client:clients (
          display_name
        ),
        contact:client_contacts (
          first_name,
          last_name,
          email
        ),
        assignee:staff!procurement_leads_assigned_to_fkey (
          first_name,
          last_name
        )
      `,
      { count: "exact" }
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `title.ilike.%${search}%,lead_code.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.source) {
    query = query.eq("source", filters.source);
  }

  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Unable to retrieve procurement leads: ${error.message}`);
  }

  const leads: ProcurementLeadListItem[] = (data ?? []).map((item) => {
    const client = Array.isArray(item.client) ? item.client[0] : item.client;
    const contact = Array.isArray(item.contact)
      ? item.contact[0]
      : item.contact;
    const assignee = Array.isArray(item.assignee)
      ? item.assignee[0]
      : item.assignee;

    return {
      ...(item as unknown as ProcurementLead),
      client_name: client?.display_name ?? null,
      contact_name: contact
        ? `${contact.first_name} ${contact.last_name}`.trim()
        : null,
      contact_email: contact?.email ?? null,
      assigned_to_name: assignee
        ? `${assignee.first_name} ${assignee.last_name}`.trim()
        : null,
    };
  });

  return {
    data: leads,
    total: count ?? 0,
  };
}

/**
 * Retrieves a single procurement lead by ID.
 */
export async function getProcurementLead(
  id: string
): Promise<ProcurementLeadListItem | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("procurement_leads")
    .select(
      `
        *,
        client:clients (
          display_name
        ),
        contact:client_contacts (
          first_name,
          last_name,
          email
        ),
        assignee:staff!procurement_leads_assigned_to_fkey (
          first_name,
          last_name
        )
      `
    )
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to retrieve procurement lead: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  const contact = Array.isArray(data.contact) ? data.contact[0] : data.contact;
  const assignee = Array.isArray(data.assignee)
    ? data.assignee[0]
    : data.assignee;

  return {
    ...(data as unknown as ProcurementLead),
    client_name: client?.display_name ?? null,
    contact_name: contact
      ? `${contact.first_name} ${contact.last_name}`.trim()
      : null,
    contact_email: contact?.email ?? null,
    assigned_to_name: assignee
      ? `${assignee.first_name} ${assignee.last_name}`.trim()
      : null,
  };
}

/**
 * Updates an existing procurement lead.
 */
export async function updateProcurementLead(
  input: UpdateProcurementLeadInput,
  staffId?: string | null
): Promise<ProcurementLead> {
  const supabase = getSupabase();

  const { id, ...updates } = input;

  const { data, error } = await supabase
    .from("procurement_leads")
    .update({
      ...updates,
      updated_by: staffId ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update procurement lead: ${error.message}`);
  }

  return data as ProcurementLead;
}

/**
 * Archives a procurement lead without physically deleting its record.
 */
export async function archiveProcurementLead(
  id: string,
  staffId?: string | null
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("procurement_leads")
    .update({
      archived_at: new Date().toISOString(),
      updated_by: staffId ?? null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to archive procurement lead: ${error.message}`);
  }
}

/**
 * Creates a new procurement opportunity.
 */
export async function createProcurementOpportunity(
  input: CreateProcurementOpportunityInput,
  staffId?: string | null
): Promise<ProcurementOpportunity> {
  const supabase = getSupabase();
  const opportunityCode = await generateOpportunityCode();

  const probability = Math.min(Math.max(input.probability ?? 0, 0), 100);

  const { data, error } = await supabase
    .from("procurement_opportunities")
    .insert({
      client_id: input.client_id,
      primary_contact_id: input.primary_contact_id ?? null,
      lead_id: input.lead_id ?? null,
      assigned_to: input.assigned_to ?? null,
      opportunity_code: opportunityCode,
      name: input.name,
      description: input.description ?? null,
      stage: input.stage ?? "qualified",
      status: input.status ?? "open",
      service_type: input.service_type ?? null,
      source: input.source ?? null,
      estimated_value: input.estimated_value ?? null,
      currency: input.currency ?? "NGN",
      probability,
      expected_close_date: input.expected_close_date ?? null,
      vendor_registration_required: input.vendor_registration_required ?? false,
      rfq_required: input.rfq_required ?? false,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      created_by: staffId ?? null,
      updated_by: staffId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to create procurement opportunity: ${error.message}`
    );
  }

  return data as ProcurementOpportunity;
}

/**
 * Retrieves procurement opportunities using the supplied filters.
 */
export async function getProcurementOpportunities(
  filters: ProcurementOpportunityFilters = {}
): Promise<{
  data: ProcurementOpportunityListItem[];
  total: number;
}> {
  const supabase = getSupabase();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.page_size ?? 25, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("procurement_opportunities")
    .select(
      `
        *,
        client:clients (
          display_name
        ),
        contact:client_contacts (
          first_name,
          last_name
        ),
        assignee:staff!procurement_opportunities_assigned_to_fkey (
          first_name,
          last_name
        )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `name.ilike.%${search}%,opportunity_code.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (filters.stage) {
    query = query.eq("stage", filters.stage);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(
      `Unable to retrieve procurement opportunities: ${error.message}`
    );
  }

  const opportunities: ProcurementOpportunityListItem[] = (data ?? []).map(
    (item) => {
      const client = Array.isArray(item.client) ? item.client[0] : item.client;
      const contact = Array.isArray(item.contact)
        ? item.contact[0]
        : item.contact;
      const assignee = Array.isArray(item.assignee)
        ? item.assignee[0]
        : item.assignee;

      return {
        ...(item as unknown as ProcurementOpportunity),
        client_name: client?.display_name ?? null,
        contact_name: contact
          ? `${contact.first_name} ${contact.last_name}`.trim()
          : null,
        assigned_to_name: assignee
          ? `${assignee.first_name} ${assignee.last_name}`.trim()
          : null,
      };
    }
  );

  return {
    data: opportunities,
    total: count ?? 0,
  };
}

/**
 * Retrieves a single procurement opportunity by ID.
 */
export async function getProcurementOpportunity(
  id: string
): Promise<ProcurementOpportunityListItem | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("procurement_opportunities")
    .select(
      `
        *,
        client:clients (
          display_name
        ),
        contact:client_contacts (
          first_name,
          last_name
        ),
        assignee:staff!procurement_opportunities_assigned_to_fkey (
          first_name,
          last_name
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to retrieve procurement opportunity: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  const contact = Array.isArray(data.contact) ? data.contact[0] : data.contact;
  const assignee = Array.isArray(data.assignee)
    ? data.assignee[0]
    : data.assignee;

  return {
    ...(data as unknown as ProcurementOpportunity),
    client_name: client?.display_name ?? null,
    contact_name: contact
      ? `${contact.first_name} ${contact.last_name}`.trim()
      : null,
    assigned_to_name: assignee
      ? `${assignee.first_name} ${assignee.last_name}`.trim()
      : null,
  };
}

/**
 * Updates an existing procurement opportunity.
 */
export async function updateProcurementOpportunity(
  input: UpdateProcurementOpportunityInput,
  staffId?: string | null
): Promise<ProcurementOpportunity> {
  const supabase = getSupabase();

  const { id, ...updates } = input;

  const payload = {
    ...updates,
    probability:
      updates.probability === undefined
        ? undefined
        : Math.min(Math.max(updates.probability, 0), 100),
    updated_by: staffId ?? null,
  };

  const { data, error } = await supabase
    .from("procurement_opportunities")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to update procurement opportunity: ${error.message}`
    );
  }

  return data as ProcurementOpportunity;
}

/**
 * Archives an opportunity by moving it to a lost state.
 */
export async function archiveProcurementOpportunity(
  id: string,
  staffId?: string | null
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("procurement_opportunities")
    .update({
      status: "cancelled",
      updated_by: staffId ?? null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Unable to archive procurement opportunity: ${error.message}`
    );
  }
}

/**
 * Converts a qualified lead into a procurement opportunity.
 */
export async function convertLeadToOpportunity(
  leadId: string,
  input: Omit<CreateProcurementOpportunityInput, "lead_id">,
  staffId?: string | null
): Promise<ProcurementOpportunity> {
  const supabase = getSupabase();

  const opportunity = await createProcurementOpportunity(
    {
      ...input,
      lead_id: leadId,
    },
    staffId
  );

  const { error } = await supabase
    .from("procurement_leads")
    .update({
      status: "converted",
      updated_by: staffId ?? null,
    })
    .eq("id", leadId);

  if (error) {
    throw new Error(
      `Opportunity was created, but the lead could not be converted: ${error.message}`
    );
  }

  return opportunity;
}

/**
 * Retrieves the headline statistics displayed on the procurement dashboard.
 */
export async function getProcurementStatistics(): Promise<ProcurementStatistics> {
  const supabase = getSupabase();

  const [leadsResult, opportunitiesResult] = await Promise.all([
    supabase.from("procurement_leads").select("status").is("archived_at", null),

    supabase
      .from("procurement_opportunities")
      .select("stage,status,estimated_value,probability")
      .in("status", ["open", "on_hold"]),
  ]);

  if (leadsResult.error) {
    throw new Error(
      `Unable to retrieve lead statistics: ${leadsResult.error.message}`
    );
  }

  if (opportunitiesResult.error) {
    throw new Error(
      `Unable to retrieve opportunity statistics: ${opportunitiesResult.error.message}`
    );
  }

  const leads = leadsResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];

  const activeLeads = leads.filter(
    (lead) => !["unqualified", "converted", "lost"].includes(lead.status)
  ).length;

  const qualifiedLeads = leads.filter(
    (lead) => lead.status === "qualified"
  ).length;

  const openOpportunities = opportunities.length;

  const pipelineValue = opportunities.reduce(
    (total, opportunity) => total + Number(opportunity.estimated_value ?? 0),
    0
  );

  const weightedPipelineValue = opportunities.reduce(
    (total, opportunity) =>
      total +
      Number(opportunity.estimated_value ?? 0) *
        (Number(opportunity.probability ?? 0) / 100),
    0
  );

  const opportunitiesWon =
    (
      await supabase
        .from("procurement_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("status", "won")
    ).count ?? 0;

  const opportunitiesLost =
    (
      await supabase
        .from("procurement_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("status", "lost")
    ).count ?? 0;

  return {
    active_leads: activeLeads,
    qualified_leads: qualifiedLeads,
    open_opportunities: openOpportunities,
    pipeline_value: pipelineValue,
    weighted_pipeline_value: weightedPipelineValue,
    opportunities_won: opportunitiesWon,
    opportunities_lost: opportunitiesLost,
  };
}
/**
 * Represents an organisation option used by procurement forms.
 */
export interface ProcurementClientOption {
  id: string;
  display_name: string;
  company_name: string | null;
}

/**
 * Represents a contact option used by procurement forms.
 */
export interface ProcurementContactOption {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
}

/**
 * Represents a staff option used for procurement assignment.
 */
export interface ProcurementStaffOption {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
}

/**
 * Retrieves the organisation, contact, staff and procurement portal options
 * needed by procurement forms.
 */
export async function getProcurementFormOptions(): Promise<{
  clients: ProcurementClientOption[];
  contacts: ProcurementContactOption[];
  staff: ProcurementStaffOption[];
  portals: ProcurementPortalListItem[];
  opportunities: ProcurementOpportunityOption[];
  rfqs: ProcurementRfqOption[];
  proposals: ProcurementProposalOption[];
}> {
  const supabase = getSupabase();

  const [
    clientsResult,
    contactsResult,
    staffResult,
    portalsResult,
    opportunitiesResult,
    rfqsResult,
    proposalsResult,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, display_name, company_name, client_type")
      .is("archived_at", null)
      .order("display_name"),

    supabase
      .from("client_contacts")
      .select("id, client_id, first_name, last_name, job_title, email")
      .is("archived_at", null)
      .order("first_name"),

    supabase
      .from("staff")
      .select("id, first_name, last_name, position")
      .eq("status", "active")
      .order("first_name"),

    supabase
      .from("procurement_portals")
      .select(
        `
          *,
          vendor_registrations (
            id,
            status
          )
        `
      )
      .eq("active", true)
      .is("archived_at", null)
      .order("organisation_name"),

    supabase
      .from("procurement_opportunities")
      .select(
        `
      id,
      opportunity_code,
      name,
      client_id,
      stage,
      status
    `
      )
      .is("archived_at", null)
      .in("status", ["open", "on_hold"])
      .order("name"),
    supabase
      .from("procurement_rfqs")
      .select(
        `
      id,
      client_id,
      opportunity_id,
      reference_code,
      request_type,
      title,
      status
    `
      )
      .is("archived_at", null)
      .not("status", "in", '("cancelled","expired","not_awarded")')
      .order("submission_deadline", {
        ascending: true,
        nullsFirst: false,
      }),
    supabase
      .from("procurement_proposals")
      .select(
        `
      id,
      client_id,
      proposal_code,
      title,
      version,
      status
    `
      )
      .is("archived_at", null)
      .not("status", "in", '("rejected","expired","cancelled")')
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (clientsResult.error) {
    throw new Error(
      `Unable to retrieve procurement companies: ${clientsResult.error.message}`
    );
  }

  if (contactsResult.error) {
    throw new Error(
      `Unable to retrieve procurement contacts: ${contactsResult.error.message}`
    );
  }

  if (staffResult.error) {
    throw new Error(
      `Unable to retrieve procurement staff: ${staffResult.error.message}`
    );
  }

  if (portalsResult.error) {
    throw new Error(
      `Unable to retrieve procurement portals: ${portalsResult.error.message}`
    );
  }

  if (opportunitiesResult.error) {
    throw new Error(
      `Unable to retrieve procurement opportunities: ${opportunitiesResult.error.message}`
    );
  }

  if (rfqsResult.error) {
    throw new Error(
      `Unable to retrieve procurement RFQs: ${rfqsResult.error.message}`
    );
  }
  if (proposalsResult.error) {
    throw new Error(
      `Unable to retrieve procurement proposals: ${proposalsResult.error.message}`
    );
  }

  return {
    clients: (clientsResult.data ?? []) as ProcurementClientOption[],
    contacts: (contactsResult.data ?? []) as ProcurementContactOption[],
    staff: (staffResult.data ?? []) as ProcurementStaffOption[],
    opportunities: opportunitiesResult.data ?? [],
    rfqs: rfqsResult.data ?? [],
    proposals: (proposalsResult.data ?? []) as ProcurementProposalOption[],

    portals: (portalsResult.data ?? []).map((portal) => {
      const registrations: Array<{
        id: string;
        status: string;
      }> = Array.isArray(portal.vendor_registrations)
        ? portal.vendor_registrations
        : [];

      return {
        ...portal,
        registrations_count: registrations.length,
        approved_registrations_count: registrations.filter(
          (registration) => registration.status === "approved"
        ).length,
        vendor_registrations: undefined,
      } as ProcurementPortalListItem;
    }),
  };
}
/**
 * Retrieves the aggregated procurement reporting data used by
 * the procurement reports dashboard.
 */
export async function getProcurementReport(): Promise<ProcurementReport> {
  const supabase = getSupabase();

  const [
    leadsResult,
    opportunitiesResult,
    registrationsResult,
    rfqsResult,
    proposalsResult,
    negotiationsResult,
    contractsResult,
    followUpsResult,
  ] = await Promise.all([
    supabase
      .from("procurement_leads")
      .select("id,status,source,assigned_to")
      .is("archived_at", null),

    supabase
      .from("procurement_opportunities")
      .select("id,status,stage,estimated_value,probability,assigned_to")
      .is("archived_at", null),

    supabase
      .from("vendor_registrations")
      .select("id,status,assigned_to")
      .is("archived_at", null),

    supabase
      .from("procurement_rfqs")
      .select("id,status,estimated_value,assigned_to")
      .is("archived_at", null),

    supabase
      .from("procurement_proposals")
      .select("id,status,quoted_value,assigned_to")
      .is("archived_at", null),

    supabase
      .from("procurement_negotiations")
      .select("id,status,agreed_value,current_value,starting_value,assigned_to")
      .is("archived_at", null),

    supabase
      .from("procurement_contracts")
      .select("id,status,contract_value,end_date,renewal_date,assigned_to")
      .is("archived_at", null),

    supabase
      .from("procurement_follow_ups")
      .select("id,status,assigned_to,due_at")
      .is("archived_at", null),
  ]);

  if (leadsResult.error) {
    throw new Error(
      `Unable to retrieve procurement lead report: ${leadsResult.error.message}`
    );
  }

  if (opportunitiesResult.error) {
    throw new Error(
      `Unable to retrieve procurement opportunity report: ${opportunitiesResult.error.message}`
    );
  }

  if (registrationsResult.error) {
    throw new Error(
      `Unable to retrieve vendor registration report: ${registrationsResult.error.message}`
    );
  }

  if (rfqsResult.error) {
    throw new Error(
      `Unable to retrieve RFQ report: ${rfqsResult.error.message}`
    );
  }

  if (proposalsResult.error) {
    throw new Error(
      `Unable to retrieve proposal report: ${proposalsResult.error.message}`
    );
  }

  if (negotiationsResult.error) {
    throw new Error(
      `Unable to retrieve negotiation report: ${negotiationsResult.error.message}`
    );
  }

  if (contractsResult.error) {
    throw new Error(
      `Unable to retrieve contract report: ${contractsResult.error.message}`
    );
  }

  if (followUpsResult.error) {
    throw new Error(
      `Unable to retrieve follow-up report: ${followUpsResult.error.message}`
    );
  }

  const leads = leadsResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const registrations = registrationsResult.data ?? [];
  const rfqs = rfqsResult.data ?? [];
  const proposals = proposalsResult.data ?? [];
  const negotiations = negotiationsResult.data ?? [];
  const contracts = contractsResult.data ?? [];
  const followUps = followUpsResult.data ?? [];

  const activeLeadStatuses = ["new", "contacted", "engaged", "qualified"];

  const activeOpportunityStatuses = ["open", "on_hold"];

  const activeProposalStatuses = [
    "draft",
    "internal_review",
    "approved",
    "submitted",
    "under_evaluation",
    "clarification",
    "negotiation",
  ];

  const activeContractStatuses = ["signed", "active", "suspended"];

  const activeLeads = leads.filter((lead) =>
    activeLeadStatuses.includes(lead.status)
  );

  const qualifiedLeads = leads.filter((lead) => lead.status === "qualified");

  const convertedLeads = leads.filter((lead) => lead.status === "converted");

  const openOpportunities = opportunities.filter((opportunity) =>
    activeOpportunityStatuses.includes(opportunity.status)
  );

  const wonOpportunities = opportunities.filter(
    (opportunity) => opportunity.status === "won"
  );

  const lostOpportunities = opportunities.filter(
    (opportunity) => opportunity.status === "lost"
  );

  const pipelineValue = openOpportunities.reduce(
    (total, opportunity) => total + Number(opportunity.estimated_value ?? 0),
    0
  );

  const weightedPipelineValue = openOpportunities.reduce(
    (total, opportunity) =>
      total +
      Number(opportunity.estimated_value ?? 0) *
        (Number(opportunity.probability ?? 0) / 100),
    0
  );

  const wonValue = wonOpportunities.reduce(
    (total, opportunity) => total + Number(opportunity.estimated_value ?? 0),
    0
  );

  const activeRegistrations = registrations.filter(
    (registration) =>
      !["approved", "rejected", "expired"].includes(registration.status)
  );

  const approvedRegistrations = registrations.filter(
    (registration) => registration.status === "approved"
  );

  const pendingRfqs = rfqs.filter((rfq) =>
    ["received", "reviewing", "qualification", "preparing"].includes(rfq.status)
  );

  const submittedRfqs = rfqs.filter((rfq) =>
    ["submitted", "under_evaluation", "clarification"].includes(rfq.status)
  );

  const awardedRfqs = rfqs.filter((rfq) => rfq.status === "awarded");

  const activeProposals = proposals.filter((proposal) =>
    activeProposalStatuses.includes(proposal.status)
  );

  const acceptedProposals = proposals.filter(
    (proposal) => proposal.status === "accepted"
  );

  const activeNegotiations = negotiations.filter((negotiation) =>
    [
      "not_started",
      "active",
      "client_review",
      "counter_offer",
      "internal_approval",
    ].includes(negotiation.status)
  );

  const agreedNegotiations = negotiations.filter((negotiation) =>
    ["agreed", "contract"].includes(negotiation.status)
  );

  const activeContracts = contracts.filter((contract) =>
    activeContractStatuses.includes(contract.status)
  );

  const today = new Date();
  const expiryLimit = new Date(today);
  expiryLimit.setDate(expiryLimit.getDate() + 60);

  const expiringContracts = contracts.filter((contract) => {
    if (!contract.end_date) {
      return false;
    }

    const endDate = new Date(contract.end_date);

    return (
      endDate >= today &&
      endDate <= expiryLimit &&
      !["completed", "expired", "terminated", "cancelled"].includes(
        contract.status
      )
    );
  });

  const pendingFollowUps = followUps.filter((followUp) =>
    ["pending", "in_progress"].includes(followUp.status)
  );

  const overdueFollowUps = followUps.filter((followUp) => {
    if (!followUp.due_at) {
      return false;
    }

    return (
      new Date(followUp.due_at) < today &&
      !["completed", "cancelled"].includes(followUp.status)
    );
  });

  const pipelineStages = [
    "qualified",
    "assessment",
    "vendor_registration",
    "opportunity",
    "rfq_rfp",
    "proposal",
    "negotiation",
    "won",
    "lost",
  ];

  const pipeline = pipelineStages.map((stage) => {
    const stageOpportunities = opportunities.filter(
      (opportunity) => opportunity.stage === stage
    );

    const value = stageOpportunities.reduce(
      (total, opportunity) => total + Number(opportunity.estimated_value ?? 0),
      0
    );

    const weightedValue = stageOpportunities.reduce(
      (total, opportunity) =>
        total +
        Number(opportunity.estimated_value ?? 0) *
          (Number(opportunity.probability ?? 0) / 100),
      0
    );

    return {
      stage,
      count: stageOpportunities.length,
      value,
      weighted_value: weightedValue,
    };
  });

  const leadSourceMap = new Map<
    string,
    {
      count: number;
      qualified: number;
      converted: number;
    }
  >();

  for (const lead of leads) {
    const source = lead.source ?? "other";

    const current = leadSourceMap.get(source) ?? {
      count: 0,
      qualified: 0,
      converted: 0,
    };

    current.count += 1;

    if (lead.status === "qualified") {
      current.qualified += 1;
    }

    if (lead.status === "converted") {
      current.converted += 1;
    }

    leadSourceMap.set(source, current);
  }

  const leadSources = Array.from(leadSourceMap.entries()).map(
    ([source, values]) => ({
      source,
      ...values,
    })
  );

  const rfqStatusMap = new Map<
    string,
    {
      count: number;
      estimated_value: number;
    }
  >();

  for (const rfq of rfqs) {
    const current = rfqStatusMap.get(rfq.status) ?? {
      count: 0,
      estimated_value: 0,
    };

    current.count += 1;
    current.estimated_value += Number(rfq.estimated_value ?? 0);

    rfqStatusMap.set(rfq.status, current);
  }

  const rfqReport = Array.from(rfqStatusMap.entries()).map(
    ([status, values]) => ({
      status,
      ...values,
    })
  );

  const proposalStatusMap = new Map<
    string,
    {
      count: number;
      quoted_value: number;
    }
  >();

  for (const proposal of proposals) {
    const current = proposalStatusMap.get(proposal.status) ?? {
      count: 0,
      quoted_value: 0,
    };

    current.count += 1;
    current.quoted_value += Number(proposal.quoted_value ?? 0);

    proposalStatusMap.set(proposal.status, current);
  }

  const proposalReport = Array.from(proposalStatusMap.entries()).map(
    ([status, values]) => ({
      status,
      ...values,
    })
  );

  const contractStatusMap = new Map<
    string,
    {
      count: number;
      contract_value: number;
    }
  >();

  for (const contract of contracts) {
    const current = contractStatusMap.get(contract.status) ?? {
      count: 0,
      contract_value: 0,
    };

    current.count += 1;
    current.contract_value += Number(contract.contract_value ?? 0);

    contractStatusMap.set(contract.status, current);
  }

  const contractReport = Array.from(contractStatusMap.entries()).map(
    ([status, values]) => ({
      status,
      ...values,
    })
  );

  const staffIds = new Set<string>();

  for (const lead of leads) {
    if (lead.assigned_to) {
      staffIds.add(lead.assigned_to);
    }
  }

  for (const opportunity of opportunities) {
    if (opportunity.assigned_to) {
      staffIds.add(opportunity.assigned_to);
    }
  }

  for (const followUp of followUps) {
    if (followUp.assigned_to) {
      staffIds.add(followUp.assigned_to);
    }
  }

  for (const contract of contracts) {
    if (contract.assigned_to) {
      staffIds.add(contract.assigned_to);
    }
  }

  const staffPerformance: ProcurementStaffPerformanceReportItem[] = [];

  if (staffIds.size > 0) {
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id,first_name,last_name")
      .in("id", Array.from(staffIds));

    if (staffError) {
      throw new Error(
        `Unable to retrieve procurement staff report: ${staffError.message}`
      );
    }

    for (const member of staff ?? []) {
      staffPerformance.push({
        staff_id: member.id,
        staff_name: `${member.first_name} ${member.last_name}`.trim(),
        leads: leads.filter((lead) => lead.assigned_to === member.id).length,
        opportunities: opportunities.filter(
          (opportunity) => opportunity.assigned_to === member.id
        ).length,
        follow_ups: followUps.filter(
          (followUp) => followUp.assigned_to === member.id
        ).length,
        contracts: contracts.filter(
          (contract) => contract.assigned_to === member.id
        ).length,
      });
    }
  }

  return {
    summary: {
      total_leads: leads.length,
      active_leads: activeLeads.length,
      qualified_leads: qualifiedLeads.length,
      converted_leads: convertedLeads.length,
      total_opportunities: opportunities.length,
      open_opportunities: openOpportunities.length,
      won_opportunities: wonOpportunities.length,
      lost_opportunities: lostOpportunities.length,
      pipeline_value: pipelineValue,
      weighted_pipeline_value: weightedPipelineValue,
      won_value: wonValue,
      active_vendor_registrations: activeRegistrations.length,
      approved_vendor_registrations: approvedRegistrations.length,
      pending_rfqs: pendingRfqs.length,
      submitted_rfqs: submittedRfqs.length,
      awarded_rfqs: awardedRfqs.length,
      active_proposals: activeProposals.length,
      accepted_proposals: acceptedProposals.length,
      active_negotiations: activeNegotiations.length,
      agreed_negotiations: agreedNegotiations.length,
      active_contracts: activeContracts.length,
      expiring_contracts: expiringContracts.length,
      pending_follow_ups: pendingFollowUps.length,
      overdue_follow_ups: overdueFollowUps.length,
    },
    pipeline,
    lead_sources: leadSources,
    rfqs: rfqReport,
    proposals: proposalReport,
    contracts: contractReport,
    staff_performance: staffPerformance,
  };
}
