import { useCallback, useEffect, useState } from "react";

/**
 * Company-wide financial summary returned by the admin API.
 */
export interface CompanyFinancialSummary {
  currentMonthRevenue: number;

  previousMonthRevenue: number;

  totalRevenue: number;

  currentMonthExpenses: number;

  currentMonthRefunds: number;

  currentMonthNetIncome: number;

  pendingIncome: number;

  paidIncomeTransactions: number;

  growthPercentage: number;

  currency: string;
}

/**
 * Response returned by the financial summary API.
 */
interface CompanyFinancialSummaryResponse {
  success: boolean;

  message?: string;

  summary?: CompanyFinancialSummary;
}

/**
 * Values returned by the reusable financial summary hook.
 */
interface UseCompanyFinancialSummaryResult {
  summary: CompanyFinancialSummary | null;

  loading: boolean;

  refreshing: boolean;

  errorMessage: string;

  refreshSummary: () => Promise<void>;
}

/**
 * Load and manage the company-wide financial summary.
 */
export function useCompanyFinancialSummary(): UseCompanyFinancialSummaryResult {
  const [summary, setSummary] = useState<CompanyFinancialSummary | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Retrieve the latest company financial summary from the server.
   */
  const loadSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/finance/summary", {
        method: "GET",

        headers: {
          Accept: "application/json",
        },

        cache: "no-store",
      });

      const result = (await response.json()) as CompanyFinancialSummaryResponse;

      if (!response.ok || !result.success || !result.summary) {
        throw new Error(
          result.message || "The financial summary could not be loaded."
        );
      }

      setSummary(result.summary);
    } catch (error) {
      console.error("Failed to load company financial summary:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The financial summary could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Refresh the summary after a payment or manual request.
   */
  const refreshSummary = useCallback(async () => {
    await loadSummary(true);
  }, [loadSummary]);

  // Load the financial summary when the component first renders.
  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return {
    summary,

    loading,

    refreshing,

    errorMessage,

    refreshSummary,
  };
}
