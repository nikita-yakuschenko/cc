import { requireSession, canManageAllLinks } from "@/server/auth/guards";
import { getOverviewStats } from "@/server/analytics/service";
import { StatsCharts } from "@/components/admin/stats-charts";

export default async function StatsPage() {
  const session = await requireSession();
  const overview = await getOverviewStats({
    excludeBots: true,
    days: 30,
    onlyOwn: !canManageAllLinks(session.user.role),
    userId: session.user.id,
  });

  return <StatsCharts overview={overview} />;
}
