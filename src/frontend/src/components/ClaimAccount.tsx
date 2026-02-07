import { useState } from 'react';
import { useClaimMemberAccount, useGetLeaderboard } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Key } from 'lucide-react';

export default function ClaimAccount() {
  const { identity } = useInternetIdentity();
  const { data: leaderboard } = useGetLeaderboard();
  const claimAccount = useClaimMemberAccount();
  const [claimCode, setClaimCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isAuthenticated = !!identity;
  const currentUserPrincipal = identity?.getPrincipal().toString();
  const isCurrentUserMember = leaderboard?.some(m => 
    m.id.toString() === currentUserPrincipal
  );

  const handleClaim = async () => {
    if (!claimCode.trim()) {
      setError('Please enter a claim code');
      return;
    }

    setError('');
    setSuccess(false);

    try {
      await claimAccount.mutateAsync(claimCode.trim());
      setSuccess(true);
      setClaimCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to claim account. Please check your claim code and try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Claim Your Account
          </CardTitle>
          <CardDescription>Use your claim code to link your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to claim your member account.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isCurrentUserMember) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Claim Your Account
          </CardTitle>
          <CardDescription>Use your claim code to link your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              You are already registered as a member. No need to claim an account.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Claim Your Account
        </CardTitle>
        <CardDescription>
          Enter the claim code provided by an administrator to link your member account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Account claimed successfully! Your member profile is now linked to your identity.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="claimCode">Claim Code</Label>
            <Input
              id="claimCode"
              placeholder="Enter your claim code"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              disabled={claimAccount.isPending}
            />
            <p className="text-sm text-muted-foreground">
              The claim code was provided to you by an administrator when your member profile was created.
            </p>
          </div>

          <Button
            onClick={handleClaim}
            disabled={!claimCode.trim() || claimAccount.isPending}
            className="w-full"
          >
            {claimAccount.isPending ? 'Claiming Account...' : 'Claim Account'}
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">1.</span>
              <span>An administrator creates your member profile with your name and optional photo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">2.</span>
              <span>You receive a unique one-time claim code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">3.</span>
              <span>Log in with Internet Identity and enter your claim code here</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">4.</span>
              <span>Your identity is linked to the member profile, and you can start playing!</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
