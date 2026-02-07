import { useGetLeaderboard, useSubmitMatchScore } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Swords, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { MemberProfile } from '../backend';

type AlphabetGroup = {
  label: string;
  range: string;
  members: MemberProfile[];
};

export default function MatchSubmission() {
  const { identity } = useInternetIdentity();
  const { data: leaderboard } = useGetLeaderboard();
  const submitMatch = useSubmitMatchScore();
  const [opponent, setOpponent] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [myScore, setMyScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isAuthenticated = !!identity;
  const currentUserPrincipal = identity?.getPrincipal().toString();
  const currentMember = leaderboard?.find(m => m.id.toString() === currentUserPrincipal);
  
  const availableOpponents = leaderboard?.filter(m => m.id.toString() !== currentUserPrincipal) || [];

  // Group members by first letter of first name into 10 alphabetic groups
  const groupedOpponents = useMemo(() => {
    const groups: AlphabetGroup[] = [
      { label: 'A–C', range: 'ABC', members: [] },
      { label: 'D–F', range: 'DEF', members: [] },
      { label: 'G–I', range: 'GHI', members: [] },
      { label: 'J–L', range: 'JKL', members: [] },
      { label: 'M–O', range: 'MNO', members: [] },
      { label: 'P–R', range: 'PQR', members: [] },
      { label: 'S–U', range: 'STU', members: [] },
      { label: 'V–X', range: 'VWX', members: [] },
      { label: 'Y–Z', range: 'YZ', members: [] },
      { label: 'Misc', range: '', members: [] },
    ];

    availableOpponents.forEach(member => {
      const firstLetter = member.name.charAt(0).toUpperCase();
      let placed = false;

      for (const group of groups.slice(0, 9)) {
        if (group.range.includes(firstLetter)) {
          group.members.push(member);
          placed = true;
          break;
        }
      }

      if (!placed) {
        groups[9].members.push(member);
      }
    });

    // Sort members within each group alphabetically
    groups.forEach(group => {
      group.members.sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [availableOpponents]);

  // Find which group contains the selected opponent
  const activeGroupLabel = useMemo(() => {
    if (!opponent) return null;
    const group = groupedOpponents.find(g => 
      g.members.some(m => m.id.toString() === opponent)
    );
    return group?.label || null;
  }, [opponent, groupedOpponents]);

  const handleSelectOpponent = (value: string) => {
    const selectedMember = availableOpponents.find(m => m.id.toString() === value);
    if (selectedMember) {
      setOpponent(value);
      setOpponentName(selectedMember.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!opponent) {
      setError('Please select an opponent');
      return;
    }

    if (myScore === '' || opponentScore === '') {
      setError('Please enter both scores');
      return;
    }

    const scoreA = parseInt(myScore);
    const scoreB = parseInt(opponentScore);

    if (isNaN(scoreA) || isNaN(scoreB)) {
      setError('Please enter valid numeric scores');
      return;
    }

    if (scoreA < 0 || scoreB < 0) {
      setError('Scores cannot be negative');
      return;
    }

    if (scoreA === scoreB) {
      setError('Cannot submit a tie game - one player must win for rating purposes');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMatch.mutateAsync({
        opponent,
        scoreA: BigInt(scoreA),
        scoreB: BigInt(scoreB),
      });
      setSuccess(true);
      setOpponent('');
      setOpponentName('');
      setMyScore('');
      setOpponentScore('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit match score');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Submit Match Score
          </CardTitle>
          <CardDescription>Record your match results for approval</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to submit match scores.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!currentMember) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Submit Match Score
          </CardTitle>
          <CardDescription>Record your match results for approval</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be registered as a member to submit match scores. Please join the member directory first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Submit Match Score
          </CardTitle>
          <CardDescription>
            Record your match results - your opponent will need to approve before ratings are updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Select Opponent by Name</Label>
              <p className="text-sm text-muted-foreground">
                Choose the dropdown that matches the first letter of your opponent's name
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {groupedOpponents.map((group) => {
                  const isActiveGroup = activeGroupLabel === group.label;
                  const hasMembers = group.members.length > 0;
                  
                  return (
                    <div 
                      key={group.label} 
                      className={`space-y-2 rounded-lg p-2 transition-all ${
                        isActiveGroup 
                          ? 'bg-primary/10 ring-2 ring-primary/50 shadow-sm' 
                          : 'bg-transparent'
                      }`}
                    >
                      <Label 
                        className={`text-xs font-semibold uppercase tracking-wide block text-center ${
                          isActiveGroup 
                            ? 'text-primary' 
                            : hasMembers 
                              ? 'text-foreground' 
                              : 'text-muted-foreground/50'
                        }`}
                      >
                        {group.label}
                      </Label>
                      <Select
                        value={group.members.some(m => m.id.toString() === opponent) ? opponent : ''}
                        onValueChange={handleSelectOpponent}
                        disabled={!hasMembers}
                      >
                        <SelectTrigger 
                          className={`w-full ${
                            isActiveGroup 
                              ? 'border-primary/50 bg-primary/5' 
                              : ''
                          }`}
                        >
                          <SelectValue placeholder={
                            !hasMembers 
                              ? 'None' 
                              : `${group.members.length}`
                          } />
                        </SelectTrigger>
                        <SelectContent className="max-h-[min(var(--radix-select-content-available-height),400px)]">
                          {group.members.map((member) => (
                            <SelectItem 
                              key={member.id.toString()} 
                              value={member.id.toString()}
                            >
                              <div className="flex items-center justify-between w-full gap-4">
                                <span className="font-medium">{member.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {Number(member.rating)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>

              {opponent && opponentName && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Selected opponent:</span>{' '}
                    <span className="font-semibold">{opponentName}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="myScore">Your Score</Label>
                <Input
                  id="myScore"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={myScore}
                  onChange={(e) => setMyScore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opponentScore">Opponent Score</Label>
                <Input
                  id="opponentScore"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Valid Score Examples:</p>
                  <div className="text-blue-800 dark:text-blue-200 space-y-0.5">
                    <p>✓ 3-0, 3-1, 3-2 (you won)</p>
                    <p>✓ 0-3, 1-3, 2-3 (opponent won)</p>
                    <p>✓ 2-0, 2-1, 0-2, 1-2 (shorter matches)</p>
                    <p className="font-medium mt-2">Zero scores are perfectly valid!</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-red-900 dark:text-red-100">Not Allowed:</p>
                  <p className="text-red-800 dark:text-red-200">✗ Tie scores (1-1, 2-2, 3-3) - one player must win</p>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Match score submitted successfully! Awaiting opponent approval before ratings are updated.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Match Score'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


