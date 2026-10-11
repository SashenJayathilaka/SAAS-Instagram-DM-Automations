"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { motionDuration, motionEase, motionStagger, revealTransition } from "@/lib/motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  replay?: boolean;
  amount?: number;
};

export function FadeIn({ children, className, delay = 0, replay = false, amount = 0.1 }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { y: 12 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: !replay, amount, margin: "-32px" }}
      transition={reduceMotion ? { duration: 0 } : revealTransition(reduceMotion, delay)}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({ children, className }: Omit<Props, "delay">) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={reduceMotion ? { duration: 0 } : { duration: motionDuration.fast, ease: motionEase.out }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Reading content must remain visible before hydration and on short viewports.
// Translate only: an observer or animation failure can never hide the article.
export function ReadableReveal({ children, className, delay = 0 }: Omit<Props, "replay" | "amount">) {
  const reduceMotion = useReducedMotion();
  return <motion.div
    initial={reduceMotion ? false : { y: 10 }}
    whileInView={reduceMotion ? undefined : { y: 0 }}
    viewport={{ once: true, amount: "some" }}
    transition={revealTransition(reduceMotion, delay)}
    className={className}
  >{children}</motion.div>;
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: motionStagger, delayChildren: 0.03 } },
};

const itemVariants: Variants = {
  hidden: { y: 12 },
  show: { opacity: 1, y: 0 },
};

export function StaggerContainer({ children, className }: Omit<Props, "delay">) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={containerVariants}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={{ once: true, amount: 0.08, margin: "-24px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: Omit<Props, "delay">) {
  return (
    <motion.div variants={itemVariants} transition={{ duration: motionDuration.content, ease: motionEase.out }} className={className}>
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, className, delay = 0 }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { scale: 0.985 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.1, margin: "-32px" }}
      transition={reduceMotion ? { duration: 0 } : { duration: motionDuration.content, ease: motionEase.out, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
