"use client";

import { Briefcase, LineChart, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import Image from "next/image";

const SLIDES = [
  {
    title: "One pipeline for every requisition",
    description: "Track candidates from sourcing through hire with a clear, auditable workflow.",
    icon: Briefcase,
    imageClassName: "bg-[radial-gradient(circle_at_top_left,oklch(0.72_0.12_250),oklch(0.28_0.06_265))]",
  },
  {
    title: "Collaborate across recruiting teams",
    description: "Recruiters, hiring managers, and admins work from the same source of truth.",
    icon: Users,
    imageClassName: "bg-[radial-gradient(circle_at_top_right,oklch(0.68_0.14_200),oklch(0.24_0.05_240))]",
  },
  {
    title: "Measure what matters",
    description: "Funnel and time-to-hire reporting built into your daily workflow.",
    icon: LineChart,
    imageClassName: "bg-[radial-gradient(circle_at_bottom,oklch(0.7_0.11_160),oklch(0.22_0.04_250))]",
  },
] as const;

const SLIDE_INTERVAL_MS = 6000;

export function LoginBrandPanel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % SLIDES.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <aside
      aria-label="Privotage ATS highlights"
      className="bg-primary text-primary-foreground relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col"
    >
      <div className="relative z-10 flex items-center gap-3 p-8">
        <div>
          <Image src="/images/pivotage-logo.png" alt="Privotage ATS" width={200} height={200} className="w-auto h-auto object-contain" />
        </div>
      </div>
      <div className="relative flex flex-1 flex-col justify-end p-8 pt-0">
        <div className="relative min-h-88 overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
          {SLIDES.map((slide, index) => {
            const Icon = slide.icon;
            const isActive = index === activeIndex;

            return (
              <article
                key={slide.title}
                aria-hidden={!isActive}
                className={cn(
                  "absolute inset-0 flex flex-col justify-between p-8 transition-opacity duration-700",
                  slide.imageClassName,
                  isActive ? "opacity-100" : "opacity-0",
                )}
              >
                <div className="flex justify-end">
                  <div className="rounded-full bg-white/10 p-4 backdrop-blur-sm">
                    <Icon aria-hidden className="size-10" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    {slide.title}
                  </h2>
                  <p className="max-w-md text-sm leading-relaxed text-white/85">
                    {slide.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div
          aria-label="Slide indicators"
          className="mt-6 flex items-center gap-2"
          role="tablist"
        >
          {SLIDES.map((slide, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={slide.title}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Show slide ${index + 1}: ${slide.title}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  isActive
                    ? "bg-primary-foreground w-8"
                    : "bg-primary-foreground/35 w-2 hover:bg-primary-foreground/55",
                )}
                onClick={() => setActiveIndex(index)}
              />
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export function LoginMobileBrand() {
  return (
    <div className="mb-8 flex items-center gap-3 lg:hidden">
      <span
        aria-hidden
        className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md text-sm font-bold"
      >
        P
      </span>
      <div>
        <p className="text-sm font-semibold tracking-tight">Privotage ATS</p>
        <p className="text-muted-foreground text-xs">Sign in to continue</p>
      </div>
    </div>
  );
}
