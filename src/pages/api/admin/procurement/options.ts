import type { APIRoute } from "astro";
import { getProcurementFormOptions } from "../../../../lib/procurement";

// Returns procurement form options used by procurement workspaces.
export const GET: APIRoute = async () => {
  try {
    const options = await getProcurementFormOptions();

    return new Response(
      JSON.stringify({
        success: true,
        data: options,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load procurement form options:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load procurement form options.",
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
