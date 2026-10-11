import type { Comparison } from "@/lib/comparisons";
import PremiumComparison from "./premium-comparison";

export default function ComparisonPage({ page }: { page: Comparison }) {
  return <PremiumComparison page={page} />;
}
