import { useGetPendingMatches, useApproveMatch, useRejectMatch, useGetLeaderboard, useIsCallerAdmin, useIsScoreAuthAdmin } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react';
import { useState } from 'react';

export default function PendingMatches() {
  const { identity } = useInternetIdentity();
  const { data: pendingMatches, isLoading } = useGetPendingMatches();
  const { data: leaderboard } = useGetLeaderboard();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: isScoreAuthAdmin } = useIsScoreAuthAdmin();
  const approveMatch = useApproveMatch();
  const rejectMatch = useRejectMatch();
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<bigint | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const isAuthenticated = !!identity;
  const currentUserPrincipal = identity?.getPrincipal().toString();
  const canManageAllMatches = isAdmin || isScoreAuthAdmin;

  const getMemberName = (principal: string) => {
    const member = leaderboard?.find(m => m.id.toString() === principal);
    return member?.name || 'Unknown Player';
  };

  const handleApprove = async (timestamp: bigint) => {
    setError('');
    try {
      await approveMatch.mutateAsync(timestamp);
    } catch (err: any) {
      setError(err.message || 'Failed to approve match');
    }
  };

  const handleReject = async () => {
    if (!selectedMatch) return;
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setError('');
    try {
      await rejectMatch.mutateAsync({ timestamp: selectedMatch, reason: rejectionReason });
      setIsDialogOpen(false);
      setRejectionReason('');
      setSelectedMatch(null);
    } catch (err: any) {
      setError(err.message || 'Failed to reject match');
    }
  };

  const openRejectDialog = (timestamp: bigint) => {
    setSelectedMatch(timestamp);
    setRejectionReason('');
    setError('');
    setIsDialogOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Match Approvals
          </CardTitle>
          <CardDescription>Review and approve submitted match scores</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view pending matches.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Match Approvals
          </CardTitle>
          <CardDescription>Review and approve submitted match scores</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading pending matches...</p>
        </CardContent>
      </Card>
    );
  }

  const myPendingMatches = pendingMatches?.filter(
    match => match.playerB.toString() === currentUserPrincipal
  ) || [];

  const allPendingMatches = pendingMatches || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Matches Awaiting Your Approval
          </CardTitle>
          <CardDescription>
            Approve or reject match scores submitted by your opponents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myPendingMatches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending matches require your approval.
            </p>
          ) : (
            <div className="space-y-4">
              {myPendingMatches.map((match) => {
                const playerAName = getMemberName(match.playerA.toString());
                const date = new Date(Number(match.timestamp) / 1000000);
                
                return (
                  <div
                    key={match.timestamp.toString()}
                    className="p-4 rounded-lg border border-border bg-card space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{playerAName}</span>
                          <Badge variant="outline">vs</Badge>
                          <span className="font-semibold text-foreground">You</span>
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                          {Number(match.scoreA)} - {Number(match.scoreB)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Submitted on {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(match.timestamp)}
                        disabled={approveMatch.isPending}
                        className="flex-1"
                        variant="default"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {approveMatch.isPending ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        onClick={() => openRejectDialog(match.timestamp)}
                        disabled={rejectMatch.isPending}
                        className="flex-1"
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {canManageAllMatches && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              All Pending Matches {isScoreAuthAdmin && !isAdmin && '(Score Auth Admin)'}
            </CardTitle>
            <CardDescription>
              {isScoreAuthAdmin && !isAdmin 
                ? 'Manage all pending match submissions as a score-authentication admin'
                : 'Manage all pending match submissions as an administrator'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allPendingMatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No pending matches in the system.
              </p>
            ) : (
              <div className="space-y-4">
                {allPendingMatches.map((match) => {
                  const playerAName = getMemberName(match.playerA.toString());
                  const playerBName = getMemberName(match.playerB.toString());
                  const date = new Date(Number(match.timestamp) / 1000000);
                  
                  return (
                    <div
                      key={match.timestamp.toString()}
                      className="p-4 rounded-lg border border-border bg-card space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{playerAName}</span>
                            <Badge variant="outline">vs</Badge>
                            <span className="font-semibold text-foreground">{playerBName}</span>
                          </div>
                          <div className="text-2xl font-bold text-foreground">
                            {Number(match.scoreA)} - {Number(match.scoreB)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Submitted on {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(match.timestamp)}
                          disabled={approveMatch.isPending}
                          className="flex-1"
                          variant="default"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {approveMatch.isPending ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => openRejectDialog(match.timestamp)}
                          disabled={rejectMatch.isPending}
                          className="flex-1"
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Match</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this match score.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Incorrect score, match didn't happen, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                maxLength={255}
              />
              <p className="text-xs text-muted-foreground">
                {rejectionReason.length}/255 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMatch.isPending}
            >
              {rejectMatch.isPending ? 'Rejecting...' : 'Reject Match'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
