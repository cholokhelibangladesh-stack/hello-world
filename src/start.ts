import { createMiddleware, createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { renderErrorPage } from "@/lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    const statusCode =
      typeof error === "object" && error !== null
        ? ((error as { statusCode?: unknown; status?: unknown }).statusCode ??
            (error as { statusCode?: unknown; status?: unknown }).status)
        : undefined;

    if (typeof statusCode === "number" && statusCode < 500) {
      throw error;
    }

    console.error(error);

    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));