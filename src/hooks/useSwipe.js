import { useRef, useCallback, useState } from "react";

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.4;
const MAX_ROTATION = 15;
const FLY_OUT_MS = 280;

export function useSwipe({ onSwipeLeft, onSwipeRight, onTap }) {
  const cardRef = useRef(null);
  const peekRef = useRef(null);
  const startRef = useRef(null);
  const movedRef = useRef(false);
  const busyRef = useRef(false);
  const lastRef = useRef({ x: 0, t: 0 });
  const [swipeProgress, setSwipeProgress] = useState(0);

  const updateProgress = useCallback((dx) => {
    const w = cardRef.current?.offsetWidth || 300;
    const raw = dx / (w * 0.45);
    setSwipeProgress(Math.max(-1, Math.min(1, raw)));
  }, []);

  const applyDrag = useCallback((dx, originY) => {
    const el = cardRef.current;
    if (!el) return;

    const w = el.offsetWidth || 300;
    const progress = Math.min(Math.abs(dx) / (w * 0.45), 1);
    const pivotFraction = originY / (el.offsetHeight || 330);
    const rotation = (dx / w) * MAX_ROTATION * (0.6 + pivotFraction * 0.8);

    el.style.transition = "none";
    el.style.transform = `translateX(${dx}px) rotate(${rotation}deg)`;
    el.style.boxShadow =
      `0 ${8 + progress * 14}px ${30 + progress * 35}px rgba(0,0,0,${0.08 + progress * 0.14})`;

    const peek = peekRef.current;
    if (peek) {
      const scale = 0.92 + progress * 0.08;
      const opacity = 0.45 + progress * 0.55;
      peek.style.transition = "none";
      peek.style.transform = `scale(${scale})`;
      peek.style.opacity = opacity;
    }

    updateProgress(dx);
  }, [updateProgress]);

  const snapBack = useCallback(() => {
    const el = cardRef.current;
    if (el) {
      el.style.transition =
        "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease";
      el.style.transform = "";
      el.style.boxShadow = "";
    }
    const peek = peekRef.current;
    if (peek) {
      peek.style.transition = "transform 0.4s ease, opacity 0.4s ease";
      peek.style.transform = "";
      peek.style.opacity = "";
    }
    setSwipeProgress(0);
  }, []);

  const flyOut = useCallback((direction, cb) => {
    busyRef.current = true;
    const el = cardRef.current;
    if (el) {
      const dist = (el.offsetWidth || 300) + 120;
      el.style.transition =
        `transform ${FLY_OUT_MS}ms cubic-bezier(0.4,0,0.8,0.3), opacity ${FLY_OUT_MS * 0.8}ms ease`;
      el.style.transform =
        `translateX(${direction * dist}px) rotate(${direction * MAX_ROTATION * 1.5}deg)`;
      el.style.opacity = "0";
    }
    const peek = peekRef.current;
    if (peek) {
      peek.style.transition =
        `transform ${FLY_OUT_MS}ms cubic-bezier(0.3,0.8,0.3,1), opacity ${FLY_OUT_MS}ms ease`;
      peek.style.transform = "scale(1)";
      peek.style.opacity = "1";
    }
    setTimeout(() => {
      cb?.();
      busyRef.current = false;
      setSwipeProgress(0);
    }, FLY_OUT_MS);
  }, []);

  // --- Touch events ---
  const onTouchStart = useCallback((e) => {
    if (busyRef.current) return;
    const t = e.touches[0];
    const rect = cardRef.current?.getBoundingClientRect();
    const originY = rect ? t.clientY - rect.top : 160;
    startRef.current = { x: t.clientX, y: t.clientY, originY };
    lastRef.current = { x: t.clientX, t: Date.now() };
    movedRef.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e) => {
      if (!startRef.current || busyRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startRef.current.x;

      if (Math.abs(dx) > 8 || Math.abs(t.clientY - startRef.current.y) > 8) {
        movedRef.current = true;
      }

      lastRef.current = { x: t.clientX, t: Date.now() };
      applyDrag(dx, startRef.current.originY);
    },
    [applyDrag]
  );

  const onTouchEnd = useCallback(
    (e) => {
      if (!startRef.current || busyRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startRef.current.x;
      const dt = Math.max(1, Date.now() - lastRef.current.t);
      const vx = Math.abs(t.clientX - lastRef.current.x) / dt;
      startRef.current = null;

      const absDx = Math.abs(dx);
      const fast = vx > VELOCITY_THRESHOLD;

      if (absDx >= SWIPE_THRESHOLD || (fast && absDx > 30)) {
        if (dx < 0) flyOut(-1, onSwipeLeft);
        else flyOut(1, onSwipeRight);
      } else {
        snapBack();
      }
    },
    [onSwipeLeft, onSwipeRight, flyOut, snapBack]
  );

  // --- Mouse events (desktop drag) ---
  const onMouseDown = useCallback((e) => {
    if (busyRef.current || e.button !== 0) return;
    e.preventDefault();
    const rect = cardRef.current?.getBoundingClientRect();
    const originY = rect ? e.clientY - rect.top : 160;
    startRef.current = { x: e.clientX, y: e.clientY, originY };
    lastRef.current = { x: e.clientX, t: Date.now() };
    movedRef.current = false;
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev) => {
      if (!startRef.current || busyRef.current) return;
      const dx = ev.clientX - startRef.current.x;
      if (Math.abs(dx) > 5 || Math.abs(ev.clientY - startRef.current.y) > 5) {
        movedRef.current = true;
      }
      lastRef.current = { x: ev.clientX, t: Date.now() };
      applyDrag(dx, startRef.current.originY);
    };

    const handleMouseUp = (ev) => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";

      if (!startRef.current || busyRef.current) return;
      const dx = ev.clientX - startRef.current.x;
      const dt = Math.max(1, Date.now() - lastRef.current.t);
      const vx = Math.abs(ev.clientX - lastRef.current.x) / dt;
      startRef.current = null;

      const absDx = Math.abs(dx);
      const fast = vx > VELOCITY_THRESHOLD;

      if (absDx >= SWIPE_THRESHOLD || (fast && absDx > 30)) {
        if (dx < 0) flyOut(-1, onSwipeLeft);
        else flyOut(1, onSwipeRight);
      } else {
        snapBack();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [applyDrag, flyOut, snapBack, onSwipeLeft, onSwipeRight]);

  const onClick = useCallback(
    (e) => {
      if (movedRef.current) return;
      onTap?.(e);
    },
    [onTap]
  );

  return {
    cardRef,
    peekRef,
    swipeProgress,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onClick,
  };
}
