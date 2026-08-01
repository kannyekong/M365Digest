import { supabase } from "./superbase";
import type { AcademyCertificateTemplate } from "../types/academy";

/**
 * Input accepted when creating an Academy certificate template.
 */
export interface CreateAcademyCertificateTemplateInput {
  name: string;

  description?: string | null;

  template_key: string;

  background_image_url?: string | null;

  logo_url?: string | null;

  signature_image_url?: string | null;

  signatory_name?: string | null;

  signatory_title?: string | null;

  primary_color?: string;

  secondary_color?: string;

  text_color?: string;

  orientation?: "landscape" | "portrait";

  configuration?: Record<string, unknown>;

  is_default?: boolean;

  is_active?: boolean;
}

/**
 * Input accepted when updating an Academy certificate template.
 */
export interface UpdateAcademyCertificateTemplateInput {
  name?: string;

  description?: string | null;

  template_key?: string;

  background_image_url?: string | null;

  logo_url?: string | null;

  signature_image_url?: string | null;

  signatory_name?: string | null;

  signatory_title?: string | null;

  primary_color?: string;

  secondary_color?: string;

  text_color?: string;

  orientation?: "landscape" | "portrait";

  configuration?: Record<string, unknown>;

  is_default?: boolean;

  is_active?: boolean;
}

/**
 * Filters supported by the certificate-template manager.
 */
export interface AcademyCertificateTemplateFilters {
  search?: string;

  orientation?: "landscape" | "portrait" | "all";

  status?: "active" | "inactive" | "all";

  defaultOnly?: boolean;
}

/**
 * Options accepted by the paginated template query.
 */
export interface ListAcademyCertificateTemplatesOptions {
  page?: number;

  pageSize?: number;

  filters?: AcademyCertificateTemplateFilters;

  sortBy?:
    "created_at" | "updated_at" | "name" | "template_key" | "orientation";

  sortDirection?: "asc" | "desc";
}

/**
 * Paginated certificate-template response.
 */
export interface AcademyCertificateTemplateListResponse {
  templates: AcademyCertificateTemplate[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}

/**
 * Certificate-template statistics used by the admin interface.
 */
export interface AcademyCertificateTemplateStatistics {
  totalTemplates: number;

  activeTemplates: number;

  inactiveTemplates: number;

  landscapeTemplates: number;

  portraitTemplates: number;

  defaultTemplate: AcademyCertificateTemplate | null;
}

/**
 * Escape characters that have special meaning inside PostgREST filters.
 */
function escapePostgrestSearch(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Convert an optional string into a trimmed nullable value.
 */
function toNullableString(value?: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

/**
 * Normalize a template key into a safe internal identifier.
 */
export function normalizeCertificateTemplateKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Normalize certificate-template input before sending it to Supabase.
 */
function normalizeTemplateValues(
  values:
    | CreateAcademyCertificateTemplateInput
    | UpdateAcademyCertificateTemplateInput
) {
  const normalizedValues = {
    ...values,
  };

  if ("name" in values && values.name !== undefined) {
    normalizedValues.name = values.name.trim();
  }

  if ("template_key" in values && values.template_key !== undefined) {
    normalizedValues.template_key = normalizeCertificateTemplateKey(
      values.template_key
    );
  }

  if ("description" in values) {
    normalizedValues.description = toNullableString(values.description);
  }

  if ("background_image_url" in values) {
    normalizedValues.background_image_url = toNullableString(
      values.background_image_url
    );
  }

  if ("logo_url" in values) {
    normalizedValues.logo_url = toNullableString(values.logo_url);
  }

  if ("signature_image_url" in values) {
    normalizedValues.signature_image_url = toNullableString(
      values.signature_image_url
    );
  }

  if ("signatory_name" in values) {
    normalizedValues.signatory_name = toNullableString(values.signatory_name);
  }

  if ("signatory_title" in values) {
    normalizedValues.signatory_title = toNullableString(values.signatory_title);
  }

  return normalizedValues;
}

/**
 * Retrieve paginated Academy certificate templates.
 */
export async function listAcademyCertificateTemplates({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = "created_at",
  sortDirection = "desc",
}: ListAcademyCertificateTemplatesOptions = {}): Promise<AcademyCertificateTemplateListResponse> {
  // Keep pagination values within a safe range.
  const safePage = Math.max(1, page);

  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const rangeStart = (safePage - 1) * safePageSize;

  const rangeEnd = rangeStart + safePageSize - 1;

  // Begin the certificate-template query.
  let query = supabase.from("academy_certificate_templates").select("*", {
    count: "exact",
  });

  // Search template names, descriptions and internal keys.
  if (filters.search?.trim()) {
    const searchValue = escapePostgrestSearch(filters.search.trim());

    query = query.or(
      [
        `name.ilike.%${searchValue}%`,
        `description.ilike.%${searchValue}%`,
        `template_key.ilike.%${searchValue}%`,
        `signatory_name.ilike.%${searchValue}%`,
      ].join(",")
    );
  }

  // Filter by certificate orientation.
  if (filters.orientation && filters.orientation !== "all") {
    query = query.eq("orientation", filters.orientation);
  }

  // Filter active and inactive templates.
  if (filters.status && filters.status !== "all") {
    query = query.eq("is_active", filters.status === "active");
  }

  // Show only the global default template when requested.
  if (filters.defaultOnly) {
    query = query.eq("is_default", true);
  }

  // Apply sorting and pagination.
  const { data, error, count } = await query
    .order(sortBy, {
      ascending: sortDirection === "asc",
      nullsFirst: false,
    })
    .range(rangeStart, rangeEnd);

  if (error) {
    console.error("Failed to load Academy certificate templates:", error);

    throw error;
  }

  const total = count ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  return {
    templates: (data ?? []) as AcademyCertificateTemplate[],

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages,
  };
}

/**
 * Retrieve one Academy certificate template by ID.
 */
export async function getAcademyCertificateTemplateById(
  templateId: string
): Promise<AcademyCertificateTemplate> {
  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error) {
    console.error("Failed to load Academy certificate template:", error);

    throw error;
  }

  return data as AcademyCertificateTemplate;
}

/**
 * Retrieve the active global default certificate template.
 */
export async function getDefaultAcademyCertificateTemplate(): Promise<AcademyCertificateTemplate | null> {
  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .select("*")
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to load the default Academy certificate template:",
      error
    );

    throw error;
  }

  return data as AcademyCertificateTemplate | null;
}
/**
 * Create a new Academy certificate template.
 */
export async function createAcademyCertificateTemplate(
  values: CreateAcademyCertificateTemplateInput
): Promise<AcademyCertificateTemplate> {
  // Normalize values before creating the template.
  const normalizedValues = normalizeTemplateValues(values);

  // Require a template name.
  if (!normalizedValues.name) {
    throw new Error("Certificate template name is required.");
  }

  // Require a stable internal template key.
  if (!normalizedValues.template_key) {
    throw new Error("Certificate template key is required.");
  }

  // Prevent more than one template from remaining the default.
  if (normalizedValues.is_default) {
    const { error: resetDefaultError } = await supabase
      .from("academy_certificate_templates")
      .update({
        is_default: false,
      })
      .eq("is_default", true);

    if (resetDefaultError) {
      console.error(
        "Failed to reset the existing default certificate template:",
        resetDefaultError
      );

      throw resetDefaultError;
    }
  }

  // Create the certificate template.
  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .insert({
      name: normalizedValues.name,

      description: normalizedValues.description ?? null,

      template_key: normalizedValues.template_key,

      background_image_url: normalizedValues.background_image_url ?? null,

      logo_url: normalizedValues.logo_url ?? null,

      signature_image_url: normalizedValues.signature_image_url ?? null,

      signatory_name: normalizedValues.signatory_name ?? null,

      signatory_title: normalizedValues.signatory_title ?? null,

      primary_color: normalizedValues.primary_color ?? "#2563EB",

      secondary_color: normalizedValues.secondary_color ?? "#1E3A8A",

      text_color: normalizedValues.text_color ?? "#0F172A",

      orientation: normalizedValues.orientation ?? "landscape",

      configuration: normalizedValues.configuration ?? {},

      is_default: normalizedValues.is_default ?? false,

      is_active: normalizedValues.is_active ?? true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create Academy certificate template:", error);

    throw error;
  }

  return data as AcademyCertificateTemplate;
}

/**
 * Update an existing Academy certificate template.
 */
export async function updateAcademyCertificateTemplate(
  templateId: string,
  updates: UpdateAcademyCertificateTemplateInput
): Promise<AcademyCertificateTemplate> {
  // Normalize values before updating the template.
  const normalizedUpdates = normalizeTemplateValues(updates);

  // Prevent an empty template name.
  if (normalizedUpdates.name !== undefined && !normalizedUpdates.name) {
    throw new Error("Certificate template name cannot be empty.");
  }

  // Prevent an empty internal template key.
  if (
    normalizedUpdates.template_key !== undefined &&
    !normalizedUpdates.template_key
  ) {
    throw new Error("Certificate template key cannot be empty.");
  }

  // Reset the existing default before assigning this template.
  if (normalizedUpdates.is_default) {
    const { error: resetDefaultError } = await supabase
      .from("academy_certificate_templates")
      .update({
        is_default: false,
      })
      .eq("is_default", true)
      .neq("id", templateId);

    if (resetDefaultError) {
      console.error(
        "Failed to reset the existing default certificate template:",
        resetDefaultError
      );

      throw resetDefaultError;
    }
  }

  // Update the selected template.
  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .update(normalizedUpdates)
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update Academy certificate template:", error);

    throw error;
  }

  return data as AcademyCertificateTemplate;
}

/**
 * Set one active template as the global default.
 */
export async function setDefaultAcademyCertificateTemplate(
  templateId: string
): Promise<AcademyCertificateTemplate> {
  // Confirm that the selected template exists.
  const template = await getAcademyCertificateTemplateById(templateId);

  // Prevent an inactive template from becoming the default.
  if (!template.is_active) {
    throw new Error("Activate this template before setting it as default.");
  }

  // Remove the default state from every other template.
  const { error: resetError } = await supabase
    .from("academy_certificate_templates")
    .update({
      is_default: false,
    })
    .eq("is_default", true)
    .neq("id", templateId);

  if (resetError) {
    console.error(
      "Failed to reset the current default certificate template:",
      resetError
    );

    throw resetError;
  }

  // Set the selected template as the new default.
  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .update({
      is_default: true,
    })
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) {
    console.error(
      "Failed to set the default Academy certificate template:",
      error
    );

    throw error;
  }

  return data as AcademyCertificateTemplate;
}

/**
 * Activate or deactivate an Academy certificate template.
 */
export async function toggleAcademyCertificateTemplateStatus(
  templateId: string,
  isActive: boolean
): Promise<AcademyCertificateTemplate> {
  // Load the existing template before applying status rules.
  const template = await getAcademyCertificateTemplateById(templateId);

  // Prevent the active default template from being disabled.
  if (template.is_default && !isActive) {
    throw new Error(
      "Choose another default template before deactivating this one."
    );
  }

  const { data, error } = await supabase
    .from("academy_certificate_templates")
    .update({
      is_active: isActive,
    })
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) {
    console.error(
      "Failed to update Academy certificate template status:",
      error
    );

    throw error;
  }

  return data as AcademyCertificateTemplate;
}

/**
 * Delete an unused Academy certificate template.
 */
export async function deleteAcademyCertificateTemplate(templateId: string) {
  // Load the template before applying deletion safeguards.
  const template = await getAcademyCertificateTemplateById(templateId);

  // Do not delete the global default template.
  if (template.is_default) {
    throw new Error("The default certificate template cannot be deleted.");
  }

  // Check whether any Academy program uses this template.
  const { count: programCount, error: programCountError } = await supabase
    .from("academy_programs")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("certificate_template_id", templateId);

  if (programCountError) {
    console.error(
      "Failed to check certificate-template program usage:",
      programCountError
    );

    throw programCountError;
  }

  if ((programCount ?? 0) > 0) {
    throw new Error(
      "This template is assigned to one or more Academy programs."
    );
  }

  // Check whether issued certificates use this template.
  const { count: certificateCount, error: certificateCountError } =
    await supabase
      .from("academy_certificates")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("template_id", templateId);

  if (certificateCountError) {
    console.error(
      "Failed to check certificate-template certificate usage:",
      certificateCountError
    );

    throw certificateCountError;
  }

  if ((certificateCount ?? 0) > 0) {
    throw new Error(
      "This template is already attached to issued certificates and should be deactivated instead."
    );
  }

  // Delete the unused certificate template.
  const { error } = await supabase
    .from("academy_certificate_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    console.error("Failed to delete Academy certificate template:", error);

    throw error;
  }
}
/**
 * Retrieve summary statistics for Academy certificate templates.
 */
export async function getAcademyCertificateTemplateStatistics(): Promise<AcademyCertificateTemplateStatistics> {
  // Load all template counts in parallel.
  const [
    totalResult,
    activeResult,
    inactiveResult,
    landscapeResult,
    portraitResult,
    defaultResult,
  ] = await Promise.all([
    supabase.from("academy_certificate_templates").select("*", {
      count: "exact",
      head: true,
    }),

    supabase
      .from("academy_certificate_templates")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("is_active", true),

    supabase
      .from("academy_certificate_templates")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("is_active", false),

    supabase
      .from("academy_certificate_templates")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("orientation", "landscape"),

    supabase
      .from("academy_certificate_templates")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("orientation", "portrait"),

    supabase
      .from("academy_certificate_templates")
      .select("*")
      .eq("is_default", true)
      .maybeSingle(),
  ]);

  // Detect the first Supabase query error.
  const queryError =
    totalResult.error ||
    activeResult.error ||
    inactiveResult.error ||
    landscapeResult.error ||
    portraitResult.error ||
    defaultResult.error;

  // Stop when any template statistics query fails.
  if (queryError) {
    console.error(
      "Failed to load Academy certificate template statistics:",
      queryError
    );

    throw queryError;
  }

  return {
    totalTemplates: totalResult.count ?? 0,

    activeTemplates: activeResult.count ?? 0,

    inactiveTemplates: inactiveResult.count ?? 0,

    landscapeTemplates: landscapeResult.count ?? 0,

    portraitTemplates: portraitResult.count ?? 0,

    defaultTemplate:
      (defaultResult.data as AcademyCertificateTemplate | null) ?? null,
  };
}

/**
 * Duplicate an existing Academy certificate template.
 */
export async function duplicateAcademyCertificateTemplate(
  templateId: string
): Promise<AcademyCertificateTemplate> {
  // Load the source template before creating the duplicate.
  const sourceTemplate = await getAcademyCertificateTemplateById(templateId);

  // Generate a unique key suffix for the duplicated template.
  const duplicateSuffix = crypto.randomUUID().split("-")[0].toLowerCase();

  // Build a duplicate using the source template configuration.
  return createAcademyCertificateTemplate({
    name: `${sourceTemplate.name} Copy`,

    description: sourceTemplate.description,

    template_key: `${sourceTemplate.template_key}_copy_${duplicateSuffix}`,

    background_image_url: sourceTemplate.background_image_url,

    logo_url: sourceTemplate.logo_url,

    signature_image_url: sourceTemplate.signature_image_url,

    signatory_name: sourceTemplate.signatory_name,

    signatory_title: sourceTemplate.signatory_title,

    primary_color: sourceTemplate.primary_color,

    secondary_color: sourceTemplate.secondary_color,

    text_color: sourceTemplate.text_color,

    orientation: sourceTemplate.orientation,

    configuration: {
      ...sourceTemplate.configuration,

      duplicated_from: sourceTemplate.id,

      duplicated_at: new Date().toISOString(),
    },

    // A duplicate must never automatically become the default.
    is_default: false,

    // Keep the duplicate inactive until it has been reviewed.
    is_active: false,
  });
}

/**
 * Retrieve certificate templates for CSV export.
 */
export async function exportAcademyCertificateTemplates(
  filters: AcademyCertificateTemplateFilters = {}
): Promise<AcademyCertificateTemplate[]> {
  // Reuse the template list query with a larger page size.
  const result = await listAcademyCertificateTemplates({
    page: 1,

    pageSize: 100,

    filters,

    sortBy: "created_at",

    sortDirection: "desc",
  });

  return result.templates;
}
