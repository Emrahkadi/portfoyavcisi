// Dashboard layout - Auth korumalı
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName={user.name} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}