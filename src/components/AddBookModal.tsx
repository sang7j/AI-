import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { createBook } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface AddBookModalProps {
  open: boolean;
  onClose: () => void;
  onBookAdded: () => void;
}

export function AddBookModal({ open, onClose, onBookAdded }: AddBookModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    coverImage: "",
    isbn: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.author) {
      toast.error('제목과 저자는 필수입니다');
      return;
    }

    setLoading(true);
    try {
      await createBook(formData);
      toast.success('도서가 추가되었습니다!');
      setFormData({
        title: "",
        author: "",
        description: "",
        coverImage: "",
        isbn: "",
      });
      onBookAdded();
      onClose();
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error('도서 추가에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 도서 추가</DialogTitle>
          <DialogDescription>
            데이터베이스에 새로운 도서를 추가합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="책 제목"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="author">저자 *</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="저자명"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="책 설명"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">표지 이미지 URL</Label>
            <Input
              id="coverImage"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="isbn">ISBN (선택)</Label>
            <Input
              id="isbn"
              value={formData.isbn}
              onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
              placeholder="978-..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '추가 중...' : '추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
