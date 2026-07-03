import type { APIRoute } from "astro";

import { logout } from "../../lib/auth";

export const GET: APIRoute = async () => {
  await logout();

  return Response.redirect("/admin/login");
};
