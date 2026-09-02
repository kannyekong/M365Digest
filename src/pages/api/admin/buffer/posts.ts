import type { APIRoute } from "astro";

import {
  getBufferOrganizations,
  getBufferScheduledPosts,
} from "../../../../lib/buffer/buffer-server";

/* Parses and validates the optional Buffer pagination limit. */
function getPageSize(url: URL) {
  const requestedSize = Number(url.searchParams.get("limit") ?? "25");

  if (!Number.isInteger(requestedSize) || requestedSize < 1) {
    return 25;
  }

  return Math.min(requestedSize, 50);
}

/* Returns the CloudTweak Buffer organization used for social publishing. */
async function getCloudTweakBufferOrganization() {
  const organizations = await getBufferOrganizations();

  const organization =
    organizations.find(
      (item) => item.name === "Cloudtweak Technologies Limited"
    ) ?? organizations[0];

  if (!organization) {
    throw new Error("No Buffer organization was found.");
  }

  return organization;
}

/* Returns scheduled posts currently waiting in the CloudTweak Buffer queue. */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);

    const limit = getPageSize(url);

    const after = url.searchParams.get("after") || undefined;

    const organization = await getCloudTweakBufferOrganization();

    const result = await getBufferScheduledPosts(organization.id, limit, after);

    return new Response(
      JSON.stringify({
        success: true,
        organization,
        posts: result.posts,
        pageInfo: result.pageInfo,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to retrieve Buffer scheduled posts:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve Buffer scheduled posts.",
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
