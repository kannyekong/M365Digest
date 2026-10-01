import type { APIRoute } from "astro";
import {
  createProcurementContact,
  getProcurementContacts,
} from "../../../../../lib/procurement";

/**
 * Handles procurement contact listing and creation.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("page_size") ?? "20");

    const isPrimaryParam = url.searchParams.get("is_primary");

    const result = await getProcurementContacts({
      search: url.searchParams.get("search") || undefined,
      client_id: url.searchParams.get("client_id") || undefined,
      contact_type: url.searchParams.get("contact_type") || undefined,
      department: url.searchParams.get("department") || undefined,
      is_primary:
        isPrimaryParam === null ? undefined : isPrimaryParam === "true",
      page: Number.isFinite(page) && page > 0 ? page : 1,
      page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20,
    });

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
    console.error("Failed to load procurement contacts:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load procurement contacts.",
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
 * Creates a new procurement contact.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.client_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Company is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!body.first_name?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "First name is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const contact = await createProcurementContact(body);

    return new Response(
      JSON.stringify({
        success: true,
        data: contact,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to create procurement contact:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create procurement contact.",
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
