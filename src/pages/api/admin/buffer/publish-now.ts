import type { APIRoute } from "astro";

import {
  getBufferOrganizations,
  getBufferScheduledPosts,
  publishBufferPostNow,
} from "../../../../lib/buffer/buffer-server";

interface PublishNowRequest {
  postId: string;
}

/* Validates a request to immediately publish an existing Buffer post. */
function isValidRequest(value: unknown): value is PublishNowRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return typeof request.postId === "string" && request.postId.trim().length > 0;
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

/* Verifies that a post belongs to the CloudTweak scheduled Buffer queue. */
async function verifyScheduledBufferPost(postId: string) {
  const organization = await getCloudTweakBufferOrganization();

  let after: string | undefined;

  /*
   * Walks through the scheduled queue so the browser cannot submit an
   * arbitrary Buffer post ID that does not belong to this organization.
   */
  do {
    const result = await getBufferScheduledPosts(organization.id, 50, after);

    const post = result.posts.find((item) => item.id === postId);

    if (post) {
      return post;
    }

    if (!result.pageInfo.hasNextPage || !result.pageInfo.endCursor) {
      break;
    }

    after = result.pageInfo.endCursor;
  } while (after);

  return null;
}

/* Immediately publishes a verified scheduled Buffer post. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();

    if (!isValidRequest(body)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "A valid Buffer post ID is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const postId = body.postId.trim();

    const scheduledPost = await verifyScheduledBufferPost(postId);

    if (!scheduledPost) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "The Buffer post is not available in the CloudTweak scheduled queue.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const post = await publishBufferPostNow(
      scheduledPost.id,
      scheduledPost.text
    );

    return new Response(
      JSON.stringify({
        success: true,
        post,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to publish Buffer post immediately:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to publish the Buffer post immediately.",
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
