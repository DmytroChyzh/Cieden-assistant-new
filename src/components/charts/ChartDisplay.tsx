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

interface ChartDisplayProps {
  conversationId: Id<"conversations">;
}

export function ChartDisplay({ conversationId }: ChartDisplayProps) {
  const charts = useQuery(api.charts.list, { conversationId });

  if (!charts || charts.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <div className="space-y-4">
          <div className="text-6xl">📊</div>
          <h3 className="text-lg font-medium">No Charts Yet</h3>
          <p className="text-sm">Ask your voice assistant to create financial charts!</p>
          <div className="text-xs space-y-1 mt-4">
            <p className="font-medium">Try saying:</p>
            <p className="text-muted-foreground">&quot;Show me my expenses as a pie chart&quot;</p>
            <p className="text-muted-foreground">&quot;Compare my income vs expenses&quot;</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {charts.map((chart) => {
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

        return (
          <Card key={chart._id} className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {chart.title}
              </CardTitle>
              <CardDescription>
                Created {new Date(chart.createdAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              {chart.type === 'pie' && (
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square max-h-[400px]"
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
                      innerRadius={60}
                      strokeWidth={5}
                    >
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
                                  className="fill-foreground text-3xl font-bold"
                                >
                                  ${total.toLocaleString()}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 24}
                                  className="fill-muted-foreground"
                                >
                                  Total
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
              
              {chart.type === 'bar' && (
                <ChartContainer config={chartConfig}>
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
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
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
            <CardFooter className="flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 font-medium leading-none">
                Generated by AI voice command <TrendingUp className="h-4 w-4" />
              </div>
              <div className="leading-none text-muted-foreground">
                Financial data visualization powered by ElevenLabs + MCP
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}