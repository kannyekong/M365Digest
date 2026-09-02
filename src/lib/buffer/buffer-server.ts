/* Defines the Buffer GraphQL API endpoint used by server-side requests. */
const BUFFER_API_URL = "https://api.buffer.com";

export interface BufferScheduledPost {
  id: string;
  text: string;
  status: string;
  dueAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  shareMode: string;
  sharedNow: boolean;
  channelId: string;
  externalLink: string | null;
  allowedActions: string[];
  assets: Array<{
    id: string;
    mimeType: string | null;
    source: string | null;
    thumbnail: string | null;
  }>;
}

export interface EditBufferScheduledPostOptions {
  postId: string;
  text: string;
  imageUrl: string | null;
}

interface BufferPostsPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface CreateBufferPostOptions {
  channelId: string;
  text: string;
  imageUrl?: string;
}

export interface BufferPost {
  id: string;
  text: string;
  dueAt: string | null;
  status: string;
  assets?: BufferPostAsset[];
}

/* Describes an image or other media asset returned with a Buffer post. */
export interface BufferPostAsset {
  id: string;
  mimeType: string | null;
}

/* Represents one normalized performance metric returned by Buffer. */
export interface BufferPostMetric {
  type: string;
  name: string;
  value: number;
  unit: "count" | "percentage";
}

/* Represents a Buffer post together with its available performance metrics. */
export interface BufferPostMetricsResult {
  id: string;
  text: string;
  channelId: string;
  metrics: BufferPostMetric[] | null;
  metricsUpdatedAt: string | null;
}

/* Stores the normalized cross-platform metrics used by CloudTweak analytics. */
export interface BufferNormalizedMetrics {
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  reposts: number | null;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  clicks: number | null;
  engagementRate: number | null;
}

interface BufferPostSuccess {
  post: BufferPost;
}

interface BufferPostError {
  message: string;
}

/* Converts Buffer's metric array into CloudTweak's cross-platform metric shape. */
export function normalizeBufferPostMetrics(
  metrics: BufferPostMetric[] | null
): BufferNormalizedMetrics {
  const normalized: BufferNormalizedMetrics = {
    reactions: null,
    comments: null,
    shares: null,
    reposts: null,
    reach: null,
    impressions: null,
    views: null,
    clicks: null,
    engagementRate: null,
  };

  if (!metrics) {
    return normalized;
  }

  /* Copies supported normalized Buffer metrics into the CloudTweak structure. */
  for (const metric of metrics) {
    switch (metric.type) {
      case "reactions":
        normalized.reactions = metric.value;
        break;

      case "comments":
        normalized.comments = metric.value;
        break;

      case "shares":
        normalized.shares = metric.value;
        break;

      case "reposts":
        normalized.reposts = metric.value;
        break;

      case "reach":
        normalized.reach = metric.value;
        break;

      case "impressions":
        normalized.impressions = metric.value;
        break;

      case "views":
        normalized.views = metric.value;
        break;

      case "clicks":
        normalized.clicks = metric.value;
        break;

      case "engagementRate":
        normalized.engagementRate = metric.value;
        break;
    }
  }

  return normalized;
}

/* Returns the private Buffer API key from the server environment. */
function getBufferApiKey() {
  const apiKey = import.meta.env.BUFFER_API_KEY;

  if (!apiKey) {
    throw new Error("BUFFER_API_KEY is not configured.");
  }

  return apiKey;
}

/* Sends a GraphQL request to the Buffer API. */
async function bufferRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getBufferApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Buffer API request failed (${response.status}): ${responseText}`
    );
  }

  const result = (await response.json()) as {
    data?: T;
    errors?: Array<{
      message: string;
    }>;
  };

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(", "));
  }

  if (!result.data) {
    throw new Error("Buffer API returned no data.");
  }

  return result.data;
}

/*
 * Creates a social post and adds it to the target Buffer channel's queue.
 * A publicly accessible image is attached when an image URL is supplied.
 */
export async function createBufferPost({
  channelId,
  text,
  imageUrl,
}: CreateBufferPostOptions) {
  /*
   * Buffer's image asset syntax is part of the GraphQL input rather than
   * a separate media-upload request. We therefore use separate mutations
   * for image and text-only posts to keep the GraphQL input explicit.
   */
  if (imageUrl?.trim()) {
    const query = `
      mutation CreateImagePost(
        $channelId: ChannelId!
        $text: String!
        $imageUrl: String!
      ) {
        createPost(
          input: {
            channelId: $channelId
            text: $text
            schedulingType: automatic
            mode: addToQueue
            assets: [
              {
                image: {
                  url: $imageUrl
                }
              }
            ]
          }
        ) {
          ... on PostActionSuccess {
            post {
              id
              text
              dueAt
              status
              assets {
                id
                mimeType
              }
            }
          }

          ... on MutationError {
            message
          }
        }
      }
    `;

    const data = await bufferRequest<{
      createPost: BufferPostSuccess | BufferPostError;
    }>(query, {
      channelId,
      text,
      imageUrl: imageUrl.trim(),
    });

    if ("message" in data.createPost) {
      throw new Error(`Buffer rejected the post: ${data.createPost.message}`);
    }

    return data.createPost.post;
  }

  /*
   * Articles without a cover image continue through the original
   * text-only Buffer publishing flow.
   */
  const query = `
    mutation CreatePost(
      $channelId: ChannelId!
      $text: String!
    ) {
      createPost(
        input: {
          channelId: $channelId
          text: $text
          schedulingType: automatic
          mode: addToQueue
        }
      ) {
        ... on PostActionSuccess {
          post {
            id
            text
            dueAt
            status
          }
        }

        ... on MutationError {
          message
        }
      }
    }
  `;

  const data = await bufferRequest<{
    createPost: BufferPostSuccess | BufferPostError;
  }>(query, {
    channelId,
    text,
  });

  if ("message" in data.createPost) {
    throw new Error(`Buffer rejected the post: ${data.createPost.message}`);
  }

  return data.createPost.post;
}

export interface BufferOrganization {
  id: string;
  name: string;
}

export interface BufferChannel {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  avatar: string | null;
  isQueuePaused: boolean;
}

/* Retrieves organizations available to the configured Buffer account. */
export async function getBufferOrganizations() {
  const query = `
    query GetOrganizations {
      account {
        organizations {
          id
          name
        }
      }
    }
  `;

  const data = await bufferRequest<{
    account: {
      organizations: BufferOrganization[];
    };
  }>(query);

  return data.account.organizations;
}

/* Retrieves the connected social channels for a Buffer organization. */
export async function getBufferChannels(organizationId: string) {
  const query = `
    query GetChannels(
      $organizationId: OrganizationId!
    ) {
      channels(
        input: {
          organizationId: $organizationId
        }
      ) {
        id
        name
        displayName
        service
        avatar
        isQueuePaused
      }
    }
  `;

  const data = await bufferRequest<{
    channels: BufferChannel[];
  }>(query, {
    organizationId,
  });

  return data.channels;
}

/* Retrieves scheduled posts currently waiting in the Buffer queue. */
export async function getBufferScheduledPosts(
  organizationId: string,
  first = 25,
  after?: string
) {
  const query = `
    query GetScheduledPosts(
      $organizationId: OrganizationId!
      $first: Int!
      $after: String
    ) {
      posts(
        first: $first
        after: $after
        input: {
          organizationId: $organizationId
          sort: [
            {
              field: dueAt
              direction: asc
            }
            {
              field: createdAt
              direction: desc
            }
          ]
          filter: {
            status: [scheduled]
          }
        }
      ) {
        edges {
          node {
            id
            text
            status
            dueAt
            sentAt
            createdAt
            updatedAt
            shareMode
            sharedNow
            channelId
            externalLink
            allowedActions

            assets {
              id
              mimeType
              source
              thumbnail
            }
          }
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const data = await bufferRequest<{
    posts: {
      edges: Array<{
        node: BufferScheduledPost;
      }>;
      pageInfo: BufferPostsPageInfo;
    };
  }>(query, {
    organizationId,
    first,
    after: after || null,
  });

  return {
    posts: data.posts.edges.map((edge) => edge.node),
    pageInfo: data.posts.pageInfo,
  };
}

/**
 * Updates the content of an existing scheduled Buffer post without changing
 * its queue position or scheduled publishing mode.
 */
export async function editBufferScheduledPost({
  postId,
  text,
  imageUrl,
}: EditBufferScheduledPostOptions) {
  /*
   * When an image URL exists, replace the scheduled post's assets with that
   * image while leaving its existing Buffer scheduling mode untouched.
   */
  if (imageUrl?.trim()) {
    const query = `
      mutation EditScheduledImagePost(
        $postId: PostId!
        $text: String!
        $imageUrl: String!
      ) {
        editPost(
          input: {
            id: $postId
            text: $text
            assets: [
              {
                image: {
                  url: $imageUrl
                }
              }
            ]
          }
        ) {
          ... on PostActionSuccess {
            post {
              id
              text
              status
              dueAt
              assets {
                id
                mimeType
              }
            }
          }

          ... on MutationError {
            message
          }
        }
      }
    `;

    const data = await bufferRequest<{
      editPost: BufferPostSuccess | BufferPostError;
    }>(query, {
      postId,
      text,
      imageUrl: imageUrl.trim(),
    });

    if ("message" in data.editPost) {
      throw new Error(
        `Buffer rejected the scheduled post update: ${data.editPost.message}`
      );
    }

    return data.editPost.post;
  }

  /*
   * An explicit empty assets array removes previously attached media while
   * preserving the post's existing schedule.
   */
  const query = `
    mutation EditScheduledTextPost(
      $postId: PostId!
      $text: String!
    ) {
      editPost(
        input: {
          id: $postId
          text: $text
          assets: []
        }
      ) {
        ... on PostActionSuccess {
          post {
            id
            text
            status
            dueAt
            assets {
              id
              mimeType
            }
          }
        }

        ... on MutationError {
          message
        }
      }
    }
  `;

  const data = await bufferRequest<{
    editPost: BufferPostSuccess | BufferPostError;
  }>(query, {
    postId,
    text,
  });

  if ("message" in data.editPost) {
    throw new Error(
      `Buffer rejected the scheduled post update: ${data.editPost.message}`
    );
  }

  return data.editPost.post;
}

/* Immediately publishes an existing scheduled Buffer post. */
export async function publishBufferPostNow(postId: string, text: string) {
  const query = `
    mutation PublishPostNow(
      $postId: PostId!
      $text: String!
    ) {
      editPost(
        input: {
          id: $postId
          text: $text
          mode: shareNow
        }
      ) {
        ... on PostActionSuccess {
          post {
            id
            text
            status
            dueAt
            sentAt
            shareMode
            sharedNow
            externalLink
          }
        }

        ... on MutationError {
          message
        }
      }
    }
  `;

  const data = await bufferRequest<{
    editPost:
      | {
          post: BufferPost & {
            sentAt?: string | null;
            shareMode?: string;
            sharedNow?: boolean;
            externalLink?: string | null;
          };
        }
      | {
          message: string;
        };
  }>(query, {
    postId,
    text,
  });

  if ("message" in data.editPost) {
    throw new Error(
      `Buffer rejected the publish-now request: ${data.editPost.message}`
    );
  }

  return data.editPost.post;
}

/* Retrieves the current performance metrics for one Buffer post. */
export async function getBufferPostMetrics(
  postId: string
): Promise<BufferPostMetricsResult> {
  const query = `
    query GetPostMetrics(
      $postId: PostId!
    ) {
      post(
        input: {
          id: $postId
        }
      ) {
        id
        text
        channelId

        metrics {
          type
          name
          value
          unit
        }

        metricsUpdatedAt
      }
    }
  `;

  const data = await bufferRequest<{
    post: BufferPostMetricsResult;
  }>(query, {
    postId,
  });

  return data.post;
}
