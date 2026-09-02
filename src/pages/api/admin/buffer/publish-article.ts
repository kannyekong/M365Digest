import type { APIRoute } from "astro";

import {
  createBufferPost,
  getBufferChannels,
  getBufferOrganizations,
} from "../../../../lib/buffer/buffer-server";

interface PublishArticleRequest {
  title: string;
  slug: string;
  excerpt?: string;
  caption?: string;
  coverImage?: string;
  channelIds: string[];
}

/* Validates a social publishing request received from the blog editor. */
function isValidRequest(value: unknown): value is PublishArticleRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    typeof request.title === "string" &&
    typeof request.slug === "string" &&
    Array.isArray(request.channelIds) &&
    request.channelIds.every((channelId) => typeof channelId === "string") &&
    (request.excerpt === undefined || typeof request.excerpt === "string") &&
    (request.caption === undefined || typeof request.caption === "string") &&
    (request.coverImage === undefined || typeof request.coverImage === "string")
  );
}

/* Builds the public CloudTweak article URL from its slug. */
function getArticleUrl(slug: string) {
  return `https://cloudtweak.net/blog/${slug}`;
}

/* Builds the default social caption when a custom caption was not supplied. */
function buildDefaultCaption(request: PublishArticleRequest) {
  const articleUrl = getArticleUrl(request.slug);

  return [
    request.title.trim(),
    request.excerpt?.trim() || "",
    `Read more: ${articleUrl}`,
    "#CloudTweak #Technology",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

/* Validates that a supplied cover image uses a public HTTPS URL. */
function isValidCoverImageUrl(coverImage?: string) {
  if (!coverImage?.trim()) {
    return true;
  }

  try {
    const url = new URL(coverImage.trim());

    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/* Publishes an article to each selected Buffer channel independently. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();

    if (!isValidRequest(body)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid social publishing request.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!body.title.trim() || !body.slug.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Article title and slug are required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!isValidCoverImageUrl(body.coverImage)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "The article cover image must use a valid HTTPS URL.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (body.channelIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          results: [],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const organizations = await getBufferOrganizations();

    const organization =
      organizations.find(
        (item) => item.name === "Cloudtweak Technologies Limited"
      ) ?? organizations[0];

    if (!organization) {
      throw new Error("No Buffer organization was found.");
    }

    const channels = await getBufferChannels(organization.id);

    const caption = body.caption?.trim() || buildDefaultCaption(body);

    const coverImage = body.coverImage?.trim() || undefined;

    /*
     * Each selected channel is processed independently so a failure
     * on one Buffer channel does not prevent the others from publishing.
     */
    const results = await Promise.all(
      body.channelIds.map(async (channelId) => {
        const channel = channels.find((item) => item.id === channelId);

        if (!channel) {
          return {
            channelId,
            success: false,
            error: "The selected Buffer channel is unavailable.",
          };
        }

        if (channel.isQueuePaused) {
          return {
            channelId: channel.id,
            platform: channel.service,
            channelName: channel.displayName || channel.name,
            success: false,
            error: "The Buffer queue for this channel is paused.",
          };
        }

        try {
          const post = await createBufferPost({
            channelId: channel.id,
            text: caption,
            imageUrl: coverImage,
          });

          return {
            channelId: channel.id,
            platform: channel.service,
            channelName: channel.displayName || channel.name,
            success: true,
            post,
          };
        } catch (error) {
          return {
            channelId: channel.id,
            platform: channel.service,
            channelName: channel.displayName || channel.name,
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to create Buffer post.",
          };
        }
      })
    );

    const successfulResults = results.filter((result) => result.success);

    const failedResults = results.filter((result) => !result.success);

    return new Response(
      JSON.stringify({
        success: failedResults.length === 0,
        partialSuccess:
          successfulResults.length > 0 && failedResults.length > 0,
        results,
        summary: {
          requested: body.channelIds.length,
          successful: successfulResults.length,
          failed: failedResults.length,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to distribute blog article through Buffer:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to publish article to Buffer.",
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
