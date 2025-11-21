import { Button } from "./ui/button";
import { createBook, addKeyword } from "../utils/api";
import { Database } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface InitialDataButtonProps {
  onComplete: () => void;
}

export function InitialDataButton({ onComplete }: InitialDataButtonProps) {
  const initializeData = async () => {
    try {
      toast.info('샘플 데이터를 생성하는 중...');

      // 샘플 도서 데이터
      const sampleBooks = [
        {
          title: "달빛 조각사",
          author: "남희성",
          description: "가상현실 게임 속에서 펼쳐지는 주인공의 성장과 모험 이야기. 감동과 재미가 가득한 판타지 소설.",
          coverImage: "https://images.unsplash.com/photo-1621944190272-ec775aad58d0?w=400",
          keywords: ["감동적인", "몰입감", "따뜻한", "재미있는", "희망적인"]
        },
        {
          title: "미움받을 용기",
          author: "기시미 이치로, 고가 후미타케",
          description: "아들러 심리학을 바탕으로 한 자기계발서. 대화 형식으로 풀어낸 인생의 지혜.",
          coverImage: "https://images.unsplash.com/photo-1706195546853-a81b6a190daf?w=400",
          keywords: ["깊이���는", "통찰력있는", "위로가되는", "명료한", "자유로운"]
        },
        {
          title: "1984",
          author: "조지 오웰",
          description: "전체주의 사회를 그린 디스토피아 소설. 현대 사회에 대한 날카로운 경고.",
          coverImage: "https://images.unsplash.com/photo-1551300329-dc0a750a7483?w=400",
          keywords: ["무겁고깊은", "충격적인", "암울한", "생각하게하는", "불안한"]
        },
        {
          title: "해리 포터와 마법사의 돌",
          author: "J.K. 롤링",
          description: "마법 세계로 초대받은 소년 해리의 첫 번째 모험. 전 세계를 매료시킨 판타지 걸작.",
          coverImage: "https://images.unsplash.com/photo-1748630864655-1d95b79fc2f1?w=400",
          keywords: ["환상적인", "신비로운", "설레는", "즐거운", "모험적인"]
        },
        {
          title: "어린 왕자",
          author: "생텍쥐페리",
          description: "사막에 불시착한 조종사가 어린 왕자를 만나 겪는 이야기. 순수함과 사랑의 의미를 담은 고전.",
          coverImage: "https://images.unsplash.com/photo-1621944190272-ec775aad58d0?w=400",
          keywords: ["순수한", "따뜻한", "감성적인", "잔잔한", "애틋한"]
        }
      ];

      // 도서 추가 및 키워드 등록
      for (const bookData of sampleBooks) {
        const { keywords, ...bookInfo } = bookData;
        const result = await createBook(bookInfo);
        const bookId = result.book.id;

        // 각 키워드 추가 (랜덤한 투표 수 부여)
        for (const keyword of keywords) {
          await addKeyword(bookId, keyword);
          
          // 일부 키워드에 추가 투표 (더 현실적인 데이터)
          const extraVotes = Math.floor(Math.random() * 5);
          for (let i = 0; i < extraVotes; i++) {
            await addKeyword(bookId, keyword);
          }
        }
      }

      toast.success('샘플 데이터가 생성되었습니다! 🎉');
      onComplete();
    } catch (error) {
      console.error('Error initializing data:', error);
      toast.error('샘플 데이터 생성에 실패했습니다');
    }
  };

  return (
    <Button 
      onClick={initializeData} 
      variant="outline"
      className="gap-2"
    >
      <Database className="h-4 w-4" />
      샘플 데이터 생성
    </Button>
  );
}
