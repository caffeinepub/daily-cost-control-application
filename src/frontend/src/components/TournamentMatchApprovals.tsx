import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useGetTournamentState, useApproveTournamentMatch, useRejectTournamentMatch, useGetLeaderboard, useIsCallerAdmin, useIsScoreAuthAdmin } from '@/hooks/useQueries';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function TournamentMatchApprovals() {
  const { identity } = useInternetIdentity();
  const { data: tournamentState } = useGetTournamentState();
  const { data: leaderboard = [] } = useGetLeaderboard();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: isScoreAuthAdmin } = useIsScoreAuthAdmin();
  const approveMatch = useApproveTournamentMatch();
  const rejectMatch = useRejectTournamentMatch();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<{ roundNumber: number; matchIndex: number } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isAuthenticated = !!identity;
  const currentUserPrincipal = identity?.getPrincipal().toString();
  const hasAdminAccess = !!(isAdmin || isScoreAuthAdmin);

  const getPlayerName = (principal: string): string => {
    const player = leaderboard.find((p) => p.id.toString() === principal);
    return player?.name || 'Unknown';
  };

  const pendingMatches: Array<{
    roundNumber: number;
    matchIndex: number;
    match: any;
  }> = [];

  tournamentState?.rounds.forEach((round, roundIndex) => {
    round.matches.forEach((match, matchIndex) => {
      if (match.status === 'pending') {
        pendingMatches.push({
          roundNumber: roundIndex,
          matchIndex,
          match,
        });
      }
    });
  });

  const handleApprove = async (roundNumber: number, matchIndex: number) => {
    try {
      await approveMatch.mutateAsync({
        roundNumber: BigInt(roundNumber),
        matchIndex: BigInt(matchIndex),
      });
      toast.success('Tournament match approved! Leaderboard updated.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to approve match');
    }
  };

  const handleRejectClick = (roundNumber: number, matchIndex: number) => {
    setSelectedMatch({ roundNumber, matchIndex });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedMatch) return;

    try {
      await rejectMatch.mutateAsync({
        roundNumber: BigInt(selectedMatch.roundNumber),
        matchIndex: BigInt(selectedMatch.matchIndex),
        reason: rejectionReason || null,
      });
      toast.success('Tournament match rejected');
      setRejectDialogOpen(false);
      setSelectedMatch(null);
      setRejectionReason('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reject match');
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament Match Approvals</CardTitle>
          <CardDescription>Review and approve pending tournament matches</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to view and approve tournament matches.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const userPendingMatches = pendingMatches.filter(
    (item) => item.match.playerB.toString() === currentUserPrincipal
  );

  const allPendingMatches = hasAdminAccess ? pendingMatches : userPendingMatches;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tournament Match Approvals</CardTitle>
          <CardDescription>
            {hasAdminAccess
              ? 'Review and approve all pending tournament matches'
              : 'Approve tournament matches where you are the opponent'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allPendingMatches.length > 0 ? (
            <div className="space-y-4">
              {allPendingMatches.map((item) => {
                const canApprove =
                  item.match.playerB.toString() === currentUserPrincipal || hasAdminAccess;

                return (
                  <div
                    key={`${item.roundNumber}-${item.matchIndex}`}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            Round {item.roundNumber + 1}
                          </Badge>
                          <Badge variant="outline">
                            Table {item.match.tableNumber.toString()}
                          </Badge>
                        </div>
                        <p className="font-medium">
                          {getPlayerName(item.match.playerA.toString())} vs{' '}
                          {getPlayerName(item.match.playerB.toString())}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Score: {item.match.scoreA.toString()} - {item.match.scoreB.toString()}
                        </p>
                      </div>
                      <Badge>Pending</Badge>
                    </div>

                    {canApprove && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(item.roundNumber, item.matchIndex)}
                          disabled={approveMatch.isPending}
                          className="flex-1"
                        >
                          {approveMatch.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectClick(item.roundNumber, item.matchIndex)}
                          disabled={rejectMatch.isPending}
                          className="flex-1"
                        >
                          {rejectMatch.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {!canApprove && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Only the opponent or admins can approve this match
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending tournament matches</p>
              <p className="text-sm mt-2">
                Submitted tournament scores will appear here for approval
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Tournament Match</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this tournament match (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedMatch(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMatch.isPending}
            >
              {rejectMatch.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Match'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
