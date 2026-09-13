"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarDays, Dumbbell, House, Lightbulb, Moon, Scale, Settings, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { startSession } from "@/app/(app)/gym/session/actions";
import { createRequest } from "@/app/(app)/settings/requests/actions";
import { weekdayInZone } from "@/lib/gym/types";
import { EASE_OUT_SOFT, transitions } from "@/lib/motion";
import { useAppTimeZone, useWriteTimeZone } from "@/components/shell/app-time-zone";
import { LogWeightSheet } from "@/components/weight/log-weight-sheet";
import { RequestSheet, type RequestSheetValues } from "@/components/requests/request-sheet";
import { LogPrayerSheet } from "@/components/prayers/log-prayer-sheet";
import { dateKey } from "@/lib/time/format";
import { WAQTS, type PrayerLog, type Waqt } from "@/lib/prayers/types";
import { cn } from "@/lib/utils";

/** Hold longer than this and it's the wheel, not a tap to Home (US-014 §3). */
const HOLD_MS = 120;
/** Moving further than this before the hold fires opens the wheel at once — "press and drag". */
const DRAG_OPEN_PX = 8;
/**
 * Button centre to node centre. Keeps adjacent 48px nodes clear across a 90° sweep — bumped from
 * 172 when a 7th node (US-015) tightened the spacing between them from 18° to ~15°; this keeps
 * roughly the same few px of clearance the original 6-node wheel had.
 */
const RADIUS = 206;
/** A node is under the finger within this distance of its centre: a 64px hit area, well past 44. */
const HIT_RADIUS = 32;
const BUTTON = 52;
const NODE = 48;
/** The button's inset from the right edge, matching `right-5`. */
const EDGE = 20;

type ActionId = "home" | "gym" | "weight" | "prayer" | "request" | "plans" | "settings";

interface NodeSpec {
  id: ActionId;
  label: string;
  icon: LucideIcon;
}

/**
 * In order along the arc, from the bottom edge to the right edge. Home sits where a right thumb
 * already rests along the bottom; Settings, the least frequent, is the furthest reach up the side.
 * Prayer sits right after Home — up to 5 logs a day makes it the single most frequent action here
 * (US-015).
 */
const NODES: NodeSpec[] = [
  { id: "home", label: "Home", icon: House },
  { id: "prayer", label: "Log prayer", icon: Moon },
  { id: "gym", label: "Start gym session", icon: Dumbbell },
  { id: "weight", label: "Log weight", icon: Scale },
  { id: "request", label: "Add request", icon: Lightbulb },
  { id: "plans", label: "Switch plan", icon: CalendarDays },
  { id: "settings", label: "Settings", icon: Settings },
];

/**
 * Node offsets from the button centre, on a true circle (owner decision, roadmap L7).
 *
 * The draft fanned nodes across 200°–340°, an arc that floats in the middle of the screen. This one
 * is a quarter circle centred on the corner button, running from 180° — flat along the bottom edge —
 * to 90°, straight up the right edge: the arc a right thumb actually sweeps from that corner.
 * Screen y grows downward, hence the negated sine.
 */
const OFFSETS = NODES.map((_, index) => {
  const theta = Math.PI - (index * (Math.PI / 2)) / (NODES.length - 1);
  return { x: Math.cos(theta) * RADIUS, y: -Math.sin(theta) * RADIUS };
});

/** Screens where the corner is already taken by a sticky primary action. */
function cornerIsTaken(pathname: string): boolean {
  return (
    pathname === "/gym/session" || // Finish / Minimise own it (US-014 §5)
    pathname.startsWith("/stopwatch/") || // the focus view's full-width Start/Stop
    pathname.endsWith("/new") ||
    pathname.endsWith("/edit")
  );
}

function haptic(ms: number) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

export interface RadialMenuProps {
  /** The active plan's seven days, or null with no active plan. */
  planDays: { weekday: number; id: string; isRest: boolean }[] | null;
  gymRunning: boolean;
  lastWeightKg: number | null;
  /** Last couple of days, so "today" can be resolved once the app zone is known (US-015). */
  recentPrayers: PrayerLog[];
}

/**
 * The radial quick-action menu (US-014).
 *
 * A fixed corner button rather than a long-press anywhere, which would collide with scroll, the
 * week strip and every row's tap target. **Tap** goes Home. **Press and hold**, or press and drag,
 * fans the wheel out; release over a node to run it, release anywhere else to cancel. A mouse gets
 * click-to-toggle instead, and the keyboard gets Enter to open, arrows to move, Enter to run.
 *
 * Motion drives the fan-out, because it follows a finger and staggers six elements — the case the
 * CSS-vs-Motion rule reserves Motion for (design-system §9.1). Everything animated is `transform`
 * and `opacity`.
 */
export function RadialMenu({ planDays, gymRunning, lastWeightKg, recentPrayers }: RadialMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const timeZone = useAppTimeZone();
  const writeTimeZone = useWriteTimeZone();
  const reduceMotion = useReducedMotion() ?? false;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hold" | "toggle">("hold");
  const [active, setActive] = useState<number | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [prayerWaqt, setPrayerWaqt] = useState<Waqt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [requestPending, startRequestTransition] = useTransition();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef<number | null>(null);
  const lastPointerType = useRef<string>("touch");
  const press = useRef<{ x: number; y: number; opened: boolean; timer: ReturnType<typeof setTimeout> | null } | null>(
    null,
  );

  const today = timeZone && planDays ? (planDays.find((day) => day.weekday === weekdayInZone(timeZone)) ?? null) : null;
  // Disabled nodes stay visible and in place, so the wheel's layout never depends on state (§4).
  const enabled = (id: ActionId) =>
    (id !== "gym" || (!gymRunning && today !== null && !today.isRest)) && (id !== "prayer" || timeZone !== null);

  // The first not-yet-logged waqt today, or Isha (to review/edit) once all five are in.
  const todayKey = timeZone ? dateKey(new Date().toISOString(), timeZone) : null;
  const loggedToday = new Set(recentPrayers.filter((log) => log.prayerDate === todayKey).map((log) => log.waqt));
  const nextWaqt: Waqt = WAQTS.find((waqt) => !loggedToday.has(waqt)) ?? WAQTS[WAQTS.length - 1];
  const existingPrayer = recentPrayers.find((log) => log.prayerDate === todayKey && log.waqt === nextWaqt) ?? null;

  // Hidden while any sheet or dialog is open: vaul drawers and Radix dialogs both render
  // `role="dialog"` with `data-state="open"`, and both claim the bottom of the screen.
  useEffect(() => {
    const check = () => setDialogOpen(document.querySelector('[role="dialog"][data-state="open"]') !== null);
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    return () => observer.disconnect();
  }, []);

  const hidden = dialogOpen || cornerIsTaken(pathname);

  const highlight = (index: number | null) => {
    if (index !== activeRef.current && index !== null) haptic(6);
    activeRef.current = index;
    setActive(index);
  };

  const close = () => {
    setOpen(false);
    highlight(null);
  };

  const openWheel = (nextMode: "hold" | "toggle") => {
    if (press.current) {
      press.current.opened = true;
      if (press.current.timer) clearTimeout(press.current.timer);
      press.current.timer = null;
    }
    setMode(nextMode);
    setOpen(true);
    highlight(null);
    haptic(10);
  };

  useEffect(() => {
    if (hidden && open) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Which node, if any, sits under a screen point. */
  const nodeAt = (clientX: number, clientY: number): number | null => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let best: number | null = null;
    let bestDistance = HIT_RADIUS;
    for (let index = 0; index < OFFSETS.length; index++) {
      const distance = Math.hypot(clientX - (cx + OFFSETS[index].x), clientY - (cy + OFFSETS[index].y));
      if (distance <= bestDistance) {
        best = index;
        bestDistance = distance;
      }
    }
    return best;
  };

  const submitRequest = (values: RequestSheetValues) => {
    startRequestTransition(async () => {
      const result = await createRequest(values);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't save that request.", {
          action: { label: "Retry", onClick: () => submitRequest(values) },
        });
        return;
      }
      toast.success("Request saved", {
        action: { label: "View", onClick: () => router.push("/settings/requests") },
      });
      setRequestOpen(false);
    });
  };

  const perform = (index: number) => {
    const node = NODES[index];
    if (!enabled(node.id)) return;
    haptic(14);
    close();

    switch (node.id) {
      case "home":
        router.push("/");
        break;
      case "plans":
        router.push("/gym/plans");
        break;
      case "settings":
        router.push("/settings");
        break;
      case "weight":
        setWeightOpen(true);
        break;
      case "prayer":
        if (!todayKey) return;
        setPrayerWaqt(nextWaqt);
        break;
      case "request":
        setRequestOpen(true);
        break;
      case "gym": {
        if (!today) return;
        const form = new FormData();
        form.set("planDayId", today.id);
        form.set("startedAt", new Date().toISOString());
        form.set("timeZone", timeZone ?? writeTimeZone());
        startTransition(async () => {
          // On success the action redirects to /gym/session and never returns here.
          const result = await startSession({ ok: true, message: null }, form);
          if (result && !result.ok) toast.error(result.message ?? "Couldn't start a session.");
        });
        break;
      }
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    lastPointerType.current = event.pointerType;
    if (event.pointerType === "mouse") return; // a mouse toggles on click instead
    // Capture, so the finger keeps reporting to this button while it drags out over the nodes.
    event.currentTarget.setPointerCapture(event.pointerId);
    press.current = {
      x: event.clientX,
      y: event.clientY,
      opened: false,
      timer: setTimeout(() => openWheel("hold"), HOLD_MS),
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const state = press.current;
    if (!state) return;
    if (!state.opened) {
      if (Math.hypot(event.clientX - state.x, event.clientY - state.y) <= DRAG_OPEN_PX) return;
      openWheel("hold");
    }
    highlight(nodeAt(event.clientX, event.clientY));
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const state = press.current;
    press.current = null;
    if (!state) return;
    if (state.timer) clearTimeout(state.timer);
    // A plain tap — no hold, no drag — is Home (§3). The wheel never opened.
    if (!state.opened) {
      router.push("/");
      return;
    }
    const index = nodeAt(event.clientX, event.clientY);
    if (index !== null) perform(index);
    else close();
  };

  const onPointerCancel = () => {
    const state = press.current;
    press.current = null;
    if (state?.timer) clearTimeout(state.timer);
    close();
  };

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    // `detail === 0` is a keyboard activation. A touch is fully handled by the pointer events above;
    // this click is the one the browser synthesises afterwards, and must be ignored.
    const viaKeyboard = event.detail === 0;
    if (!viaKeyboard && lastPointerType.current !== "mouse") return;
    if (open) {
      close();
      return;
    }
    openWheel("toggle");
    if (viaKeyboard) highlight(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) return;
    const step = (delta: number) => {
      event.preventDefault();
      const from = activeRef.current ?? (delta > 0 ? -1 : NODES.length);
      highlight((from + delta + NODES.length) % NODES.length);
    };
    // Up and right travel along the arc towards the right edge; down and left back to the bottom.
    if (event.key === "ArrowUp" || event.key === "ArrowRight") step(1);
    if (event.key === "ArrowDown" || event.key === "ArrowLeft") step(-1);
    if ((event.key === "Enter" || event.key === " ") && activeRef.current !== null) {
      event.preventDefault();
      perform(activeRef.current);
    }
  };

  const bottom = "calc(1.25rem + env(safe-area-inset-bottom) + var(--mini-bar-height, 0px))";
  const spring = reduceMotion ? { duration: 0 } : transitions.drag;

  return (
    <>
      {!hidden && (
        <>
          <AnimatePresence>
            {open && (
              <motion.div
                key="scrim"
                className={cn(
                  "fixed inset-0 z-40 overflow-hidden bg-neutral-950/60",
                  mode === "hold" && "pointer-events-none",
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.14, ease: EASE_OUT_SOFT }}
                onClick={close}
                aria-hidden
              >
                {/* The circle itself, so the wheel reads as a circle rather than six loose dots.
                    Frosted glass fill: a blurred, translucent disc between the button and the
                    nodes, so the page shows through softened rather than the wedge staying empty.
                    Solid neutral fallback where `backdrop-filter` isn't supported (§9.1 tokens
                    only — no arbitrary hex). Only opacity/scale animate, matching the rest of the
                    wheel; the blur itself never animates. */}
                <motion.div
                  className="absolute rounded-full border border-neutral-800 bg-neutral-900/70 supports-backdrop-filter:bg-neutral-900/30 supports-backdrop-filter:backdrop-blur-md"
                  style={{
                    width: RADIUS * 2,
                    height: RADIUS * 2,
                    right: EDGE + BUTTON / 2 - RADIUS,
                    bottom: `calc(${bottom} + ${BUTTON / 2 - RADIUS}px)`,
                  }}
                  initial={reduceMotion ? false : { scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { scale: 0.3, opacity: 0 }}
                  transition={spring}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="fixed right-5 z-40" style={{ bottom, width: BUTTON, height: BUTTON }}>
            <AnimatePresence>
              {open && active !== null && (
                <motion.p
                  key="caption"
                  // Pinned above the top node rather than beside the highlighted one: a label centred
                  // on a node hugging the right edge would run off the screen.
                  className="pointer-events-none absolute right-0 rounded-sm bg-neutral-800 px-2.5 py-1 text-body-sm whitespace-nowrap text-neutral-50"
                  style={{ bottom: BUTTON / 2 + RADIUS + NODE / 2 + 12 }}
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.12, ease: EASE_OUT_SOFT }}
                >
                  {NODES[active].label}
                  {!enabled(NODES[active].id) && <span className="text-neutral-500"> — not now</span>}
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {open && (
                <div role="menu" aria-label="Quick actions" className="absolute inset-0">
                  {NODES.map((node, index) => {
                    const Icon = node.icon;
                    const isActive = active === index;
                    const isEnabled = enabled(node.id);
                    return (
                      <motion.button
                        key={node.id}
                        id={`radial-${node.id}`}
                        type="button"
                        role="menuitem"
                        aria-label={node.label}
                        aria-disabled={!isEnabled}
                        tabIndex={mode === "toggle" ? 0 : -1}
                        onClick={() => perform(index)}
                        onPointerEnter={() => mode === "toggle" && highlight(index)}
                        className={cn(
                          "absolute top-1/2 left-1/2 flex items-center justify-center rounded-full border",
                          isActive ? "border-accent-700 bg-accent-950" : "border-neutral-700 bg-neutral-900",
                          !isEnabled && "opacity-40",
                          mode === "hold" && "pointer-events-none",
                        )}
                        style={{ width: NODE, height: NODE, marginLeft: -NODE / 2, marginTop: -NODE / 2 }}
                        initial={reduceMotion ? false : { x: 0, y: 0, scale: 0.4, opacity: 0 }}
                        animate={{
                          x: OFFSETS[index].x,
                          y: OFFSETS[index].y,
                          scale: isActive ? 54 / NODE : 1,
                          opacity: 1,
                        }}
                        exit={
                          reduceMotion
                            ? { opacity: 0, transition: { duration: 0 } }
                            : { x: 0, y: 0, scale: 0.4, opacity: 0 }
                        }
                        transition={reduceMotion ? { duration: 0 } : { ...transitions.drag, delay: index * 0.025 }}
                      >
                        <Icon className="size-5 text-neutral-50" strokeWidth={1.75} aria-hidden />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

            <motion.button
              ref={buttonRef}
              type="button"
              aria-label="Quick actions. Tap for Home, hold for more."
              aria-haspopup="menu"
              aria-expanded={open}
              aria-activedescendant={open && active !== null ? `radial-${NODES[active].id}` : undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onClick={onClick}
              onKeyDown={onKeyDown}
              onContextMenu={(event) => event.preventDefault()}
              // touch-none: the browser must not scroll the page while a thumb drags out the wheel.
              className="relative flex size-full touch-none items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 select-none [-webkit-touch-callout:none]"
              animate={{ scale: open ? 60 / BUTTON : 1 }}
              transition={spring}
            >
              <span className="size-2 rounded-full bg-accent-500" aria-hidden />
            </motion.button>
          </div>
        </>
      )}

      <LogWeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} lastValueKg={lastWeightKg} />
      <RequestSheet
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSubmit={submitRequest}
        pending={requestPending}
      />
      {prayerWaqt && todayKey && (
        <LogPrayerSheet
          open
          onClose={() => setPrayerWaqt(null)}
          waqt={prayerWaqt}
          prayerDate={todayKey}
          timeZone={timeZone ?? writeTimeZone()}
          existing={existingPrayer}
        />
      )}
    </>
  );
}
