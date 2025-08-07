'use client';

import type React from 'react';
import { useState } from 'react';

import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@kit/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

// Mock data for the charts
const revenueData = [
  { month: 'Jan', actual: 65000, projected: 60000 },
  { month: 'Feb', actual: 72000, projected: 65000 },
  { month: 'Mar', actual: 80000, projected: 70000 },
  { month: 'Apr', actual: 92000, projected: 75000 },
  { month: 'May', actual: 105000, projected: 80000 },
  { month: 'Jun', actual: 120000, projected: 85000 },
  { month: 'Jul', actual: 135000, projected: 90000 },
];

const dealStageData = [
  { name: 'Lead', value: 35 },
  { name: 'Contacted', value: 25 },
  { name: 'Meeting', value: 20 },
  { name: 'Proposal', value: 15 },
  { name: 'Closed', value: 5 },
];

const conversionData = [
  { stage: 'Lead → Contact', rate: 65 },
  { stage: 'Contact → Meeting', rate: 48 },
  { stage: 'Meeting → Proposal', rate: 72 },
  { stage: 'Proposal → Closed', rate: 35 },
];

const weeklyActivityData = [
  { day: 'Mon', emails: 45, calls: 12, meetings: 5 },
  { day: 'Tue', emails: 52, calls: 15, meetings: 8 },
  { day: 'Wed', emails: 48, calls: 18, meetings: 10 },
  { day: 'Thu', emails: 61, calls: 14, meetings: 7 },
  { day: 'Fri', emails: 38, calls: 10, meetings: 6 },
];

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const KPICard = ({
  title,
  value,
  change,
  icon,
  trend,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down';
}) => (
  <Card className="border border-white/10 bg-black/40">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-white/70">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <div className="mt-2 flex items-center">
            {trend === 'up' ? (
              <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
            )}
            <span
              className={
                trend === 'up'
                  ? 'text-sm text-green-500'
                  : 'text-sm text-red-500'
              }
            >
              {change}
            </span>
          </div>
        </div>
        <div className="bg-designer-violet/20 rounded-full p-3">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('30d');

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="font-monument text-2xl">Analytics Dashboard</h2>
        <Select defaultValue={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] border-white/10 bg-black/40">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-black/90">
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value="$135,000"
          change="+12.5% from last month"
          icon={<DollarSign className="text-designer-violet h-6 w-6" />}
          trend="up"
        />
        <KPICard
          title="Conversion Rate"
          value="24.8%"
          change="+3.2% from last month"
          icon={<TrendingUp className="text-designer-violet h-6 w-6" />}
          trend="up"
        />
        <KPICard
          title="New Leads"
          value="87"
          change="-5.3% from last month"
          icon={<Users className="text-designer-violet h-6 w-6" />}
          trend="down"
        />
        <KPICard
          title="Deals Closed"
          value="23"
          change="+18.7% from last month"
          icon={<Target className="text-designer-violet h-6 w-6" />}
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="border border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
            <CardDescription>Actual vs Projected Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                actual: {
                  label: 'Actual Revenue',
                  color: 'hsl(var(--designer-violet))',
                },
                projected: {
                  label: 'Projected Revenue',
                  color: 'hsl(var(--designer-blue))',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--color-actual)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="projected"
                    stroke="var(--color-projected)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Deal Stage Distribution */}
        <Card className="border border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Deal Stage Distribution</CardTitle>
            <CardDescription>Current deals by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dealStageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {dealStageData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} deals`, 'Count']}
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                    itemStyle={{ color: 'white' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rates */}
        <Card className="border border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Conversion Rates</CardTitle>
            <CardDescription>
              Stage-to-stage conversion percentages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                rate: {
                  label: 'Conversion Rate',
                  color: 'hsl(var(--designer-blue))',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis dataKey="stage" stroke="rgba(255,255,255,0.5)" />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="rate"
                    fill="var(--color-rate)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card className="border border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>
              Emails, calls, and meetings by day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                emails: {
                  label: 'Emails Sent',
                  color: 'hsl(var(--designer-violet))',
                },
                calls: {
                  label: 'Calls Made',
                  color: 'hsl(var(--designer-blue))',
                },
                meetings: {
                  label: 'Meetings Held',
                  color: 'hsl(var(--designer-silver))',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivityData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar
                    dataKey="emails"
                    fill="var(--color-emails)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="calls"
                    fill="var(--color-calls)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="meetings"
                    fill="var(--color-meetings)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics Tabs */}
      <Card className="border border-white/10 bg-black/40">
        <CardHeader>
          <CardTitle>Detailed Analytics</CardTitle>
          <CardDescription>Explore specific metrics in depth</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="performance">
            <TabsList className="border border-white/10 bg-black/60">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="leads">Lead Sources</TabsTrigger>
              <TabsTrigger value="team">Team Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="performance" className="pt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">
                      Average Deal Size
                    </p>
                    <p className="text-xl font-semibold">$42,500</p>
                  </div>
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">
                      Sales Cycle Length
                    </p>
                    <p className="text-xl font-semibold">32 days</p>
                  </div>
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">Win Rate</p>
                    <p className="text-xl font-semibold">28.4%</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="leads" className="pt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">Website</p>
                    <p className="text-xl font-semibold">42%</p>
                  </div>
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">LinkedIn</p>
                    <p className="text-xl font-semibold">28%</p>
                  </div>
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">Referrals</p>
                    <p className="text-xl font-semibold">18%</p>
                  </div>
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">Other</p>
                    <p className="text-xl font-semibold">12%</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="team" className="pt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">Top Performer</p>
                    <p className="text-xl font-semibold">Sarah Johnson</p>
                    <p className="text-sm text-white/50">$245,000 in sales</p>
                  </div>
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">Most Improved</p>
                    <p className="text-xl font-semibold">Michael Chen</p>
                    <p className="text-sm text-white/50">+65% growth</p>
                  </div>
                  <div className="rounded-md border border-white/5 bg-black/30 p-4">
                    <p className="mb-1 text-sm text-white/70">Team Average</p>
                    <p className="text-xl font-semibold">$178,500</p>
                    <p className="text-sm text-white/50">per sales rep</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
