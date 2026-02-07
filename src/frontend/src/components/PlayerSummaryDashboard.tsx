import { useState } from 'react';
import { useGetPlayerMatchHistory, useGetLeaderboard } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Activity } from 'lucide-react';
import { Principal } from '@icp-sdk/core/principal';

export default function PlayerSummaryDashboard() {
  const { identity } = useInternetIdentity();
  const { data: leaderboard, isLoading: leaderboardLoading } = useGetLeaderboard();
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');

  const currentUserPrincipal = identity?.getPrincipal().toString() || '';
  const playerToView = selectedPlayer || currentUserPrincipal;

  const { data: matchHistory, isLoading: matchHistoryLoading } = useGetPlayerMatchHistory(
    playerToView ? Principal.fromText(playerToView) : Principal.anonymous()
  );

  const isLoading = leaderboardLoading || matchHistoryLoading;

  const getPlayerName = (principalStr: string) => {
    const player = leaderboard?.find(p => p.id.toString() === principalStr);
    return player?.name || 'Unknown Player';
  };

  const getAvatarUrl = (photo?: Uint8Array) => {
    if (!photo) return null;
    const blob = new Blob([new Uint8Array(photo)], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  };

  const playerProfile = leaderboard?.find(p => p.id.toString() === playerToView);
  const totalMatches = matchHistory?.length || 0;
  const currentElo = playerProfile?.rating || 0n;

  // Calculate K-factor based on matches played
  const calculateKFactor = (matchesPlayed: number): number => {
    if (matchesPlayed < 30) return 40;
    if (matchesPlayed < 100) return 20;
    return 10;
  };

  const kFactor = calculateKFactor(totalMatches);
  const kFactorRule = kFactor === 40 
    ? 'New players (< 30 matches)' 
    : kFactor === 20 
    ? 'Regular players (30-99 matches)' 
    : 'Experienced players (100+ matches)';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">Player Summary Dashboard</h2>
        </div>
        <div className="text-center py-12 text-muted-foreground">Loading player data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-foreground">Player Summary Dashboard</h2>
        
        <Select value={playerToView} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select a player" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={currentUserPrincipal}>My Dashboard</SelectItem>
            {leaderboard?.filter(p => p.id.toString() !== currentUserPrincipal).map((player) => (
              <SelectItem key={player.id.toString()} value={player.id.toString()}>
                {player.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {playerProfile ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Player Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={getAvatarUrl(playerProfile.photo) || undefined} />
                <AvatarFallback className="text-2xl">
                  {playerProfile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-2xl font-bold">{playerProfile.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {totalMatches} matches played
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Current Elo Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold">{Number(currentElo)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                K-Factor
              </CardTitle>
              <CardDescription>{kFactorRule}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{kFactor}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {kFactor === 40 && 'New players (< 30 matches)'}
                {kFactor === 20 && 'Regular players (30-99 matches)'}
                {kFactor === 10 && 'Experienced players (100+ matches)'}
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Match History
              </CardTitle>
              <CardDescription>
                Detailed record of all matches with scores and opponents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!matchHistory || matchHistory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No matches played yet</p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {matchHistory.map((match, index) => {
                      const isPlayerA = match.playerA.toString() === playerToView;
                      const opponentId = isPlayerA ? match.playerB : match.playerA;
                      const opponentName = getPlayerName(opponentId.toString());
                      const playerScore = isPlayerA ? Number(match.scoreA) : Number(match.scoreB);
                      const opponentScore = isPlayerA ? Number(match.scoreB) : Number(match.scoreA);
                      const won = playerScore > opponentScore;
                      const ratingChange = isPlayerA ? Number(match.ratingChangeA) : Number(match.ratingChangeB);

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <Badge variant={won ? 'default' : 'secondary'}>
                              {won ? 'Won' : 'Lost'}
                            </Badge>
                            <div>
                              <p className="font-medium">vs {opponentName}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(Number(match.timestamp) / 1000000).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {playerScore} - {opponentScore}
                            </p>
                            <p className={`text-sm font-semibold ${ratingChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {ratingChange >= 0 ? '+' : ''}{ratingChange} Elo
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No player data available. Please select a player or ensure you have a claimed account.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
