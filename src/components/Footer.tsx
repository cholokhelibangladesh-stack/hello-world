import { Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-display text-xl text-foreground">SCOUT BD</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Digitizing Bangladesh sports. Connecting talent with opportunity, safely and transparently.
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
