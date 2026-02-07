import { useGetApprovedMatches, useGetLeaderboard } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, AlertCircle } from 'lucide-react';

export default function MatchHistory() {
  const { identity } = useInternetIdentity();
  const { data: approvedMatches = [] } = useGetApprovedMatches();
  const { data: leaderboard } = useGetLeaderboard();

  const isAuthenticated = !!identity;
  const currentUserPrincipal = identity?.getPrincipal().toString();

  const getMemberName = (principal: string) => {
    const member = leaderboard?.find(m => m.id.toString() === principal);
    return member?.name || 'Unknown Player';
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Match History
          </CardTitle>
          <CardDescription>View approved match records</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view match history.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const myApprovedMatches = approvedMatches.filter(
    match => match.playerA.toString() === currentUserPrincipal || match.playerB.toString() === currentUserPrincipal
  );

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Match History
          </CardTitle>
          <CardDescription>View your approved match records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mt-4">
            {myApprovedMatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No approved matches yet.
              </p>
            ) : (
              <div className="space-y-3">
                {myApprovedMatches.map((match) => {
                  const isPlayerA = match.playerA.toString() === currentUserPrincipal;
                  const opponentName = isPlayerA 
                    ? getMemberName(match.playerB.toString())
                    : getMemberName(match.playerA.toString());
                  const myScore = isPlayerA ? Number(match.scoreA) : Number(match.scoreB);
                  const theirScore = isPlayerA ? Number(match.scoreB) : Number(match.scoreA);
                  const won = myScore > theirScore;
                  const ratingChange = isPlayerA ? Number(match.ratingChangeA) : Number(match.ratingChangeB);
                  const date = new Date(Number(match.timestamp) / 1000000);

                  return (
                    <div
                      key={match.timestamp.toString()}
                      className="p-4 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              vs {opponentName}
                            </span>
                            <Badge variant={won ? 'default' : 'secondary'}>
                              {won ? 'Won' : 'Lost'}
                            </Badge>
                          </div>
                          <div className="text-xl font-bold text-foreground">
                            {myScore} - {theirScore}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-semibold ${ratingChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {ratingChange >= 0 ? '+' : ''}{ratingChange}
                          </div>
                          <Badge variant="outline" className="mt-1">Approved</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
