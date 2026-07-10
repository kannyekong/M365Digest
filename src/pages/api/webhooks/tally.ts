import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {

    const payload = await request.json();

    console.log(payload.data.fields);

    return new Response("OK");
};