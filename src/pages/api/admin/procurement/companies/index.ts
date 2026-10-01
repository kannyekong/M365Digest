import type { APIRoute } from "astro";
import { createProcurementCompany } from "../../../../../lib/procurement";
import { getProcurementCompanies } from "../../../../../lib/procurement";

/**
 * Retrieves procurement companies from the existing clients master.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const search = url.searchParams.get("search") ?? undefined;
    const industry = url.searchParams.get("industry") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;

    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);

    const pageSize = Math.min(
      Math.max(Number(url.searchParams.get("page_size") ?? 20), 1),
      100
    );

    const result = await getProcurementCompanies({
      search,
      industry,
      status,
      page,
      page_size: pageSize,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        count: result.total,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load procurement companies:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load procurement companies.",
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
 * Creates a new procurement company.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.display_name?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Company name is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const company = await createProcurementCompany(body);

    return new Response(
      JSON.stringify({
        success: true,
        data: company,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to create procurement company:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to create company.",
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
