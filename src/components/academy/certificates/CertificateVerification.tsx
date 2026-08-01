import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * Public certificate details returned by the verification endpoint.
 */
interface VerifiedCertificate {
  id: string;

  certificateNumber: string;

  verificationCode: string;

  recipientName: string;

  programTitle: string;

  programCode: string | null;

  programSlug?: string | null;

  issueDate: string;

  completionDate: string | null;

  generatedAt: string;

  fileUrl: string | null;

  templateName: string | null;

  orientation: "landscape" | "portrait" | null;

  revokedAt: string | null;

  revocationReason: string | null;
}

/**
 * Response returned by the certificate verification endpoint.
 */
interface CertificateVerificationResponse {
  success: boolean;

  valid?: boolean;

  status:
    | "valid"
    | "revoked"
    | "not_found"
    | "missing_code"
    | "unavailable"
    | "error";

  message: string;

  certificate?: VerifiedCertificate;
}

/**
 * Format a certificate date for public display.
 */
function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Display one certificate information row.
 */
function CertificateDetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-box-border py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <span className="text-sm text-heading-3">{label}</span>

      <span className="max-w-xl break-words text-sm font-semibold text-heading-1 sm:text-right">
        {value || "Not available"}
      </span>
    </div>
  );
}

/**
 * Display the public Academy certificate verification interface.
 */
export default function CertificateVerification() {
  // Store the verification code entered by the visitor.
  const [verificationCode, setVerificationCode] = useState("");

  // Store the certificate verification result.
  const [verificationResult, setVerificationResult] =
    useState<CertificateVerificationResponse | null>(null);

  // Track certificate verification requests.
  const [loading, setLoading] = useState(false);

  /**
   * Verify a certificate through the public API endpoint.
   */
  const verifyCertificate = useCallback(async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      setVerificationResult({
        success: false,
        status: "missing_code",
        message: "Enter a certificate verification code.",
      });

      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      const response = await fetch(
        `/api/academy/certificates/verify?code=${encodeURIComponent(
          normalizedCode
        )}`,
        {
          method: "GET",

          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = (await response.json()) as CertificateVerificationResponse;

      setVerificationResult(result);
    } catch (error) {
      console.error("Certificate verification request failed:", error);

      setVerificationResult({
        success: false,
        status: "error",
        message: "The certificate could not be verified. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Automatically verify a code supplied in the page URL.
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    const code = searchParams.get("code")?.trim() ?? "";

    if (!code) {
      return;
    }

    setVerificationCode(code.toUpperCase());

    void verifyCertificate(code);
  }, [verifyCertificate]);

  /**
   * Submit the public verification form.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = verificationCode.trim().toUpperCase();

    const pageUrl = new URL(window.location.href);

    if (normalizedCode) {
      pageUrl.searchParams.set("code", normalizedCode);
    } else {
      pageUrl.searchParams.delete("code");
    }

    window.history.replaceState({}, "", pageUrl);

    void verifyCertificate(normalizedCode);
  }

  /**
   * Reset the verification page.
   */
  function resetVerification() {
    setVerificationCode("");
    setVerificationResult(null);

    const pageUrl = new URL(window.location.href);

    pageUrl.searchParams.delete("code");

    window.history.replaceState({}, "", pageUrl);
  }

  const certificate = verificationResult?.certificate;

  const isValid =
    verificationResult?.status === "valid" && verificationResult.valid === true;

  const isRevoked = verificationResult?.status === "revoked";

  return (
    <div className="mx-auto max-w-5xl">
      <section className="relative overflow-hidden rounded-[2rem] border border-box-border bg-box-bg px-6 py-12 shadow-lg sm:px-10 lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            CloudTweak Academy
          </p>

          <h1 className="mt-3 text-3xl font-bold text-heading-1 sm:text-4xl lg:text-5xl">
            Verify a Certificate
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-heading-3">
            Enter the verification code printed on a CloudTweak Academy
            certificate to confirm its authenticity and current status.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-heading-3" />

              <input
                type="text"
                value={verificationCode}
                onChange={(event) => {
                  setVerificationCode(event.target.value.toUpperCase());
                }}
                placeholder="Example: CTV-A1B2C3D4E5F6"
                autoComplete="off"
                spellCheck={false}
                className="min-h-14 w-full rounded-2xl border border-box-border bg-body py-3 pl-12 pr-4 font-mono text-sm uppercase text-heading-1 outline-none transition placeholder:font-sans placeholder:normal-case placeholder:text-heading-3 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <FileSearch className="h-5 w-5" />
              )}

              {loading ? "Verifying..." : "Verify Certificate"}
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-heading-3">
            Use the certificate verification code beginning with{" "}
            <strong>CTV-</strong>. Payment references cannot be used here.
          </p>
        </div>
      </section>

      {loading ? (
        <section className="mt-8 rounded-[2rem] border border-box-border bg-box-bg p-10 text-center shadow-sm">
          <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-primary" />

          <h2 className="mt-5 text-xl font-bold text-heading-1">
            Verifying certificate
          </h2>

          <p className="mt-2 text-sm text-heading-3">
            Please wait while we check the credential.
          </p>
        </section>
      ) : null}

      {!loading && isValid && certificate ? (
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-emerald-200 bg-box-bg shadow-lg">
          <header className="bg-emerald-50 px-6 py-8 text-center dark:bg-emerald-950/30 sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-emerald-800 dark:text-emerald-300">
              Certificate Verified
            </h2>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-emerald-700 dark:text-emerald-400">
              This credential is valid and was issued by CloudTweak Academy.
            </p>
          </header>

          <div className="p-6 sm:p-10">
            <div className="text-center">
              <Award className="mx-auto h-10 w-10 text-primary" />

              <p className="mt-5 text-sm text-heading-3">Awarded to</p>

              <h3 className="mt-2 text-3xl font-bold text-heading-1">
                {certificate.recipientName}
              </h3>

              <p className="mt-4 text-sm text-heading-3">
                for successfully completing
              </p>

              <p className="mt-2 text-xl font-bold text-primary">
                {certificate.programTitle}
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-box-border bg-body px-5">
              <CertificateDetailRow
                label="Certificate number"
                value={certificate.certificateNumber}
              />

              <CertificateDetailRow
                label="Verification code"
                value={
                  <code className="rounded-lg bg-box-bg px-2 py-1 font-mono text-xs">
                    {certificate.verificationCode}
                  </code>
                }
              />

              <CertificateDetailRow
                label="Program code"
                value={certificate.programCode}
              />

              <CertificateDetailRow
                label="Completion date"
                value={formatDate(certificate.completionDate)}
              />

              <CertificateDetailRow
                label="Issue date"
                value={formatDate(certificate.issueDate)}
              />

              <CertificateDetailRow
                label="Certificate template"
                value={certificate.templateName}
              />

              <CertificateDetailRow
                label="Status"
                value={
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Valid
                  </span>
                }
              />
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {certificate.fileUrl ? (
                <a
                  href={certificate.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  View Certificate PDF
                </a>
              ) : null}

              {certificate.programSlug ? (
                <a
                  href={`/academy/${certificate.programSlug}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-box-border bg-box-bg px-5 text-sm font-semibold text-heading-1 transition hover:border-primary/40"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Program
                </a>
              ) : null}

              <button
                type="button"
                onClick={resetVerification}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-box-border bg-box-bg px-5 text-sm font-semibold text-heading-1 transition hover:border-primary/40"
              >
                <RefreshCw className="h-4 w-4" />
                Verify Another
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && isRevoked && certificate ? (
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-red-200 bg-box-bg shadow-lg">
          <header className="bg-red-50 px-6 py-8 text-center dark:bg-red-950/30 sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
              <XCircle className="h-9 w-9" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-red-800 dark:text-red-300">
              Certificate Revoked
            </h2>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-red-700 dark:text-red-400">
              This certificate exists but is no longer considered valid.
            </p>
          </header>

          <div className="p-6 sm:p-10">
            <div className="mx-auto max-w-3xl rounded-2xl border border-box-border bg-body px-5">
              <CertificateDetailRow
                label="Recipient"
                value={certificate.recipientName}
              />

              <CertificateDetailRow
                label="Program"
                value={certificate.programTitle}
              />

              <CertificateDetailRow
                label="Certificate number"
                value={certificate.certificateNumber}
              />

              <CertificateDetailRow
                label="Verification code"
                value={certificate.verificationCode}
              />

              <CertificateDetailRow
                label="Originally issued"
                value={formatDate(certificate.issueDate)}
              />

              <CertificateDetailRow
                label="Revoked"
                value={formatDate(certificate.revokedAt)}
              />

              <CertificateDetailRow
                label="Reason"
                value={
                  certificate.revocationReason ??
                  "No public reason was provided."
                }
              />
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={resetVerification}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-box-border bg-box-bg px-5 text-sm font-semibold text-heading-1 transition hover:border-primary/40"
              >
                <RefreshCw className="h-4 w-4" />
                Verify Another Certificate
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!loading &&
      verificationResult &&
      !verificationResult.success &&
      verificationResult.status !== "missing_code" ? (
        <section className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center shadow-sm dark:bg-amber-950/30 sm:p-10">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-700 dark:text-amber-300" />

          <h2 className="mt-5 text-2xl font-bold text-amber-900 dark:text-amber-300">
            {verificationResult.status === "not_found"
              ? "Certificate Not Found"
              : "Verification Unavailable"}
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-amber-800 dark:text-amber-400">
            {verificationResult.message}
          </p>

          <p className="mx-auto mt-3 max-w-xl text-xs leading-5 text-amber-700 dark:text-amber-500">
            Confirm that you entered the certificate verification code, not a
            payment reference or registration ID.
          </p>

          <button
            type="button"
            onClick={resetVerification}
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 text-sm font-semibold text-white transition hover:bg-amber-800"
          >
            <RefreshCw className="h-4 w-4" />
            Try Another Code
          </button>
        </section>
      ) : null}

      {!loading && verificationResult?.status === "missing_code" ? (
        <section className="mt-8 rounded-[2rem] border border-box-border bg-box-bg p-8 text-center shadow-sm">
          <FileSearch className="mx-auto h-9 w-9 text-heading-3" />

          <p className="mt-4 font-semibold text-heading-1">
            Enter a certificate verification code to continue.
          </p>
        </section>
      ) : null}
    </div>
  );
}
