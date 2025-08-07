'use client';

import { useEffect, useState } from 'react';

import {
  Calendar,
  Clock,
  Download,
  Filter,
  MessageSquare,
  Mic,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
// import { Progress } from '@kit/ui/progress';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

interface MeetingAnalytics {
  totalMeetings: number;
  totalDuration: number;
  averageDuration: number;
  totalParticipants: number;
  averageParticipants: number;
  meetingsPerDeal: number;
  topSpeakers: Array<{
    name: string;
    speakingTime: number;
    percentage: number;
  }>;
  meetingsByMonth: Array<{ month: string; count: number }>;
  meetingsByDeal: Array<{ dealName: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  sentimentByDeal: Array<{
    dealName: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}

export default function MeetingAnalytics() {
  const [timeRange, setTimeRange] = useState('90d');
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would fetch from your database
      // For now, we'll use mock data
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setAnalytics(generateMockAnalytics());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = (): MeetingAnalytics => {
    return {
      totalMeetings: 47,
      totalDuration: 2820, // minutes
      averageDuration: 60, // minutes
      totalParticipants: 156,
      averageParticipants: 3.3,
      meetingsPerDeal: 2.8,
      topSpeakers: [
        { name: 'John Smith', speakingTime: 840, percentage: 30 },
        { name: 'Sarah Johnson', speakingTime: 560, percentage: 20 },
        { name: 'Michael Chen', speakingTime: 420, percentage: 15 },
        { name: 'Emily Davis', speakingTime: 280, percentage: 10 },
        { name: 'Others', speakingTime: 720, percentage: 25 },
      ],
      meetingsByMonth: [
        { month: 'Jan', count: 5 },
        { month: 'Feb', count: 7 },
        { month: 'Mar', count: 10 },
        { month: 'Apr', count: 8 },
        { month: 'May', count: 12 },
        { month: 'Jun', count: 5 },
      ],
      meetingsByDeal: [
        { dealName: 'TechCorp Inc.', count: 5 },
        { dealName: 'Acme Corp', count: 3 },
        { dealName: 'Global Enterprises', count: 7 },
        { dealName: 'Innovate Solutions', count: 4 },
        { dealName: 'Future Tech', count: 6 },
      ],
      topKeywords: [
        { keyword: 'integration', count: 28 },
        { keyword: 'pricing', count: 24 },
        { keyword: 'timeline', count: 22 },
        { keyword: 'features', count: 19 },
        { keyword: 'support', count: 17 },
        { keyword: 'security', count: 15 },
        { keyword: 'implementation', count: 14 },
        { keyword: 'ROI', count: 12 },
      ],
      sentimentByDeal: [
        { dealName: 'TechCorp Inc.', positive: 65, neutral: 25, negative: 10 },
        { dealName: 'Acme Corp', positive: 45, neutral: 40, negative: 15 },
        {
          dealName: 'Global Enterprises',
          positive: 70,
          neutral: 20,
          negative: 10,
        },
        {
          dealName: 'Innovate Solutions',
          positive: 55,
          neutral: 35,
          negative: 10,
        },
        { dealName: 'Future Tech', positive: 80, neutral: 15, negative: 5 },
      ],
    };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const COLORS = [
    '#a855f7',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#6366f1',
  ];

  if (!analytics) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-monument text-2xl">Meeting Analytics</h2>
          <Select disabled value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] border-white/10 bg-black/40">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-white/10 bg-black/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-12 animate-pulse rounded-md bg-gray-700/50" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="font-monument text-2xl">Meeting Analytics</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] border-white/10 bg-black/40">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-black/90">
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/10 bg-black/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="text-designer-violet h-5 w-5" />
              Total Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold">
                  {analytics.totalMeetings}
                </p>
                <p className="text-sm text-white/50">
                  {timeRange === '30d'
                    ? 'Last 30 days'
                    : timeRange === '90d'
                      ? 'Last 90 days'
                      : 'Last 6 months'}
                </p>
              </div>
              <div className="text-sm text-green-400">+12% ↑</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="text-designer-blue h-5 w-5" />
              Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold">
                  {formatDuration(analytics.totalDuration)}
                </p>
                <p className="text-sm text-white/50">
                  Avg: {formatDuration(analytics.averageDuration)} per meeting
                </p>
              </div>
              <div className="text-sm text-green-400">+8% ↑</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="text-designer-violet h-5 w-5" />
              Total Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold">
                  {analytics.totalParticipants}
                </p>
                <p className="text-sm text-white/50">
                  Avg: {analytics.averageParticipants.toFixed(1)} per meeting
                </p>
              </div>
              <div className="text-sm text-green-400">+5% ↑</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="text-designer-blue h-5 w-5" />
              Meetings Per Deal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold">
                  {analytics.meetingsPerDeal.toFixed(1)}
                </p>
                <p className="text-sm text-white/50">Across all active deals</p>
              </div>
              <div className="text-sm text-yellow-400">-2% ↓</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Meetings by Month */}
        <Card className="border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="text-designer-violet h-5 w-5" />
              Meetings by Month
            </CardTitle>
            <CardDescription>
              Number of meetings conducted each month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.meetingsByMonth}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                    itemStyle={{ color: 'white' }}
                  />
                  <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Speakers */}
        <Card className="border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="text-designer-blue h-5 w-5" />
              Speaking Time Distribution
            </CardTitle>
            <CardDescription>
              Percentage of speaking time by participant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.topSpeakers}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="percentage"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {analytics.topSpeakers.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Speaking Time']}
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

        {/* Sentiment Analysis */}
        <Card className="border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Sentiment Analysis by Deal</CardTitle>
            <CardDescription>
              Positive, neutral, and negative sentiment in meetings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.sentimentByDeal}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                  <YAxis
                    dataKey="dealName"
                    type="category"
                    scale="band"
                    stroke="rgba(255,255,255,0.5)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                    itemStyle={{ color: 'white' }}
                  />
                  <Legend />
                  <Bar dataKey="positive" stackId="a" fill="#10b981" />
                  <Bar dataKey="neutral" stackId="a" fill="#6b7280" />
                  <Bar dataKey="negative" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Keywords */}
        <Card className="border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Top Keywords</CardTitle>
            <CardDescription>
              Most frequently mentioned topics in meetings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topKeywords.map((keyword, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{keyword.keyword}</span>
                    <span>{keyword.count} mentions</span>
                  </div>
                  {/* <Progress
                    value={
                      (keyword.count / analytics.topKeywords[0].count) * 100
                    }
                    className="h-2"
                  /> */}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meetings by Deal */}
      <Card className="border-white/10 bg-black/40">
        <CardHeader>
          <CardTitle>Meetings by Deal</CardTitle>
          <CardDescription>
            Number of meetings conducted for each deal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.meetingsByDeal} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                <YAxis
                  dataKey="dealName"
                  type="category"
                  scale="band"
                  stroke="rgba(255,255,255,0.5)"
                  width={150}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                  itemStyle={{ color: 'white' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
