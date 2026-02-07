import { useState, useMemo } from 'react';
import { useGetApprovedMatches, useGetLeaderboard } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpDown, Search, Calendar } from 'lucide-react';
import type { MatchScore } from '../backend';

type SortField = 'date' | 'playerA' | 'playerB' | 'score';
type SortDirection = 'asc' | 'desc';

export default function MatchHistoryScreen() {
  const { data: matches, isLoading: matchesLoading } = useGetApprovedMatches();
  const { data: leaderboard, isLoading: leaderboardLoading } = useGetLeaderboard();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const isLoading = matchesLoading || leaderboardLoading;

  const getPlayerName = (principalStr: string) => {
    const player = leaderboard?.find(p => p.id.toString() === principalStr);
    return player?.name || 'Unknown Player';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedMatches = useMemo(() => {
    if (!matches) return [];

    let filtered = matches;

    if (searchTerm) {
      filtered = matches.filter((match) => {
        const playerAName = getPlayerName(match.playerA.toString()).toLowerCase();
        const playerBName = getPlayerName(match.playerB.toString()).toLowerCase();
        const search = searchTerm.toLowerCase();
        return playerAName.includes(search) || playerBName.includes(search);
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = Number(a.timestamp) - Number(b.timestamp);
          break;
        case 'playerA':
          comparison = getPlayerName(a.playerA.toString()).localeCompare(
            getPlayerName(b.playerA.toString())
          );
          break;
        case 'playerB':
          comparison = getPlayerName(a.playerB.toString()).localeCompare(
            getPlayerName(b.playerB.toString())
          );
          break;
        case 'score':
          comparison = Number(a.scoreA) - Number(b.scoreA);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [matches, searchTerm, sortField, sortDirection, leaderboard]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground">Match History</h2>
        <div className="text-center py-12 text-muted-foreground">Loading match history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Match History</h2>
        <p className="text-muted-foreground mt-2">
          Complete record of all approved matches with scores and rating changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            All Approved Matches
          </CardTitle>
          <CardDescription>
            Sort and filter matches by player name or date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by player name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filteredAndSortedMatches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? 'No matches found matching your search' : 'No approved matches yet'}
            </div>
          ) : (
            <ScrollArea className="h-[600px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-1 hover:bg-transparent"
                      >
                        Date
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('playerA')}
                        className="flex items-center gap-1 hover:bg-transparent"
                      >
                        Player A
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('playerB')}
                        className="flex items-center gap-1 hover:bg-transparent"
                      >
                        Player B
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('score')}
                        className="flex items-center gap-1 hover:bg-transparent"
                      >
                        Score
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">Rating Change A</TableHead>
                    <TableHead className="text-center">Rating Change B</TableHead>
                    <TableHead className="text-center">K-Factor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedMatches.map((match, index) => {
                    const playerAName = getPlayerName(match.playerA.toString());
                    const playerBName = getPlayerName(match.playerB.toString());
                    const matchDate = new Date(Number(match.timestamp) / 1000000);
                    const kFactor = Number(match.kFactor) || 20;

                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {matchDate.toLocaleDateString()}
                        </TableCell>
                        <TableCell>{playerAName}</TableCell>
                        <TableCell>{playerBName}</TableCell>
                        <TableCell className="text-center font-bold">
                          {Number(match.scoreA)} - {Number(match.scoreB)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-semibold ${
                              Number(match.ratingChangeA) >= 0
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}
                          >
                            {Number(match.ratingChangeA) >= 0 ? '+' : ''}
                            {Number(match.ratingChangeA)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-semibold ${
                              Number(match.ratingChangeB) >= 0
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}
                          >
                            {Number(match.ratingChangeB) >= 0 ? '+' : ''}
                            {Number(match.ratingChangeB)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{kFactor}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {filteredAndSortedMatches.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Showing {filteredAndSortedMatches.length} of {matches?.length || 0} matches
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
