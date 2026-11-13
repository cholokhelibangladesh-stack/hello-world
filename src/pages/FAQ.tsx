import { motion } from "framer-motion";
import { HelpCircle, ChevronDown, AlertTriangle, Mail, Send } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";

const faqs = [
  { q: "How much does it cost to register?", a: "Nothing. Signing up and uploading highlights is free for players, and scouts register for free too." },
  { q: "How are scouts verified?", a: "Every scout account is manually reviewed by our admin team. They must provide valid credentials before accessing the talent database." },
  { q: "Is my video safe?", a: "Your highlights are shown inside Cholo Kheli to verified scouts and other players. Make your account private in Settings and only verified scouts can see them. We do not share your content outside the platform." },
  { q: "What sports are supported?", a: "Football, cricket and basketball." },
  { q: "Can I edit or remove a highlight?", a: "Yes. Open the highlight on your profile to change its title and description, or delete it from the Upload page at any time." },
  { q: "What if I'm under 18?", a: "Players under 18 sign up with a parent or guardian's consent and contact. A scout can only message a player after our team approves the request, and our team can read every conversation." },
  { q: "How do I report suspicious behaviour?", a: "Use Report on the person's profile or on a message in the app, use the form below, or email legal@cholokheli.com." },
];

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const ContactUs = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const filtered = faqs.filter(
    (f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Invalid form", description: parsed.error.issues[0]?.message ?? "Please check the fields.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("contact_messages" as any).insert({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    } as any);
    setSending(false);
    if (error) {
      toast({ title: t("contact.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("contact.success") });
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <Mail className="h-8 w-8 text-primary" />
            <h1 className="font-display text-4xl text-foreground">{t("contact.title")}</h1>
          </div>

          {/* FAQ section */}
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl text-foreground">{t("contact.faqHeading")}</h2>
          </div>

          <Input
            placeholder={t("contact.searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 bg-card border-border"
          />

          <div className="space-y-2 mb-12">
            {filtered.map((faq, i) => (
              <div key={i} className="bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium text-foreground pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openIndex === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border pt-3">{faq.a}</div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">{t("contact.noResults")}</p>
            )}
          </div>

          {/* Contact form section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card border border-border rounded-2xl p-6 sm:p-8 mb-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl text-foreground">{t("contact.formHeading")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">{t("contact.formSub")}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {t("contact.name")}
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t("contact.namePh")}
                    maxLength={100}
                    required
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {t("contact.email")}
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={t("contact.emailPh")}
                    maxLength={255}
                    required
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {t("contact.subject")}
                </label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder={t("contact.subjectPh")}
                  maxLength={150}
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {t("contact.message")}
                </label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t("contact.messagePh")}
                  maxLength={2000}
                  required
                  rows={6}
                  className="bg-secondary border-border resize-none"
                />
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? t("contact.sending") : t("contact.send")}
              </Button>
            </form>
          </motion.div>

          {/* Urgent report */}
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-6 text-center">
            <AlertTriangle className="h-6 w-6 text-accent mx-auto mb-3" />
            <h3 className="font-display text-xl text-foreground mb-2">{t("contact.urgentHeading")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("contact.urgentBody")}</p>
            <Button
              className="bg-accent text-accent-foreground font-bold hover:bg-accent/90"
              onClick={() => toast({ title: t("contact.reportSent"), description: t("contact.reportSentDesc") })}
            >
              {t("contact.reportBtn")}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUs;
