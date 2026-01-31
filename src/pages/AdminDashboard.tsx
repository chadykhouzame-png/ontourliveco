import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import AdminProfileApproval from '@/components/admin/AdminProfileApproval';
import AdminDisputes from '@/components/admin/AdminDisputes';
import AdminStats from '@/components/admin/AdminStats';

const AdminDashboard = () => {
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || userRole !== 'admin')) {
      navigate('/');
    }
  }, [user, userRole, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users, profiles, and disputes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <AdminStats />

        <Tabs defaultValue="approval" className="mt-8">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="approval" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Approvals</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Disputes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approval" className="mt-6">
            <AdminProfileApproval />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="disputes" className="mt-6">
            <AdminDisputes />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;