"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatsCharts({
  overview,
}: {
  overview: {
    totalLinks: number;
    activeLinks: number;
    clicks: number;
    cachedClicks: number;
    byDay: Array<{ day: string; count: number }>;
  };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Статистика</h2>
        <p className="mt-1 text-sm text-slate-500">
          Сводка за 30 дней (боты исключены)
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Всего ссылок", value: overview.totalLinks },
          { label: "Активных", value: overview.activeLinks },
          { label: "Переходы (30д)", value: overview.clicks },
          { label: "Кеш переходов", value: overview.cachedClicks },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Переходы по дням</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {overview.byDay.length === 0 ? (
            <p className="text-sm text-slate-500">Пока нет данных</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#276152"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
