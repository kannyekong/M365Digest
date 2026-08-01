import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileImage,
  Filter,
  ImageIcon,
  LayoutTemplate,
  LoaderCircle,
  Palette,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { toast } from "react-toastify";
import {
  createAcademyCertificateTemplate,
  deleteAcademyCertificateTemplate,
  duplicateAcademyCertificateTemplate,
  exportAcademyCertificateTemplates,
  getAcademyCertificateTemplateStatistics,
  listAcademyCertificateTemplates,
  normalizeCertificateTemplateKey,
  setDefaultAcademyCertificateTemplate,
  toggleAcademyCertificateTemplateStatus,
  updateAcademyCertificateTemplate,
  type AcademyCertificateTemplateFilters,
  type AcademyCertificateTemplateStatistics,
} from "../../../lib/academyCertificateTemplates";
import type { AcademyCertificateTemplate } from "../../../types/academy";

/**
 * Filters used by the certificate-template interface.
 */
interface CertificateTemplateFilterState {
  search: string;

  orientation: "landscape" | "portrait" | "all";

  status: "active" | "inactive" | "all";

  defaultOnly: boolean;
}

/**
 * Local form values used when creating or editing a template.
 */
interface CertificateTemplateFormState {
  name: string;

  description: string;

  templateKey: string;

  backgroundImageUrl: string;

  logoUrl: string;

  signatureImageUrl: string;

  signatoryName: string;

  signatoryTitle: string;

  primaryColor: string;

  secondaryColor: string;

  textColor: string;

  orientation: "landscape" | "portrait";

  isDefault: boolean;

  isActive: boolean;

  showLogo: boolean;

  showCertificateNumber: boolean;

  showVerificationCode: boolean;

  showCompletionDate: boolean;

  recipientNameSize: string;

  programTitleSize: string;

  signaturePosition: "left" | "center" | "right";

  verificationPosition: "bottom-left" | "bottom-center" | "bottom-right";
}

/**
 * One dashboard statistic shown above the template table.
 */
interface CertificateTemplateMetric {
  label: string;

  value: string;

  description: string;

  icon: ComponentType<{
    size?: number;

    className?: string;
  }>;

  iconClasses: string;
}

/**
 * Sorting fields supported by the template table.
 */
type CertificateTemplateSortField =
  "created_at" | "updated_at" | "name" | "template_key" | "orientation";

type SortDirection = "asc" | "desc";

const PAGE_SIZE = 8;

const DEFAULT_FILTERS: CertificateTemplateFilterState = {
  search: "",

  orientation: "all",

  status: "all",

  defaultOnly: false,
};

const DEFAULT_TEMPLATE_FORM: CertificateTemplateFormState = {
  name: "",

  description: "",

  templateKey: "",

  backgroundImageUrl: "",

  logoUrl: "",

  signatureImageUrl: "",

  signatoryName: "",

  signatoryTitle: "",

  primaryColor: "#2563EB",

  secondaryColor: "#1E3A8A",

  textColor: "#0F172A",

  orientation: "landscape",

  isDefault: false,

  isActive: true,

  showLogo: true,

  showCertificateNumber: true,

  showVerificationCode: true,

  showCompletionDate: true,

  recipientNameSize: "44",

  programTitleSize: "24",

  signaturePosition: "right",

  verificationPosition: "bottom-left",
};

/**
 * Format a database date for the template table.
 */
function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",

    month: "short",

    year: "numeric",
  }).format(date);
}

/**
 * Convert an underscore-separated value into a readable label.
 */
function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Read one boolean configuration value safely.
 */
function getBooleanConfigurationValue(
  configuration: Record<string, unknown>,
  key: string,
  fallback: boolean
) {
  const value = configuration[key];

  return typeof value === "boolean" ? value : fallback;
}

/**
 * Read one string configuration value safely.
 */
function getStringConfigurationValue(
  configuration: Record<string, unknown>,
  key: string,
  fallback: string
) {
  const value = configuration[key];

  return typeof value === "string" ? value : fallback;
}

/**
 * Read one numeric configuration value safely and convert it to text.
 */
function getNumberConfigurationValue(
  configuration: Record<string, unknown>,
  key: string,
  fallback: number
) {
  const value = configuration[key];

  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : String(fallback);
}

/**
 * Convert a template record into editable form values.
 */
function templateToFormState(
  template: AcademyCertificateTemplate
): CertificateTemplateFormState {
  const configuration = template.configuration ?? {};

  return {
    name: template.name,

    description: template.description ?? "",

    templateKey: template.template_key,

    backgroundImageUrl: template.background_image_url ?? "",

    logoUrl: template.logo_url ?? "",

    signatureImageUrl: template.signature_image_url ?? "",

    signatoryName: template.signatory_name ?? "",

    signatoryTitle: template.signatory_title ?? "",

    primaryColor: template.primary_color || "#2563EB",

    secondaryColor: template.secondary_color || "#1E3A8A",

    textColor: template.text_color || "#0F172A",

    orientation: template.orientation,

    isDefault: template.is_default,

    isActive: template.is_active,

    showLogo: getBooleanConfigurationValue(configuration, "show_logo", true),

    showCertificateNumber: getBooleanConfigurationValue(
      configuration,
      "show_certificate_number",
      true
    ),

    showVerificationCode: getBooleanConfigurationValue(
      configuration,
      "show_verification_code",
      true
    ),

    showCompletionDate: getBooleanConfigurationValue(
      configuration,
      "show_completion_date",
      true
    ),

    recipientNameSize: getNumberConfigurationValue(
      configuration,
      "recipient_name_size",
      44
    ),

    programTitleSize: getNumberConfigurationValue(
      configuration,
      "program_title_size",
      24
    ),

    signaturePosition: getStringConfigurationValue(
      configuration,
      "signature_position",
      "right"
    ) as CertificateTemplateFormState["signaturePosition"],

    verificationPosition: getStringConfigurationValue(
      configuration,
      "verification_position",
      "bottom-left"
    ) as CertificateTemplateFormState["verificationPosition"],
  };
}

/**
 * Build the reusable JSON configuration stored with a template.
 */
function buildTemplateConfiguration(form: CertificateTemplateFormState) {
  return {
    show_logo: form.showLogo,

    show_certificate_number: form.showCertificateNumber,

    show_verification_code: form.showVerificationCode,

    show_completion_date: form.showCompletionDate,

    recipient_name_size: Number(form.recipientNameSize) || 44,

    program_title_size: Number(form.programTitleSize) || 24,

    signature_position: form.signaturePosition,

    verification_position: form.verificationPosition,
  };
}

/**
 * Escape one value before adding it to a CSV file.
 */
function escapeCsvCell(value: unknown) {
  const normalizedValue =
    value === null || value === undefined ? "" : String(value);

  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

/**
 * Download certificate templates as a CSV file.
 */
function downloadTemplatesCsv(templates: AcademyCertificateTemplate[]) {
  const headers = [
    "Template ID",
    "Name",
    "Template Key",
    "Description",
    "Orientation",
    "Active",
    "Default",
    "Primary Color",
    "Secondary Color",
    "Text Color",
    "Background Image",
    "Logo",
    "Signature Image",
    "Signatory Name",
    "Signatory Title",
    "Created At",
    "Updated At",
  ];

  const rows = templates.map((template) => [
    template.id,
    template.name,
    template.template_key,
    template.description,
    template.orientation,
    template.is_active,
    template.is_default,
    template.primary_color,
    template.secondary_color,
    template.text_color,
    template.background_image_url,
    template.logo_url,
    template.signature_image_url,
    template.signatory_name,
    template.signatory_title,
    template.created_at,
    template.updated_at,
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(","),

    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = objectUrl;

  anchor.download = `academy-certificate-templates-${
    new Date().toISOString().split("T")[0]
  }.csv`;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

/**
 * Display one reusable details row.
 */
function TemplateDetailRow({
  label,
  value,
}: {
  label: string;

  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-200 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="max-w-md break-words text-sm font-semibold text-slate-900 sm:text-right">
        {value || "Not available"}
      </span>
    </div>
  );
}

/**
 * Display one certificate-template statistic.
 */
function TemplateMetricCard({ metric }: { metric: CertificateTemplateMetric }) {
  const Icon = metric.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${metric.iconClasses}`}
      >
        <Icon size={21} />
      </div>

      <p className="mt-4 text-2xl font-bold text-slate-950">{metric.value}</p>

      <p className="mt-1 text-sm font-semibold text-slate-700">
        {metric.label}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {metric.description}
      </p>
    </article>
  );
}
/**
 * Display and manage Academy certificate templates.
 */
export default function AcademyCertificateTemplatesTable() {
  // Store the current page of certificate templates.
  const [templates, setTemplates] = useState<AcademyCertificateTemplate[]>([]);

  // Store summary statistics for certificate templates.
  const [statistics, setStatistics] =
    useState<AcademyCertificateTemplateStatistics | null>(null);

  // Store the active template filters.
  const [filters, setFilters] =
    useState<CertificateTemplateFilterState>(DEFAULT_FILTERS);

  // Store the current pagination page.
  const [page, setPage] = useState(1);

  // Store the total number of matching templates.
  const [total, setTotal] = useState(0);

  // Store the total number of available pages.
  const [totalPages, setTotalPages] = useState(1);

  // Store the active sorting field.
  const [sortBy, setSortBy] =
    useState<CertificateTemplateSortField>("created_at");

  // Store the active sorting direction.
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Track whether template records are loading.
  const [loading, setLoading] = useState(true);

  // Track whether CSV export is running.
  const [exporting, setExporting] = useState(false);

  // Store a safe loading error for the interface.
  const [errorMessage, setErrorMessage] = useState("");

  // Track whether the expanded filter section is visible.
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Track whether the create-template modal is open.
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Store the template currently displayed in the details modal.
  const [selectedTemplate, setSelectedTemplate] =
    useState<AcademyCertificateTemplate | null>(null);

  // Store values used while creating a template.
  const [createForm, setCreateForm] = useState<CertificateTemplateFormState>(
    DEFAULT_TEMPLATE_FORM
  );

  // Store values used while editing the selected template.
  const [editForm, setEditForm] = useState<CertificateTemplateFormState>(
    DEFAULT_TEMPLATE_FORM
  );

  // Track whether a new template is being created.
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Store the template ID currently being updated.
  const [updatingTemplateId, setUpdatingTemplateId] = useState<string | null>(
    null
  );

  // Store the template ID currently being duplicated.
  const [duplicatingTemplateId, setDuplicatingTemplateId] = useState<
    string | null
  >(null);

  // Store the template ID currently being deleted.
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null
  );

  /**
   * Convert the component filters into the service filter shape.
   */
  const serviceFilters = useMemo<AcademyCertificateTemplateFilters>(
    () => ({
      search: filters.search.trim() || undefined,

      orientation: filters.orientation,

      status: filters.status,

      defaultOnly: filters.defaultOnly || undefined,
    }),
    [filters]
  );

  /**
   * Load the current page of templates and their statistics.
   */
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [templateResult, statisticsResult] = await Promise.all([
        listAcademyCertificateTemplates({
          page,

          pageSize: PAGE_SIZE,

          filters: serviceFilters,

          sortBy,

          sortDirection,
        }),

        getAcademyCertificateTemplateStatistics(),
      ]);

      setTemplates(templateResult.templates);

      setTotal(templateResult.total);

      setTotalPages(templateResult.totalPages);

      setStatistics(statisticsResult);

      // Return to the final valid page when filtering reduces the result.
      if (page > templateResult.totalPages) {
        setPage(templateResult.totalPages);
      }
    } catch (error) {
      console.error("Failed to load Academy certificate templates:", error);

      setErrorMessage("The certificate templates could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, serviceFilters, sortBy, sortDirection]);

  // Load templates whenever pagination, filters or sorting changes.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTemplates();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadTemplates]);

  /**
   * Synchronize the edit form with the selected template.
   */
  useEffect(() => {
    if (!selectedTemplate) {
      setEditForm(DEFAULT_TEMPLATE_FORM);

      return;
    }

    setEditForm(templateToFormState(selectedTemplate));
  }, [selectedTemplate]);

  /**
   * Update one certificate-template filter and reset pagination.
   */
  function updateFilter<Key extends keyof CertificateTemplateFilterState>(
    field: Key,
    value: CertificateTemplateFilterState[Key]
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,

      [field]: value,
    }));

    setPage(1);
  }

  /**
   * Reset every active certificate-template filter.
   */
  function clearFilters() {
    setFilters(DEFAULT_FILTERS);

    setPage(1);
  }

  /**
   * Update one create-template form field.
   */
  function updateCreateForm<Key extends keyof CertificateTemplateFormState>(
    field: Key,
    value: CertificateTemplateFormState[Key]
  ) {
    setCreateForm((currentForm) => ({
      ...currentForm,

      [field]: value,
    }));
  }

  /**
   * Update one edit-template form field.
   */
  function updateEditForm<Key extends keyof CertificateTemplateFormState>(
    field: Key,
    value: CertificateTemplateFormState[Key]
  ) {
    setEditForm((currentForm) => ({
      ...currentForm,

      [field]: value,
    }));
  }

  /**
   * Update the create form name and automatically suggest a template key.
   */
  function handleCreateNameChange(value: string) {
    setCreateForm((currentForm) => {
      const previousGeneratedKey = normalizeCertificateTemplateKey(
        currentForm.name
      );

      const shouldUpdateTemplateKey =
        !currentForm.templateKey ||
        currentForm.templateKey === previousGeneratedKey;

      return {
        ...currentForm,

        name: value,

        templateKey: shouldUpdateTemplateKey
          ? normalizeCertificateTemplateKey(value)
          : currentForm.templateKey,
      };
    });
  }

  /**
   * Open the template creation modal with fresh form values.
   */
  function openCreateModal() {
    setCreateForm({
      ...DEFAULT_TEMPLATE_FORM,
    });

    setCreateModalOpen(true);
  }

  /**
   * Close the template creation modal.
   */
  function closeCreateModal() {
    if (creatingTemplate) {
      return;
    }

    setCreateModalOpen(false);

    setCreateForm(DEFAULT_TEMPLATE_FORM);
  }

  /**
   * Replace an updated template in local state.
   */
  function replaceTemplate(updatedTemplate: AcademyCertificateTemplate) {
    setTemplates((currentTemplates) =>
      currentTemplates.map((template) =>
        template.id === updatedTemplate.id ? updatedTemplate : template
      )
    );

    setSelectedTemplate((currentTemplate) =>
      currentTemplate?.id === updatedTemplate.id
        ? updatedTemplate
        : currentTemplate
    );
  }

  /**
   * Synchronize the default-template state across local records.
   */
  function applyDefaultTemplateLocally(
    defaultTemplate: AcademyCertificateTemplate
  ) {
    setTemplates((currentTemplates) =>
      currentTemplates.map((template) => ({
        ...template,

        is_default: template.id === defaultTemplate.id,
      }))
    );

    setSelectedTemplate((currentTemplate) => {
      if (!currentTemplate) {
        return currentTemplate;
      }

      return {
        ...currentTemplate,

        is_default: currentTemplate.id === defaultTemplate.id,
      };
    });
  }

  /**
   * Count all active template filters.
   */
  const activeFilterCount = useMemo(() => {
    return [
      filters.search,

      filters.orientation !== "all" ? filters.orientation : "",

      filters.status !== "all" ? filters.status : "",

      filters.defaultOnly ? "default" : "",
    ].filter(Boolean).length;
  }, [filters]);

  /**
   * Build the certificate-template metric cards.
   */
  const metrics = useMemo<CertificateTemplateMetric[]>(() => {
    if (!statistics) {
      return [];
    }

    return [
      {
        label: "Total Templates",

        value: statistics.totalTemplates.toLocaleString(),

        description: "All certificate designs",

        icon: LayoutTemplate,

        iconClasses: "bg-blue-100 text-blue-700",
      },

      {
        label: "Active Templates",

        value: statistics.activeTemplates.toLocaleString(),

        description: "Available during certificate generation",

        icon: CheckCircle2,

        iconClasses: "bg-emerald-100 text-emerald-700",
      },

      {
        label: "Landscape",

        value: statistics.landscapeTemplates.toLocaleString(),

        description: `${statistics.portraitTemplates} portrait templates`,

        icon: FileImage,

        iconClasses: "bg-purple-100 text-purple-700",
      },

      {
        label: "Default Template",

        value: statistics.defaultTemplate?.name ?? "Not configured",

        description: statistics.defaultTemplate
          ? "Global fallback certificate design"
          : "Choose an active default template",

        icon: ShieldCheck,

        iconClasses: "bg-amber-100 text-amber-700",
      },
    ];
  }, [statistics]);

  const firstVisibleRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const lastVisibleRecord = Math.min(page * PAGE_SIZE, total);

  /**
   * Change the active template sorting field or direction.
   */
  function handleSort(field: CertificateTemplateSortField) {
    if (sortBy === field) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );

      return;
    }

    setSortBy(field);
    setSortDirection("asc");
    setPage(1);
  }

  /**
   * Return the icon representing the active sort state.
   */
  function getSortIcon(field: CertificateTemplateSortField) {
    if (sortBy !== field) {
      return <ChevronDown className="h-3.5 w-3.5 text-slate-300" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary" />
    );
  }

  /**
   * Validate certificate-template form values.
   */
  function validateTemplateForm(form: CertificateTemplateFormState) {
    if (!form.name.trim()) {
      return "Template name is required.";
    }

    if (!form.templateKey.trim()) {
      return "Template key is required.";
    }

    const normalizedRecipientSize = Number(form.recipientNameSize);

    if (
      !Number.isFinite(normalizedRecipientSize) ||
      normalizedRecipientSize <= 0
    ) {
      return "Recipient name size must be greater than zero.";
    }

    const normalizedProgramSize = Number(form.programTitleSize);

    if (!Number.isFinite(normalizedProgramSize) || normalizedProgramSize <= 0) {
      return "Program title size must be greater than zero.";
    }

    return null;
  }

  /**
   * Create a new Academy certificate template.
   */
  async function handleCreateTemplate() {
    if (creatingTemplate) {
      return;
    }

    const validationError = validateTemplateForm(createForm);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setCreatingTemplate(true);

    try {
      const createdTemplate = await createAcademyCertificateTemplate({
        name: createForm.name.trim(),

        description: createForm.description.trim() || null,

        template_key: normalizeCertificateTemplateKey(createForm.templateKey),

        background_image_url: createForm.backgroundImageUrl.trim() || null,

        logo_url: createForm.logoUrl.trim() || null,

        signature_image_url: createForm.signatureImageUrl.trim() || null,

        signatory_name: createForm.signatoryName.trim() || null,

        signatory_title: createForm.signatoryTitle.trim() || null,

        primary_color: createForm.primaryColor,

        secondary_color: createForm.secondaryColor,

        text_color: createForm.textColor,

        orientation: createForm.orientation,

        configuration: buildTemplateConfiguration(createForm),

        is_default: createForm.isDefault,

        is_active: createForm.isActive,
      });

      setTemplates((currentTemplates) => {
        const updatedTemplates = createForm.isDefault
          ? currentTemplates.map((template) => ({
              ...template,

              is_default: false,
            }))
          : currentTemplates;

        return [createdTemplate, ...updatedTemplates];
      });

      setTotal((currentTotal) => currentTotal + 1);

      setStatistics((currentStatistics) => {
        if (!currentStatistics) {
          return currentStatistics;
        }

        return {
          ...currentStatistics,

          totalTemplates: currentStatistics.totalTemplates + 1,

          activeTemplates: createdTemplate.is_active
            ? currentStatistics.activeTemplates + 1
            : currentStatistics.activeTemplates,

          inactiveTemplates: createdTemplate.is_active
            ? currentStatistics.inactiveTemplates
            : currentStatistics.inactiveTemplates + 1,

          landscapeTemplates:
            createdTemplate.orientation === "landscape"
              ? currentStatistics.landscapeTemplates + 1
              : currentStatistics.landscapeTemplates,

          portraitTemplates:
            createdTemplate.orientation === "portrait"
              ? currentStatistics.portraitTemplates + 1
              : currentStatistics.portraitTemplates,

          defaultTemplate: createdTemplate.is_default
            ? createdTemplate
            : currentStatistics.defaultTemplate,
        };
      });

      toast.success("Certificate template created successfully.");

      closeCreateModal();
    } catch (error) {
      console.error("Failed to create certificate template:", error);

      const message =
        error instanceof Error
          ? error.message
          : "The certificate template could not be created.";

      toast.error(message);
    } finally {
      setCreatingTemplate(false);
    }
  }

  /**
   * Save changes made to the selected certificate template.
   */
  async function handleSaveTemplateChanges() {
    if (!selectedTemplate || updatingTemplateId) {
      return;
    }

    const validationError = validateTemplateForm(editForm);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUpdatingTemplateId(selectedTemplate.id);

    try {
      const updatedTemplate = await updateAcademyCertificateTemplate(
        selectedTemplate.id,
        {
          name: editForm.name.trim(),

          description: editForm.description.trim() || null,

          template_key: normalizeCertificateTemplateKey(editForm.templateKey),

          background_image_url: editForm.backgroundImageUrl.trim() || null,

          logo_url: editForm.logoUrl.trim() || null,

          signature_image_url: editForm.signatureImageUrl.trim() || null,

          signatory_name: editForm.signatoryName.trim() || null,

          signatory_title: editForm.signatoryTitle.trim() || null,

          primary_color: editForm.primaryColor,

          secondary_color: editForm.secondaryColor,

          text_color: editForm.textColor,

          orientation: editForm.orientation,

          configuration: buildTemplateConfiguration(editForm),

          is_active: editForm.isActive,

          is_default: editForm.isDefault,
        }
      );

      if (updatedTemplate.is_default) {
        applyDefaultTemplateLocally(updatedTemplate);
      }

      replaceTemplate(updatedTemplate);

      toast.success("Certificate template updated.");

      await loadTemplates();
    } catch (error) {
      console.error("Failed to update certificate template:", error);

      const message =
        error instanceof Error
          ? error.message
          : "The certificate template could not be updated.";

      toast.error(message);
    } finally {
      setUpdatingTemplateId(null);
    }
  }

  /**
   * Set one active template as the global default.
   */
  async function handleSetDefaultTemplate(
    template: AcademyCertificateTemplate
  ) {
    if (updatingTemplateId) {
      return;
    }

    if (template.is_default) {
      toast.info("This template is already the default.");

      return;
    }

    const confirmed = window.confirm(
      `Set "${template.name}" as the global default certificate template?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingTemplateId(template.id);

    try {
      const updatedTemplate = await setDefaultAcademyCertificateTemplate(
        template.id
      );

      applyDefaultTemplateLocally(updatedTemplate);

      setStatistics((currentStatistics) => {
        if (!currentStatistics) {
          return currentStatistics;
        }

        return {
          ...currentStatistics,

          defaultTemplate: updatedTemplate,
        };
      });

      toast.success("Default certificate template updated.");
    } catch (error) {
      console.error("Failed to set default certificate template:", error);

      const message =
        error instanceof Error
          ? error.message
          : "The default template could not be updated.";

      toast.error(message);
    } finally {
      setUpdatingTemplateId(null);
    }
  }

  /**
   * Activate or deactivate one certificate template.
   */
  async function handleToggleTemplateStatus(
    template: AcademyCertificateTemplate
  ) {
    if (updatingTemplateId) {
      return;
    }

    const nextStatus = !template.is_active;

    const actionLabel = nextStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `${actionLabel.charAt(0).toUpperCase()}${actionLabel.slice(
        1
      )} "${template.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingTemplateId(template.id);

    try {
      const updatedTemplate = await toggleAcademyCertificateTemplateStatus(
        template.id,
        nextStatus
      );

      replaceTemplate(updatedTemplate);

      setStatistics((currentStatistics) => {
        if (!currentStatistics) {
          return currentStatistics;
        }

        return {
          ...currentStatistics,

          activeTemplates: nextStatus
            ? currentStatistics.activeTemplates + 1
            : Math.max(0, currentStatistics.activeTemplates - 1),

          inactiveTemplates: nextStatus
            ? Math.max(0, currentStatistics.inactiveTemplates - 1)
            : currentStatistics.inactiveTemplates + 1,
        };
      });

      toast.success(`Template ${actionLabel}d successfully.`);
    } catch (error) {
      console.error("Failed to update template status:", error);

      const message =
        error instanceof Error
          ? error.message
          : "The template status could not be updated.";

      toast.error(message);
    } finally {
      setUpdatingTemplateId(null);
    }
  }

  /**
   * Duplicate an existing certificate template.
   */
  async function handleDuplicateTemplate(template: AcademyCertificateTemplate) {
    if (duplicatingTemplateId) {
      return;
    }

    setDuplicatingTemplateId(template.id);

    try {
      const duplicatedTemplate = await duplicateAcademyCertificateTemplate(
        template.id
      );

      setTemplates((currentTemplates) => [
        duplicatedTemplate,
        ...currentTemplates,
      ]);

      setTotal((currentTotal) => currentTotal + 1);

      setStatistics((currentStatistics) => {
        if (!currentStatistics) {
          return currentStatistics;
        }

        return {
          ...currentStatistics,

          totalTemplates: currentStatistics.totalTemplates + 1,

          inactiveTemplates: currentStatistics.inactiveTemplates + 1,

          landscapeTemplates:
            duplicatedTemplate.orientation === "landscape"
              ? currentStatistics.landscapeTemplates + 1
              : currentStatistics.landscapeTemplates,

          portraitTemplates:
            duplicatedTemplate.orientation === "portrait"
              ? currentStatistics.portraitTemplates + 1
              : currentStatistics.portraitTemplates,
        };
      });

      toast.success(
        "Template duplicated. The copy is inactive until reviewed."
      );
    } catch (error) {
      console.error("Failed to duplicate certificate template:", error);

      const message =
        error instanceof Error
          ? error.message
          : "The template could not be duplicated.";

      toast.error(message);
    } finally {
      setDuplicatingTemplateId(null);
    }
  }

  /**
   * Delete an unused certificate template.
   */
  async function handleDeleteTemplate(template: AcademyCertificateTemplate) {
    if (deletingTemplateId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${template.name}"? Templates already used by programs or issued certificates cannot be deleted.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingTemplateId(template.id);

    try {
      await deleteAcademyCertificateTemplate(template.id);

      setTemplates((currentTemplates) =>
        currentTemplates.filter(
          (currentTemplate) => currentTemplate.id !== template.id
        )
      );

      setSelectedTemplate(null);

      setTotal((currentTotal) => Math.max(0, currentTotal - 1));

      setStatistics((currentStatistics) => {
        if (!currentStatistics) {
          return currentStatistics;
        }

        return {
          ...currentStatistics,

          totalTemplates: Math.max(0, currentStatistics.totalTemplates - 1),

          activeTemplates: template.is_active
            ? Math.max(0, currentStatistics.activeTemplates - 1)
            : currentStatistics.activeTemplates,

          inactiveTemplates: template.is_active
            ? currentStatistics.inactiveTemplates
            : Math.max(0, currentStatistics.inactiveTemplates - 1),

          landscapeTemplates:
            template.orientation === "landscape"
              ? Math.max(0, currentStatistics.landscapeTemplates - 1)
              : currentStatistics.landscapeTemplates,

          portraitTemplates:
            template.orientation === "portrait"
              ? Math.max(0, currentStatistics.portraitTemplates - 1)
              : currentStatistics.portraitTemplates,
        };
      });

      toast.success("Certificate template deleted.");
    } catch (error) {
      console.error("Failed to delete certificate template:", error);

      const message =
        error instanceof Error
          ? error.message
          : "The certificate template could not be deleted.";

      toast.error(message);
    } finally {
      setDeletingTemplateId(null);
    }
  }

  /**
   * Export templates matching the active filters.
   */
  async function handleExport() {
    if (exporting) {
      return;
    }

    setExporting(true);

    try {
      const exportedTemplates =
        await exportAcademyCertificateTemplates(serviceFilters);

      if (exportedTemplates.length === 0) {
        toast.info("There are no matching templates to export.");

        return;
      }

      downloadTemplatesCsv(exportedTemplates);

      toast.success(`${exportedTemplates.length} templates exported.`);
    } catch (error) {
      console.error("Failed to export certificate templates:", error);

      toast.error("The certificate-template export could not be created.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="mx-auto max-w-full">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <a
            href="/admin/academy"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Academy dashboard
          </a>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Certificate Design
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Certificate Templates
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Create reusable certificate designs, manage branding, configure
            signatories and select the default Academy template.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              void loadTemplates();
            }}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              void handleExport();
            }}
            disabled={exporting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}

            {exporting ? "Exporting..." : "Export CSV"}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-11 items-center justify-center gap-1 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            New Template
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <TemplateMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {statistics?.defaultTemplate ? (
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <p className="font-semibold text-amber-900">
                {statistics.defaultTemplate.name} is the global default
                certificate template.
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                It will be used whenever a program or certificate does not have
                another template selected.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedTemplate(statistics.defaultTemplate);
            }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            <Eye className="h-4 w-4" />
            View Default
          </button>
        </section>
      ) : (
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

            <div>
              <p className="font-semibold text-red-900">
                No default certificate template has been configured.
              </p>

              <p className="mt-1 text-sm leading-6 text-red-700">
                Create an active template or set an existing active template as
                the global default.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={filters.search}
              onChange={(event) => {
                updateFilter("search", event.target.value);
              }}
              placeholder="Search template name, key, description or signatory..."
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setFiltersVisible((currentValue) => !currentValue);
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          ) : null}
        </div>

        {filtersVisible ? (
          <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="template-orientation-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Orientation
              </label>

              <select
                id="template-orientation-filter"
                value={filters.orientation}
                onChange={(event) => {
                  updateFilter(
                    "orientation",
                    event.target
                      .value as CertificateTemplateFilterState["orientation"]
                  );
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All orientations</option>

                <option value="landscape">Landscape</option>

                <option value="portrait">Portrait</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="template-status-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Template status
              </label>

              <select
                id="template-status-filter"
                value={filters.status}
                onChange={(event) => {
                  updateFilter(
                    "status",
                    event.target
                      .value as CertificateTemplateFilterState["status"]
                  );
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All statuses</option>

                <option value="active">Active</option>

                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4">
                <input
                  type="checkbox"
                  checked={filters.defaultOnly}
                  onChange={(event) => {
                    updateFilter("defaultOnly", event.target.checked);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />

                <span className="text-sm font-semibold text-slate-700">
                  Show default template only
                </span>
              </label>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {errorMessage ? (
          <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("name");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Template
                    {getSortIcon("name")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("template_key");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Internal Key
                    {getSortIcon("template_key")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("orientation");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Orientation
                    {getSortIcon("orientation")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("updated_at");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Updated
                    {getSortIcon("updated_at")}
                  </button>
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-primary" />

                    <p className="mt-3 text-sm text-slate-500">
                      Loading certificate templates...
                    </p>
                  </td>
                </tr>
              ) : templates.length > 0 ? (
                templates.map((template) => (
                  <tr
                    key={template.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200"
                          style={{
                            backgroundColor: template.primary_color,
                          }}
                        >
                          {template.logo_url ? (
                            <img
                              src={template.logo_url}
                              alt=""
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <LayoutTemplate className="h-5 w-5 text-white" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {template.name}
                          </p>

                          <p className="mt-1 max-w-[260px] truncate text-sm text-slate-500">
                            {template.description ?? "No description"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <code className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                        {template.template_key}
                      </code>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                        <FileImage className="h-3.5 w-3.5" />

                        {formatLabel(template.orientation)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            template.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {template.is_active ? "Active" : "Inactive"}
                        </span>

                        {template.is_default ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Default
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(template.updated_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void handleDuplicateTemplate(template);
                          }}
                          disabled={duplicatingTemplateId === template.id}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Duplicate ${template.name}`}
                        >
                          {duplicatingTemplateId === template.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(template);
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 hover:text-primary"
                          aria-label={`View ${template.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteTemplate(template);
                          }}
                          disabled={
                            template.is_default ||
                            deletingTemplateId === template.id
                          }
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Delete ${template.name}`}
                        >
                          {deletingTemplateId === template.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <LayoutTemplate className="mx-auto h-8 w-8 text-slate-400" />

                    <h2 className="mt-4 text-lg font-bold text-slate-800">
                      No templates found
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Create a certificate template or adjust the active
                      filters.
                    </p>

                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Create Template
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {firstVisibleRecord}–{lastVisibleRecord} of{" "}
            {total.toLocaleString()}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPage((currentPage) => Math.max(1, currentPage - 1));
              }}
              disabled={page <= 1 || loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <span className="min-w-24 text-center text-sm font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => {
                setPage((currentPage) => Math.min(totalPages, currentPage + 1));
              }}
              disabled={page >= totalPages || loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>

      {createModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-template-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Certificate Design
                </p>

                <h2
                  id="create-template-title"
                  className="mt-2 text-2xl font-bold text-slate-950"
                >
                  Create Certificate Template
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Configure branding, signatory information, colours, layout and
                  visibility options for this reusable certificate design.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creatingTemplate}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close template creation"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-6 p-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <LayoutTemplate className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">
                        Basic Information
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Give the template a clear name and stable internal
                        identifier.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="create-template-name"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Template name *
                      </label>

                      <input
                        id="create-template-name"
                        type="text"
                        value={createForm.name}
                        onChange={(event) => {
                          handleCreateNameChange(event.target.value);
                        }}
                        placeholder="CloudTweak Standard Certificate"
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="create-template-key"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Template key *
                      </label>

                      <input
                        id="create-template-key"
                        type="text"
                        value={createForm.templateKey}
                        onChange={(event) => {
                          updateCreateForm(
                            "templateKey",
                            normalizeCertificateTemplateKey(event.target.value)
                          );
                        }}
                        placeholder="cloudtweak_standard"
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-mono text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Used internally by the certificate renderer.
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="create-template-description"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Description
                      </label>

                      <textarea
                        id="create-template-description"
                        value={createForm.description}
                        onChange={(event) => {
                          updateCreateForm("description", event.target.value);
                        }}
                        rows={4}
                        placeholder="Describe when this certificate design should be used."
                        disabled={creatingTemplate}
                        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="create-template-orientation"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Orientation *
                      </label>

                      <select
                        id="create-template-orientation"
                        value={createForm.orientation}
                        onChange={(event) => {
                          updateCreateForm(
                            "orientation",
                            event.target
                              .value as CertificateTemplateFormState["orientation"]
                          );
                        }}
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        <option value="landscape">Landscape</option>

                        <option value="portrait">Portrait</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4">
                        <input
                          type="checkbox"
                          checked={createForm.isActive}
                          onChange={(event) => {
                            updateCreateForm("isActive", event.target.checked);
                          }}
                          disabled={creatingTemplate}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />

                        <span className="text-sm font-semibold text-slate-700">
                          Activate this template
                        </span>
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4">
                        <input
                          type="checkbox"
                          checked={createForm.isDefault}
                          onChange={(event) => {
                            updateCreateForm("isDefault", event.target.checked);
                          }}
                          disabled={creatingTemplate}
                          className="h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-600"
                        />

                        <div>
                          <span className="block text-sm font-semibold text-amber-900">
                            Set as global default
                          </span>

                          <span className="mt-0.5 block text-xs text-amber-700">
                            This will replace the current default certificate
                            template.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">Brand Assets</h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Add the background, logo and authorized signature used
                        by the certificate.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-5">
                    <div>
                      <label
                        htmlFor="create-background-image"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Background image URL
                      </label>

                      <input
                        id="create-background-image"
                        type="url"
                        value={createForm.backgroundImageUrl}
                        onChange={(event) => {
                          updateCreateForm(
                            "backgroundImageUrl",
                            event.target.value
                          );
                        }}
                        placeholder="https://..."
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="create-logo-url"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Logo URL
                        </label>

                        <input
                          id="create-logo-url"
                          type="url"
                          value={createForm.logoUrl}
                          onChange={(event) => {
                            updateCreateForm("logoUrl", event.target.value);
                          }}
                          placeholder="https://..."
                          disabled={creatingTemplate}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="create-signature-url"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Signature image URL
                        </label>

                        <input
                          id="create-signature-url"
                          type="url"
                          value={createForm.signatureImageUrl}
                          onChange={(event) => {
                            updateCreateForm(
                              "signatureImageUrl",
                              event.target.value
                            );
                          }}
                          placeholder="https://..."
                          disabled={creatingTemplate}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
                      These fields currently accept URLs. We can later replace
                      them with the existing reusable image uploader so files
                      are uploaded directly to Supabase Storage.
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">
                        Authorized Signatory
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Identify the person whose signature appears on
                        certificates using this template.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="create-signatory-name"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Signatory name
                      </label>

                      <input
                        id="create-signatory-name"
                        type="text"
                        value={createForm.signatoryName}
                        onChange={(event) => {
                          updateCreateForm("signatoryName", event.target.value);
                        }}
                        placeholder="Full name"
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="create-signatory-title"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Signatory title
                      </label>

                      <input
                        id="create-signatory-title"
                        type="text"
                        value={createForm.signatoryTitle}
                        onChange={(event) => {
                          updateCreateForm(
                            "signatoryTitle",
                            event.target.value
                          );
                        }}
                        placeholder="Academy Director"
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <Palette className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">Colours</h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Choose the main visual colours used by the certificate
                        renderer.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="create-primary-color"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Primary colour
                      </label>

                      <div className="flex gap-2">
                        <input
                          id="create-primary-color"
                          type="color"
                          value={createForm.primaryColor}
                          onChange={(event) => {
                            updateCreateForm(
                              "primaryColor",
                              event.target.value
                            );
                          }}
                          disabled={creatingTemplate}
                          className="h-12 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1 disabled:cursor-not-allowed"
                        />

                        <input
                          type="text"
                          value={createForm.primaryColor}
                          onChange={(event) => {
                            updateCreateForm(
                              "primaryColor",
                              event.target.value
                            );
                          }}
                          disabled={creatingTemplate}
                          className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm uppercase text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="create-secondary-color"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Secondary colour
                      </label>

                      <div className="flex gap-2">
                        <input
                          id="create-secondary-color"
                          type="color"
                          value={createForm.secondaryColor}
                          onChange={(event) => {
                            updateCreateForm(
                              "secondaryColor",
                              event.target.value
                            );
                          }}
                          disabled={creatingTemplate}
                          className="h-12 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1 disabled:cursor-not-allowed"
                        />

                        <input
                          type="text"
                          value={createForm.secondaryColor}
                          onChange={(event) => {
                            updateCreateForm(
                              "secondaryColor",
                              event.target.value
                            );
                          }}
                          disabled={creatingTemplate}
                          className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm uppercase text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="create-text-color"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Text colour
                      </label>

                      <div className="flex gap-2">
                        <input
                          id="create-text-color"
                          type="color"
                          value={createForm.textColor}
                          onChange={(event) => {
                            updateCreateForm("textColor", event.target.value);
                          }}
                          disabled={creatingTemplate}
                          className="h-12 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1 disabled:cursor-not-allowed"
                        />

                        <input
                          type="text"
                          value={createForm.textColor}
                          onChange={(event) => {
                            updateCreateForm("textColor", event.target.value);
                          }}
                          disabled={creatingTemplate}
                          className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm uppercase text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <FileImage className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">
                        Layout Configuration
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Control which elements appear and how important
                        certificate text is sized.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4">
                      <input
                        type="checkbox"
                        checked={createForm.showLogo}
                        onChange={(event) => {
                          updateCreateForm("showLogo", event.target.checked);
                        }}
                        disabled={creatingTemplate}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />

                      <span className="text-sm font-semibold text-slate-700">
                        Show logo
                      </span>
                    </label>

                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4">
                      <input
                        type="checkbox"
                        checked={createForm.showCertificateNumber}
                        onChange={(event) => {
                          updateCreateForm(
                            "showCertificateNumber",
                            event.target.checked
                          );
                        }}
                        disabled={creatingTemplate}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />

                      <span className="text-sm font-semibold text-slate-700">
                        Show certificate number
                      </span>
                    </label>

                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4">
                      <input
                        type="checkbox"
                        checked={createForm.showVerificationCode}
                        onChange={(event) => {
                          updateCreateForm(
                            "showVerificationCode",
                            event.target.checked
                          );
                        }}
                        disabled={creatingTemplate}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />

                      <span className="text-sm font-semibold text-slate-700">
                        Show verification code
                      </span>
                    </label>

                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4">
                      <input
                        type="checkbox"
                        checked={createForm.showCompletionDate}
                        onChange={(event) => {
                          updateCreateForm(
                            "showCompletionDate",
                            event.target.checked
                          );
                        }}
                        disabled={creatingTemplate}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />

                      <span className="text-sm font-semibold text-slate-700">
                        Show completion date
                      </span>
                    </label>

                    <div>
                      <label
                        htmlFor="create-recipient-size"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Recipient name size
                      </label>

                      <input
                        id="create-recipient-size"
                        type="number"
                        min="12"
                        max="96"
                        value={createForm.recipientNameSize}
                        onChange={(event) => {
                          updateCreateForm(
                            "recipientNameSize",
                            event.target.value
                          );
                        }}
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="create-program-size"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Program title size
                      </label>

                      <input
                        id="create-program-size"
                        type="number"
                        min="12"
                        max="72"
                        value={createForm.programTitleSize}
                        onChange={(event) => {
                          updateCreateForm(
                            "programTitleSize",
                            event.target.value
                          );
                        }}
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="create-signature-position"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Signature position
                      </label>

                      <select
                        id="create-signature-position"
                        value={createForm.signaturePosition}
                        onChange={(event) => {
                          updateCreateForm(
                            "signaturePosition",
                            event.target
                              .value as CertificateTemplateFormState["signaturePosition"]
                          );
                        }}
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      >
                        <option value="left">Left</option>

                        <option value="center">Center</option>

                        <option value="right">Right</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="create-verification-position"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Verification position
                      </label>

                      <select
                        id="create-verification-position"
                        value={createForm.verificationPosition}
                        onChange={(event) => {
                          updateCreateForm(
                            "verificationPosition",
                            event.target
                              .value as CertificateTemplateFormState["verificationPosition"]
                          );
                        }}
                        disabled={creatingTemplate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      >
                        <option value="bottom-left">Bottom left</option>

                        <option value="bottom-center">Bottom center</option>

                        <option value="bottom-right">Bottom right</option>
                      </select>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="xl:sticky xl:top-24 xl:self-start">
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                        Live Preview
                      </p>

                      <h3 className="mt-2 text-xl font-bold text-slate-950">
                        Certificate Appearance
                      </h3>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-600 shadow-sm">
                      {createForm.orientation}
                    </span>
                  </div>

                  <div
                    className={`relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ${
                      createForm.orientation === "landscape"
                        ? "aspect-[1.414/1]"
                        : "aspect-[1/1.414]"
                    }`}
                    style={{
                      backgroundColor: "#ffffff",
                      backgroundImage: createForm.backgroundImageUrl
                        ? `url("${createForm.backgroundImageUrl}")`
                        : undefined,
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "cover",
                      color: createForm.textColor,
                    }}
                  >
                    <div
                      className="absolute inset-0 border-[10px]"
                      style={{
                        borderColor: createForm.primaryColor,
                      }}
                    />

                    <div
                      className="absolute inset-[18px] border"
                      style={{
                        borderColor: createForm.secondaryColor,
                      }}
                    />

                    <div className="relative flex h-full flex-col items-center justify-between p-8 text-center">
                      <div className="flex min-h-12 items-center justify-center">
                        {createForm.showLogo && createForm.logoUrl ? (
                          <img
                            src={createForm.logoUrl}
                            alt=""
                            className="max-h-12 max-w-40 object-contain"
                          />
                        ) : createForm.showLogo ? (
                          <div
                            className="flex h-10 items-center rounded-xl px-4 text-xs font-bold uppercase tracking-[0.16em] text-white"
                            style={{
                              backgroundColor: createForm.primaryColor,
                            }}
                          >
                            CloudTweak Academy
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <p
                          className="text-xs font-bold uppercase tracking-[0.28em]"
                          style={{
                            color: createForm.primaryColor,
                          }}
                        >
                          Certificate of Completion
                        </p>

                        <p className="mt-5 text-sm">
                          This certificate is proudly presented to
                        </p>

                        <p
                          className="mt-3 font-serif font-bold leading-tight"
                          style={{
                            fontSize: `${Math.max(
                              18,
                              Number(createForm.recipientNameSize) / 2
                            )}px`,
                          }}
                        >
                          Learner Name
                        </p>

                        <div
                          className="mx-auto mt-3 h-0.5 w-36"
                          style={{
                            backgroundColor: createForm.secondaryColor,
                          }}
                        />

                        <p className="mt-5 text-sm">
                          for successfully completing
                        </p>

                        <p
                          className="mt-2 font-bold"
                          style={{
                            color: createForm.primaryColor,
                            fontSize: `${Math.max(
                              14,
                              Number(createForm.programTitleSize) / 1.7
                            )}px`,
                          }}
                        >
                          Academy Program Title
                        </p>

                        {createForm.showCompletionDate ? (
                          <p className="mt-4 text-xs opacity-70">
                            Completed on 31 July 2026
                          </p>
                        ) : null}
                      </div>

                      <div className="grid w-full grid-cols-3 items-end gap-3 text-xs">
                        <div
                          className={
                            createForm.verificationPosition === "bottom-left"
                              ? "block text-left"
                              : "invisible"
                          }
                        >
                          {createForm.showVerificationCode ? (
                            <>
                              <p className="font-semibold">Verification</p>

                              <p className="mt-1 opacity-70">CTV-123456789</p>
                            </>
                          ) : null}
                        </div>

                        <div
                          className={
                            createForm.signaturePosition === "center"
                              ? "block"
                              : "invisible"
                          }
                        >
                          {createForm.signatureImageUrl ? (
                            <img
                              src={createForm.signatureImageUrl}
                              alt=""
                              className="mx-auto mb-1 max-h-8 max-w-24 object-contain"
                            />
                          ) : null}

                          <div
                            className="mx-auto h-px w-24"
                            style={{
                              backgroundColor: createForm.textColor,
                            }}
                          />

                          <p className="mt-1 font-semibold">
                            {createForm.signatoryName || "Authorized Signatory"}
                          </p>
                        </div>

                        <div
                          className={
                            createForm.signaturePosition === "right"
                              ? "block text-right"
                              : createForm.signaturePosition === "left"
                                ? "block text-left"
                                : "invisible"
                          }
                        >
                          {createForm.signatureImageUrl ? (
                            <img
                              src={createForm.signatureImageUrl}
                              alt=""
                              className={`mb-1 max-h-8 max-w-24 object-contain ${
                                createForm.signaturePosition === "right"
                                  ? "ml-auto"
                                  : ""
                              }`}
                            />
                          ) : null}

                          <div
                            className={`h-px w-24 ${
                              createForm.signaturePosition === "right"
                                ? "ml-auto"
                                : ""
                            }`}
                            style={{
                              backgroundColor: createForm.textColor,
                            }}
                          />

                          <p className="mt-1 font-semibold">
                            {createForm.signatoryName || "Authorized Signatory"}
                          </p>

                          <p className="opacity-70">
                            {createForm.signatoryTitle || "Academy Director"}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`absolute bottom-5 text-[10px] opacity-70 ${
                          createForm.verificationPosition === "bottom-left"
                            ? "left-8"
                            : createForm.verificationPosition === "bottom-right"
                              ? "right-8"
                              : "left-1/2 -translate-x-1/2"
                        }`}
                      >
                        {createForm.showCertificateNumber ? (
                          <p>Certificate No: CTA-ACADEMY-2026-123456</p>
                        ) : null}

                        {createForm.showVerificationCode &&
                        createForm.verificationPosition !== "bottom-left" ? (
                          <p className="mt-1">Verification: CTV-123456789</p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <TemplateDetailRow
                      label="Template key"
                      value={createForm.templateKey || "Not generated"}
                    />

                    <TemplateDetailRow
                      label="Orientation"
                      value={formatLabel(createForm.orientation)}
                    />

                    <TemplateDetailRow
                      label="Status"
                      value={createForm.isActive ? "Active" : "Inactive"}
                    />

                    <TemplateDetailRow
                      label="Default"
                      value={createForm.isDefault ? "Yes" : "No"}
                    />
                  </div>
                </section>
              </aside>
            </div>

            <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creatingTemplate}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleCreateTemplate();
                }}
                disabled={creatingTemplate}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingTemplate ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}

                {creatingTemplate ? "Creating template..." : "Create template"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
      {selectedTemplate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-details-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                    Template Details
                  </p>

                  {selectedTemplate.is_default ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Global Default
                    </span>
                  ) : null}

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selectedTemplate.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {selectedTemplate.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <h2
                  id="template-details-title"
                  className="mt-2 text-2xl font-bold text-slate-950"
                >
                  {selectedTemplate.name}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Edit branding, layout, signatory details and
                  certificate-rendering options.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate(null);
                }}
                disabled={
                  updatingTemplateId === selectedTemplate.id ||
                  deletingTemplateId === selectedTemplate.id ||
                  duplicatingTemplateId === selectedTemplate.id
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close template details"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-6 p-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <LayoutTemplate className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">
                        Basic Information
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Update the template name, internal key and availability.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="edit-template-name"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Template name *
                      </label>

                      <input
                        id="edit-template-name"
                        type="text"
                        value={editForm.name}
                        onChange={(event) => {
                          updateEditForm("name", event.target.value);
                        }}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-template-key"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Template key *
                      </label>

                      <input
                        id="edit-template-key"
                        type="text"
                        value={editForm.templateKey}
                        onChange={(event) => {
                          updateEditForm(
                            "templateKey",
                            normalizeCertificateTemplateKey(event.target.value)
                          );
                        }}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-mono text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="edit-template-description"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Description
                      </label>

                      <textarea
                        id="edit-template-description"
                        value={editForm.description}
                        onChange={(event) => {
                          updateEditForm("description", event.target.value);
                        }}
                        rows={4}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-template-orientation"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Orientation
                      </label>

                      <select
                        id="edit-template-orientation"
                        value={editForm.orientation}
                        onChange={(event) => {
                          updateEditForm(
                            "orientation",
                            event.target
                              .value as CertificateTemplateFormState["orientation"]
                          );
                        }}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      >
                        <option value="landscape">Landscape</option>

                        <option value="portrait">Portrait</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(event) => {
                            updateEditForm("isActive", event.target.checked);
                          }}
                          disabled={
                            updatingTemplateId === selectedTemplate.id ||
                            selectedTemplate.is_default
                          }
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />

                        <div>
                          <span className="block text-sm font-semibold text-slate-700">
                            Active template
                          </span>

                          {selectedTemplate.is_default ? (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              The default template cannot be deactivated.
                            </span>
                          ) : null}
                        </div>
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4">
                        <input
                          type="checkbox"
                          checked={editForm.isDefault}
                          onChange={(event) => {
                            updateEditForm("isDefault", event.target.checked);
                          }}
                          disabled={
                            updatingTemplateId === selectedTemplate.id ||
                            !editForm.isActive
                          }
                          className="h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-600"
                        />

                        <div>
                          <span className="block text-sm font-semibold text-amber-900">
                            Global default template
                          </span>

                          <span className="mt-0.5 block text-xs text-amber-700">
                            Only one active template can be the global default.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">Brand Assets</h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Update the certificate background, logo and signature
                        assets.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-5">
                    <div>
                      <label
                        htmlFor="edit-background-image"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Background image URL
                      </label>

                      <input
                        id="edit-background-image"
                        type="url"
                        value={editForm.backgroundImageUrl}
                        onChange={(event) => {
                          updateEditForm(
                            "backgroundImageUrl",
                            event.target.value
                          );
                        }}
                        placeholder="https://..."
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="edit-logo-url"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Logo URL
                        </label>

                        <input
                          id="edit-logo-url"
                          type="url"
                          value={editForm.logoUrl}
                          onChange={(event) => {
                            updateEditForm("logoUrl", event.target.value);
                          }}
                          placeholder="https://..."
                          disabled={updatingTemplateId === selectedTemplate.id}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-signature-url"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Signature image URL
                        </label>

                        <input
                          id="edit-signature-url"
                          type="url"
                          value={editForm.signatureImageUrl}
                          onChange={(event) => {
                            updateEditForm(
                              "signatureImageUrl",
                              event.target.value
                            );
                          }}
                          placeholder="https://..."
                          disabled={updatingTemplateId === selectedTemplate.id}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">Signatory</h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Configure the authorized person shown on the
                        certificate.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="edit-signatory-name"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Signatory name
                      </label>

                      <input
                        id="edit-signatory-name"
                        type="text"
                        value={editForm.signatoryName}
                        onChange={(event) => {
                          updateEditForm("signatoryName", event.target.value);
                        }}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-signatory-title"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Signatory title
                      </label>

                      <input
                        id="edit-signatory-title"
                        type="text"
                        value={editForm.signatoryTitle}
                        onChange={(event) => {
                          updateEditForm("signatoryTitle", event.target.value);
                        }}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <Palette className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">Colours</h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Update the template’s primary, secondary and text
                        colours.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-3">
                    {(
                      [
                        {
                          label: "Primary colour",
                          field: "primaryColor",
                          value: editForm.primaryColor,
                        },
                        {
                          label: "Secondary colour",
                          field: "secondaryColor",
                          value: editForm.secondaryColor,
                        },
                        {
                          label: "Text colour",
                          field: "textColor",
                          value: editForm.textColor,
                        },
                      ] as const
                    ).map((colorField) => (
                      <div key={colorField.field}>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {colorField.label}
                        </label>

                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={colorField.value}
                            onChange={(event) => {
                              updateEditForm(
                                colorField.field,
                                event.target.value
                              );
                            }}
                            disabled={
                              updatingTemplateId === selectedTemplate.id
                            }
                            className="h-12 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1 disabled:cursor-not-allowed"
                          />

                          <input
                            type="text"
                            value={colorField.value}
                            onChange={(event) => {
                              updateEditForm(
                                colorField.field,
                                event.target.value
                              );
                            }}
                            disabled={
                              updatingTemplateId === selectedTemplate.id
                            }
                            className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm uppercase text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <FileImage className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <div>
                      <h3 className="font-bold text-slate-900">
                        Layout Configuration
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Control certificate visibility and positioning options.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        {
                          label: "Show logo",
                          field: "showLogo",
                          value: editForm.showLogo,
                        },
                        {
                          label: "Show certificate number",
                          field: "showCertificateNumber",
                          value: editForm.showCertificateNumber,
                        },
                        {
                          label: "Show verification code",
                          field: "showVerificationCode",
                          value: editForm.showVerificationCode,
                        },
                        {
                          label: "Show completion date",
                          field: "showCompletionDate",
                          value: editForm.showCompletionDate,
                        },
                      ] as const
                    ).map((option) => (
                      <label
                        key={option.field}
                        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4"
                      >
                        <input
                          type="checkbox"
                          checked={option.value}
                          onChange={(event) => {
                            updateEditForm(option.field, event.target.checked);
                          }}
                          disabled={updatingTemplateId === selectedTemplate.id}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />

                        <span className="text-sm font-semibold text-slate-700">
                          {option.label}
                        </span>
                      </label>
                    ))}

                    <div>
                      <label
                        htmlFor="edit-recipient-size"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Recipient name size
                      </label>

                      <input
                        id="edit-recipient-size"
                        type="number"
                        min="12"
                        max="96"
                        value={editForm.recipientNameSize}
                        onChange={(event) => {
                          updateEditForm(
                            "recipientNameSize",
                            event.target.value
                          );
                        }}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-program-size"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Program title size
                      </label>

                      <input
                        id="edit-program-size"
                        type="number"
                        min="12"
                        max="72"
                        value={editForm.programTitleSize}
                        onChange={(event) => {
                          updateEditForm(
                            "programTitleSize",
                            event.target.value
                          );
                        }}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-signature-position"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Signature position
                      </label>

                      <select
                        id="edit-signature-position"
                        value={editForm.signaturePosition}
                        onChange={(event) => {
                          updateEditForm(
                            "signaturePosition",
                            event.target
                              .value as CertificateTemplateFormState["signaturePosition"]
                          );
                        }}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      >
                        <option value="left">Left</option>

                        <option value="center">Center</option>

                        <option value="right">Right</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="edit-verification-position"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Verification position
                      </label>

                      <select
                        id="edit-verification-position"
                        value={editForm.verificationPosition}
                        onChange={(event) => {
                          updateEditForm(
                            "verificationPosition",
                            event.target
                              .value as CertificateTemplateFormState["verificationPosition"]
                          );
                        }}
                        disabled={updatingTemplateId === selectedTemplate.id}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
                      >
                        <option value="bottom-left">Bottom left</option>

                        <option value="bottom-center">Bottom center</option>

                        <option value="bottom-right">Bottom right</option>
                      </select>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="xl:sticky xl:top-24 xl:self-start">
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                        Live Preview
                      </p>

                      <h3 className="mt-2 text-xl font-bold text-slate-950">
                        Certificate Appearance
                      </h3>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-600 shadow-sm">
                      {editForm.orientation}
                    </span>
                  </div>

                  <div
                    className={`relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ${
                      editForm.orientation === "landscape"
                        ? "aspect-[1.414/1]"
                        : "aspect-[1/1.414]"
                    }`}
                    style={{
                      backgroundImage: editForm.backgroundImageUrl
                        ? `url("${editForm.backgroundImageUrl}")`
                        : undefined,
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "cover",
                      color: editForm.textColor,
                    }}
                  >
                    <div
                      className="absolute inset-0 border-[10px]"
                      style={{
                        borderColor: editForm.primaryColor,
                      }}
                    />

                    <div
                      className="absolute inset-[18px] border"
                      style={{
                        borderColor: editForm.secondaryColor,
                      }}
                    />

                    <div className="relative flex h-full flex-col items-center justify-between p-8 text-center">
                      <div className="flex min-h-12 items-center justify-center">
                        {editForm.showLogo && editForm.logoUrl ? (
                          <img
                            src={editForm.logoUrl}
                            alt=""
                            className="max-h-12 max-w-40 object-contain"
                          />
                        ) : editForm.showLogo ? (
                          <div
                            className="flex h-10 items-center rounded-xl px-4 text-xs font-bold uppercase tracking-[0.16em] text-white"
                            style={{
                              backgroundColor: editForm.primaryColor,
                            }}
                          >
                            CloudTweak Academy
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <p
                          className="text-xs font-bold uppercase tracking-[0.28em]"
                          style={{
                            color: editForm.primaryColor,
                          }}
                        >
                          Certificate of Completion
                        </p>

                        <p className="mt-5 text-sm">
                          This certificate is proudly presented to
                        </p>

                        <p
                          className="mt-3 font-serif font-bold leading-tight"
                          style={{
                            fontSize: `${Math.max(
                              18,
                              Number(editForm.recipientNameSize) / 2
                            )}px`,
                          }}
                        >
                          Learner Name
                        </p>

                        <div
                          className="mx-auto mt-3 h-0.5 w-36"
                          style={{
                            backgroundColor: editForm.secondaryColor,
                          }}
                        />

                        <p className="mt-5 text-sm">
                          for successfully completing
                        </p>

                        <p
                          className="mt-2 font-bold"
                          style={{
                            color: editForm.primaryColor,
                            fontSize: `${Math.max(
                              14,
                              Number(editForm.programTitleSize) / 1.7
                            )}px`,
                          }}
                        >
                          Academy Program Title
                        </p>

                        {editForm.showCompletionDate ? (
                          <p className="mt-4 text-xs opacity-70">
                            Completed on 31 July 2026
                          </p>
                        ) : null}
                      </div>

                      <div className="grid w-full grid-cols-3 items-end gap-3 text-xs">
                        <div
                          className={
                            editForm.verificationPosition === "bottom-left"
                              ? "block text-left"
                              : "invisible"
                          }
                        >
                          {editForm.showVerificationCode ? (
                            <>
                              <p className="font-semibold">Verification</p>

                              <p className="mt-1 opacity-70">CTV-123456789</p>
                            </>
                          ) : null}
                        </div>

                        <div
                          className={
                            editForm.signaturePosition === "center"
                              ? "block"
                              : "invisible"
                          }
                        >
                          {editForm.signatureImageUrl ? (
                            <img
                              src={editForm.signatureImageUrl}
                              alt=""
                              className="mx-auto mb-1 max-h-8 max-w-24 object-contain"
                            />
                          ) : null}

                          <div
                            className="mx-auto h-px w-24"
                            style={{
                              backgroundColor: editForm.textColor,
                            }}
                          />

                          <p className="mt-1 font-semibold">
                            {editForm.signatoryName || "Authorized Signatory"}
                          </p>
                        </div>

                        <div
                          className={
                            editForm.signaturePosition === "right"
                              ? "block text-right"
                              : editForm.signaturePosition === "left"
                                ? "block text-left"
                                : "invisible"
                          }
                        >
                          {editForm.signatureImageUrl ? (
                            <img
                              src={editForm.signatureImageUrl}
                              alt=""
                              className={`mb-1 max-h-8 max-w-24 object-contain ${
                                editForm.signaturePosition === "right"
                                  ? "ml-auto"
                                  : ""
                              }`}
                            />
                          ) : null}

                          <div
                            className={`h-px w-24 ${
                              editForm.signaturePosition === "right"
                                ? "ml-auto"
                                : ""
                            }`}
                            style={{
                              backgroundColor: editForm.textColor,
                            }}
                          />

                          <p className="mt-1 font-semibold">
                            {editForm.signatoryName || "Authorized Signatory"}
                          </p>

                          <p className="opacity-70">
                            {editForm.signatoryTitle || "Academy Director"}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`absolute bottom-5 text-[10px] opacity-70 ${
                          editForm.verificationPosition === "bottom-left"
                            ? "left-8"
                            : editForm.verificationPosition === "bottom-right"
                              ? "right-8"
                              : "left-1/2 -translate-x-1/2"
                        }`}
                      >
                        {editForm.showCertificateNumber ? (
                          <p>Certificate No: CTA-ACADEMY-2026-123456</p>
                        ) : null}

                        {editForm.showVerificationCode &&
                        editForm.verificationPosition !== "bottom-left" ? (
                          <p className="mt-1">Verification: CTV-123456789</p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <TemplateDetailRow
                      label="Created"
                      value={formatDate(selectedTemplate.created_at)}
                    />

                    <TemplateDetailRow
                      label="Updated"
                      value={formatDate(selectedTemplate.updated_at)}
                    />

                    <TemplateDetailRow
                      label="Template ID"
                      value={selectedTemplate.id}
                    />

                    <TemplateDetailRow
                      label="Template key"
                      value={editForm.templateKey}
                    />
                  </div>
                </section>

                <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900">Template Actions</h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Manage the template lifecycle without affecting issued
                    certificate data.
                  </p>

                  <div className="mt-5 grid gap-3">
                    {!selectedTemplate.is_default ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleSetDefaultTemplate(selectedTemplate);
                        }}
                        disabled={
                          updatingTemplateId === selectedTemplate.id ||
                          !selectedTemplate.is_active
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Set as default
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        void handleToggleTemplateStatus(selectedTemplate);
                      }}
                      disabled={
                        updatingTemplateId === selectedTemplate.id ||
                        selectedTemplate.is_default
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {selectedTemplate.is_active ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}

                      {selectedTemplate.is_active
                        ? "Deactivate template"
                        : "Activate template"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleDuplicateTemplate(selectedTemplate);
                      }}
                      disabled={duplicatingTemplateId === selectedTemplate.id}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {duplicatingTemplateId === selectedTemplate.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Duplicate template
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleDeleteTemplate(selectedTemplate);
                      }}
                      disabled={
                        selectedTemplate.is_default ||
                        deletingTemplateId === selectedTemplate.id
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingTemplateId === selectedTemplate.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete unused template
                    </button>
                  </div>
                </section>
              </aside>
            </div>

            <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate(null);
                }}
                disabled={
                  updatingTemplateId === selectedTemplate.id ||
                  deletingTemplateId === selectedTemplate.id
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleSaveTemplateChanges();
                }}
                disabled={updatingTemplateId === selectedTemplate.id}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingTemplateId === selectedTemplate.id ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}

                {updatingTemplateId === selectedTemplate.id
                  ? "Saving changes..."
                  : "Save changes"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
