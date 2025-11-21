import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface KeywordBadgeProps {
  keyword: {
    keyword: string;
    upvotes: number;
    downvotes: number;
    score: number;
  };
  onVote?: (voteType: 'up' | 'down') => void;
  showVoting?: boolean;
}

export function KeywordBadge({ keyword, onVote, showVoting = true }: KeywordBadgeProps) {
  const isPositive = keyword.score > 0;
  const isNegative = keyword.score < 0;
  // 13자 이상이면 줄바꿈 처리
  const shouldWrap = keyword.keyword.length >= 13;

  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-white">
      <Badge 
        variant={isPositive ? "default" : isNegative ? "outline" : "secondary"}
        className={`text-sm ${shouldWrap ? 'break-all whitespace-normal max-w-[200px]' : ''}`}
      >
        {keyword.keyword}
      </Badge>
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <span className="flex items-center gap-0.5">
          <ThumbsUp className="h-3 w-3" />
          {keyword.upvotes}
        </span>
        <span className="flex items-center gap-0.5">
          <ThumbsDown className="h-3 w-3" />
          {keyword.downvotes}
        </span>
        {keyword.score !== 0 && (
          <span className={`ml-1 ${keyword.score > 0 ? 'text-green-600' : 'text-red-600'}`}>
            ({keyword.score > 0 ? '+' : ''}{keyword.score})
          </span>
        )}
      </div>
      {showVoting && onVote && (
        <div className="flex gap-1 ml-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onVote('up')}
            className="h-7 px-2"
          >
            <ThumbsUp className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onVote('down')}
            className="h-7 px-2"
          >
            <ThumbsDown className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      )}
    </div>
  );
}