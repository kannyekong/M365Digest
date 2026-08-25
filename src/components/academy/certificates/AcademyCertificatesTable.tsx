import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Mail,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileBadge2,
  Filter,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { supabase } from "../../../lib/superbase";
import { toast } from "react-toastify";
import {
  createAcademyCertificate,
  deleteAcademyCertificate,
  exportAcademyCertificates,
  getAcademyCertificateStatistics,
  listAcademyCertificates,
  listAcademyProgramsForCertificateFilters,
  listActiveAcademyCertificateTemplates,
  listCertificateEligibleRegistrations,
  restoreAcademyCertificate,
  revokeAcademyCertificate,
  updateAcademyCertificate,
  type AcademyCertificateEligibleRegistration,
  type AcademyCertificateFilters,
  type AcademyCertificateRecord,
  type AcademyCertificateSortField,
  type AcademyCertificateStatistics,
} from "../../../lib/academyCertificates";
import type { AcademyCertificateStatus } from "../../../types/academy";
import AcademyModuleNav from "../../admin/academy/AcademyModuleNav";

/**
 * Program option displayed inside certificate filters.
 */
interface AcademyCertificateProgramOption {
  id: string;

  title: string;

  slug: string;

  code: string | null;

  status: string;
}

/**
 * Certificate template available during certificate generation.
 */
interface AcademyCertificateTemplateOption {
  id: string;

  name: string;

  template_key: string;

  orientation: "landscape" | "portrait";

  is_default: boolean;

  is_active: boolean;
}

/**
 * Local filter state used by the certificate table.
 */
interface CertificateFilterState {
  search: string;

  programId: string;

  status: AcademyCertificateStatus | "all";

  templateId: string;

  dateFrom: string;

  dateTo: string;
}

/**
 * Response returned by the certificate PDF-generation endpoint.
 */
interface CertificatePdfGenerationResponse {
  success: boolean;

  message: string;

  fileUrl?: string;

  storagePath?: string;

  certificate?: {
    id: string;

    template_id: string | null;

    certificate_number: string;

    verification_code: string;

    file_url: string | null;

    generated_at: string;

    status: AcademyCertificateStatus;
  };
}
/**
 * Values used by the certificate-generation form.
 */
interface CertificateGenerationFormState {
  registrationId: string;

  templateId: string;

  certificateNumber: string;

  verificationCode: string;

  issueDate: string;

  fileUrl: string;

  generatedBy: string;
}

/**
 * Values used when editing a generated certificate.
 */
interface CertificateEditFormState {
  certificateNumber: string;

  verificationCode: string;

  recipientName: string;

  programTitle: string;

  issueDate: string;

  completionDate: string;

  fileUrl: string;

  templateId: string;
}

/**
 * One statistic card displayed above the certificate table.
 */
interface CertificateMetric {
  label: string;

  value: string;

  description: string;

  icon: ComponentType<{
    size?: number;

    className?: string;
  }>;

  iconClasses: string;
}

type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: CertificateFilterState = {
  search: "",

  programId: "",

  status: "all",

  templateId: "",

  dateFrom: "",

  dateTo: "",
};

const DEFAULT_GENERATION_FORM: CertificateGenerationFormState = {
  registrationId: "",

  templateId: "",

  certificateNumber: "",

  verificationCode: "",

  issueDate: new Date().toISOString().split("T")[0],

  fileUrl: "",

  generatedBy: "",
};

const DEFAULT_EDIT_FORM: CertificateEditFormState = {
  certificateNumber: "",

  verificationCode: "",

  recipientName: "",

  programTitle: "",

  issueDate: "",

  completionDate: "",

  fileUrl: "",

  templateId: "",
};

/**
 * Format a database date for compact display.
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
 * Format a database date with time.
 */
function formatDateTime(value: string | null) {
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

    hour: "numeric",

    minute: "2-digit",
  }).format(date);
}

/**
 * Convert an underscore-separated value into a readable label.
 */
function formatStatus(value: string) {
  return value
    .split("_")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Return the certificate status badge classes.
 */
function getCertificateStatusClasses(status: AcademyCertificateStatus) {
  switch (status) {
    case "generated":
      return "bg-emerald-100 text-emerald-700";

    case "revoked":
      return "bg-red-100 text-red-700";

    case "eligible":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

/**
 * Create a readable certificate number.
 */
function generateCertificateNumber(programCode?: string | null) {
  const normalizedProgramCode = (programCode || "ACADEMY")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const year = new Date().getFullYear();

  const randomValue = crypto.randomUUID().split("-")[0].toUpperCase();

  return `CTA-${normalizedProgramCode}-${year}-${randomValue}`;
}

/**
 * Create a unique public certificate verification code.
 */
function generateVerificationCode() {
  const randomValue = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)
    .toUpperCase();

  return `CTV-${randomValue}`;
}

/**
 * Escape one value before adding it to a CSV document.
 */
function escapeCsvCell(value: unknown) {
  const normalizedValue =
    value === null || value === undefined ? "" : String(value);

  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

/**
 * Download Academy certificate records as a CSV file.
 */
function downloadCertificatesCsv(certificates: AcademyCertificateRecord[]) {
  const headers = [
    "Certificate ID",

    "Certificate Number",

    "Verification Code",

    "Recipient Name",

    "Recipient Email",

    "Program",

    "Program Code",

    "Template",

    "Status",

    "Issue Date",

    "Completion Date",

    "Generated At",

    "Generated By",

    "File URL",

    "Revoked At",

    "Revocation Reason",
  ];

  const rows = certificates.map((certificate) => [
    certificate.id,

    certificate.certificate_number,

    certificate.verification_code,

    certificate.recipient_name,

    certificate.registration?.email,

    certificate.program_title,

    certificate.program?.code,

    certificate.template?.name,

    certificate.status,

    certificate.issue_date,

    certificate.completion_date,

    certificate.generated_at,

    certificate.generated_by,

    certificate.file_url,

    certificate.revoked_at,

    certificate.revocation_reason,
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

  anchor.download = `academy-certificates-${
    new Date().toISOString().split("T")[0]
  }.csv`;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

/**
 * Display one reusable row inside certificate detail sections.
 */
function CertificateDetailRow({
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
 * Display one certificate dashboard metric.
 */
function CertificateMetricCard({ metric }: { metric: CertificateMetric }) {
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
 * Display and manage Academy certificates.
 */
export default function AcademyCertificatesTable() {
  // Store the current page of generated certificate records.
  const [certificates, setCertificates] = useState<AcademyCertificateRecord[]>(
    []
  );

  /* Tracks the certificate currently being emailed to prevent duplicate requests. */
  const [sendingCertificateId, setSendingCertificateId] = useState<
    string | null
  >(null);

  // Store the certificate ID whose PDF is currently being generated.
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // Store certificate dashboard statistics.
  const [statistics, setStatistics] =
    useState<AcademyCertificateStatistics | null>(null);

  // Store Academy programs used by the filter dropdown.
  const [programOptions, setProgramOptions] = useState<
    AcademyCertificateProgramOption[]
  >([]);

  // Store active certificate templates.
  const [templateOptions, setTemplateOptions] = useState<
    AcademyCertificateTemplateOption[]
  >([]);

  // Store learners who are eligible for certificate generation.
  const [eligibleRegistrations, setEligibleRegistrations] = useState<
    AcademyCertificateEligibleRegistration[]
  >([]);

  // Store the currently active certificate filters.
  const [filters, setFilters] =
    useState<CertificateFilterState>(DEFAULT_FILTERS);

  // Store the current pagination page.
  const [page, setPage] = useState(1);

  // Store the total number of matching certificates.
  const [total, setTotal] = useState(0);

  // Store the total number of available pages.
  const [totalPages, setTotalPages] = useState(1);

  // Store the active sorting field.
  const [sortBy, setSortBy] =
    useState<AcademyCertificateSortField>("generated_at");

  // Store the active sorting direction.
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Track the main certificate loading state.
  const [loading, setLoading] = useState(true);

  // Track CSV export preparation.
  const [exporting, setExporting] = useState(false);

  // Store a safe loading error for the interface.
  const [errorMessage, setErrorMessage] = useState("");

  // Track whether the expanded filter panel is visible.
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Track whether the certificate-generation modal is open.
  const [generationModalOpen, setGenerationModalOpen] = useState(false);

  // Store the certificate currently displayed in the details modal.
  const [selectedCertificate, setSelectedCertificate] =
    useState<AcademyCertificateRecord | null>(null);

  // Store the certificate-generation form.
  const [generationForm, setGenerationForm] =
    useState<CertificateGenerationFormState>(DEFAULT_GENERATION_FORM);

  // Store editable values for the selected certificate.
  const [editForm, setEditForm] =
    useState<CertificateEditFormState>(DEFAULT_EDIT_FORM);

  // Store the certificate ID currently being updated.
  const [updatingCertificateId, setUpdatingCertificateId] = useState<
    string | null
  >(null);

  // Track whether a new certificate is being generated.
  const [generatingCertificate, setGeneratingCertificate] = useState(false);

  // Track the certificate currently being deleted.
  const [deletingCertificateId, setDeletingCertificateId] = useState<
    string | null
  >(null);

  // Store the revocation reason entered by the administrator.
  const [revocationReason, setRevocationReason] = useState("");

  /**
   * Convert component filters into the certificate service shape.
   */
  const serviceFilters = useMemo<AcademyCertificateFilters>(
    () => ({
      search: filters.search.trim() || undefined,

      programId: filters.programId || undefined,

      status: filters.status,

      templateId: filters.templateId || undefined,

      dateFrom: filters.dateFrom || undefined,

      dateTo: filters.dateTo || undefined,
    }),
    [filters]
  );

  /**
   * Load the current page of certificates and certificate statistics.
   */
  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [certificateResult, statisticsResult] = await Promise.all([
        listAcademyCertificates({
          page,

          pageSize: PAGE_SIZE,

          filters: serviceFilters,

          sortBy,

          sortDirection,
        }),

        getAcademyCertificateStatistics(),
      ]);

      setCertificates(certificateResult.certificates);

      setTotal(certificateResult.total);

      setTotalPages(certificateResult.totalPages);

      setStatistics(statisticsResult);

      // Move back to the final valid page when filters reduce results.
      if (page > certificateResult.totalPages) {
        setPage(certificateResult.totalPages);
      }
    } catch (error) {
      console.error("Failed to load Academy certificates:", error);

      setErrorMessage("The Academy certificates could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, serviceFilters, sortBy, sortDirection]);

  /**
   * Load programs and templates used by certificate filters and forms.
   */
  const loadCertificateOptions = useCallback(async () => {
    try {
      const [programs, templates] = await Promise.all([
        listAcademyProgramsForCertificateFilters(),

        listActiveAcademyCertificateTemplates(),
      ]);

      setProgramOptions(programs as AcademyCertificateProgramOption[]);

      setTemplateOptions(templates as AcademyCertificateTemplateOption[]);
    } catch (error) {
      console.error("Failed to load certificate options:", error);

      toast.error("Certificate programs or templates could not be loaded.");
    }
  }, []);

  /**
   * Load registrations that are eligible for certificate generation.
   */
  const loadEligibleRegistrations = useCallback(async () => {
    try {
      const registrations = await listCertificateEligibleRegistrations();

      setEligibleRegistrations(registrations);
    } catch (error) {
      console.error(
        "Failed to load certificate-eligible registrations:",
        error
      );

      toast.error("Eligible learners could not be loaded.");
    }
  }, []);

  // Load filter and form options after the component hydrates.
  useEffect(() => {
    void loadCertificateOptions();
  }, [loadCertificateOptions]);

  // Load eligible registrations after the component hydrates.
  useEffect(() => {
    void loadEligibleRegistrations();
  }, [loadEligibleRegistrations]);

  // Reload certificates whenever pagination, filters or sorting change.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCertificates();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadCertificates]);

  /**
   * Synchronize the edit form with the selected certificate.
   */
  useEffect(() => {
    if (!selectedCertificate) {
      setEditForm(DEFAULT_EDIT_FORM);
      setRevocationReason("");

      return;
    }

    setEditForm({
      certificateNumber: selectedCertificate.certificate_number,

      verificationCode: selectedCertificate.verification_code,

      recipientName: selectedCertificate.recipient_name,

      programTitle: selectedCertificate.program_title,

      issueDate: selectedCertificate.issue_date || "",

      completionDate: selectedCertificate.completion_date || "",

      fileUrl: selectedCertificate.file_url || "",

      templateId: selectedCertificate.template_id || "",
    });

    setRevocationReason(selectedCertificate.revocation_reason || "");
  }, [selectedCertificate]);

  /**
   * Select the default certificate template when opening generation.
   */
  useEffect(() => {
    if (
      !generationModalOpen ||
      generationForm.templateId ||
      templateOptions.length === 0
    ) {
      return;
    }

    const defaultTemplate =
      templateOptions.find((template) => template.is_default) ??
      templateOptions[0];

    setGenerationForm((currentForm) => ({
      ...currentForm,

      templateId: defaultTemplate?.id ?? "",
    }));
  }, [generationModalOpen, generationForm.templateId, templateOptions]);

  /**
   * Update one active certificate filter and reset pagination.
   */
  function updateFilter<Key extends keyof CertificateFilterState>(
    field: Key,
    value: CertificateFilterState[Key]
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,

      [field]: value,
    }));

    setPage(1);
  }

  /**
   * Reset every active certificate filter.
   */
  function clearFilters() {
    setFilters(DEFAULT_FILTERS);

    setPage(1);
  }

  /**
   * Update one certificate-generation form field.
   */
  function updateGenerationForm<
    Key extends keyof CertificateGenerationFormState,
  >(field: Key, value: CertificateGenerationFormState[Key]) {
    setGenerationForm((currentForm) => ({
      ...currentForm,

      [field]: value,
    }));
  }

  /**
   * Update one certificate edit form field.
   */
  function updateEditForm<Key extends keyof CertificateEditFormState>(
    field: Key,
    value: CertificateEditFormState[Key]
  ) {
    setEditForm((currentForm) => ({
      ...currentForm,

      [field]: value,
    }));
  }

  /**
   * Open the certificate-generation modal with fresh values.
   */
  function openGenerationModal() {
    const defaultTemplate =
      templateOptions.find((template) => template.is_default) ??
      templateOptions[0];

    setGenerationForm({
      ...DEFAULT_GENERATION_FORM,

      issueDate: new Date().toISOString().split("T")[0],

      templateId: defaultTemplate?.id ?? "",
    });

    setGenerationModalOpen(true);
  }

  /* Sends an existing generated certificate to the learner by email. */
  async function handleSendCertificateEmail(
    certificate: AcademyCertificateRecord
  ) {
    // Prevent concurrent certificate email requests.
    if (sendingCertificateId) {
      return;
    }

    // Revoked certificates must never be distributed.
    if (certificate.status === "revoked") {
      toast.error("A revoked certificate cannot be emailed.");
      return;
    }

    // Require the PDF to exist before allowing certificate delivery.
    if (!certificate.file_url) {
      toast.error(
        "Generate the certificate PDF before sending it to the learner."
      );
      return;
    }

    const confirmed = window.confirm(
      `Send certificate ${certificate.certificate_number} to ${certificate.recipient_name}?`
    );

    if (!confirmed) {
      return;
    }

    setSendingCertificateId(certificate.id);

    try {
      // Retrieve the current administrator session for the protected API request.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Sign in again before sending the certificate."
        );
      }

      // Ask the trusted server endpoint to deliver this certificate.
      const response = await fetch("/api/academy/certificates/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          certificateId: certificate.id,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        emailId?: string | null;
        recipient?: string;
      };

      // Surface any API or Resend failure to the administrator.
      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "The certificate email could not be sent."
        );
      }

      toast.success(result.message || "Certificate sent successfully.");
    } catch (error) {
      console.error("Failed to send certificate email:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The certificate email could not be sent."
      );
    } finally {
      setSendingCertificateId(null);
    }
  }
  /**
   * Close the certificate-generation modal and reset its form.
   */
  function closeGenerationModal() {
    if (generatingCertificate) {
      return;
    }

    setGenerationModalOpen(false);

    setGenerationForm(DEFAULT_GENERATION_FORM);
  }

  /**
   * Replace one certificate in the local table and details modal.
   */
  function replaceCertificate(updatedCertificate: AcademyCertificateRecord) {
    setCertificates((currentCertificates) =>
      currentCertificates.map((certificate) =>
        certificate.id === updatedCertificate.id
          ? updatedCertificate
          : certificate
      )
    );

    setSelectedCertificate((currentCertificate) =>
      currentCertificate?.id === updatedCertificate.id
        ? updatedCertificate
        : currentCertificate
    );
  }

  /**
   * Find the currently selected eligible registration.
   */
  const selectedEligibleRegistration = useMemo(() => {
    return (
      eligibleRegistrations.find(
        (registration) => registration.id === generationForm.registrationId
      ) ?? null
    );
  }, [eligibleRegistrations, generationForm.registrationId]);

  /**
   * Count all active certificate filters.
   */
  const activeFilterCount = useMemo(() => {
    return [
      filters.search,

      filters.programId,

      filters.status !== "all" ? filters.status : "",

      filters.templateId,

      filters.dateFrom,

      filters.dateTo,
    ].filter(Boolean).length;
  }, [filters]);

  /**
   * Build the certificate dashboard metrics.
   */
  const metrics = useMemo<CertificateMetric[]>(() => {
    if (!statistics) {
      return [];
    }

    return [
      {
        label: "Total Certificates",

        value: statistics.totalCertificates.toLocaleString(),

        description: "All generated certificate records",

        icon: Award,

        iconClasses: "bg-blue-100 text-blue-700",
      },

      {
        label: "Active Certificates",

        value: statistics.generatedCertificates.toLocaleString(),

        description: "Currently valid certificates",

        icon: ShieldCheck,

        iconClasses: "bg-emerald-100 text-emerald-700",
      },

      {
        label: "Eligible Learners",

        value: statistics.eligibleRegistrations.toLocaleString(),

        description: "Completed learners awaiting certificates",

        icon: UserCheck,

        iconClasses: "bg-purple-100 text-purple-700",
      },

      {
        label: "Revoked Certificates",

        value: statistics.revokedCertificates.toLocaleString(),

        description: `${statistics.certificatesThisMonth} generated this month`,

        icon: XCircle,

        iconClasses: "bg-red-100 text-red-700",
      },
    ];
  }, [statistics]);

  const firstVisibleRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const lastVisibleRecord = Math.min(page * PAGE_SIZE, total);

  /**
   * Change the active certificate sorting field or direction.
   */
  function handleSort(field: AcademyCertificateSortField) {
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
   * Return the icon representing the current sort state.
   */
  function getSortIcon(field: AcademyCertificateSortField) {
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
   * Generate certificate identifiers when an eligible learner is selected.
   */
  function handleEligibleRegistrationChange(registrationId: string) {
    const registration = eligibleRegistrations.find(
      (eligibleRegistration) => eligibleRegistration.id === registrationId
    );

    if (!registration) {
      updateGenerationForm("registrationId", "");

      updateGenerationForm("certificateNumber", "");

      updateGenerationForm("verificationCode", "");

      return;
    }

    setGenerationForm((currentForm) => ({
      ...currentForm,

      registrationId: registration.id,

      certificateNumber: generateCertificateNumber(registration.program?.code),

      verificationCode: generateVerificationCode(),
    }));
  }

  /**
   * Generate a certificate for the selected eligible learner.
   */
  async function handleGenerateCertificate() {
    if (generatingCertificate) {
      return;
    }

    if (!selectedEligibleRegistration) {
      toast.error("Select an eligible learner.");

      return;
    }

    if (!generationForm.templateId) {
      toast.error("Select a certificate template.");

      return;
    }

    if (!generationForm.certificateNumber.trim()) {
      toast.error("A certificate number is required.");

      return;
    }

    if (!generationForm.verificationCode.trim()) {
      toast.error("A verification code is required.");

      return;
    }

    if (!generationForm.issueDate) {
      toast.error("Select the certificate issue date.");

      return;
    }

    if (!selectedEligibleRegistration.program) {
      toast.error(
        "The selected learner does not have a valid Academy program."
      );

      return;
    }

    setGeneratingCertificate(true);

    try {
      const createdCertificate = await createAcademyCertificate({
        registration_id: selectedEligibleRegistration.id,

        program_id: selectedEligibleRegistration.program_id,

        template_id: generationForm.templateId,

        certificate_number: generationForm.certificateNumber.trim(),

        verification_code: generationForm.verificationCode.trim(),

        recipient_name:
          `${selectedEligibleRegistration.first_name} ${selectedEligibleRegistration.last_name}`.trim(),

        program_title: selectedEligibleRegistration.program.title,

        issue_date: generationForm.issueDate,

        completion_date: selectedEligibleRegistration.completed_at,

        file_url: generationForm.fileUrl.trim() || null,

        generated_by: generationForm.generatedBy.trim() || null,

        metadata: {
          learner_email: selectedEligibleRegistration.email,

          generated_from: "academy_admin",

          generated_at: new Date().toISOString(),
        },
      });

      setCertificates((currentCertificates) => [
        createdCertificate,
        ...currentCertificates,
      ]);

      setTotal((currentTotal) => currentTotal + 1);

      setEligibleRegistrations((currentRegistrations) =>
        currentRegistrations.filter(
          (registration) => registration.id !== selectedEligibleRegistration.id
        )
      );

      setStatistics((currentStatistics) => {
        if (!currentStatistics) {
          return currentStatistics;
        }

        return {
          ...currentStatistics,

          totalCertificates: currentStatistics.totalCertificates + 1,

          generatedCertificates: currentStatistics.generatedCertificates + 1,

          eligibleRegistrations: Math.max(
            0,
            currentStatistics.eligibleRegistrations - 1
          ),

          certificatesThisMonth: currentStatistics.certificatesThisMonth + 1,
        };
      });

      toast.success("Certificate generated successfully.");

      closeGenerationModal();
    } catch (error) {
      console.error("Failed to generate Academy certificate:", error);

      toast.error("The certificate could not be generated.");
    } finally {
      setGeneratingCertificate(false);
    }
  }

  /**
   * Save edits made to the selected certificate.
   */
  async function handleSaveCertificateEdits() {
    if (!selectedCertificate || updatingCertificateId) {
      return;
    }

    if (!editForm.certificateNumber.trim()) {
      toast.error("Certificate number is required.");

      return;
    }

    if (!editForm.verificationCode.trim()) {
      toast.error("Verification code is required.");

      return;
    }

    if (!editForm.recipientName.trim()) {
      toast.error("Recipient name is required.");

      return;
    }

    if (!editForm.programTitle.trim()) {
      toast.error("Program title is required.");

      return;
    }

    if (!editForm.issueDate) {
      toast.error("Issue date is required.");

      return;
    }

    setUpdatingCertificateId(selectedCertificate.id);

    try {
      const updatedCertificate = await updateAcademyCertificate(
        selectedCertificate.id,
        {
          certificate_number: editForm.certificateNumber.trim(),

          verification_code: editForm.verificationCode.trim(),

          recipient_name: editForm.recipientName.trim(),

          program_title: editForm.programTitle.trim(),

          issue_date: editForm.issueDate,

          completion_date: editForm.completionDate || null,

          file_url: editForm.fileUrl.trim() || null,

          template_id: editForm.templateId || null,
        }
      );

      replaceCertificate(updatedCertificate);

      toast.success("Certificate details updated.");
    } catch (error) {
      console.error("Failed to update Academy certificate:", error);

      toast.error("The certificate could not be updated.");
    } finally {
      setUpdatingCertificateId(null);
    }
  }

  /**
   * Generate or regenerate the PDF file for one Academy certificate.
   */
  async function handleGenerateCertificatePdf(
    certificate: AcademyCertificateRecord
  ) {
    // Prevent concurrent PDF-generation requests.
    if (generatingPdfId) {
      return;
    }

    // Prevent a revoked certificate from receiving a new PDF.
    if (certificate.status === "revoked") {
      toast.error("A revoked certificate cannot be regenerated.");

      return;
    }

    const actionLabel = certificate.file_url ? "regenerate" : "generate";

    const confirmed = window.confirm(
      `${
        actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)
      } the PDF for certificate ${certificate.certificate_number}?`
    );

    if (!confirmed) {
      return;
    }

    setGeneratingPdfId(certificate.id);

    try {
      // Request server-side PDF generation and Storage upload.
      const response = await fetch(
        `/api/academy/certificates/${certificate.id}/generate`,
        {
          method: "POST",

          headers: {
            Accept: "application/json",
          },
        }
      );

      const result =
        (await response.json()) as CertificatePdfGenerationResponse;

      // Surface the API error when PDF generation fails.
      if (!response.ok || !result.success || !result.fileUrl) {
        throw new Error(
          result.message || "The certificate PDF could not be generated."
        );
      }

      // Update the local certificate record with the generated PDF URL.
      const updatedCertificate: AcademyCertificateRecord = {
        ...certificate,

        template_id: result.certificate?.template_id ?? certificate.template_id,

        file_url: result.fileUrl,

        generated_at:
          result.certificate?.generated_at ?? new Date().toISOString(),

        status: result.certificate?.status ?? certificate.status,

        updated_at: new Date().toISOString(),
      };

      replaceCertificate(updatedCertificate);

      toast.success(
        certificate.file_url
          ? "Certificate PDF regenerated successfully."
          : "Certificate PDF generated successfully."
      );
    } catch (error) {
      console.error("Failed to generate certificate PDF:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "The certificate PDF could not be generated."
      );
    } finally {
      setGeneratingPdfId(null);
    }
  }

  /**
   * Revoke the selected certificate.
   */
  async function handleRevokeCertificate() {
    if (!selectedCertificate || updatingCertificateId) {
      return;
    }

    if (!revocationReason.trim()) {
      toast.error("Enter a reason for revoking this certificate.");

      return;
    }

    const confirmed = window.confirm(
      `Revoke certificate ${selectedCertificate.certificate_number}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingCertificateId(selectedCertificate.id);

    try {
      const updatedCertificate = await revokeAcademyCertificate(
        selectedCertificate,
        revocationReason
      );

      replaceCertificate(updatedCertificate);

      setStatistics((currentStatistics) => {
        if (!currentStatistics) {
          return currentStatistics;
        }

        return {
          ...currentStatistics,

          generatedCertificates: Math.max(
            0,
            currentStatistics.generatedCertificates - 1
          ),

          revokedCertificates: currentStatistics.revokedCertificates + 1,
        };
      });

      toast.success("Certificate revoked.");
    } catch (error) {
      console.error("Failed to revoke Academy certificate:", error);

      toast.error("The certificate could not be revoked.");
    } finally {
      setUpdatingCertificateId(null);
    }
  }

  /**
   * Restore a previously revoked certificate.
   */
  async function handleRestoreCertificate() {
    if (!selectedCertificate || updatingCertificateId) {
      return;
    }

    const confirmed = window.confirm(
      `Restore certificate ${selectedCertificate.certificate_number}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingCertificateId(selectedCertificate.id);

    try {
      const updatedCertificate =
        await restoreAcademyCertificate(selectedCertificate);

      replaceCertificate(updatedCertificate);

      setRevocationReason("");

      setStatistics((currentStatistics) => {
        if (!currentStatistics) {
          return currentStatistics;
        }

        return {
          ...currentStatistics,

          generatedCertificates: currentStatistics.generatedCertificates + 1,

          revokedCertificates: Math.max(
            0,
            currentStatistics.revokedCertificates - 1
          ),
        };
      });

      toast.success("Certificate restored.");
    } catch (error) {
      console.error("Failed to restore Academy certificate:", error);

      toast.error("The certificate could not be restored.");
    } finally {
      setUpdatingCertificateId(null);
    }
  }

  /**
   * Delete a certificate created for testing or in error.
   */
  async function handleDeleteCertificate(
    certificate: AcademyCertificateRecord
  ) {
    if (deletingCertificateId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete certificate ${certificate.certificate_number}? Production certificates should normally be revoked instead.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingCertificateId(certificate.id);

    try {
      await deleteAcademyCertificate(certificate);

      setCertificates((currentCertificates) =>
        currentCertificates.filter(
          (currentCertificate) => currentCertificate.id !== certificate.id
        )
      );

      setSelectedCertificate(null);

      setTotal((currentTotal) => Math.max(0, currentTotal - 1));

      setStatistics((currentStatistics) => {
        if (!currentStatistics) {
          return currentStatistics;
        }

        return {
          ...currentStatistics,

          totalCertificates: Math.max(
            0,
            currentStatistics.totalCertificates - 1
          ),

          generatedCertificates:
            certificate.status === "generated"
              ? Math.max(0, currentStatistics.generatedCertificates - 1)
              : currentStatistics.generatedCertificates,

          revokedCertificates:
            certificate.status === "revoked"
              ? Math.max(0, currentStatistics.revokedCertificates - 1)
              : currentStatistics.revokedCertificates,

          eligibleRegistrations: currentStatistics.eligibleRegistrations + 1,
        };
      });

      await loadEligibleRegistrations();

      toast.success("Certificate deleted.");
    } catch (error) {
      console.error("Failed to delete Academy certificate:", error);

      toast.error("The certificate could not be deleted.");
    } finally {
      setDeletingCertificateId(null);
    }
  }

  /**
   * Export certificates matching the current filters.
   */
  async function handleExport() {
    if (exporting) {
      return;
    }

    setExporting(true);

    try {
      const exportedCertificates =
        await exportAcademyCertificates(serviceFilters);

      if (exportedCertificates.length === 0) {
        toast.info("There are no matching certificates to export.");

        return;
      }

      downloadCertificatesCsv(exportedCertificates);

      toast.success(`${exportedCertificates.length} certificates exported.`);
    } catch (error) {
      console.error("Failed to export Academy certificates:", error);

      toast.error("The certificate export could not be created.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="mx-auto max-w-full space-y-5">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mt-2 text-xl font-bold text-slate-950">
            Academy Certificates
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Generate, manage, verify, revoke and export certificates issued to
            Academy learners.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void loadCertificates();
              void loadEligibleRegistrations();
            }}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
            onClick={openGenerationModal}
            disabled={eligibleRegistrations.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileBadge2 className="h-4 w-4" />
            Generate Cert
          </button>
        </div>
      </header>

      <AcademyModuleNav current="Certificates" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <CertificateMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {statistics && statistics.eligibleRegistrations > 0 ? (
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-purple-200 bg-purple-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-purple-700" />

            <div>
              <p className="font-semibold text-purple-900">
                {statistics.eligibleRegistrations}{" "}
                {statistics.eligibleRegistrations === 1
                  ? "learner is"
                  : "learners are"}{" "}
                ready for certificate generation.
              </p>

              <p className="mt-1 text-sm leading-6 text-purple-700">
                Generate certificates for learners who have completed their
                Academy programs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openGenerationModal}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-800"
          >
            <Award className="h-4 w-4" />
            Generate now
          </button>
        </section>
      ) : null}

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
              placeholder="Search recipient, program, certificate number or verification code..."
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
          <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <label
                htmlFor="certificate-program-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Program
              </label>

              <select
                id="certificate-program-filter"
                value={filters.programId}
                onChange={(event) => {
                  updateFilter("programId", event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="">All programs</option>

                {programOptions.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="certificate-status-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Certificate status
              </label>

              <select
                id="certificate-status-filter"
                value={filters.status}
                onChange={(event) => {
                  updateFilter(
                    "status",
                    event.target.value as AcademyCertificateStatus | "all"
                  );
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All statuses</option>

                <option value="generated">Generated</option>

                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="certificate-template-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Template
              </label>

              <select
                id="certificate-template-filter"
                value={filters.templateId}
                onChange={(event) => {
                  updateFilter("templateId", event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="">All templates</option>

                {templateOptions.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="certificate-date-from"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Issue date from
              </label>

              <input
                id="certificate-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(event) => {
                  updateFilter("dateFrom", event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div>
              <label
                htmlFor="certificate-date-to"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Issue date to
              </label>

              <input
                id="certificate-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(event) => {
                  updateFilter("dateTo", event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
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
                      handleSort("recipient_name");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Recipient
                    {getSortIcon("recipient_name")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("program_title");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Program
                    {getSortIcon("program_title")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("certificate_number");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Certificate
                    {getSortIcon("certificate_number")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("status");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Status
                    {getSortIcon("status")}
                  </button>
                </th>

                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleSort("issue_date");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Issue Date
                    {getSortIcon("issue_date")}
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
                      Loading certificates...
                    </p>
                  </td>
                </tr>
              ) : certificates.length > 0 ? (
                certificates.map((certificate) => (
                  <tr
                    key={certificate.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-sm text-slate-900">
                        {certificate.recipient_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {certificate.registration?.email ?? "No learner email"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[240px] text-xs text-slate-800">
                        {certificate.program_title}
                      </p>

                      {certificate.program?.code ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {certificate.program.code}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[220px] break-all text-xs font-semibold text-slate-900">
                        {certificate.certificate_number}
                      </p>

                      <p className="mt-1 max-w-[220px] break-all text-xs text-slate-400">
                        {certificate.verification_code}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getCertificateStatusClasses(
                          certificate.status
                        )}`}
                      >
                        {formatStatus(certificate.status)}
                      </span>

                      {certificate.template?.name ? (
                        <p className="mt-2 text-xs text-slate-500">
                          {certificate.template.name}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-600">
                        {formatDate(certificate.issue_date)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Generated {formatDate(certificate.generated_at)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void handleGenerateCertificatePdf(certificate);
                          }}
                          disabled={
                            generatingPdfId === certificate.id ||
                            certificate.status === "revoked"
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-200 text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`${
                            certificate.file_url ? "Regenerate" : "Generate"
                          } PDF for ${certificate.recipient_name}`}
                        >
                          {generatingPdfId === certificate.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileBadge2 className="h-4 w-4" />
                          )}
                        </button>
                        {certificate.file_url ? (
                          <a
                            href={certificate.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 hover:text-primary"
                            aria-label={`Open certificate for ${certificate.recipient_name}`}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            void handleSendCertificateEmail(certificate);
                          }}
                          disabled={
                            sendingCertificateId === certificate.id ||
                            generatingPdfId === certificate.id ||
                            certificate.status === "revoked" ||
                            !certificate.file_url
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Send certificate to ${certificate.recipient_name}`}
                          title={
                            certificate.file_url
                              ? `Send certificate to ${certificate.recipient_name}`
                              : "Generate the certificate PDF before sending"
                          }
                        >
                          {sendingCertificateId === certificate.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCertificate(certificate);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 hover:text-primary"
                          aria-label={`View certificate for ${certificate.recipient_name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteCertificate(certificate);
                          }}
                          disabled={deletingCertificateId === certificate.id}
                          className="inline-flex h-8 w-8 border border-red-300 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete certificate for ${certificate.recipient_name}`}
                        >
                          {deletingCertificateId === certificate.id ? (
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
                    <Award className="mx-auto h-8 w-8 text-slate-400" />

                    <h2 className="mt-4 text-lg font-bold text-slate-800">
                      No certificates found
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Generate a certificate or adjust the active filters.
                    </p>

                    {eligibleRegistrations.length > 0 ? (
                      <button
                        type="button"
                        onClick={openGenerationModal}
                        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        <FileBadge2 className="h-4 w-4" />
                        Generate Certificate
                      </button>
                    ) : null}
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

      {generationModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="certificate-generation-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Certificate Generation
                </p>

                <h2
                  id="certificate-generation-title"
                  className="mt-2 text-2xl font-bold text-slate-950"
                >
                  Generate Academy Certificate
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Select an eligible learner, confirm the certificate details
                  and generate the new credential.
                </p>
              </div>

              <button
                type="button"
                onClick={closeGenerationModal}
                disabled={generatingCertificate}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close certificate generation"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-6 p-6">
              {eligibleRegistrations.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                    <div>
                      <h3 className="font-semibold text-amber-900">
                        No eligible learners
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        A learner must have a completed registration and an
                        eligible certificate status before a certificate can be
                        generated.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <section className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-900">
                      Learner and Program
                    </h3>

                    <div className="mt-5">
                      <label
                        htmlFor="eligible-registration"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Eligible learner *
                      </label>

                      <select
                        id="eligible-registration"
                        value={generationForm.registrationId}
                        onChange={(event) => {
                          handleEligibleRegistrationChange(event.target.value);
                        }}
                        disabled={generatingCertificate}
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        <option value="">Select an eligible learner</option>

                        {eligibleRegistrations.map((registration) => (
                          <option key={registration.id} value={registration.id}>
                            {registration.first_name} {registration.last_name} —{" "}
                            {registration.program?.title ?? "Unknown program"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedEligibleRegistration ? (
                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <CertificateDetailRow
                          label="Learner"
                          value={`${selectedEligibleRegistration.first_name} ${selectedEligibleRegistration.last_name}`}
                        />

                        <CertificateDetailRow
                          label="Email"
                          value={selectedEligibleRegistration.email}
                        />

                        <CertificateDetailRow
                          label="Program"
                          value={selectedEligibleRegistration.program?.title}
                        />

                        <CertificateDetailRow
                          label="Program code"
                          value={selectedEligibleRegistration.program?.code}
                        />

                        <CertificateDetailRow
                          label="Completed"
                          value={formatDateTime(
                            selectedEligibleRegistration.completed_at
                          )}
                        />
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-900">
                      Certificate Information
                    </h3>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="generation-template"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Certificate template *
                        </label>

                        <select
                          id="generation-template"
                          value={generationForm.templateId}
                          onChange={(event) => {
                            updateGenerationForm(
                              "templateId",
                              event.target.value
                            );
                          }}
                          disabled={generatingCertificate}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          <option value="">
                            Select a certificate template
                          </option>

                          {templateOptions.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                              {template.is_default ? " — Default" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="generation-certificate-number"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Certificate number *
                        </label>

                        <input
                          id="generation-certificate-number"
                          type="text"
                          value={generationForm.certificateNumber}
                          onChange={(event) => {
                            updateGenerationForm(
                              "certificateNumber",
                              event.target.value
                            );
                          }}
                          disabled={generatingCertificate}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="generation-verification-code"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Verification code *
                        </label>

                        <input
                          id="generation-verification-code"
                          type="text"
                          value={generationForm.verificationCode}
                          onChange={(event) => {
                            updateGenerationForm(
                              "verificationCode",
                              event.target.value
                            );
                          }}
                          disabled={generatingCertificate}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="generation-issue-date"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Issue date *
                        </label>

                        <input
                          id="generation-issue-date"
                          type="date"
                          value={generationForm.issueDate}
                          onChange={(event) => {
                            updateGenerationForm(
                              "issueDate",
                              event.target.value
                            );
                          }}
                          disabled={generatingCertificate}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="generation-generated-by"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Generated by
                        </label>

                        <input
                          id="generation-generated-by"
                          type="text"
                          value={generationForm.generatedBy}
                          onChange={(event) => {
                            updateGenerationForm(
                              "generatedBy",
                              event.target.value
                            );
                          }}
                          placeholder="Administrator name"
                          disabled={generatingCertificate}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="generation-file-url"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Certificate file URL
                        </label>

                        <input
                          id="generation-file-url"
                          type="url"
                          value={generationForm.fileUrl}
                          onChange={(event) => {
                            updateGenerationForm("fileUrl", event.target.value);
                          }}
                          placeholder="https://..."
                          disabled={generatingCertificate}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          This can be added later if the PDF certificate has not
                          yet been generated.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedEligibleRegistration) {
                            toast.error("Select an eligible learner first.");

                            return;
                          }

                          updateGenerationForm(
                            "certificateNumber",
                            generateCertificateNumber(
                              selectedEligibleRegistration.program?.code
                            )
                          );
                        }}
                        disabled={
                          generatingCertificate || !selectedEligibleRegistration
                        }
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Regenerate number
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateGenerationForm(
                            "verificationCode",
                            generateVerificationCode()
                          );
                        }}
                        disabled={generatingCertificate}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Regenerate code
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

                      <div>
                        <h3 className="font-semibold text-blue-900">
                          Public certificate verification
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-blue-700">
                          The verification code will be used on the public
                          certificate verification page to confirm whether this
                          credential is valid or revoked.
                        </p>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>

            <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeGenerationModal}
                disabled={generatingCertificate}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleGenerateCertificate();
                }}
                disabled={
                  generatingCertificate || eligibleRegistrations.length === 0
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingCertificate ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Award className="h-4 w-4" />
                )}

                {generatingCertificate
                  ? "Generating certificate..."
                  : "Generate certificate"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {selectedCertificate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="certificate-details-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Certificate Details
                </p>

                <h2
                  id="certificate-details-title"
                  className="mt-2 text-2xl font-bold text-slate-950"
                >
                  {selectedCertificate.recipient_name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedCertificate.program_title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCertificate(null);
                }}
                disabled={updatingCertificateId === selectedCertificate.id}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close certificate details"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-6 p-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Certificate Information
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Core credential details and public verification
                      information.
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getCertificateStatusClasses(
                      selectedCertificate.status
                    )}`}
                  >
                    {formatStatus(selectedCertificate.status)}
                  </span>
                </div>

                <div className="mt-4">
                  <CertificateDetailRow
                    label="Certificate number"
                    value={selectedCertificate.certificate_number}
                  />

                  <CertificateDetailRow
                    label="Verification code"
                    value={selectedCertificate.verification_code}
                  />

                  <CertificateDetailRow
                    label="Issue date"
                    value={formatDate(selectedCertificate.issue_date)}
                  />

                  <CertificateDetailRow
                    label="Completion date"
                    value={formatDate(selectedCertificate.completion_date)}
                  />

                  <CertificateDetailRow
                    label="Generated at"
                    value={formatDateTime(selectedCertificate.generated_at)}
                  />

                  <CertificateDetailRow
                    label="Generated by"
                    value={selectedCertificate.generated_by}
                  />

                  <CertificateDetailRow
                    label="Template"
                    value={selectedCertificate.template?.name}
                  />

                  <CertificateDetailRow
                    label="Orientation"
                    value={
                      selectedCertificate.template?.orientation
                        ? formatStatus(selectedCertificate.template.orientation)
                        : null
                    }
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">
                  Learner and Program
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Registration and program information connected to this
                  certificate.
                </p>

                <div className="mt-4">
                  <CertificateDetailRow
                    label="Recipient"
                    value={selectedCertificate.recipient_name}
                  />

                  <CertificateDetailRow
                    label="Email"
                    value={selectedCertificate.registration?.email}
                  />

                  <CertificateDetailRow
                    label="Program"
                    value={selectedCertificate.program_title}
                  />

                  <CertificateDetailRow
                    label="Program code"
                    value={selectedCertificate.program?.code}
                  />

                  <CertificateDetailRow
                    label="Registration status"
                    value={
                      selectedCertificate.registration?.registration_status
                        ? formatStatus(
                            selectedCertificate.registration.registration_status
                          )
                        : null
                    }
                  />

                  <CertificateDetailRow
                    label="Certificate status on registration"
                    value={
                      selectedCertificate.registration?.certificate_status
                        ? formatStatus(
                            selectedCertificate.registration.certificate_status
                          )
                        : null
                    }
                  />

                  <CertificateDetailRow
                    label="Registration ID"
                    value={selectedCertificate.registration_id}
                  />

                  <CertificateDetailRow
                    label="Program ID"
                    value={selectedCertificate.program_id}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5 lg:col-span-2">
                <h3 className="font-bold text-slate-900">Edit Certificate</h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Update certificate metadata and attach the generated
                  certificate file.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="edit-certificate-number"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Certificate number *
                    </label>

                    <input
                      id="edit-certificate-number"
                      type="text"
                      value={editForm.certificateNumber}
                      onChange={(event) => {
                        updateEditForm("certificateNumber", event.target.value);
                      }}
                      disabled={
                        updatingCertificateId === selectedCertificate.id
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-verification-code"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Verification code *
                    </label>

                    <input
                      id="edit-verification-code"
                      type="text"
                      value={editForm.verificationCode}
                      onChange={(event) => {
                        updateEditForm("verificationCode", event.target.value);
                      }}
                      disabled={
                        updatingCertificateId === selectedCertificate.id
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-recipient-name"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Recipient name *
                    </label>

                    <input
                      id="edit-recipient-name"
                      type="text"
                      value={editForm.recipientName}
                      onChange={(event) => {
                        updateEditForm("recipientName", event.target.value);
                      }}
                      disabled={
                        updatingCertificateId === selectedCertificate.id
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-program-title"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Program title *
                    </label>

                    <input
                      id="edit-program-title"
                      type="text"
                      value={editForm.programTitle}
                      onChange={(event) => {
                        updateEditForm("programTitle", event.target.value);
                      }}
                      disabled={
                        updatingCertificateId === selectedCertificate.id
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-issue-date"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Issue date *
                    </label>

                    <input
                      id="edit-issue-date"
                      type="date"
                      value={editForm.issueDate}
                      onChange={(event) => {
                        updateEditForm("issueDate", event.target.value);
                      }}
                      disabled={
                        updatingCertificateId === selectedCertificate.id
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-completion-date"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Completion date
                    </label>

                    <input
                      id="edit-completion-date"
                      type="date"
                      value={editForm.completionDate}
                      onChange={(event) => {
                        updateEditForm("completionDate", event.target.value);
                      }}
                      disabled={
                        updatingCertificateId === selectedCertificate.id
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-template"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Certificate template
                    </label>

                    <select
                      id="edit-template"
                      value={editForm.templateId}
                      onChange={(event) => {
                        updateEditForm("templateId", event.target.value);
                      }}
                      disabled={
                        updatingCertificateId === selectedCertificate.id
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">No template selected</option>

                      {templateOptions.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-file-url"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Certificate file URL
                    </label>

                    <input
                      id="edit-file-url"
                      type="url"
                      value={editForm.fileUrl}
                      onChange={(event) => {
                        updateEditForm("fileUrl", event.target.value);
                      }}
                      placeholder="https://..."
                      disabled={
                        updatingCertificateId === selectedCertificate.id
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void handleSaveCertificateEdits();
                      }}
                      disabled={
                        updatingCertificateId === selectedCertificate.id ||
                        generatingPdfId === selectedCertificate.id
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingCertificateId === selectedCertificate.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Save changes
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleGenerateCertificatePdf(selectedCertificate);
                      }}
                      disabled={
                        generatingPdfId === selectedCertificate.id ||
                        updatingCertificateId === selectedCertificate.id ||
                        selectedCertificate.status === "revoked"
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generatingPdfId === selectedCertificate.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileBadge2 className="h-4 w-4" />
                      )}

                      {generatingPdfId === selectedCertificate.id
                        ? "Generating PDF..."
                        : selectedCertificate.file_url
                          ? "Regenerate PDF"
                          : "Generate PDF"}
                    </button>

                    {selectedCertificate.file_url ? (
                      <a
                        href={selectedCertificate.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" />
                        Open certificate PDF
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>

              {selectedCertificate.status === "generated" ? (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-5 lg:col-span-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

                    <div className="flex-1">
                      <h3 className="font-bold text-red-900">
                        Revoke Certificate
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-red-700">
                        Revocation marks this certificate as invalid without
                        deleting its audit record.
                      </p>

                      <label
                        htmlFor="revocation-reason"
                        className="mt-5 block text-sm font-semibold text-red-900"
                      >
                        Revocation reason *
                      </label>

                      <textarea
                        id="revocation-reason"
                        value={revocationReason}
                        onChange={(event) => {
                          setRevocationReason(event.target.value);
                        }}
                        rows={4}
                        placeholder="Explain why this certificate is being revoked."
                        disabled={
                          updatingCertificateId === selectedCertificate.id
                        }
                        className="mt-2 w-full resize-y rounded-xl border border-red-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:bg-red-100"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          void handleRevokeCertificate();
                        }}
                        disabled={
                          updatingCertificateId === selectedCertificate.id
                        }
                        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingCertificateId === selectedCertificate.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Revoke certificate
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 lg:col-span-2">
                  <div className="flex items-start gap-3">
                    <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900">
                        Revoked Certificate
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        This credential is currently invalid and will appear as
                        revoked during public verification.
                      </p>

                      <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
                        <CertificateDetailRow
                          label="Revoked at"
                          value={formatDateTime(selectedCertificate.revoked_at)}
                        />

                        <CertificateDetailRow
                          label="Reason"
                          value={selectedCertificate.revocation_reason}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          void handleRestoreCertificate();
                        }}
                        disabled={
                          updatingCertificateId === selectedCertificate.id
                        }
                        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingCertificateId === selectedCertificate.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Restore certificate
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  void handleDeleteCertificate(selectedCertificate);
                }}
                disabled={
                  deletingCertificateId === selectedCertificate.id ||
                  updatingCertificateId === selectedCertificate.id
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingCertificateId === selectedCertificate.id ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete certificate
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={`/verify-certificate?code=${encodeURIComponent(
                    selectedCertificate.verification_code
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Verify Certificate{" "}
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCertificate(null);
                  }}
                  disabled={
                    updatingCertificateId === selectedCertificate.id ||
                    deletingCertificateId === selectedCertificate.id
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
