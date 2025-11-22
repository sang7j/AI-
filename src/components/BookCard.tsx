import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./common/ImageWithFallback";

interface BookCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    description: string;
    coverImage: string;
  };
  matchedKeywords?: string[];
  score?: number;
  onClick?: () => void;
  onKeywordClick?: (keyword: string) => void;
}

export function BookCard({ book, matchedKeywords, score, onClick, onKeywordClick }: BookCardProps) {
  const handleKeywordClick = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    onKeywordClick?.(keyword);
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] bg-gray-100">
        <ImageWithFallback
          src={book.coverImage || "https://images.unsplash.com/photo-1551300329-dc0a750a7483?w=400"}
          alt={book.title}
          className="w-full h-full object-cover"
        />
        {score !== undefined && score > 0 && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full">
            ★ {score}
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{book.title}</CardTitle>
        <CardDescription>{book.author}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{book.description}</p>
        {matchedKeywords && matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {matchedKeywords.slice(0, 3).map((keyword, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="text-xs cursor-pointer hover:bg-purple-200" 
                onClick={(e) => handleKeywordClick(e, keyword)}
              >
                {keyword}
              </Badge>
            ))}
            {matchedKeywords.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{matchedKeywords.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}