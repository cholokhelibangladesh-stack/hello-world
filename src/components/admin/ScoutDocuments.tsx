import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveMediaUrl } from "@/lib/media";

type Doc = { id: string; type: string; name: string; url: string };
const LABEL: Record<string, string> = { scout_org_id: "Organisation ID", scout_cv: "CV", birth_certificate: "Birth certificate" };

/** Lists a user's verification documents for admins; each opens through a short-lived signed link. */
const ScoutDocuments = ({ userId }: { userId: string }) => {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  useEffect(() => {
    supabase.from("documents").select("id, type, name, url").eq("user_id", userId).order("created_at", { ascending: false })
      .then(({ data }) => setDocs((data ?? []) as Doc[]));
  }, [userId]);
  if (docs === null) return <p className="footnote">Loading documents…</p>;
  if (docs.length === 0) return <p className="footnote">No documents uploaded yet. Approve only after the scout uploads an ID and CV.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {docs.map((d) => (
        <button key={d.id} type="button"
          onClick={async () => { const u = await resolveMediaUrl(d.url, "documents"); if (u) window.open(u, "_blank", "noopener"); else toast.error("Couldn't open that document"); }}
          className="press inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-medium text-primary">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {LABEL[d.type] ?? d.name}
        </button>
      ))}
    </div>
  );
};
export default ScoutDocuments;
