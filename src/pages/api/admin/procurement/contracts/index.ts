import type { APIRoute } from "astro";
import {
  createProcurementContract,
  getProcurementContracts,
} from "../../../../../lib/procurement";
import type {
  CreateProcurementContractInput,
  ProcurementContractFilters,
} from "../../../../../types/procurement";

/**
 * Handles procurement contract list requests.
 *
 * GET returns filtered and paginated contracts.
 * POST creates a new procurement contract.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const filters: ProcurementContractFilters = {
      search: url.searchParams.get("search") ?? undefined,
      status:
        (url.searchParams.get(
          "status"
        ) as ProcurementContractFilters["status"]) ?? undefined,
      priority:
        (url.searchParams.get(
          "priority"
        ) as ProcurementContractFilters["priority"]) ?? undefined,
      client_id: url.searchParams.get("client_id") ?? undefined,
      opportunity_id: url.searchParams.get("opportunity_id") ?? undefined,
      proposal_id: url.searchParams.get("proposal_id") ?? undefined,
      negotiation_id: url.searchParams.get("negotiation_id") ?? undefined,
      assigned_to: url.searchParams.get("assigned_to") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
      page_size: Number(url.searchParams.get("page_size") ?? 15),
    };

    const result = await getProcurementContracts(filters);

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        count: result.count,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load procurement contracts:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load procurement contracts.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

/**
 * Creates a procurement contract from a supplied payload.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CreateProcurementContractInput & {
      staff_id?: string | null;
    };

    if (!body.client_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Client is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!body.title?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Contract title is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { staff_id, ...contractInput } = body;

    const contract = await createProcurementContract(
      contractInput,
      staff_id ?? null
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: contract,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to create procurement contract:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement contract.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
