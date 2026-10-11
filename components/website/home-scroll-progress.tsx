"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

export default function HomeScrollProgress() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30, restDelta: 0.001 });
  const reduceMotion = useReducedMotion();
  return <motion.div aria-hidden="true" style={{ scaleX: reduceMotion ? scrollYProgress : progress }} className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-300 rtl:origin-right" />;
}
