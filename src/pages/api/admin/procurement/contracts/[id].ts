import type { APIRoute } from "astro";
import {
  archiveProcurementContract,
  updateProcurementContract,
  updateProcurementContractStatus,
} from "../../../../../lib/procurement";
import type {
  ProcurementContractStatus,
  UpdateProcurementContractInput,
} from "../../../../../types/procurement";

/**
 * Updates, archives, or changes the status of a procurement contract.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  const contractId = params.id;

  if (!contractId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Contract ID is required.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = (await request.json()) as {
      action?: "archive" | "status";
      status?: ProcurementContractStatus;
      staff_id?: string | null;
    } & Partial<UpdateProcurementContractInput>;

    if (body.action === "archive") {
      const contract = await archiveProcurementContract(
        contractId,
        body.staff_id ?? null
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: contract,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (body.action === "status") {
      if (!body.status) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Contract status is required.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      const contract = await updateProcurementContractStatus(
        contractId,
        body.status,
        body.staff_id ?? null
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: contract,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const {
      id: _ignoredId,
      action: _ignoredAction,
      staff_id,
      ...changes
    } = body;

    const contract = await updateProcurementContract(
      {
        id: contractId,
        ...changes,
      },
      staff_id ?? null
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: contract,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to update procurement contract:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update procurement contract.",
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
