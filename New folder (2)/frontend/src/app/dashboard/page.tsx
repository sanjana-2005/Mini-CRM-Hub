'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Mail, BarChart, TrendingUp, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalCustomers: number;
  totalSegments: number;
  totalCampaigns: number;
  activeCampaigns: number;
}

interface Activity {
  id: string;
  type: 'customer' | 'campaign' | 'segment';
  action: 'created' | 'updated' | 'deleted';
  name: string;
  timestamp: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalSegments: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchStats = () => {
      const customers = JSON.parse(localStorage.getItem('customers') || '[]');
      const segments = JSON.parse(localStorage.getItem('segments') || '[]');
      const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
      const storedActivities = JSON.parse(localStorage.getItem('activities') || '[]');

      setStats({
        totalCustomers: customers.length,
        totalSegments: segments.length,
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c: any) => c.status === 'active').length,
      });

      const sortedActivities = storedActivities
        .sort((a: Activity, b: Activity) => b.timestamp - a.timestamp)
        .slice(0, 5);
      setActivities(sortedActivities);
    };

    fetchStats();

    const handleStorageChange = (e: StorageEvent) => {
      if (["customers", "segments", "campaigns", "activities"].includes(e.key!)) {
        fetchStats();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-campaign':
        router.push('/dashboard/campaigns');
        break;
      case 'new-segment':
        router.push('/dashboard/segments');
        break;
      case 'import-customers':
        router.push('/dashboard/customers');
        break;
      case 'documentation':
        window.open('https://docs.example.com', '_blank');
        break;
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'customer': return <Users className="h-4 w-4 text-primary" />;
      case 'campaign': return <Mail className="h-4 w-4 text-primary" />;
      case 'segment': return <BarChart className="h-4 w-4 text-primary" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}! Here's an overview of your CRM platform.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <TrendingUp className="mr-2 h-4 w-4" /> View Reports
          </Button>
          <Button size="sm" onClick={() => handleQuickAction('new-campaign')}>
            <Mail className="mr-2 h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Customers', value: stats.totalCustomers, Icon: Users },
          { label: 'Segments', value: stats.totalSegments, Icon: BarChart },
          { label: 'Campaigns', value: stats.totalCampaigns, Icon: Mail },
          { label: 'Active Campaigns', value: stats.activeCampaigns, Icon: TrendingUp },
        ].map(({ label, value, Icon }) => (
          <Card key={label} className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <div className="rounded-full bg-primary/10 p-2">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{label} summary</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BarChart className="mb-4 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 rounded-lg border p-4">
                    <div className="rounded-full bg-primary/10 p-2">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.name}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatTimestamp(activity.timestamp)}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button className="w-full justify-start" size="lg" onClick={() => handleQuickAction('new-campaign')}>
                <Mail className="mr-2 h-4 w-4" /> Create New Campaign
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg" onClick={() => handleQuickAction('new-segment')}>
                <BarChart className="mr-2 h-4 w-4" /> Create New Segment
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg" onClick={() => handleQuickAction('import-customers')}>
                <FileUp className="mr-2 h-4 w-4" /> Import Customers
              </Button>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 text-sm font-medium">Need Help?</h4>
                <p className="text-xs text-muted-foreground">Check out our documentation or contact support for assistance.</p>
                <Button variant="link" className="mt-2 h-auto p-0 text-xs" onClick={() => handleQuickAction('documentation')}>
                  View Documentation →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}