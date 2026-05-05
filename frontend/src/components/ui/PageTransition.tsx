import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";

const ITEM_DURATION = 0.3;

const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: ITEM_DURATION, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

type PageTransitionProps = {
  children: ReactNode;
  transitionKey: string;
};

type StaggerProps = Omit<HTMLMotionProps<"div">, "children" | "variants" | "initial" | "animate" | "exit"> & {
  children: ReactNode;
};

export function StaggerPage({ children, className, ...props }: StaggerProps) {
  return (
    <motion.div
      {...props}
      className={className}
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...props }: StaggerProps) {
  return (
    <motion.div
      {...props}
      className={className}
      variants={itemVariants}
    >
      {children}
    </motion.div>
  );
}

export default function PageTransition({ children, transitionKey }: PageTransitionProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [transitionKey]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}