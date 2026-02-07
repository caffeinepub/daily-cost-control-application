import { useGetMemberDirectory } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, TrendingUp, Users, CheckCircle2, Clock } from 'lucide-react';
import type { PublicMemberDirectoryEntry } from '../backend';

interface MemberDirectoryProps {
  preview?: boolean;
  onViewAll?: () => void;
}

export default function MemberDirectory({ preview = false, onViewAll }: MemberDirectoryProps) {
  const { data: members, isLoading } = useGetMemberDirectory();
  const { identity } = useInternetIdentity();

  const isAuthenticated = !!identity;
  const displayMembers = preview ? members?.slice(0, 4) : members;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMemberImage = (member: PublicMemberDirectoryEntry) => {
    if (member.photo) {
      const blob = new Blob([new Uint8Array(member.photo)], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    }
    return '/assets/generated/default-avatar.dim_100x100.png';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Directory
          </CardTitle>
          <CardDescription>Loading members...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const memberList = (
    <div className="space-y-4">
      {displayMembers?.map((member) => {
        const rank = member.isClaimed ? Number(member.rank) : 0;
        
        return (
          <div
            key={`member-${member.name}-${member.rating}`}
            className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              {rank > 0 && rank <= 3 && (
                <Trophy className={`h-5 w-5 ${
                  rank === 1 ? 'text-yellow-500' : 
                  rank === 2 ? 'text-gray-400' : 
                  'text-amber-600'
                }`} />
              )}
              <Avatar className="h-12 w-12">
                <AvatarImage src={getMemberImage(member)} alt={member.name} />
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{member.name}</span>
                  {member.isClaimed ? (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      Claimed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      Unclaimed
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {member.isClaimed && rank > 0 ? (
                    <>
                      <span>Rank #{rank}</span>
                      <span>•</span>
                    </>
                  ) : null}
                  <span>Elo: {Number(member.rating)}</span>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {Number(member.rating)}
            </Badge>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Member Directory
            </CardTitle>
            <CardDescription>
              {members?.length || 0} members ranked by Elo rating
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!members || members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No members registered yet.</p>
          </div>
        ) : preview ? (
          <>
            {memberList}
            {members && members.length > 4 && (
              <div className="text-center pt-4">
                <button onClick={onViewAll} className="text-primary hover:underline">
                  View all {members.length} members →
                </button>
              </div>
            )}
          </>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            {memberList}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
