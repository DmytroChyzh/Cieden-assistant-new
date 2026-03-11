'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { TrendingUp, DollarSign } from 'lucide-react';
import { Label, Pie, PieChart, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface ChartMessageProps {
  chartId?: Id<"charts">;
  chart?: {
    _id: string;
    type: string;
    title: string;
    data: Array<{name: string; amount?: number; value?: number}>;
    conversationId: Id<"conversations">;
    _creationTime: number;
    createdAt?: number;
  };
  compact?: boolean;
}

export function ChartMessage({ chartId, chart: chartProp, compact = false }: ChartMessageProps) {
  const fetchedChart = useQuery(api.charts.get, chartId ? { chartId } : "skip");
  const chart = chartProp || fetchedChart;

  if (!chart) {
    return (
      <div className="p-4 border border-dashed rounded-lg bg-muted/30">
        <div className="text-sm text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  // Generate chart config dynamically based on data
  const generateChartConfig = (chartData: Array<{name: string; amount?: number; value?: number}>, type: string): ChartConfig => {
    if (type === 'pie') {
      const config: ChartConfig = {
        amount: { label: 'Amount' }
      };
      chartData.forEach((item, index) => {
        config[item.name.toLowerCase().replace(/\s+/g, '')] = {
          label: item.name,
          color: `hsl(var(--chart-${(index % 5) + 1}))`
        };
      });
      return config;
    } else if (type === 'bar') {
      return {
        income: { label: 'Income', color: 'hsl(var(--chart-1))' },
        expenses: { label: 'Expenses', color: 'hsl(var(--chart-2))' },
        value: { label: 'Value', color: 'hsl(var(--chart-3))' }
      } satisfies ChartConfig;
    }
    return {};
  };

  const chartConfig = generateChartConfig(chart.data, chart.type);
  const height = compact ? 200 : 300;

  return (
    <Card className="my-4 rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/15 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
      <CardHeader className={compact ? "pb-2" : "items-center pb-0"}>
        <CardTitle className={`flex items-center gap-2 ${compact ? 'text-base' : ''}`}>
          <DollarSign className="h-4 w-4" />
          {chart.title}
        </CardTitle>
        {!compact && (
          <CardDescription>
            Created {new Date(chart._creationTime || chart.createdAt).toLocaleString()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={compact ? "py-2" : "flex-1 pb-0"}>
        {chart.type === 'pie' && (
          <ChartContainer
            config={chartConfig}
            className={`mx-auto aspect-square max-h-[${height}px]`}
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chart.data.map((item: {name: string; amount?: number; value?: number}) => ({
                  ...item,
                  fill: `var(--color-${item.name.toLowerCase().replace(/\s+/g, '')})`
                }))}
                dataKey="value"
                nameKey="name"
                innerRadius={compact ? 40 : 60}
                strokeWidth={5}
              >
                {!compact && (
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        const total = chart.data.reduce((acc: number, curr: {value: number}) => acc + curr.value, 0);
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-bold"
                            >
                              ${total.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 20}
                              className="fill-muted-foreground text-sm"
                            >
                              Total
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                )}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
        
        {chart.type === 'bar' && (
          <ChartContainer config={chartConfig} className={`max-h-[${height}px]`}>
            <BarChart
              accessibilityLayer
              data={chart.data}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={compact ? 10 : 12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                fontSize={compact ? 10 : 12}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              {chart.data[0]?.income !== undefined && (
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
              )}
              {chart.data[0]?.expenses !== undefined && (
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
              )}
              {chart.data[0]?.value !== undefined && (
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
              )}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {!compact && (
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            Generated by AI voice command <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            Financial data visualization powered by ElevenLabs + MCP
          </div>
        </CardFooter>
      )}
    </Card>
  );
}