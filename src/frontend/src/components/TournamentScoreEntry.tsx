import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useGetLeaderboard, useSubmitTournamentMatchScore, useSubmitTournamentMatchScoreWithPlayers, useGetTournamentState } from '@/hooks/useQueries';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { Principal } from '@icp-sdk/core/principal';

interface TournamentScoreEntryProps {
  hasAdminAccess?: boolean;
}

export default function TournamentScoreEntry({ hasAdminAccess = false }: TournamentScoreEntryProps) {
  const { identity } = useInternetIdentity();
  const { data: leaderboard = [] } = useGetLeaderboard();
  const { data: tournamentState } = useGetTournamentState();
  const submitScore = useSubmitTournamentMatchScore();
  const submitScoreWithPlayers = useSubmitTournamentMatchScoreWithPlayers();

  const [player1, setPlayer1] = useState<string>('');
  const [player2, setPlayer2] = useState<string>('');
  const [opponent, setOpponent] = useState<string>('');
  const [roundNumber, setRoundNumber] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');

  const isAuthenticated = !!identity;
  const currentUserPrincipal = identity?.getPrincipal().toString();

  const availableOpponents = leaderboard.filter(
    (member) => member.id.toString() !== currentUserPrincipal
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasAdminAccess) {
      // Admin mode: validate player1 and player2
      if (!player1 || !player2 || !roundNumber || !tableNumber || !scoreA || !scoreB) {
        toast.error('Please fill in all fields');
        return;
      }

      if (player1 === player2) {
        toast.error('Player 1 and Player 2 must be different');
        return;
      }
    } else {
      // Non-admin mode: validate opponent
      if (!opponent || !roundNumber || !tableNumber || !scoreA || !scoreB) {
        toast.error('Please fill in all fields');
        return;
      }
    }

    const scoreANum = BigInt(scoreA);
    const scoreBNum = BigInt(scoreB);

    const validScores = [
      { a: 2n, b: 0n },
      { a: 2n, b: 1n },
      { a: 1n, b: 2n },
      { a: 0n, b: 2n },
    ];

    const isValid = validScores.some(
      (valid) => valid.a === scoreANum && valid.b === scoreBNum
    );

    if (!isValid) {
      toast.error('Invalid score. Must be best-of-three: 2-0, 2-1, 1-2, or 0-2');
      return;
    }

    try {
      if (hasAdminAccess) {
        await submitScoreWithPlayers.mutateAsync({
          player1: Principal.fromText(player1),
          player2: Principal.fromText(player2),
          scoreA: scoreANum,
          scoreB: scoreBNum,
          roundNumber: BigInt(roundNumber),
          tableNumber: BigInt(tableNumber),
        });
      } else {
        await submitScore.mutateAsync({
          opponent: Principal.fromText(opponent),
          scoreA: scoreANum,
          scoreB: scoreBNum,
          roundNumber: BigInt(roundNumber),
          tableNumber: BigInt(tableNumber),
        });
      }

      toast.success('Tournament match score submitted! Awaiting approval.');
      
      // Reset form
      setPlayer1('');
      setPlayer2('');
      setOpponent('');
      setRoundNumber('');
      setTableNumber('');
      setScoreA('');
      setScoreB('');
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error?.message || 'Failed to submit tournament score');
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enter Tournament Scores</CardTitle>
          <CardDescription>Submit your tournament match results</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to submit tournament scores.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isPending = hasAdminAccess ? submitScoreWithPlayers.isPending : submitScore.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Tournament Scores</CardTitle>
        <CardDescription>
          {hasAdminAccess 
            ? 'Submit tournament match results for any two players'
            : 'Submit your tournament match results for approval'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How to enter scores:</strong>
            <br />
            {hasAdminAccess ? (
              <>
                1. Select Player 1 and Player 2, round number, and table number
                <br />
                2. Enter the match score in best-of-three format (2-0, 2-1, 1-2, or 0-2)
                <br />
                3. Submit for approval - either player or an admin must approve
              </>
            ) : (
              <>
                1. Select your opponent, round number, and table number
                <br />
                2. Enter the match score in best-of-three format (2-0, 2-1, 1-2, or 0-2)
                <br />
                3. Submit for approval - your opponent or an admin must approve
              </>
            )}
            <br />
            4. Once approved, the tournament leaderboard will update automatically
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasAdminAccess ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="player1">Player 1</Label>
                <Select value={player1} onValueChange={setPlayer1}>
                  <SelectTrigger id="player1">
                    <SelectValue placeholder="Select Player 1" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {leaderboard.map((member) => (
                      <SelectItem key={member.id.toString()} value={member.id.toString()}>
                        {member.name} (Elo: {member.rating.toString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="player2">Player 2</Label>
                <Select value={player2} onValueChange={setPlayer2}>
                  <SelectTrigger id="player2">
                    <SelectValue placeholder="Select Player 2" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {leaderboard.map((member) => (
                      <SelectItem key={member.id.toString()} value={member.id.toString()}>
                        {member.name} (Elo: {member.rating.toString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent</Label>
              <Select value={opponent} onValueChange={setOpponent}>
                <SelectTrigger id="opponent">
                  <SelectValue placeholder="Select opponent" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {availableOpponents.map((member) => (
                    <SelectItem key={member.id.toString()} value={member.id.toString()}>
                      {member.name} (Elo: {member.rating.toString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roundNumber">Round Number</Label>
              <Select value={roundNumber} onValueChange={setRoundNumber}>
                <SelectTrigger id="roundNumber">
                  <SelectValue placeholder="Select round" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((round) => (
                    <SelectItem key={round} value={round.toString()}>
                      Round {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableNumber">Table Number</Label>
              <Select value={tableNumber} onValueChange={setTableNumber}>
                <SelectTrigger id="tableNumber">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 7 }, (_, i) => i + 1).map((table) => (
                    <SelectItem key={table} value={table.toString()}>
                      Table {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Match Score (Best-of-Three)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scoreA" className="text-sm">
                  {hasAdminAccess ? 'Player 1 Score' : 'Your Score'}
                </Label>
                <Select value={scoreA} onValueChange={setScoreA}>
                  <SelectTrigger id="scoreA">
                    <SelectValue placeholder={hasAdminAccess ? 'Player 1 score' : 'Your score'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scoreB" className="text-sm">
                  {hasAdminAccess ? 'Player 2 Score' : 'Opponent Score'}
                </Label>
                <Select value={scoreB} onValueChange={setScoreB}>
                  <SelectTrigger id="scoreB">
                    <SelectValue placeholder={hasAdminAccess ? 'Player 2 score' : 'Opponent score'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Valid scores: 2-0, 2-1, 1-2, or 0-2 (one player must win 2 games)
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              isPending || 
              !roundNumber || 
              !tableNumber || 
              !scoreA || 
              !scoreB ||
              (hasAdminAccess ? (!player1 || !player2) : !opponent)
            }
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Tournament Score'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
