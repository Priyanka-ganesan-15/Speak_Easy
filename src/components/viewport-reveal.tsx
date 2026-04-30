"use client";

import { useEffect, useRef, useState } from "react";

type ViewportRevealProps = {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  threshold?: number;
  once?: boolean;
};

export function ViewportReveal({
  children,
  className,
  delayMs = 0,
  threshold = 0.2,
  once = true,
}: ViewportRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;

        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(node);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [once, threshold]);

  return (
    <div
      ref={rootRef}
      className={`reveal-on-scroll ${isVisible ? "is-visible" : ""} ${className ?? ""}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
