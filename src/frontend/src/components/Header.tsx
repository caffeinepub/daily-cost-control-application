import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useIsCallerAdmin, useIsScoreAuthAdmin, useGetTournamentState } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, X, Trophy, Users, Calendar, Swords, Clock, History, Image, UserPlus, Shield, BarChart3, ListChecks, ImageIcon, Award } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TournamentStatus } from '@/backend';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingCount?: number;
}

export default function Header({ activeTab, onTabChange, pendingCount = 0 }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: isScoreAuthAdmin } = useIsScoreAuthAdmin();
  const { data: tournamentState } = useGetTournamentState();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';
  const hasAdminAccess = isAdmin || isScoreAuthAdmin;

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
      onTabChange('home');
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  // Tournament tab is always visible to admins, visible to all users when tournament is announced or active
  const isTournamentAnnouncedOrActive = tournamentState?.status === TournamentStatus.announced || tournamentState?.status === TournamentStatus.active;
  const shouldShowTournamentTab = hasAdminAccess || isTournamentAnnouncedOrActive;

  const navItems = [
    { id: 'home', label: 'Home', icon: Trophy, authRequired: false },
    { id: 'members', label: 'Members', icon: Users, authRequired: false },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3, authRequired: false },
    { id: 'schedule', label: 'Schedule', icon: Calendar, authRequired: false },
    { id: 'tournament', label: 'Tournament', icon: Award, authRequired: false, conditionalShow: shouldShowTournamentTab },
    { id: 'matches', label: 'Submit Match', icon: Swords, authRequired: true },
    { id: 'pending', label: 'Pending', icon: Clock, authRequired: true, badge: pendingCount },
    { id: 'player-summary', label: 'Player Summary', icon: BarChart3, authRequired: true },
    { id: 'match-history', label: 'Match History', icon: ListChecks, authRequired: true },
    { id: 'history', label: 'History', icon: History, authRequired: true },
    { id: 'gallery', label: 'Gallery', icon: Image, authRequired: false },
    { id: 'claim', label: 'Claim Account', icon: UserPlus, authRequired: true },
  ];

  const adminNavItems = [
    { id: 'admin', label: 'Admin', icon: Shield },
    { id: 'banner-manager', label: 'Banner Manager', icon: ImageIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/assets/generated/fttlr-logo-transparent.dim_200x200.png" 
              alt="FTTLR Logo" 
              className="h-10 w-10"
            />
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">FTTLR</span>
              <span className="text-xs text-muted-foreground leading-tight">Table Tennis Fellowship</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.authRequired && !isAuthenticated) return null;
              if (item.conditionalShow !== undefined && !item.conditionalShow) return null;
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabClick(item.id)}
                  className="gap-2 relative"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
            {hasAdminAccess && adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabClick(item.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAuth}
              disabled={disabled}
              size="sm"
              variant={isAuthenticated ? 'outline' : 'default'}
            >
              {loginStatus === 'logging-in' ? 'Logging in...' : isAuthenticated ? 'Logout' : 'Login'}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 space-y-1 border-t">
            {navItems.map((item) => {
              if (item.authRequired && !isAuthenticated) return null;
              if (item.conditionalShow !== undefined && !item.conditionalShow) return null;
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabClick(item.id)}
                  className="w-full justify-start gap-2 relative"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="destructive" className="ml-auto px-1.5 py-0 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
            {hasAdminAccess && adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabClick(item.id)}
                  className="w-full justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
