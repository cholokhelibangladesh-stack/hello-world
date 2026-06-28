import { motion } from "framer-motion";
import { Target, Heart, Globe } from "lucide-react";

const Mission = () => (
  <div className="min-h-screen pt-20 pb-16">
    <div className="container max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-5xl text-foreground mb-4">OUR MISSION</h1>
        <p className="text-lg text-muted-foreground mb-10">
          To digitize Bangladesh sports, remove corruption from talent discovery, and give every young athlete a fair shot at greatness.
        </p>

        <div className="space-y-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <Target className="h-8 w-8 text-primary mb-3" />
            <h2 className="font-display text-2xl text-foreground mb-3">THE PROBLEM</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              In Bangladesh, countless talented athletes never get discovered. The traditional scouting system is broken — plagued by middlemen, corruption, and geography. A striker in Barisal has almost no chance of being seen by a scout in Dhaka. We're here to change that.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <Heart className="h-8 w-8 text-primary mb-3" />
            <h2 className="font-display text-2xl text-foreground mb-3">OUR APPROACH</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Scout BD creates a transparent digital bridge between grassroots talent and professional scouts. Every player gets the same platform. Every scout is verified. Every interaction is tracked. No middlemen, no corruption — just pure talent.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <Globe className="h-8 w-8 text-primary mb-3" />
            <h2 className="font-display text-2xl text-foreground mb-3">THE VISION</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We envision a Bangladesh where talent speaks louder than connections. Where a 16-year-old cricketer from Rangpur can be discovered by a national selector. Where the next football star doesn't need to know the right people — just be the right player.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

export default Mission;
