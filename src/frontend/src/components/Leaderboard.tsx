import { useGetLeaderboard, useGetCategoryLeaderboards } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Leaderboard() {
  const { data: globalLeaderboard, isLoading: globalLoading } = useGetLeaderboard();
  const { data: categoryLeaderboards, isLoading: categoriesLoading } = useGetCategoryLeaderboards();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getAvatarUrl = (photo: Uint8Array | undefined) => {
    if (!photo) return '/assets/generated/default-avatar.dim_100x100.png';
    const blob = new Blob([new Uint8Array(photo)], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  };

  if (globalLoading || categoriesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Leaderboard
          </CardTitle>
          <CardDescription>Player rankings by Elo rating</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </CardContent>
      </Card>
    );
  }

  const totalPlayers = globalLeaderboard?.length || 0;

  // Build a map from player ID to category name based on backend's equal division
  const playerCategoryMap = new Map<string, string>();
  categoryLeaderboards?.forEach((category) => {
    category.players.forEach((player) => {
      playerCategoryMap.set(player.id.toString(), category.categoryName);
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Leaderboard
          </CardTitle>
          <CardDescription>
            Player rankings by Elo rating with automatic equal category distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-primary/5 border-primary/20">
            <RefreshCw className="h-4 w-4" />
            <AlertDescription>
              All {totalPlayers} players are automatically sorted by Elo rating in descending order and divided equally into 8 categories. 
              Highest-rated players are placed in Expert Pros, lowest-rated in Learners. 
              Categories update automatically whenever Elo ratings change after match approvals.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9">
              <TabsTrigger value="global">Global</TabsTrigger>
              <TabsTrigger value="expert-pros">Expert Pros</TabsTrigger>
              <TabsTrigger value="expert-elites">Expert Elites</TabsTrigger>
              <TabsTrigger value="expert-club">Expert Club</TabsTrigger>
              <TabsTrigger value="casuals-club">Casuals Club</TabsTrigger>
              <TabsTrigger value="casuals-newbie">Casuals Newbie</TabsTrigger>
              <TabsTrigger value="beginners-club">Beginners Club</TabsTrigger>
              <TabsTrigger value="beginners-newbies">Beginners Newbies</TabsTrigger>
              <TabsTrigger value="learners">Learners</TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="mt-8 md:mt-10">
              {!globalLeaderboard || globalLeaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No players registered yet.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-right">Elo Rating</TableHead>
                        <TableHead className="text-right">Matches</TableHead>
                        <TableHead className="text-right">Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalLeaderboard.map((player) => {
                        const rank = Number(player.rank);
                        const categoryName = playerCategoryMap.get(player.id.toString()) || 'Unassigned';

                        return (
                          <TableRow key={player.id.toString()}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {getRankIcon(rank)}
                                <span>{rank}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={getAvatarUrl(player.photo)} alt={player.name} />
                                  <AvatarFallback>{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{player.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="font-mono">
                                {Number(player.rating)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {player.matchHistory.length}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-xs">
                                {categoryName}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {categoryLeaderboards?.map((category, catIndex) => {
              const categoryId = category.categoryName.toLowerCase().replace(/\s+/g, '-');
              const categoryDescriptions = [
                'Top tier - highest Elo ratings',
                'Elite level - high Elo ratings',
                'Expert club - above average Elo',
                'Casual competitive - mid-range Elo',
                'Casual newcomers - mid-range Elo',
                'Beginner club - below average Elo',
                'Beginning players - lower Elo ratings',
                'Learning tier - lowest Elo ratings',
              ];
              
              return (
                <TabsContent key={categoryId} value={categoryId} className="mt-8 md:mt-10">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-foreground">{category.categoryName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {categoryDescriptions[catIndex]} • {category.players.length} {category.players.length === 1 ? 'player' : 'players'}
                    </p>
                  </div>
                  
                  {category.players.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No players in this category yet.
                    </p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Global Rank</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead className="text-right">Elo Rating</TableHead>
                            <TableHead className="text-right">Matches</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.players.map((player) => {
                            const globalRank = Number(player.rank);
                            
                            return (
                              <TableRow key={player.id.toString()}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {getRankIcon(globalRank)}
                                    <span>{globalRank}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={getAvatarUrl(player.photo)} alt={player.name} />
                                      <AvatarFallback>{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{player.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary" className="font-mono">
                                    {Number(player.rating)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {player.matchHistory.length}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
