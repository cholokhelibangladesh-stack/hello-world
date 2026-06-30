import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Quote } from "lucide-react";
import playerRafiq from "@/assets/player-rafiq.jpg";
import playerTanjim from "@/assets/player-tanjim.jpg";
import playerNusrat from "@/assets/player-nusrat.jpg";
import bangladeshMap from "@/assets/bangladesh-divisions-map.png";

type PlayerPin = {
  id: string;
  x: number;
  y: number;
  district: string;
  name: string;
  sport: string;
  position: string;
  issue: string;
  story: string;
  image: string;
  defaultOpen?: boolean;
};

const players: PlayerPin[] = [
  {
    id: "rafiq",
    x: 43, y: 47,
    district: "Dhaka", name: "Rafiqul Islam", sport: "Football", position: "Midfielder",
    issue: "No platform to showcase talent outside his locality. Spent 3 years unnoticed.",
    story: "Within weeks of uploading his highlight reel on Cholo Kheli, three clubs reached out. He now plays for a Dhaka Premier Division club.",
    image: playerRafiq, defaultOpen: true,
  },
  {
    id: "tanjim",
    x: 57, y: 26,
    district: "Sylhet", name: "Tanjim Ahmed", sport: "Cricket", position: "All-rounder",
    issue: "Playing in remote Sylhet with zero scouting infrastructure. His talent was invisible.",
    story: "Cholo Kheli connected him to a BPL franchise scout. He now holds a regional cricket contract and represents Sylhet in the National Championship.",
    image: playerTanjim, defaultOpen: true,
  },
  {
    id: "nusrat",
    x: 28, y: 58,
    district: "Khulna", name: "Nusrat Jahan", sport: "Football", position: "Forward",
    issue: "Female players in Khulna had no visibility — no scouts ever visited the district.",
    story: "After uploading her skills video, she received an invite to the Bangladesh Women's U-20 trials. She made the squad.",
    image: playerNusrat, defaultOpen: true,
  },
  { id: "p4", x: 28, y: 38, district: "Rajshahi", name: "Arif Hossain", sport: "Football", position: "Goalkeeper", issue: "Limited access to professional coaching.", story: "Now training with Rajshahi FC youth academy after being spotted on Cholo Kheli.", image: playerRafiq },
  { id: "p5", x: 38, y: 70, district: "Barisal", name: "Sumon Dey", sport: "Cricket", position: "Fast Bowler", issue: "No way to reach metropolitan scouts from coastal Barisal.", story: "Secured a trial with a Dhaka-based cricket academy through Cholo Kheli.", image: playerTanjim },
  { id: "p6", x: 44, y: 30, district: "Mymensingh", name: "Karim Uddin", sport: "Football", position: "Defender", issue: "Talented but invisible due to lack of local scouting.", story: "Joined Dhaka Abahani youth team after being discovered on Cholo Kheli.", image: playerNusrat },
  { id: "p7", x: 28, y: 18, district: "Rangpur", name: "Belal Khan", sport: "Cricket", position: "Spinner", issue: "Northern districts ignored by big club scouts.", story: "Offered contract by Rangpur Riders academy after highlight reel went viral.", image: playerRafiq },
  { id: "p8", x: 50, y: 53, district: "Comilla", name: "Rony Mia", sport: "Football", position: "Winger", issue: "Played street football with no professional pathway.", story: "Discovered by a scout from Chittagong Abahani and offered a trial.", image: playerTanjim },
  { id: "p9", x: 53, y: 58, district: "Chittagong", name: "Sadia Islam", sport: "Football", position: "Midfielder", issue: "Women's football completely unscouted in Chittagong.", story: "Selected for national women's development camp after Cholo Kheli profile.", image: playerNusrat },
];

const districtLabels = [
  { name: "Rangpur",    x: 28, y: 13 },
  { name: "Rajshahi",   x: 25, y: 40 },
  { name: "Mymensingh", x: 44, y: 26 },
  { name: "Sylhet",     x: 58, y: 22 },
  { name: "Dhaka",      x: 42, y: 43 },
  { name: "Khulna",     x: 24, y: 58 },
  { name: "Barisal",    x: 39, y: 68 },
  { name: "Chittagong", x: 56, y: 55 },
];

function Pin({ active, open }: { active: boolean; open: boolean }) {
  const fill = open ? "hsl(var(--foreground))" : "hsl(var(--foreground)/0.45)";
  const dot  = open ? "hsl(var(--background))" : "hsl(var(--background)/0.85)";
  const shadow = active
    ? "drop-shadow(0 0 8px hsl(var(--foreground)/0.9)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
    : open
    ? "drop-shadow(0 0 5px hsl(var(--foreground)/0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.7))"
    : "drop-shadow(0 2px 4px rgba(0,0,0,0.8))";

  return (
    <svg viewBox="0 0 24 32" width="20" height="27" style={{ filter: shadow, display: "block" }}>
      <path
        d="M12 1C7.58 1 4 4.58 4 9c0 6.5 8 22 8 22s8-15.5 8-22C20 4.58 16.42 1 12 1z"
        fill={fill}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.8"
      />
      <circle cx="12" cy="9" r="3" fill={dot} />
    </svg>
  );
}

export default function BangladeshMapTestimonials() {
  const [openPins, setOpenPins] = useState<Set<string>>(new Set());
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    if (!mapVisible) return;
    players.filter(p => p.defaultOpen).forEach((p, i) => {
      setTimeout(() => setOpenPins(prev => new Set([...prev, p.id])), 500 + i * 280);
    });
  }, [mapVisible]);

  const handlePinClick = (id: string) => {
    setActivePinId(prev => (prev === id ? null : id));
    setOpenPins(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activePlayer = players.find(p => p.id === activePinId);

  return (
    <section className="py-16 sm:py-24 border-t border-border overflow-hidden">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="font-display text-3xl sm:text-5xl text-foreground mb-2 sm:mb-3">
            VOICES FROM ACROSS BANGLADESH
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Every pin is a real player whose life changed. Click any pin to hear their story.
          </p>
        </motion.div>

        <div className="relative flex flex-col lg:flex-row gap-10 items-start justify-center">

          {/* ── Map ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setMapVisible(true)}
            className="relative w-full max-w-lg lg:max-w-xl flex-shrink-0 mx-auto lg:mx-0"
          >
            {/* SVG glow filter applied to the map outline itself */}
            <svg width="0" height="0" className="absolute">
              <defs>
                <filter id="map-outline-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                  <feColorMatrix in="blur1" type="matrix"
                    values="3 0 0 0 0.95  0 3 0 0 0.95  0 0 3 0 0.95  0 0 0 1.5 0"
                    result="glow1" />
                  <feColorMatrix in="blur2" type="matrix"
                    values="2 0 0 0 0.85  0 2 0 0 0.85  0 0 2 0 0.85  0 0 0 0.8 0"
                    result="glow2" />
                  <feMerge>
                    <feMergeNode in="glow2" />
                    <feMergeNode in="glow1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>

            <div className="relative w-full select-none">
              <img
                src={bangladeshMap}
                alt="Bangladesh divisions map"
                className="w-full h-auto pointer-events-none"
                style={{
                  filter: "url(#map-outline-glow) invert(1) brightness(0.9) contrast(1.15)",
                  mixBlendMode: "normal",
                }}
                draggable={false}
              />

              {/* District labels — bright white, clearly readable */}
              <div className="absolute inset-0 pointer-events-none">
                {districtLabels.map(({ name, x, y }) => (
                  <span
                    key={name}
                    className="absolute font-semibold tracking-widest uppercase"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                      fontSize: "clamp(7px, 1.4vw, 10px)",
                      color: "hsl(var(--foreground) / 0.85)",
                      letterSpacing: "0.1em",
                      whiteSpace: "nowrap",
                      textShadow: "0 0 8px hsl(var(--background)), 0 0 16px hsl(var(--background)), 0 1px 3px rgba(0,0,0,0.9)",
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>

              {/* Pins */}
              {players.map((player, idx) => {
                const isOpen   = openPins.has(player.id);
                const isActive = activePinId === player.id;

                return (
                  <motion.button
                    key={player.id}
                    initial={{ opacity: 0, y: -10, scale: 0.4 }}
                    animate={mapVisible
                      ? { opacity: 1, y: 0, scale: 1 }
                      : { opacity: 0, y: -10, scale: 0.4 }}
                    transition={{ delay: 0.12 + idx * 0.07, type: "spring", stiffness: 320, damping: 24 }}
                    whileHover={{ y: -5, scale: 1.3, transition: { duration: 0.14 } }}
                    onClick={() => handlePinClick(player.id)}
                    className="absolute focus:outline-none"
                    style={{
                      left: `${player.x}%`,
                      top: `${player.y}%`,
                      transform: "translate(-50%, -100%)",
                      zIndex: isActive ? 30 : isOpen ? 20 : 10,
                    }}
                    aria-label={`${player.name} from ${player.district}`}
                  >
                    {isOpen && (
                      <motion.div
                        className="absolute rounded-full pointer-events-none"
                        initial={{ scale: 0.6, opacity: 0.7 }}
                        animate={{ scale: 2.6, opacity: 0 }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                        style={{
                          width: 10, height: 10,
                          background: "hsl(var(--foreground)/0.4)",
                          top: "32%", left: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    )}

                    <Pin active={isActive} open={isOpen} />

                    <AnimatePresence>
                      {isOpen && !isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.85 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.85 }}
                          transition={{ duration: 0.18 }}
                          className="absolute bottom-full mb-1 left-1/2 whitespace-nowrap bg-foreground text-background text-[9px] font-semibold px-2 py-0.5 rounded-full shadow-lg pointer-events-none"
                          style={{ transform: "translateX(-50%)" }}
                        >
                          {player.name.split(" ")[0]} · {player.district}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* ── Testimonial Panel ── */}
          <div className="w-full lg:max-w-sm lg:flex-shrink-0 lg:sticky lg:top-24">
            <AnimatePresence mode="wait">
              {activePlayer ? (
                <motion.div
                  key={activePlayer.id}
                  initial={{ opacity: 0, x: 24, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -24, scale: 0.97 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="rounded-2xl overflow-hidden border border-border/60"
                  style={{
                    background: "hsl(var(--card))",
                    boxShadow: "0 0 0 1px hsl(var(--foreground)/0.06), 0 20px 50px -10px rgba(0,0,0,0.6)",
                  }}
                >
                  <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
                    <img
                      src={activePlayer.image}
                      alt={activePlayer.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectPosition: "center 15%" }}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(to bottom, transparent 55%, hsl(var(--card)/0.65) 80%, hsl(var(--card)) 100%)",
                      }}
                    />
                    <button
                      onClick={() => setActivePinId(null)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background/90 transition-colors z-10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-10">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <h3 className="font-display text-lg text-foreground leading-tight">
                            {activePlayer.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activePlayer.sport} · {activePlayer.position}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-foreground/90 rounded-full px-2 py-0.5 flex-shrink-0">
                          <MapPin className="h-2.5 w-2.5 text-background" />
                          <span className="text-[10px] font-semibold text-background">{activePlayer.district}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-3 space-y-3">
                    <div className="rounded-xl p-3 border border-destructive/20 bg-destructive/5">
                      <p className="text-[10px] font-semibold text-destructive/70 uppercase tracking-wider mb-1">The Challenge</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{activePlayer.issue}</p>
                    </div>
                    <div className="rounded-xl p-3 border border-foreground/10 bg-foreground/5">
                      <p className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider mb-1">The Breakthrough</p>
                      <div className="flex gap-2">
                        <Quote className="h-3.5 w-3.5 text-foreground/40 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground leading-relaxed">{activePlayer.story}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-56 text-center gap-3 bg-card/30 border border-dashed border-border/50 rounded-2xl p-8"
                >
                  <MapPin className="h-7 w-7 text-foreground/20" />
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Click any location pin on the map<br />to read a player's story
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex flex-wrap gap-2">
              {players.filter(p => p.defaultOpen).map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePinClick(p.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
                    activePinId === p.id
                      ? "bg-foreground text-background border-foreground shadow-md"
                      : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {p.name.split(" ")[0]} · {p.district}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Pin active={false} open={true} />
                <span className="text-xs text-muted-foreground">Has story</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Pin active={false} open={false} />
                <span className="text-xs text-muted-foreground">More players</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
