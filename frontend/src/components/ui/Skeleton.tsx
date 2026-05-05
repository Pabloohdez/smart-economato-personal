import { cn } from "../../lib/utils";

type SkeletonProps = {
  className?: string;
};

export default function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("bo-skeleton", className)} />;
}