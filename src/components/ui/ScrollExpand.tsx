import React, { useEffect, useRef, useState } from "react";
import "./ScrollExpand.css";

export interface ScrollExpandProps {
  src: string;
  alt?: string;
  startWidth?: number; // percentage (e.g. 42 => 85% to 100% of container)
  startHeight?: number; // in px or vh baseline (e.g. 58 => 440px to 540px)
  startRadius?: number; // border radius in px (default 24)
  endRadius?: number; // border radius in px (default 12)
  mediaZoom?: number; // initial zoom scale (default 1.25 -> 1.0)
  scrollDistance?: number; // scroll multiplier relative to window height (default 1.2)
  holdDistance?: number; // hold range ratio (default 0.35)
  smoothing?: number; // lerp smoothing factor (default 0.08)
  overlayScrim?: number; // dark scrim overlay max opacity (default 0.2)
  useWindowScroll?: boolean;
  className?: string;
}

export const ScrollExpand: React.FC<ScrollExpandProps> = ({
  src,
  alt = "Rasoi product showcase",
  startWidth = 85,
  startHeight = 420,
  startRadius = 24,
  endRadius = 16,
  mediaZoom = 1.25,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.08,
  overlayScrim = 0.2,
  useWindowScroll = true,
  className = "",
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Animated values (lerped)
  const [progress, setProgress] = useState(0);

  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);

  useEffect(() => {
    const isMobile = window.innerWidth <= 991;
    if (isMobile) {
      setProgress(0.5);
      return;
    }

    const checkReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (checkReducedMotion) {
      setProgress(1);
      return;
    }

    const handleScroll = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Start calculating when container enters viewport
      const totalScrollableDistance = windowHeight * scrollDistance;
      const distanceScrolled = windowHeight - rect.top;

      let rawProgress = distanceScrolled / totalScrollableDistance;
      // Clamp between 0 and 1
      rawProgress = Math.max(0, Math.min(1, rawProgress));

      // Account for hold distance
      if (rawProgress > 1 - holdDistance) {
        rawProgress = 1;
      } else if (holdDistance < 1) {
        rawProgress = rawProgress / (1 - holdDistance);
        rawProgress = Math.max(0, Math.min(1, rawProgress));
      }

      targetProgressRef.current = rawProgress;
    };

    const updateAnimation = () => {
      // Lerp smoothing
      const diff = targetProgressRef.current - currentProgressRef.current;
      currentProgressRef.current += diff * smoothing;

      if (Math.abs(diff) > 0.001) {
        setProgress(currentProgressRef.current);
      } else {
        setProgress(targetProgressRef.current);
      }

      animFrameRef.current = requestAnimationFrame(updateAnimation);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    // Initial measurement
    handleScroll();
    animFrameRef.current = requestAnimationFrame(updateAnimation);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [scrollDistance, holdDistance, smoothing, useWindowScroll]);

  // Derived dynamic styles based on progress
  const currentWidthPercent = startWidth + (100 - startWidth) * progress; // startWidth% to 100%
  const currentHeightPx = startHeight + (540 - startHeight) * progress; // e.g. 420px to 540px
  const currentRadius = startRadius - (startRadius - endRadius) * progress; // 24px to 16px
  const currentZoom = mediaZoom - (mediaZoom - 1.0) * progress; // 1.25 to 1.0
  const currentScrimOpacity = overlayScrim * (1 - progress); // 0.2 down to 0

  return (
    <div
      ref={wrapperRef}
      className={`scroll-expand-wrapper ${className}`}
      style={{ height: "auto", minHeight: "480px" }}
    >
      <div className="scroll-expand-glow" />
      <div className="scroll-expand-sticky">
        <div
          className="scroll-expand-frame"
          style={{
            width: `${currentWidthPercent}%`,
            height: `${currentHeightPx}px`,
            borderRadius: `${currentRadius}px`,
            transition: "none",
          }}
        >
          <div
            className="scroll-expand-media-container"
            style={{ borderRadius: `${Math.max(4, currentRadius - 8)}px` }}
          >
            <img
              src={src}
              alt={alt}
              className="scroll-expand-media"
              style={{
                transform: `scale(${currentZoom})`,
                transition: "none",
              }}
              loading="lazy"
              decoding="async"
            />
            {currentScrimOpacity > 0.01 && (
              <div className="scroll-expand-scrim" style={{ opacity: currentScrimOpacity }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollExpand;
