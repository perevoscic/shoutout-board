import { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import GlennImg from "./assets/glenn.png";
import TommyImg from "./assets/Tommy.png";
import RuslanImg from "./assets/ruslan.png";
import WelcomeBanner from "./assets/welcome-banner.jpg";
import WhistleSfx from "./assets/whistle.mp3";
import CrowdSfx from "./assets/crowd.mp3";
import TdTitansSfx from "./assets/touchdown-titans.mp3";
import TdBotsSfx from "./assets/touchdown-bots.mp3";
import ChantCtrlAltDefeat from "./assets/ctrl-alt-defeat.mp3";
import ChantFirstDown from "./assets/first-down.mp3";
import ChantGoHumans from "./assets/go-humans.mp3";
import ChantNoSoul from "./assets/no-soul.mp3";
import ChantRamSpam from "./assets/ram-spam.mp3";

type HeadConfig = {
  name: string;
  role: string;
  imgUrl?: string;
  initials: string;
  jersey: number;
};

type Entity = {
  id: string;
  x: number;
  y: number;
  type: "human" | "robot";
  head?: HeadConfig;
  number?: number;
  vx?: number;
  vy?: number;
};

type GameState = "idle" | "playing" | "huddle" | "scored";
type Orientation = "landscape" | "portrait";

const DEFAULT_HEADS: HeadConfig[] = [
  { name: "Tommy", role: "CIO", initials: "T", jersey: 12, imgUrl: TommyImg },
  {
    name: "Glenn",
    role: "IT Support & Training Manager",
    initials: "G",
    jersey: 21,
    imgUrl: GlennImg,
  },
  {
    name: "Ruslan",
    role: "IT Manager",
    initials: "R",
    jersey: 42,
    imgUrl: RuslanImg,
  },
  { name: "Tyler", role: "IT Assistant", initials: "Ty", jersey: 7 },
];

const CHANTS = [
  "Humans! Go, humans!",
  "No Soul, No goal!",
  "Error 404! Blue Screen!",
  "First down, shutdown!",
  "We’ve got RAM, they’ve got spam!",
  "Control-Alt-Defeat!",
  "Patch This, Robots!",
  "Debug the Defense!",
];

// Timing
const PERIOD_SECONDS = 20;
const TOTAL_PERIODS = 4;

// Movement tuning so robots and humans are similar speed
const SPEED = {
  drift: 0.04, // gentle drift toward scoring direction
  wanderJitter: 0.08, // random wander accel per tick
  idleMax: 0.35, // cap for idle velocity magnitude
  chaseCarrier: 0.35, // speed when chasing/carrying toward endzone
  support: 0.3, // speed for supporting teammates
};

// Simple separation to avoid huddling
const SEPARATION = {
  radius: 6,
  strength: 0.06,
};

function useFormation(orientation: Orientation) {
  // Normalized positions (0..100) inside field
  // IT team attacks LEFT in landscape and UP in portrait
  const offense = useMemo(() => {
    if (orientation === "portrait") {
      return [
        { x: 50, y: 82 },
        { x: 40, y: 74 },
        { x: 60, y: 74 },
        { x: 50, y: 66 },
      ];
    }
    // landscape: start on right half, move left
    return [
      { x: 82, y: 60 },
      { x: 74, y: 50 },
      { x: 74, y: 70 },
      { x: 66, y: 60 },
    ];
  }, [orientation]);

  const defense = useMemo(() => {
    if (orientation === "portrait") {
      return [
        { x: 22, y: 34 },
        { x: 50, y: 30 },
        { x: 78, y: 34 },
        { x: 50, y: 22 },
      ];
    }
    return [
      { x: 22, y: 40 },
      { x: 18, y: 60 },
      { x: 30, y: 48 },
      { x: 30, y: 72 },
    ];
  }, [orientation]);
  return { offense, defense };
}

function Head({ head, size = 36 }: { head?: HeadConfig; size?: number }) {
  if (head?.imgUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={head.imgUrl}
          alt={head.name}
          style={{ height: "100%", width: "auto", display: "block" }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: Math.round(size * 0.45),
      }}
    >
      {head?.initials || "?"}
    </div>
  );
}

function Human({ entity, selected }: { entity: Entity; selected?: boolean }) {
  // Simple American football silhouette with jersey
  return (
    <div
      className={`player${selected ? " selected" : ""}`}
      style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
    >
      <svg width="70" height="90" viewBox="0 0 70 90">
        <defs>
          <linearGradient id="jerseyIT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a4112e" />
            <stop offset="100%" stopColor="#dc143c" />
          </linearGradient>
        </defs>
        <rect
          x="12"
          y="32"
          width="46"
          height="36"
          rx="10"
          fill="url(#jerseyIT)"
        />
        <rect x="5" y="34" width="14" height="10" rx="4" fill="#7a0d24" />
        <rect x="51" y="34" width="14" height="10" rx="4" fill="#7a0d24" />
        <rect x="22" y="68" width="10" height="16" rx="3" fill="#263238" />
        <rect x="38" y="68" width="10" height="16" rx="3" fill="#263238" />
        <text
          x="35"
          y="55"
          textAnchor="middle"
          fontSize="16"
          fill="#fff"
          fontWeight="800"
        >
          {entity.head?.jersey}
        </text>
      </svg>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "2px",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Head head={entity.head} size={87.5} />
      </div>
    </div>
  );
}

function Robot({ entity, selected }: { entity: Entity; selected?: boolean }) {
  return (
    <div
      className={`robot${selected ? " selected" : ""}`}
      style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
    >
      <svg width="70" height="92" viewBox="0 0 70 92">
        {/* Tesla Optimus-like silhouette */}
        {/* head */}
        <rect x="22" y="6" width="26" height="22" rx="10" fill="#0b0b0b" />
        <rect x="26" y="14" width="18" height="6" rx="3" fill="#00e5ff" />
        {/* neck */}
        <rect x="31" y="28" width="8" height="4" rx="2" fill="#111" />
        {/* torso */}
        <rect x="10" y="34" width="50" height="30" rx="10" fill="#f5f5f5" />
        <rect x="16" y="38" width="38" height="22" rx="8" fill="#eeeeee" />
        {/* shoulder caps */}
        <rect x="4" y="36" width="12" height="12" rx="6" fill="#0f0f10" />
        <rect x="54" y="36" width="12" height="12" rx="6" fill="#0f0f10" />
        {/* arms */}
        <rect x="2" y="46" width="14" height="10" rx="4" fill="#c7c7c7" />
        <rect x="54" y="46" width="14" height="10" rx="4" fill="#c7c7c7" />
        {/* waist */}
        <rect x="26" y="64" width="18" height="6" rx="3" fill="#111" />
        {/* legs */}
        <rect x="22" y="70" width="10" height="18" rx="3" fill="#dcdcdc" />
        <rect x="38" y="70" width="10" height="18" rx="3" fill="#dcdcdc" />
        <text
          x="35"
          y="52"
          textAnchor="middle"
          fontSize="16"
          fill="#111"
          fontWeight="800"
        >
          {entity.number ?? 0}
        </text>
      </svg>
    </div>
  );
}

function YardLines({ orientation }: { orientation: Orientation }) {
  // Correct 10% end zones. 100-yard field of play between 10%..90%.
  const playStart = 10;
  const playEnd = 90;
  const majorSteps = Array.from({ length: 21 }).map((_, i) => i); // 0..20 every 5 yards
  if (orientation === "portrait") {
    return (
      <>
        {majorSteps.map((i) => {
          const top = playStart + (i * (playEnd - playStart)) / 20;
          const cls = i === 0 || i === 20 ? "goal-line-horiz" : "yard-line";
          return (
            <div key={`h-${i}`} className={cls} style={{ top: `${top}%` }} />
          );
        })}
      </>
    );
  }
  return (
    <>
      {majorSteps.map((i) => {
        const left = playStart + (i * (playEnd - playStart)) / 20;
        const cls = i === 0 || i === 20 ? "goal-line-vert" : "yard-line-vert";
        return (
          <div key={`v-${i}`} className={cls} style={{ left: `${left}%` }} />
        );
      })}
    </>
  );
}

function YardTicks({ orientation }: { orientation: Orientation }) {
  // 1-yard ticks along top/bottom (landscape) or left/right (portrait) for 100-yard field
  const playStart = 10;
  const playEnd = 90;
  const ticks = Array.from({ length: 99 }).map((_, i) => i + 1); // 1..99
  if (orientation === "portrait") {
    return (
      <>
        {ticks.map((i) => {
          const top = playStart + (i * (playEnd - playStart)) / 100;
          return (
            <>
              <div
                key={`tl-${i}`}
                className="yard-tick-h"
                style={{ top: `${top}%`, left: `1%` }}
              />
              <div
                key={`tr-${i}`}
                className="yard-tick-h"
                style={{ top: `${top}%`, right: `1%` }}
              />
            </>
          );
        })}
      </>
    );
  }
  return (
    <>
      {ticks.map((i) => {
        const left = playStart + (i * (playEnd - playStart)) / 100;
        return (
          <>
            <div
              key={`tt-${i}`}
              className="yard-tick"
              style={{ left: `${left}%`, top: `1%` }}
            />
            <div
              key={`tb-${i}`}
              className="yard-tick"
              style={{ left: `${left}%`, bottom: `1%` }}
            />
          </>
        );
      })}
    </>
  );
}

function YardNumbers({ orientation }: { orientation: Orientation }) {
  // Numbers at each 10-yard interval inside the field (excluding end zones)
  const seq = [10, 20, 30, 40, 50, 40, 30, 20, 10];
  const playStart = 10;
  const playEnd = 90;
  if (orientation === "portrait") {
    return (
      <>
        {seq.map((n, i) => {
          const top = playStart + ((i + 0.5) * (playEnd - playStart)) / 9;
          return (
            <div
              key={`pn-${i}`}
              className="yard-number portrait"
              style={{ top: `${top}%`, left: "6%" }}
            >
              {n}
            </div>
          );
        })}
        {seq.map((n, i) => {
          const top = playStart + ((i + 0.5) * (playEnd - playStart)) / 9;
          return (
            <div
              key={`pn2-${i}`}
              className="yard-number portrait flip"
              style={{ top: `${top}%`, right: "6%" }}
            >
              {n}
            </div>
          );
        })}
      </>
    );
  }
  return (
    <>
      {seq.map((n, i) => {
        const left = playStart + ((i + 0.5) * (playEnd - playStart)) / 9;
        return (
          <div
            key={`ln-${i}`}
            className="yard-number"
            style={{ left: `${left}%`, top: "8%" }}
          >
            {n}
          </div>
        );
      })}
      {seq.map((n, i) => {
        const left = playStart + ((i + 0.5) * (playEnd - playStart)) / 9;
        return (
          <div
            key={`ln2-${i}`}
            className="yard-number flip"
            style={{ left: `${left}%`, bottom: "8%" }}
          >
            {n}
          </div>
        );
      })}
    </>
  );
}

function EndZones({ orientation }: { orientation: Orientation }) {
  if (orientation === "portrait") {
    return (
      <>
        <div className="endzone portrait top">
          <span className="endzone-text">IT TITANS</span>
        </div>
        <div className="endzone portrait bottom">
          <span className="endzone-text">THE GLITCH SQUAD</span>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="endzone left">
        <span className="endzone-text rotate">THE GLITCH SQUAD</span>
      </div>
      <div className="endzone right">
        <span className="endzone-text rotate">IT TITANS</span>
      </div>
    </>
  );
}

function Goal({ portrait }: { portrait?: boolean }) {
  return (
    <div className={`goal ${portrait ? "portrait" : ""}`}>
      <div className="gp-stand" />
      <div className="gp-cross" />
      <div className="gp-upright left" />
      <div className="gp-upright right" />
      <div className="gp-pad" />
    </div>
  );
}

function GoalPosts({ orientation }: { orientation: Orientation }) {
  if (orientation === "portrait") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: "0%",
            left: "50%",
            transform: "translate(-50%, -110%)",
          }}
        >
          <Goal portrait />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "0%",
            left: "50%",
            transform: "translate(-50%, 110%) rotate(180deg)",
          }}
        >
          <Goal portrait />
        </div>
      </>
    );
  }
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: "0%",
          top: "50%",
          transform: "translate(-110%, -50%) rotate(-90deg)",
        }}
      >
        <Goal />
      </div>
      <div
        style={{
          position: "absolute",
          right: "0%",
          top: "50%",
          transform: "translate(110%, -50%) rotate(90deg)",
        }}
      >
        <Goal />
      </div>
    </>
  );
}

function Scoreboard({
  home,
  guest,
  clockSeconds,
  period,
}: {
  home: number;
  guest: number;
  clockSeconds: number;
  period: number;
}) {
  const mm = Math.floor(clockSeconds / 60)
    .toString()
    .padStart(1, "0");
  const ss = Math.floor(clockSeconds % 60)
    .toString()
    .padStart(2, "0");
  return (
    <div className="scoreboard">
      <div className="sb-side">
        <div className="sb-label">GUEST</div>
        <div className="sb-score">{guest}</div>
        <div className="sb-team">THE GLITCH SQUAD</div>
      </div>
      <div className="sb-center">
        <div className="sb-title">THE GLITCH</div>
        <div className="sb-title small">vs</div>
        <div className="sb-title">IT TITANS</div>
        <div className="sb-meta">
          <div className="sb-clock">
            {mm}:{ss}
          </div>
          <div className="sb-period">P{period}</div>
        </div>
      </div>
      <div className="sb-side">
        <div className="sb-label">HOME</div>
        <div className="sb-score">{home}</div>
        <div className="sb-team">IT TITANS</div>
      </div>
    </div>
  );
}

export function Stands() {
  // Lightweight visual rows of seats to make stands look like chairs
  const rowCount = 6;
  const seatsPerRow = 18;
  return (
    <div className="stands" aria-hidden>
      {Array.from({ length: rowCount }).map((_, rowIdx) => (
        <div className="seat-row" key={rowIdx}>
          {Array.from({ length: seatsPerRow }).map((_, seatIdx) => (
            <div className="seat" key={seatIdx} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PeopleGallery({ heads }: { heads: HeadConfig[] }) {
  return (
    <div className="people-gallery">
      {heads.map((h) => (
        <div
          className="gallery-item"
          key={h.name}
          title={`${h.name} — ${h.role}`}
        >
          <Head head={h} size={125} />
          <div className="gallery-name">{h.name}</div>
        </div>
      ))}
    </div>
  );
}

function ChantBanners({ orientation }: { orientation: Orientation }) {
  return (
    <div className="crowd">
      <div className="banner-strip row-1">
        <div className="banner-track">
          {CHANTS.concat(CHANTS).map((c, i) => (
            <div className="poster" key={`r1-${i}`}>
              {c}
            </div>
          ))}
        </div>
      </div>
      {orientation === "portrait" && (
        <div className="banner-strip row-2">
          <div className="banner-track reverse">
            {CHANTS.concat(CHANTS).map((c, i) => (
              <div className="poster" key={`r2-${i}`}>
                {c}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function useFieldRefSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const getPoint = (xPct: number, yPct: number) => {
    const el = ref.current;
    if (!el) return { left: "0px", top: "0px" };
    const rect = el.getBoundingClientRect();
    return {
      left: `${(rect.width * xPct) / 100}px`,
      top: `${(rect.height * yPct) / 100}px`,
    };
  };
  return { ref, getPoint };
}

export default function App() {
  const [orientation, setOrientation] = useState<Orientation>(() =>
    window.matchMedia && window.matchMedia("(orientation: portrait)").matches
      ? "portrait"
      : "landscape"
  );
  useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches =
        "matches" in e ? e.matches : (e as MediaQueryList).matches;
      setOrientation(matches ? "portrait" : "landscape");
    };
    if ((mql as any).addEventListener)
      (mql as any).addEventListener("change", handler as any);
    else (mql as any).addListener(handler as any);
    handler(mql);
    return () => {
      if ((mql as any).removeEventListener)
        (mql as any).removeEventListener("change", handler as any);
      else (mql as any).removeListener(handler as any);
    };
  }, []);

  const { offense, defense } = useFormation(orientation);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [state, setState] = useState<GameState>("idle");
  const [heads, setHeads] = useState<HeadConfig[]>(DEFAULT_HEADS);
  const [humans, setHumans] = useState<Entity[]>(() =>
    offense.map((p, i) => ({
      id: `H${i + 1}`,
      type: "human",
      x: p.x,
      y: p.y,
      head: DEFAULT_HEADS[i],
      vx: Math.random() * 0.4 - 0.2,
      vy: Math.random() * 0.4 - 0.2,
    }))
  );
  const [robots, setRobots] = useState<Entity[]>(() =>
    defense.map((p, i) => ({
      id: `R${i + 1}`,
      type: "robot",
      x: p.x,
      y: p.y,
      vx: Math.random() * 0.4 - 0.2,
      vy: Math.random() * 0.4 - 0.2,
    }))
  );
  const [ballOwner, setBallOwner] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [guestScore, setGuestScore] = useState(0);
  const { ref: fieldRef } = useFieldRefSize();
  const [showConfig, setShowConfig] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [period, setPeriod] = useState(1);
  const [clock, setClock] = useState(PERIOD_SECONDS);
  const [showPeriodBreak, setShowPeriodBreak] = useState(false);
  const [muted, setMuted] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const whistleAudioRef = useRef<HTMLAudioElement | null>(null);
  const crowdAudioRef = useRef<HTMLAudioElement | null>(null);
  const tdTitansAudioRef = useRef<HTMLAudioElement | null>(null);
  const tdBotsAudioRef = useRef<HTMLAudioElement | null>(null);
  const shoutTimeoutRef = useRef<number | null>(null);
  const activeShoutsRef = useRef<HTMLAudioElement[]>([]);

  // Reposition teams when orientation changes
  useEffect(() => {
    setHumans(
      offense.map((p, i) => ({
        id: `H${i + 1}`,
        type: "human",
        x: p.x,
        y: p.y,
        head: heads[i],
        vx: Math.random() * 0.4 - 0.2,
        vy: Math.random() * 0.4 - 0.2,
      }))
    );
    setRobots(
      defense.map((p, i) => ({
        id: `R${i + 1}`,
        type: "robot",
        x: p.x,
        y: p.y,
        vx: Math.random() * 0.4 - 0.2,
        vy: Math.random() * 0.4 - 0.2,
      }))
    );
  }, [orientation, offense, defense, heads]);

  const ballPosition = useMemo(() => {
    const owner =
      humans.concat(robots).find((e) => e.id === ballOwner) || humans[0];
    return { x: owner.x, y: owner.y - 6 };
  }, [ballOwner, humans, robots]);

  function startGame() {
    setPeriod(1);
    setClock(PERIOD_SECONDS);
    setState("playing");
    setGameRunning(true);
    // Kickoff-like reset and random possession
    resetKickoffImmediate();
    // SFX: whistle at 25% volume, then loop crowd background
    playWhistleThenCrowd();
    // Start randomized shouts over crowd
    scheduleNextShout();
  }

  function passToHuman(targetId: string) {
    if (state !== "playing") return;
    // Only allow passing if a human currently has the ball
    const owner = humans.concat(robots).find((e) => e.id === ballOwner);
    if (owner?.type !== "human") return;
    setSelectedId(targetId);
    setBallOwner(targetId);
  }

  function tryShoot() {
    if (state !== "playing") return;
    const owner = humans.concat(robots).find((e) => e.id === ballOwner);
    if (!owner) return;
    const ownerIsHuman = owner.type === "human";
    // Count touching the goal line as a score because movement clamps to [10, 90]
    const humanInEndzone =
      orientation === "portrait" ? owner.y <= 10 : owner.x <= 10;
    const robotInEndzone =
      orientation === "portrait" ? owner.y >= 90 : owner.x >= 90;

    if (ownerIsHuman && humanInEndzone) {
      setHomeScore((s) => s + 7);
      setState("scored");
      playTouchdown("titans");
    } else if (!ownerIsHuman && robotInEndzone) {
      setGuestScore((s) => s + 7);
      setState("scored");
      playTouchdown("bots");
    }
    if (humanInEndzone || robotInEndzone) {
      setTimeout(() => {
        // Reset to kickoff-ish
        resetKickoffImmediate();
        setState("playing");
      }, 1200);
    }
  }

  // removed huddle controls for streamlined scoreboard UI

  // Allow clicking the field to move the selected player to an empty spot
  function onFieldClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!selectedId) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setHumans((prev) =>
      prev.map((h) => (h.id === selectedId ? { ...h, x: xPct, y: yPct } : h))
    );
  }

  // Removed auto-start; game begins after clicking Start on the welcome overlay

  function playWhistleThenCrowd() {
    if (!whistleAudioRef.current) {
      whistleAudioRef.current = new Audio(WhistleSfx);
    }
    if (!crowdAudioRef.current) {
      crowdAudioRef.current = new Audio(CrowdSfx);
      crowdAudioRef.current.loop = true;
      crowdAudioRef.current.volume = 0.25; // background volume
    }
    const whistle = whistleAudioRef.current;
    const crowd = crowdAudioRef.current;
    // Respect current mute setting
    whistle.muted = muted;
    crowd.muted = muted;
    try {
      crowd.pause();
    } catch {}
    whistle.currentTime = 0;
    whistle.volume = 0.25;
    whistle
      .play()
      .then(() => {
        whistle.addEventListener(
          "ended",
          () => {
            if (!crowd) return;
            crowd.currentTime = 0;
            crowd.play().catch(() => {});
          },
          { once: true }
        );
      })
      .catch(() => {
        // Autoplay might fail if not triggered by user gesture; ignored
      });
  }

  // Keep crowd ambience running continuously after first start

  // Apply mute to any existing audio elements when toggled
  useEffect(() => {
    if (whistleAudioRef.current) whistleAudioRef.current.muted = muted;
    if (crowdAudioRef.current) crowdAudioRef.current.muted = muted;
    if (tdTitansAudioRef.current) tdTitansAudioRef.current.muted = muted;
    if (tdBotsAudioRef.current) tdBotsAudioRef.current.muted = muted;
    activeShoutsRef.current.forEach((a) => {
      a.muted = muted;
    });
  }, [muted]);

  function toggleMute() {
    setMuted((m) => !m);
  }

  function playTouchdown(team: "titans" | "bots") {
    if (team === "titans") {
      if (!tdTitansAudioRef.current)
        tdTitansAudioRef.current = new Audio(TdTitansSfx);
      const a = tdTitansAudioRef.current;
      a.muted = muted;
      a.volume = 0.15;
      a.currentTime = 0;
      a.play().catch(() => {});
    } else {
      if (!tdBotsAudioRef.current)
        tdBotsAudioRef.current = new Audio(TdBotsSfx);
      const a = tdBotsAudioRef.current;
      a.muted = muted;
      a.volume = 0.15; // per request
      a.currentTime = 0;
      a.play().catch(() => {});
    }
  }

  const SHOUT_SOUNDS = useMemo(
    () => [
      ChantCtrlAltDefeat,
      ChantFirstDown,
      ChantGoHumans,
      ChantNoSoul,
      ChantRamSpam,
    ],
    []
  );

  function scheduleNextShout() {
    if (!gameRunning || state !== "playing") return;
    if (shoutTimeoutRef.current) {
      clearTimeout(shoutTimeoutRef.current);
      shoutTimeoutRef.current = null;
    }
    const delayMs = 5000 + Math.floor(Math.random() * 5000); // 5–10s
    shoutTimeoutRef.current = window.setTimeout(() => {
      if (!gameRunning || state !== "playing") {
        return;
      }
      playRandomShout();
      scheduleNextShout();
    }, delayMs);
  }

  function playRandomShout() {
    const src = SHOUT_SOUNDS[Math.floor(Math.random() * SHOUT_SOUNDS.length)];
    if (!src) return;
    const a = new Audio(src);
    a.muted = muted;
    a.volume = 0.25; // shout over crowd
    // Track active shout to sync mute toggles
    activeShoutsRef.current.push(a);
    const cleanup = () => {
      const idx = activeShoutsRef.current.indexOf(a);
      if (idx >= 0) activeShoutsRef.current.splice(idx, 1);
    };
    a.addEventListener("ended", cleanup, { once: true });
    a.addEventListener("error", cleanup, { once: true });
    a.play().catch(() => {
      cleanup();
    });
  }

  useEffect(() => {
    if (gameRunning && state === "playing") {
      scheduleNextShout();
    } else if (shoutTimeoutRef.current) {
      clearTimeout(shoutTimeoutRef.current);
      shoutTimeoutRef.current = null;
    }
    return () => {
      if (shoutTimeoutRef.current) {
        clearTimeout(shoutTimeoutRef.current);
        shoutTimeoutRef.current = null;
      }
    };
  }, [gameRunning, state]);

  // Countdown game clock
  useEffect(() => {
    if (state !== "playing") return;
    const id = setInterval(() => {
      setClock((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [state, period]);

  // Handle end of period
  useEffect(() => {
    if (state !== "playing") return;
    if (clock > 0) return;
    if (period < TOTAL_PERIODS) {
      // Special pause after 1st period
      if (period === 1) {
        setState("idle");
        setShowPeriodBreak(true);
        return;
      }
      setPeriod((p) => p + 1);
      resetKickoffImmediate();
      setClock(PERIOD_SECONDS);
    } else {
      // End of game
      setState("idle");
      setGameRunning(false);
    }
  }, [clock, state, period]);

  function startSecondPeriod() {
    setShowPeriodBreak(false);
    setPeriod((p) => p + 1);
    resetKickoffImmediate();
    setClock(PERIOD_SECONDS);
    setState("playing");
  }

  function resetKickoffImmediate() {
    setHumans(
      offense.map((p, i) => ({
        id: `H${i + 1}`,
        type: "human",
        x: p.x,
        y: p.y,
        head: heads[i],
        vx: Math.random() * 0.4 - 0.2,
        vy: Math.random() * 0.4 - 0.2,
      }))
    );
    setRobots(
      defense.map((p, i) => ({
        id: `R${i + 1}`,
        type: "robot",
        x: p.x,
        y: p.y,
        vx: Math.random() * 0.4 - 0.2,
        vy: Math.random() * 0.4 - 0.2,
      }))
    );
    const all = [
      ...offense.map((_, i) => ({
        id: `H${i + 1}`,
        type: "human" as const,
      })),
      ...defense.map((_, i) => ({
        id: `R${i + 1}`,
        type: "robot" as const,
      })),
    ];
    const randomOwner = all[Math.floor(Math.random() * all.length)] || {
      id: "H1",
      type: "human" as const,
    };
    setBallOwner(randomOwner.id);
    if (randomOwner.type === "human") setSelectedId(randomOwner.id);
  }

  // Auto-detect scoring when the ball carrier enters the end zone
  useEffect(() => {
    tryShoot();
  }, [ballOwner, humans, robots, orientation]);

  // Simple movement loop and collision detection
  useEffect(() => {
    if (state !== "playing") return;
    const interval = setInterval(() => {
      // Determine chase behavior
      const owner = humans.concat(robots).find((e) => e.id === ballOwner);
      const ownerIsHuman = owner?.type === "human";

      setHumans((prev) => {
        return prev.map((h) => {
          let { x, y, vx = 0, vy = 0 } = h;
          // Humans drift slightly left/up depending on orientation
          const driftX = orientation === "portrait" ? 0 : -SPEED.drift;
          const driftY = orientation === "portrait" ? -SPEED.drift : 0;

          // Separation from other humans to avoid huddling
          let sepX = 0;
          let sepY = 0;
          for (const other of prev) {
            if (other.id === h.id) continue;
            const dx = x - other.x;
            const dy = y - other.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < SEPARATION.radius) {
              const force =
                (SEPARATION.strength * (SEPARATION.radius - dist)) /
                SEPARATION.radius;
              sepX += (dx / dist) * force;
              sepY += (dy / dist) * force;
            }
          }

          x += vx + driftX;
          y += vy + driftY;
          // gently apply separation into velocity for next step
          vx += sepX;
          vy += sepY;

          // clamp idle speeds
          vx = Math.max(-SPEED.idleMax, Math.min(SPEED.idleMax, vx));
          vy = Math.max(-SPEED.idleMax, Math.min(SPEED.idleMax, vy));
          // bounds within play area 10..90
          if (x < 10 || x > 90) vx = -vx;
          if (y < 10 || y > 90) vy = -vy;
          x = Math.min(90, Math.max(10, x));
          y = Math.min(90, Math.max(10, y));
          return { ...h, x, y, vx, vy };
        });
      });

      setRobots((prev) => {
        return prev.map((r) => {
          let { x, y, vx = 0, vy = 0 } = r;
          if (!ownerIsHuman && owner && r.id === owner.id) {
            // Ball-carrying robot heads to its scoring endzone (right/bottom)
            const targetX = orientation === "portrait" ? x : 95;
            const targetY = orientation === "portrait" ? 95 : y;
            const dx = targetX - x;
            const dy = targetY - y;
            const len = Math.hypot(dx, dy) || 1;
            vx = (dx / len) * SPEED.chaseCarrier;
            vy = (dy / len) * SPEED.chaseCarrier;
          } else if (!ownerIsHuman && owner) {
            // Supporting robots move in same direction, slightly slower
            const targetX = orientation === "portrait" ? r.x : 95;
            const targetY = orientation === "portrait" ? 95 : r.y;
            const dx = targetX - x;
            const dy = targetY - y;
            const len = Math.hypot(dx, dy) || 1;
            vx = (dx / len) * SPEED.support;
            vy = (dy / len) * SPEED.support;
          } else if (ownerIsHuman && owner) {
            // Chase the human ball carrier at human-equivalent speed
            const dx = owner.x - x;
            const dy = owner.y - y;
            const len = Math.hypot(dx, dy) || 1;
            vx = (dx / len) * SPEED.chaseCarrier;
            vy = (dy / len) * SPEED.chaseCarrier;
          } else {
            // Idle wander similar envelope to humans
            vx += Math.random() * SPEED.wanderJitter - SPEED.wanderJitter / 2;
            vy += Math.random() * SPEED.wanderJitter - SPEED.wanderJitter / 2;
          }

          // Separation from other robots to avoid huddling
          let sepX = 0;
          let sepY = 0;
          for (const other of prev) {
            if (other.id === r.id) continue;
            const dx = x - other.x;
            const dy = y - other.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < SEPARATION.radius) {
              const force =
                (SEPARATION.strength * (SEPARATION.radius - dist)) /
                SEPARATION.radius;
              sepX += (dx / dist) * force;
              sepY += (dy / dist) * force;
            }
          }
          vx += sepX;
          vy += sepY;

          // clamp speeds to match humans
          vx = Math.max(-SPEED.idleMax, Math.min(SPEED.idleMax, vx));
          vy = Math.max(-SPEED.idleMax, Math.min(SPEED.idleMax, vy));
          x += vx;
          y += vy;
          if (x < 10 || x > 90) vx = -vx;
          if (y < 10 || y > 90) vy = -vy;
          x = Math.min(90, Math.max(10, x));
          y = Math.min(90, Math.max(10, y));
          return { ...r, x, y, vx, vy };
        });
      });

      // Collision: humans tagging the robot ball carrier (humans steal the ball)
      if (owner && !ownerIsHuman) {
        humans.forEach((h) => {
          const dx = h.x - owner.x;
          const dy = h.y - owner.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 5) {
            setBallOwner(h.id);
          }
        });
      }
      // Collision: robots tagging the human ball carrier (robots steal the ball)
      if (owner && ownerIsHuman) {
        robots.forEach((r) => {
          const dx = r.x - owner.x;
          const dy = r.y - owner.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 5) {
            setBallOwner(r.id);
          }
        });
      }
    }, 40);
    return () => clearInterval(interval);
  }, [state, orientation, robots, humans, ballOwner]);

  return (
    <div className="app-shell">
      <div className="stadium">
        {showWelcome && (
          <div className="welcome-overlay">
            <div className="welcome-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={WelcomeBanner}
                alt="Welcome"
                className="welcome-image"
              />
              <div className="welcome-actions">
                <button
                  className="ui-button"
                  onClick={() => {
                    setShowWelcome(false);
                    startGame();
                  }}
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        )}
        <ChantBanners orientation={orientation} />
        <div
          className={`field ${orientation}`}
          ref={fieldRef}
          onClick={onFieldClick}
        >
          <EndZones orientation={orientation} />
          <GoalPosts orientation={orientation} />
          <YardLines orientation={orientation} />
          <YardTicks orientation={orientation} />
          <YardNumbers orientation={orientation} />
          {humans.map((h) => (
            <div
              key={h.id}
              onClick={(ev) => {
                ev.stopPropagation();
                passToHuman(h.id);
              }}
            >
              <Human entity={h} selected={selectedId === h.id} />
            </div>
          ))}
          {robots.map((r, idx) => (
            <div key={r.id} onClick={(ev) => ev.stopPropagation()}>
              <Robot entity={{ ...r, number: 70 + idx }} selected={false} />
            </div>
          ))}
          <div
            className="ball"
            style={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%` }}
          >
            <div className="laces" />
          </div>
          {/* Scoreboard renders above field */}
        </div>
        <Scoreboard
          home={homeScore}
          guest={guestScore}
          clockSeconds={clock}
          period={period}
        />
        <div className="ui-overlay">
          <button className="ui-button" onClick={toggleMute}>
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>
        {showPeriodBreak && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.8)",
              borderRadius: 12,
              padding: 20,
              width: "min(92vw, 520px)",
              color: "#fff",
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              zIndex: 50,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
              1st period is over
            </div>
            <button className="ui-button" onClick={startSecondPeriod}>
              Start Second Period
            </button>
          </div>
        )}
        {showConfig && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.8)",
              borderRadius: 12,
              padding: 16,
              width: "min(92vw, 520px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <strong>Set Headshots</strong>
              <button
                className="ui-button"
                onClick={() => setShowConfig(false)}
              >
                Done
              </button>
            </div>
            {heads.map((h, i) => (
              <div
                key={h.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Head head={h} size={68.75} />
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {h.name} — {h.role}
                  </div>
                  <input
                    type="url"
                    placeholder="Paste image URL (optional)"
                    value={h.imgUrl || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHeads((prev) =>
                        prev.map((ph, idx) =>
                          idx === i ? { ...ph, imgUrl: v } : ph
                        )
                      );
                      setHumans((prev) =>
                        prev.map((ent, idx) =>
                          ent.type === "human" && idx === i
                            ? {
                                ...ent,
                                head: {
                                  ...(ent.head as HeadConfig),
                                  imgUrl: v,
                                },
                              }
                            : ent
                        )
                      );
                    }}
                    style={{
                      width: "100%",
                      padding: 6,
                      borderRadius: 8,
                      border: 0,
                    }}
                  />
                  <div style={{ marginTop: 6 }}>
                    <label style={{ fontSize: 12, opacity: 0.9 }}>
                      or upload image:
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = URL.createObjectURL(file);
                          setHeads((prev) =>
                            prev.map((ph, idx) =>
                              idx === i ? { ...ph, imgUrl: url } : ph
                            )
                          );
                          setHumans((prev) =>
                            prev.map((ent, idx) =>
                              ent.type === "human" && idx === i
                                ? {
                                    ...ent,
                                    head: {
                                      ...(ent.head as HeadConfig),
                                      imgUrl: url,
                                    },
                                  }
                                : ent
                            )
                          );
                        }}
                        style={{ marginLeft: 8 }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
