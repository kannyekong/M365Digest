import type { APIRoute } from "astro";

import {
  getBufferChannels,
  getBufferOrganizations,
} from "../../../../lib/buffer/buffer-server";

import { normalizeBufferPlatform } from "../../../../lib/social/social-platforms";

/* Returns the Buffer organization used by CloudTweak Social Publishing. */
async function getCloudTweakOrganization() {
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

/* Returns CloudTweak's supported connected social channels. */
export const GET: APIRoute = async () => {
  try {
    const organization = await getCloudTweakOrganization();

    const bufferChannels = await getBufferChannels(organization.id);

    const channels = bufferChannels.flatMap((channel) => {
      const platform = normalizeBufferPlatform(channel.service);

      if (!platform) {
        return [];
      }

      return [
        {
          id: channel.id,
          name: channel.name,
          displayName: channel.displayName,
          platform,
          avatar: channel.avatar,
          isQueuePaused: channel.isQueuePaused,
        },
      ];
    });

    return new Response(
      JSON.stringify({
        success: true,

        organization: {
          id: organization.id,
          name: organization.name,
        },

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
    console.error("Unable to retrieve social channels:", error);

    return new Response(
      JSON.stringify({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve social channels.",
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
