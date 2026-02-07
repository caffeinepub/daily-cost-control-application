import { useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetPendingMatches, useIsCallerAdmin, useIsScoreAuthAdmin } from './hooks/useQueries';
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import MemberDirectory from './components/MemberDirectory';
import WeeklySchedule from './components/WeeklySchedule';
import MatchSubmission from './components/MatchSubmission';
import PendingMatches from './components/PendingMatches';
import MatchHistory from './components/MatchHistory';
import PhotoGallery from './components/PhotoGallery';
import Leaderboard from './components/Leaderboard';
import AdminManagement from './components/AdminManagement';
import ClaimAccount from './components/ClaimAccount';
import ProfileSetupModal from './components/ProfileSetupModal';
import PlayerSummaryDashboard from './components/PlayerSummaryDashboard';
import MatchHistoryScreen from './components/MatchHistoryScreen';
import AdminBannerManager from './components/AdminBannerManager';
import Tournament from './components/Tournament';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function App() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { data: pendingMatches } = useGetPendingMatches();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: isScoreAuthAdmin } = useIsScoreAuthAdmin();
  const [activeTab, setActiveTab] = useState('home');

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;
  const hasAdminAccess = isAdmin || isScoreAuthAdmin;

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const myPendingCount = pendingMatches?.filter(
    match => match.playerB.toString() === currentUserPrincipal
  ).length || 0;

  const handleViewAllMembers = () => {
    setActiveTab('members');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} pendingCount={myPendingCount} />
      
      <main className="flex-1">
        {activeTab === 'home' && <Hero />}
        
        <div className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="home">Home</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="tournament">Tournament</TabsTrigger>
              <TabsTrigger value="matches">Matches</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="claim">Claim</TabsTrigger>
              {hasAdminAccess && <TabsTrigger value="admin">Admin</TabsTrigger>}
              <TabsTrigger value="player-summary">Player Summary</TabsTrigger>
              <TabsTrigger value="match-history">Match History</TabsTrigger>
              {hasAdminAccess && <TabsTrigger value="banner-manager">Banner Manager</TabsTrigger>}
            </TabsList>

            <TabsContent value="home" className="space-y-12">
              <section className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-foreground">Welcome to FTTLR</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  The Fellowship of Table Tennis Loving Rotarians brings together passionate players 
                  for weekly practice sessions, competitive matches, and community building through sport.
                </p>
              </section>
              
              <div className="grid md:grid-cols-2 gap-8">
                <MemberDirectory preview onViewAll={handleViewAllMembers} />
                <WeeklySchedule preview />
              </div>
            </TabsContent>

            <TabsContent value="members">
              <MemberDirectory />
            </TabsContent>

            <TabsContent value="leaderboard">
              <Leaderboard />
            </TabsContent>

            <TabsContent value="schedule">
              <WeeklySchedule />
            </TabsContent>

            <TabsContent value="tournament">
              <Tournament />
            </TabsContent>

            <TabsContent value="matches">
              <MatchSubmission />
            </TabsContent>

            <TabsContent value="pending">
              <PendingMatches />
            </TabsContent>

            <TabsContent value="history">
              <MatchHistory />
            </TabsContent>

            <TabsContent value="gallery">
              <PhotoGallery />
            </TabsContent>

            <TabsContent value="claim">
              <ClaimAccount />
            </TabsContent>

            {hasAdminAccess && (
              <TabsContent value="admin">
                <AdminManagement />
              </TabsContent>
            )}

            <TabsContent value="player-summary">
              <PlayerSummaryDashboard />
            </TabsContent>

            <TabsContent value="match-history">
              <MatchHistoryScreen />
            </TabsContent>

            {hasAdminAccess && (
              <TabsContent value="banner-manager">
                <AdminBannerManager />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      <Footer />
      
      {showProfileSetup && <ProfileSetupModal />}
    </div>
  );
}
