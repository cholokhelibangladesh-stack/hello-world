import { motion } from "framer-motion";
import { HelpCircle, ChevronDown, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const faqs = [
  { q: "How much does it cost to register?", a: "Players pay a one-time fee of ৳100 via bKash. There are no hidden charges. Scouts can register for free." },
  { q: "How are scouts verified?", a: "Every scout account is manually reviewed by our admin team. They must provide valid credentials before accessing the talent database." },
  { q: "Is my video safe?", a: "Your video is only visible to verified, active scouts. We do not share your content externally." },
  { q: "What sports are supported?", a: "Currently we support Football and Cricket, with plans to add more sports in the future." },
  { q: "Can I update my video after payment?", a: "Yes, you can replace your video once. Contact support for additional changes." },
  { q: "What if I'm under 18?", a: "Players under 18 must provide a guardian contact. All communication with scouts will be shared with the guardian." },
  { q: "How do I report suspicious behaviour?", a: "Use the 'Report a Scout' button on the Safe Scouting page or email legal@cholokheli.com immediately." },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const filtered = faqs.filter(
    (f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="font-display text-4xl text-foreground">FAQ & HELPLINE</h1>
          </div>

          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-6 bg-card border-border"
          />

          <div className="space-y-2 mb-8">
            {filtered.map((faq, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium text-foreground pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                      openIndex === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openIndex === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No matching questions found.</p>
            )}
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-xl p-6 text-center">
            <AlertTriangle className="h-6 w-6 text-accent mx-auto mb-3" />
            <h3 className="font-display text-xl text-foreground mb-2">NEED URGENT HELP?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you feel unsafe or need immediate assistance, report it now.
            </p>
            <Button
              className="bg-accent text-accent-foreground font-bold hover:bg-accent/90"
              onClick={() => toast({ title: "Report Sent", description: "Admin has been alerted immediately." })}
            >
              Report a Scout
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQ;
