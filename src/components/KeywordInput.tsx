import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { AlertDialog } from "./AlertDialog";

interface KeywordInputProps {
  onAddKeyword: (keyword: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  existingKeywords?: string[];
}

export function KeywordInput({ onAddKeyword, placeholder, disabled, existingKeywords = [] }: KeywordInputProps) {
  const [input, setInput] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 쉼표(,)로 분리하여 여러 키워드 처리 (쉼표 앞뒤 공백 제거)
    const keywords = input.split(',').map(k => k.trim()).filter(k => k);
    
    // 띄어쓰기 검증
    const hasSpaces = keywords.some(keyword => keyword.includes(' '));
    if (hasSpaces) {
      showAlert('키워드에 띄어쓰기가 포함될 수 없습니다.\n띄어쓰기 없이 입력해주세요.');
      return;
    }

    // 중복 키워드 검증 (정규화하여 비교)
    const normalizedExisting = existingKeywords.map(k => k.toLowerCase());
    const duplicates = keywords.filter(keyword => 
      normalizedExisting.includes(keyword.toLowerCase())
    );

    if (duplicates.length > 0) {
      showAlert(`이 책에 이미 '${duplicates.join(', ')}' 키워드를 입력하여 입력에 실패하셨습니다.`);
      return;
    }

    // 모든 키워드 추가
    for (const keyword of keywords) {
      await onAddKeyword(keyword);
    }

    setInput("");
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder || "감정/추상 입력 (쉼표로 여러 개 입력 가능)"}
          disabled={disabled}
          className="flex-1"
        />
        <Button type="submit" disabled={!input.trim() || disabled}>
          추가
        </Button>
      </form>

      <AlertDialog
        open={alertOpen}
        title="키워드 입력 실패"
        message={alertMessage}
        onConfirm={() => setAlertOpen(false)}
      />
    </>
  );
}