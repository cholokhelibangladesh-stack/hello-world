import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SafeScouting = () => {
  const { toast } = useToast();

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="font-display text-4xl text-foreground">SAFE SCOUTING</h1>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h2 className="font-display text-2xl text-foreground mb-4">OUR PROMISE</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Scout BD <strong className="text-foreground">never</strong> asks players for extra money for trials, beyond the ৳100 registration fee.</span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>All scouts are verified by our admin team before gaining access to player profiles.</span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>All communication between scouts and players is logged for safety.</span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Guardian contact is mandatory for players under 18.</span>
              </li>
            </ul>
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <h3 className="font-display text-xl text-foreground">RED FLAGS TO WATCH FOR</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Anyone asking for additional payment outside the platform</li>
              <li>• Scouts requesting personal meetings without platform approval</li>
              <li>• Promises of guaranteed selection or contracts</li>
              <li>• Requests for passport or original documents</li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h3 className="font-display text-xl text-foreground mb-4">REPORT A SCOUT</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you feel unsafe or have encountered suspicious behaviour, report immediately. All reports are reviewed within 24 hours.
            </p>
            <Button
              className="bg-accent text-accent-foreground font-bold hover:bg-accent/90"
              onClick={() => toast({ title: "Report Submitted", description: "Our team will review within 24 hours." })}
            >
              <AlertTriangle className="h-4 w-4 mr-2" /> Report a Scout
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xl text-foreground mb-4">CONTACT OUR TEAM</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>Legal: <strong className="text-foreground">legal@scoutbd.com</strong></span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>Support: <strong className="text-foreground">support@scoutbd.com</strong></span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>Helpline: <strong className="text-foreground">+880 1700-000000</strong></span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SafeScouting;
