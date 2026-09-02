import type { APIRoute } from "astro";

import {
  getBufferChannels,
  getBufferOrganizations,
} from "../../../../lib/buffer/buffer-server";

/* Returns the Buffer organizations and connected channels for integration testing. */
export const GET: APIRoute = async () => {
  try {
    const organizations = await getBufferOrganizations();

    if (organizations.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No Buffer organizations were found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const organization = organizations[0];

    const channels = await getBufferChannels(organization.id);

    return new Response(
      JSON.stringify({
        organization,
        channels,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to retrieve Buffer channels:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve Buffer channels.",
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
