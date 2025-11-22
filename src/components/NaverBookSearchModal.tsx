import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { searchNaverBooks, createBook } from "../utils/api";
import { Search } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { ImageWithFallback } from './common/ImageWithFallback';
interface NaverBookSearchModalProps {
  open: boolean;
  onClose: () => void;
  onBookAdded: () => void;
}

export function NaverBookSearchModal({ open, onClose, onBookAdded }: NaverBookSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchNaverBooks(query);
      setResults(data.books || []);
      
      if (data.books.length === 0) {
        toast.info('검색 결과가 없습니다');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      if (error.message.includes('not configured')) {
        toast.error('네이버 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.');
      } else {
        toast.error('책 검색에 실패했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (book: any) => {
    setAdding(book.isbn);
    try {
      await createBook(book);
      toast.success('도서가 추가되었습니다!');
      onBookAdded();
      onClose();
    } catch (error) {
      console.error('Add book error:', error);
      toast.error('도서 추가에 실패했습니다');
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>네이버 책 검색</DialogTitle>
          <DialogDescription>
            검색해서 도서 정보를 자동으로 가져오세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="책 제목이나 저자를 입력하세요"
            className="flex-1"
          />
          <Button type="submit" disabled={loading} className="gap-2">
            <Search className="h-4 w-4" />
            {loading ? '검색 중...' : '검색'}
          </Button>
        </form>

        {results.length > 0 && (
          <div className="space-y-4 mt-4">
            {results.map((book, idx) => (
              <div key={`${book.isbn}-${idx}`} className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-shrink-0 w-20">
                  <ImageWithFallback
                    key={book.coverImage}
                    src={book.coverImage || "https://images.unsplash.com/photo-1551300329-dc0a750a7483?w=200"}
                    alt={book.title}
                    className="w-full aspect-[3/4] object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="line-clamp-1 mb-1">{book.title}</h3>
                  <p className="text-sm text-gray-600 mb-1">{book.author}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{book.description}</p>
                  <div className="flex gap-2 text-xs text-gray-500">
                    {book.publisher && <span>{book.publisher}</span>}
                    {book.pubdate && <span>• {book.pubdate}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleAddBook(book)}
                    disabled={adding === book.isbn}
                  >
                    {adding === book.isbn ? '추가 중...' : '추가'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}