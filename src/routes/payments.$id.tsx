import { createFileRoute } from "@tanstack/react-router";
import PaymentReceipt from "@/pages/PaymentReceipt";
export const Route = createFileRoute("/payments/$id")({
  component: PaymentReceipt,
  validateSearch: (s: Record<string, unknown>) => ({
    result: typeof s.result === "string" ? s.result : undefined,
    doc: typeof s.doc === "string" ? s.doc : undefined,
  }),
});
