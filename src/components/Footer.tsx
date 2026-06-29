import { Link } from "@tanstack/react-router";
import CholoKheliMark from "@/components/CholoKheliMark";

const Footer = () => (
  <footer className="border-t border-border surface-paper">
    <div className="container py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <CholoKheliMark className="h-7 w-9 text-foreground" accent="hsl(var(--teal-deep))" />
            <span className="font-display text-lg tracking-[0.04em] text-foreground font-semibold">
              CHOLO <span className="text-[hsl(var(--teal-deep))] font-bold">KHELI</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Digitising Bangladesh sports. Connecting talent with opportunity — safely, transparently, beautifully.
          </p>
        </div>
        <div>
          <h4 className="font-display text-lg text-foreground mb-3">QUICK LINKS</h4>
          <div className="flex flex-col gap-2">
            <Link to="/safe-scouting" className="text-sm text-muted-foreground hover:text-primary transition-colors">Safe Scouting</Link>
            <Link to="/mission" className="text-sm text-muted-foreground hover:text-primary transition-colors">Our Mission</Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ & Helpline</Link>
          </div>
        </div>
        <div>
          <h4 className="font-display text-lg text-foreground mb-3">CONTACT</h4>
          <p className="text-sm text-muted-foreground">support@scoutbd.com</p>
          <p className="text-sm text-muted-foreground">Legal: legal@scoutbd.com</p>
          <p className="text-sm text-muted-foreground mt-2">Dhaka, Bangladesh</p>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        © 2026 Scout BD. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
