import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck, Baby, Ban, ChevronRight, Clock, Eye, Flag, Heart, Inbox, Loader2, MessageCircle,
  RefreshCw, ShieldAlert, UserPlus, Users, Video, Activity, Bell, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCount } from "@/lib/taxonomy";

/** Splits "/path?a=b" into the path and a search object, as the router expects them separately. */
const splitTo = (to: string) => {
  const [path, qs] = to.split("?");
  return { to: path as never, search: (qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined) as never };
};

type Day = { day: string; signups: number; uploads: number; views: number; likes: number };
export type AdminStatsData = {
  generated_at: string; days: number;
  users: { players: number; scouts_active: number; scouts_pending: number; admins: number; banned: number; suspended: number; private: number; minors: number; new_in_period: number; active_7d: number };
  content: { videos_live: number; videos_flagged: number; videos_removed: number; views: number; watch_hours: number; likes: number; shares: number; comments: number; follows: number };
  queues: { reports_open: number; alerts_new: number; scout_requests: number; contact_unread: number; support_unread: number };
  sports: Record<string, number>;
  daily: Day[];
  top_videos: { id: string; title: string | null; user_id: string; full_name: string | null; view_count: number; like_count: number }[];
  top_players: { user_id: string; full_name: string | null; username: string | null; sport: string | null; views: number; likes: number; followers: number }[];
};

const METRICS: { key: keyof Omit<Day, "day">; label: string }[] = [
  { key: "views", label: "Views" }, { key: "signups", label: "Sign-ups" }, { key: "uploads", label: "Uploads" }, { key: "likes", label: "Likes" },
];

/** Daily bars for one metric. Bars, not a line: each day is a separate count. */
const DailyBars = ({ days, metric }: { days: Day[]; metric: keyof Omit<Day, "day"> }) => {
  const max = Math.max(1, ...days.map((d) => d[metric]));
  const total = days.reduce((n, d) => n + d[metric], 0);
  const [hover, setHover] = useState<number | null>(null);
  const h = hover !== null ? days[hover] : null;
  return (
    <div>
      <p className="text-[13px] text-muted-foreground">
        {h ? <><span className="font-semibold text-foreground">{formatCount(h[metric])}</span> on {new Date(h.day).toLocaleDateString([], { day: "numeric", month: "short" })}</>
          : <><span className="font-semibold text-foreground">{formatCount(total)}</span> in the last {days.length} days</>}
      </p>
      <div className="mt-2 flex h-24 items-end gap-[2px]" role="img" aria-label={`Daily ${metric}, ${total} in total`} onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => (
          <div key={d.day} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
            <div className={`w-full rounded-t-[3px] ${hover === i ? "bg-primary" : "bg-primary/55"}`} style={{ height: `${Math.max(d[metric] ? 4 : 1, (d[metric] / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{new Date(days[0]?.day ?? Date.now()).toLocaleDateString([], { day: "numeric", month: "short" })}</span><span>Today</span>
      </div>
    </div>
  );
};

const TONES = {
  sky: "bg-[#7EC8FF]/25 text-[#13738F] dark:text-[#7EC8FF]",
  mint: "bg-[#5FD3B5]/25 text-[#0F7A60] dark:text-[#5FD3B5]",
  sand: "bg-[#F2C98A]/35 text-[#8A5A14] dark:text-[#F2C98A]",
  alert: "bg-destructive/15 text-destructive",
} as const;

/** One statistic as a horizontal glass card: icon, label, number, and an arrow when it opens something. */
const Tile = ({ label, value, to, alert, icon: Icon, tone = "sky" }: {
  label: string; value: number | string; to?: string; alert?: boolean; icon: LucideIcon; tone?: keyof typeof TONES;
}) => {
  const body = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${TONES[alert ? "alert" : tone]}`}><Icon className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 flex-1 text-[15px] font-medium">{label}</span>
      <span className={`text-[20px] font-bold tabular-nums ${alert ? "text-destructive" : ""}`}>{typeof value === "number" ? formatCount(value) : value}</span>
      {to && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </>
  );
  const cls = "flex min-h-[60px] items-center gap-3 rounded-[20px] bg-card px-3.5 py-2.5";
  return to ? <Link {...splitTo(to)} className={`press ${cls}`}>{body}</Link> : <div className={cls}>{body}</div>;
};

/** Platform statistics, computed by the database so the numbers are exact at any size. */
const AdminStats = ({ compact = false }: { compact?: boolean }) => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AdminStatsData | null>(null);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<keyof Omit<Day, "day">>("views");
  const load = async () => {
    setError(false);
    const { data: d, error: e } = await supabase.rpc("get_admin_stats" as never, { _days: days } as never);
    if (e) { setError(true); return; }
    setData(d as unknown as AdminStatsData);
  };
  useEffect(() => { setData(null); load(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const sports = useMemo(() => Object.entries(data?.sports ?? {}).sort((a, b) => b[1] - a[1]), [data]);
  const sportTotal = sports.reduce((n, [, c]) => n + c, 0) || 1;

  if (error) return <button type="button" onClick={load} className="press w-full rounded-[20px] bg-card px-4 py-5 text-[15px] text-muted-foreground">Couldn't load statistics. Tap to retry.</button>;
  if (!data) return <div className="grid h-40 place-items-center rounded-[20px] bg-card"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const q = data.queues;
  return (
    <div className="space-y-4">
      <section>
        <h2 className="ios-group-label !px-0">Needs attention</h2>
        <div className="space-y-2">
          <Tile icon={Flag} label="Open reports" value={q.reports_open} to="/admin/reports" alert={q.reports_open > 0} />
          <Tile icon={BadgeCheck} label="Scouts to verify" value={data.users.scouts_pending} to="/admin/panel?tab=scouts" alert={data.users.scouts_pending > 0} />
          <Tile icon={ShieldAlert} label="Videos in review" value={data.content.videos_flagged} to="/admin/explore" alert={data.content.videos_flagged > 0} />
          <Tile icon={UserPlus} tone="mint" label="Scout requests" value={q.scout_requests} to="/admin/panel?tab=requests" />
          <Tile icon={Inbox} tone="sand" label="Unread support" value={q.support_unread + q.contact_unread} to="/admin/panel?tab=contact" />
          <Tile icon={Bell} label="New alerts" value={q.alerts_new} to="/admin/panel?tab=alerts" />
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="ios-group-label !px-0">People</h2>
          <button type="button" onClick={load} aria-label="Refresh" className="press mb-1 grid h-7 w-7 place-items-center text-muted-foreground"><RefreshCw className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2">
          <Tile icon={Users} label="Players" value={data.users.players} to="/admin/users" />
          <Tile icon={BadgeCheck} tone="mint" label="Verified scouts" value={data.users.scouts_active} to="/admin/users" />
          <Tile icon={Activity} tone="sand" label="Active this week" value={data.users.active_7d} />
          <Tile icon={UserPlus} label={`New in ${data.days} days`} value={data.users.new_in_period} />
          <Tile icon={Baby} tone="mint" label="Under 18" value={data.users.minors} />
          <Tile icon={Ban} tone="sand" label="Banned or suspended" value={data.users.banned} to="/admin/users" />
        </div>
      </section>

      <section className="rounded-[22px] bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label="Metric">
            {METRICS.map((m) => (
              <button key={m.key} type="button" role="radio" aria-checked={metric === m.key} onClick={() => setMetric(m.key)}
                className={`press shrink-0 rounded-full px-3 py-1 text-[13px] font-medium ${metric === m.key ? "bg-foreground text-background" : "bg-secondary"}`}>{m.label}</button>
            ))}
          </div>
          <select aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 rounded-full bg-secondary px-2 text-[13px]">
            <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
          </select>
        </div>
        <div className="mt-3"><DailyBars days={data.daily} metric={metric} /></div>
      </section>

      {!compact && (
        <>
          <section>
            <h2 className="ios-group-label !px-0">Content</h2>
            <div className="space-y-2">
              <Tile icon={Video} label="Live highlights" value={data.content.videos_live} to="/admin/explore" />
              <Tile icon={Eye} tone="mint" label="Total views" value={data.content.views} />
              <Tile icon={Clock} tone="sand" label="Hours watched" value={data.content.watch_hours} />
              <Tile icon={Heart} label="Likes" value={data.content.likes} />
              <Tile icon={MessageCircle} tone="mint" label="Comments" value={data.content.comments} />
              <Tile icon={UserPlus} tone="sand" label="Follows" value={data.content.follows} />
            </div>
          </section>

          {sports.length > 0 && (
            <section className="rounded-[22px] bg-card p-4">
              <h2 className="text-[15px] font-semibold">Players by sport</h2>
              <ul className="mt-2 space-y-2">
                {sports.map(([s, c]) => (
                  <li key={s}>
                    <div className="flex justify-between text-[14px]"><span className="capitalize">{s}</span><span className="text-muted-foreground">{c} · {Math.round((c / sportTotal) * 100)}%</span></div>
                    <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(c / sportTotal) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.top_players.length > 0 && (
            <section>
              <h2 className="ios-group-label !px-0">Most watched players</h2>
              <ol className="space-y-2">
                {data.top_players.map((p, i) => (
                  <li key={p.user_id}>
                    <Link to={`/resume/${p.user_id}` as never} className="press flex min-h-[60px] items-center gap-3 rounded-[20px] bg-card px-3.5 py-2.5">
                      <span className="w-5 text-[15px] font-semibold text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[15px]">{p.full_name ?? p.username}</span><span className="block text-[13px] capitalize text-muted-foreground">{p.sport} · {formatCount(p.followers)} followers</span></span>
                      <span className="text-[14px] text-muted-foreground">{formatCount(Number(p.views))} views</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
      <p className="footnote text-center">Updated {new Date(data.generated_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
    </div>
  );
};

export default AdminStats;
