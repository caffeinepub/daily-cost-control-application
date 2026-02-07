import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { 
  useIsCallerAdmin, 
  useIsScoreAuthAdmin, 
  useGetTournamentState,
  useGetTournamentLeaderboard,
  useAnnounceTournament,
  useStartTournament,
  usePauseTournament,
  useEndTournament,
  useResetTournament,
  useRegisterForTournament,
  useUnregisterFromTournament,
  useGetRegisteredPlayerDetails
} from '@/hooks/useQueries';
import { Trophy, Users, Calendar, Award, AlertCircle, Loader2, UserCheck, CheckCircle, Info, Edit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TournamentStatus } from '@/backend';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import TournamentScoreEntry from './TournamentScoreEntry';
import TournamentMatchApprovals from './TournamentMatchApprovals';

export default function Tournament() {
  const { identity } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: isScoreAuthAdmin } = useIsScoreAuthAdmin();
  const { data: tournamentState, isLoading: tournamentLoading } = useGetTournamentState();
  const { data: leaderboard = [] } = useGetTournamentLeaderboard();

  const isAuthenticated = !!identity;
  const hasAdminAccess = !!(isAdmin || isScoreAuthAdmin);

  const { data: registeredPlayers = [], isLoading: registeredPlayersLoading } = useGetRegisteredPlayerDetails(hasAdminAccess);

  const announceTournament = useAnnounceTournament();
  const startTournament = useStartTournament();
  const pauseTournament = usePauseTournament();
  const endTournament = useEndTournament();
  const resetTournament = useResetTournament();
  const registerForTournament = useRegisterForTournament();
  const unregisterFromTournament = useUnregisterFromTournament();

  // Controlled tab state
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusBadge = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.announced:
        return <Badge variant="secondary">Announced - Registration Open</Badge>;
      case TournamentStatus.active:
        return <Badge className="bg-green-600">Active - Tournament Running</Badge>;
      case TournamentStatus.paused:
        return <Badge variant="outline">Paused</Badge>;
      case TournamentStatus.completed:
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const handleAnnounceTournament = async () => {
    try {
      await announceTournament.mutateAsync();
      toast.success('Tournament announced! Registration is now open.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to announce tournament');
    }
  };

  const handleStartTournament = async () => {
    try {
      await startTournament.mutateAsync();
      toast.success('Tournament started! Members can now register and play.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start tournament');
    }
  };

  const handlePauseTournament = async () => {
    try {
      await pauseTournament.mutateAsync();
      toast.success('Tournament paused');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause tournament');
    }
  };

  const handleEndTournament = async () => {
    try {
      await endTournament.mutateAsync();
      toast.success('Tournament ended successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to end tournament');
    }
  };

  const handleResetTournament = async () => {
    try {
      await resetTournament.mutateAsync();
      toast.success('Tournament reset successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset tournament');
    }
  };

  const handleRegister = async () => {
    try {
      await registerForTournament.mutateAsync();
      toast.success('Successfully registered for tournament!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to register for tournament');
    }
  };

  const handleUnregister = async () => {
    try {
      await unregisterFromTournament.mutateAsync();
      toast.success('Successfully unregistered from tournament');
    } catch (error: any) {
      toast.error(error.message || 'Failed to unregister from tournament');
    }
  };

  const isRegistered = useMemo(() => {
    if (!identity || !tournamentState) return false;
    const userPrincipal = identity.getPrincipal().toString();
    return tournamentState.registeredPlayers.some((p) => p.id.toString() === userPrincipal);
  }, [identity, tournamentState]);

  const canRegister = tournamentState?.status === TournamentStatus.announced || 
                      tournamentState?.status === TournamentStatus.active;

  if (tournamentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            4th Sunday FTTLR Tournament
          </h1>
          <p className="text-muted-foreground mt-2">
            Monthly Swiss-system tournament with 7 tables and best-of-three matches
          </p>
        </div>
      </div>

      {hasAdminAccess && (
        <Alert className="border-primary bg-primary/5">
          <Edit className="h-4 w-4" />
          <AlertTitle>Admin Quick Access</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Need to enter tournament scores? Click here to go directly to the score entry form.</span>
            <Button 
              size="sm" 
              onClick={() => setActiveTab('scores')}
              className="ml-4"
            >
              Enter Scores
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How to participate:</strong> Register for the tournament, then use the "Enter Scores" tab to submit your match results. 
          Your opponent or an admin must approve each score before the leaderboard updates. 
          {!isAuthenticated && <span className="block mt-2 font-semibold">Login is required to submit scores and register.</span>}
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${hasAdminAccess ? 'grid-cols-6' : 'grid-cols-4'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="scores">Enter Scores</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          {hasAdminAccess && <TabsTrigger value="registered">Registered Players</TabsTrigger>}
          {hasAdminAccess && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Status</CardTitle>
              <CardDescription>Current tournament information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(tournamentState?.status || TournamentStatus.notStarted)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Registered Players:</span>
                <span className="text-sm">{tournamentState?.registeredPlayers.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Round:</span>
                <span className="text-sm">
                  {tournamentState?.status === TournamentStatus.active || tournamentState?.status === TournamentStatus.paused
                    ? tournamentState.currentRound.toString()
                    : '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tournament Format</CardTitle>
              <CardDescription>Swiss-system tournament details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Swiss League System</p>
                  <p className="text-sm text-muted-foreground">
                    Automatic pairing based on current standings and previous results
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Best-of-Three Matches</p>
                  <p className="text-sm text-muted-foreground">
                    All matches are best-of-three games (2-0, 2-1, 1-2, or 0-2 formats)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">7 Tables</p>
                  <p className="text-sm text-muted-foreground">
                    Matches played simultaneously across 7 tables each round
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Registration</CardTitle>
              <CardDescription>
                {isAuthenticated 
                  ? 'Register for the upcoming 4th Sunday tournament'
                  : 'Please login to register for the tournament'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAuthenticated ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You must be logged in to register for tournaments.
                  </AlertDescription>
                </Alert>
              ) : canRegister ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {tournamentState?.status === TournamentStatus.announced 
                      ? 'Registration is open for the next tournament. Click below to register or unregister.'
                      : 'Tournament is active! You can still register to participate.'}
                  </p>
                  {isRegistered ? (
                    <div className="space-y-3">
                      <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          You are registered for this tournament
                        </AlertDescription>
                      </Alert>
                      <Button 
                        disabled
                        className="w-full"
                        variant="secondary"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Registered
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleUnregister}
                        disabled={unregisterFromTournament.isPending}
                      >
                        {unregisterFromTournament.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Unregister from Tournament
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={handleRegister}
                      disabled={registerForTournament.isPending}
                    >
                      {registerForTournament.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Register for Tournament
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {tournamentState?.status === TournamentStatus.paused
                        ? 'Tournament is paused. Registration is closed.'
                        : tournamentState?.status === TournamentStatus.completed
                        ? 'Tournament has ended. Wait for the next tournament announcement.'
                        : 'Registration will open when the next tournament is announced by administrators.'}
                    </AlertDescription>
                  </Alert>
                  <Button disabled className="w-full">
                    Registration Not Open
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scores" className="space-y-6">
          <TournamentScoreEntry hasAdminAccess={hasAdminAccess} />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <TournamentMatchApprovals />
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Standings</CardTitle>
              <CardDescription>Current tournament leaderboard (updates automatically after match approval)</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div 
                      key={entry.player.toString()}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg w-8">{entry.rank}</span>
                        <div>
                          <p className="font-medium">{entry.playerName}</p>
                          <p className="text-sm text-muted-foreground">
                            W: {entry.wins.toString()} | L: {entry.losses.toString()} | Pts: {entry.points.toString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active tournament</p>
                  <p className="text-sm mt-2">Standings will appear when a tournament is in progress</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {hasAdminAccess && (
          <TabsContent value="registered" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Registered Players
                </CardTitle>
                <CardDescription>
                  View all players registered for the current tournament (auto-refreshes every 3 seconds)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {registeredPlayersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : registeredPlayers.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium">
                        Total Registered: {registeredPlayers.length}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Auto-refreshing
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {registeredPlayers.map((player, index) => (
                        <div 
                          key={player.id.toString()}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <span className="font-semibold text-muted-foreground w-8">
                            {index + 1}
                          </span>
                          <Avatar className="h-10 w-10">
                            {player.photo ? (
                              <AvatarImage 
                                src={URL.createObjectURL(new Blob([new Uint8Array(player.photo)], { type: 'image/jpeg' }))} 
                                alt={player.name}
                              />
                            ) : null}
                            <AvatarFallback>
                              {player.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{player.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Elo: {player.rating.toString()}
                            </p>
                          </div>
                          <Badge variant="secondary">Registered</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No players registered yet</p>
                    <p className="text-sm mt-2">
                      {tournamentState?.status === TournamentStatus.announced || tournamentState?.status === TournamentStatus.active
                        ? 'Players will appear here as they register'
                        : 'Announce a tournament to open registration'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {hasAdminAccess && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Administration</CardTitle>
                <CardDescription>Manage tournament lifecycle and operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Button 
                    className="w-full justify-start"
                    onClick={handleAnnounceTournament}
                    disabled={
                      announceTournament.isPending || 
                      (tournamentState?.status !== TournamentStatus.notStarted && 
                       tournamentState?.status !== TournamentStatus.completed)
                    }
                  >
                    {announceTournament.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Announce Tournament
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={handleStartTournament}
                    disabled={
                      startTournament.isPending || 
                      tournamentState?.status !== TournamentStatus.announced
                    }
                  >
                    {startTournament.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Start Tournament
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={handlePauseTournament}
                    disabled={
                      pauseTournament.isPending || 
                      tournamentState?.status !== TournamentStatus.active
                    }
                  >
                    {pauseTournament.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Pause Tournament
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={handleEndTournament}
                    disabled={
                      endTournament.isPending || 
                      tournamentState?.status === TournamentStatus.notStarted ||
                      tournamentState?.status === TournamentStatus.completed
                    }
                  >
                    {endTournament.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    End Tournament
                  </Button>

                  <Button 
                    variant="secondary" 
                    className="w-full justify-start"
                    onClick={handleResetTournament}
                    disabled={
                      resetTournament.isPending || 
                      tournamentState?.status !== TournamentStatus.completed
                    }
                  >
                    {resetTournament.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Reset Tournament
                  </Button>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Current Status:</strong> {tournamentState?.status || 'Not Started'}
                    <br />
                    <strong>Registered Players:</strong> {tournamentState?.registeredPlayers.length || 0}
                    <br />
                    <br />
                    <strong>State Transitions:</strong>
                    <br />
                    • <strong>Announce Tournament:</strong> Opens registration (status: announced)
                    <br />
                    • <strong>Start Tournament:</strong> Begins play, members can register (status: active)
                    <br />
                    • <strong>Pause Tournament:</strong> Temporarily halts play (status: paused)
                    <br />
                    • <strong>End Tournament:</strong> Completes tournament and updates Elo ratings (status: completed)
                    <br />
                    • <strong>Reset Tournament:</strong> Clears tournament data for next event (status: notStarted)
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
