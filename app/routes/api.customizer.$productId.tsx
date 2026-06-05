// app/routes/api.customizer.$productId.tsx
import type { LoaderFunctionArgs } from "react-router";

import { getStorefrontCustomizerConfig } from "../lib/customizer.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const productId = String(params.productId ?? "");
  const config = await getStorefrontCustomizerConfig(productId);

  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
