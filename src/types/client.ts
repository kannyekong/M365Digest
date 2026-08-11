export type ClientType = "individual" | "organisation";

export type ClientStatus =
  "lead" | "prospect" | "active" | "inactive" | "suspended";

export interface Client {
  id: string;

  client_code: string;

  client_type: ClientType;

  display_name: string;

  company_name: string | null;

  first_name: string | null;

  last_name: string | null;

  email: string | null;

  phone: string | null;

  alternative_phone: string | null;

  website: string | null;

  industry: string | null;

  tax_identification_number: string | null;

  billing_address: string | null;

  city: string | null;

  state: string | null;

  country: string;

  postal_code: string | null;

  status: ClientStatus;

  account_manager_id: string | null;

  source: string | null;

  notes: string | null;

  metadata: Record<string, unknown>;

  created_by: string | null;

  updated_by: string | null;

  created_at: string;

  updated_at: string;

  archived_at: string | null;
}

export interface ClientListItem extends Client {
  projects_count: number;

  active_projects_count: number;

  invoices_count: number;

  total_invoiced: number;

  total_paid: number;

  outstanding_amount: number;

  lifetime_revenue: number;

  refunded_amount: number;

  currency: string;
}

export interface ClientDetails extends ClientListItem {
  contacts_count: number;

  notes_count: number;
}

export interface CreateClientInput {
  client_type: ClientType;

  display_name: string;

  company_name?: string | null;

  first_name?: string | null;

  last_name?: string | null;

  email?: string | null;

  phone?: string | null;

  alternative_phone?: string | null;

  website?: string | null;

  industry?: string | null;

  tax_identification_number?: string | null;

  billing_address?: string | null;

  city?: string | null;

  state?: string | null;

  country?: string;

  postal_code?: string | null;

  status?: ClientStatus;

  account_manager_id?: string | null;

  source?: string | null;

  notes?: string | null;

  metadata?: Record<string, unknown>;
}

export interface UpdateClientInput {
  client_type?: ClientType;

  display_name?: string;

  company_name?: string | null;

  first_name?: string | null;

  last_name?: string | null;

  email?: string | null;

  phone?: string | null;

  alternative_phone?: string | null;

  website?: string | null;

  industry?: string | null;

  tax_identification_number?: string | null;

  billing_address?: string | null;

  city?: string | null;

  state?: string | null;

  country?: string;

  postal_code?: string | null;

  status?: ClientStatus;

  account_manager_id?: string | null;

  source?: string | null;

  notes?: string | null;

  metadata?: Record<string, unknown>;
}

export interface ClientFilters {
  search?: string;

  clientType?: ClientType | "all";

  status?: ClientStatus | "all";

  accountManagerId?: string | "all";

  country?: string;

  archived?: boolean;
}

export interface ListClientsOptions {
  page?: number;

  pageSize?: number;

  filters?: ClientFilters;

  sortBy?: keyof Client;

  sortDirection?: "asc" | "desc";
}

export interface ClientListResponse {
  clients: ClientListItem[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

export interface ClientStatistics {
  totalClients: number;

  activeClients: number;

  leads: number;

  prospects: number;

  inactiveClients: number;

  suspendedClients: number;

  totalInvoiced: number;

  totalPaid: number;

  totalOutstanding: number;

  lifetimeRevenue: number;

  currency: string;
}

export interface ClientOption {
  id: string;

  client_code: string;

  display_name: string;

  company_name: string | null;

  email: string | null;

  phone: string | null;

  billing_address: string | null;

  status: ClientStatus;
}
