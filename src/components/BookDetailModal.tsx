import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { getBook, addKeyword, voteKeyword, getMyVotes, deleteBook, updateBook, mergeKeywordsWithAI } from "../utils/api";
import { getCurrentUser } from "../utils/supabase/client";
import { KeywordInput } from "./KeywordInput";
import { KeywordBadge } from "./KeywordBadge";
import { ImageWithFallback } from './figma/ImageWithFallback';
import { AlertDialog } from './AlertDialog';
import { toast } from "sonner@2.0.3";
import { Trash2, Edit, Check, X, Sparkles } from "lucide-react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface BookDetailModalProps {
  bookId: string | null;
  open: boolean;
  onClose: () => void;
  onBookDeleted?: () => void;
  onBookUpdated?: () => void;
  onAuthRequired?: () => void;
}

export function BookDetailModal({ bookId, open, onClose, onBookDeleted, onBookUpdated, onAuthRequired }: BookDetailModalProps) {
  const [book, setBook] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [ownKeywords, setOwnKeywords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [mergedGroups, setMergedGroups] = useState<any[]>([]);
  const [aiMerging, setAiMerging] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'merged'>('original');
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (bookId && open) {
      loadBookDetails();
      loadMyVotes();
      setShowFullDescription(false); // 모달이 열릴 때마다 설명을 축소 상태로 초기화
    }
  }, [bookId, open]);

  const loadBookDetails = async () => {
    if (!bookId) return;
    
    setLoading(true);
    try {
      const data = await getBook(bookId);
      setBook(data.book);
      setEditData(data.book);
      
      // 키워드를 점수순으로 정렬
      const sortedKeywords = (data.keywords || []).sort((a: any, b: any) => b.score - a.score);
      setKeywords(sortedKeywords);
    } catch (error) {
      console.error('Error loading book details:', error);
      toast.error('도서 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadMyVotes = async () => {
    if (!bookId) return;
    
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      const data = await getMyVotes(bookId);
      const votedKeywords = new Set(data.votes.map((v: any) => v.keyword));
      const ownKeywordsSet = new Set(data.ownKeywords || []);
      setMyVotes(votedKeywords);
      setOwnKeywords(ownKeywordsSet);
    } catch (error) {
      console.error('Error loading votes:', error);
    }
  };

  const handleAddKeyword = async (keyword: string) => {
    if (!bookId) return;
    
    try {
      const data = await addKeyword(bookId, keyword);
      toast.success(data.existed ? '키워드에 동의했습니다!' : '새 키워드를 추가했습니다!');
      await loadBookDetails();
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast.error('키워드 추가에 실패했습니다');
    }
  };

  const handleVote = async (keyword: string, voteType: 'up' | 'down') => {
    if (!bookId) return;
    
    // 사용자 인증 확인
    const user = await getCurrentUser();
    if (!user) {
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }

    // 이미 투표했는지 확인
    if (myVotes.has(keyword)) {
      toast.error('이미 투표한 키워드입니다');
      return;
    }
    
    try {
      const response = await voteKeyword(bookId, keyword, voteType);
      
      if (response.deleted) {
        toast.info(response.message || '키워드가 삭제되었습니다', { duration: 3000 });
      } else {
        toast.success(voteType === 'up' ? '맞아요 👍' : '틀려요 👎');
      }
      
      setMyVotes(new Set([...myVotes, keyword]));
      await loadBookDetails();
    } catch (error: any) {
      console.error('Error voting on keyword:', error);
      if (error.message.includes('Authentication required')) {
        toast.error('로그인이 필요합니다');
        if (onAuthRequired) {
          onAuthRequired();
        }
      } else if (error.message.includes('Already voted')) {
        toast.error('이미 투표한 키워드입니다');
      } else {
        toast.error('투표에 실패했습니다');
      }
    }
  };

  const handleDelete = async () => {
    if (!bookId) return;
    
    if (!confirm('정말로 이 도서를 삭제하시겠습니까?')) return;
    
    try {
      await deleteBook(bookId);
      toast.success('도서가 삭제되었습니다');
      if (onBookDeleted) {
        onBookDeleted();
      }
      onClose();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('도서 삭제에 실패했습니다');
    }
  };

  const handleSaveEdit = async () => {
    if (!bookId) return;
    
    try {
      await updateBook(bookId, editData);
      toast.success('도서 정보가 수정되었습니다');
      setIsEditing(false);
      await loadBookDetails();
      if (onBookUpdated) {
        onBookUpdated();
      }
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('도서 수정에 실패했습니다');
    }
  };

  const handleCancelEdit = () => {
    setEditData(book);
    setIsEditing(false);
  };

  const handleMergeKeywordsWithAI = async () => {
    if (keywords.length === 0) {
      toast.error('통합할 키워드가 없습니다');
      return;
    }

    setAiMerging(true);
    try {
      const keywordList = keywords.map(k => k.keyword);
      const data = await mergeKeywordsWithAI(keywordList);
      
      if (data.groups && data.groups.length > 0) {
        toast.success(`AI가 ${data.groups.length}개의 유사 키워드 그룹을 찾았습니다!`);
        
        // 각 그룹의 통계 합산
        const mergedGroupsWithStats = data.groups.map((group: any) => {
          const groupKeywords = group.group.map((kw: string) => 
            keywords.find(k => k.keyword === kw)
          ).filter(Boolean);
          
          const totalUpvotes = groupKeywords.reduce((sum: number, kw: any) => sum + (kw?.upvotes || 0), 0);
          const totalDownvotes = groupKeywords.reduce((sum: number, kw: any) => sum + (kw?.downvotes || 0), 0);
          const totalScore = groupKeywords.reduce((sum: number, kw: any) => sum + (kw?.score || 0), 0);
          
          return {
            ...group,
            totalUpvotes,
            totalDownvotes,
            totalScore,
            keywords: groupKeywords
          };
        });
        
        setMergedGroups(mergedGroupsWithStats);
        setViewMode('merged');
        console.log('AI Keyword Groups:', mergedGroupsWithStats);
      } else {
        const message = data.message || '유사한 키워드가 발견되지 않았습니다';
        toast.info(message);
      }
    } catch (error: any) {
      console.error('Error merging keywords:', error);
      
      const errorMessage = error.message || 'AI 통합에 실패했습니다';
      
      if (errorMessage.includes('not configured') || errorMessage.includes('not available')) {
        toast.error('AI 키워드 통합 기능을 사용할 수 없습니다. Hugging Face API 토큰이 설정되지 않았습니다.', {
          duration: 6000
        });
      } else if (errorMessage.includes('check the server logs')) {
        toast.error('AI API 요청이 실패했습니다. 잠시 후 다시 시도해주세요.', {
          duration: 5000
        });
      } else {
        toast.error(`AI 통합 실패: ${errorMessage}`);
      }
    } finally {
      setAiMerging(false);
    }
  };

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle>{book.title}</DialogTitle>
              <DialogDescription>{book.author}</DialogDescription>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveEdit}
                    className="gap-2 text-green-600"
                  >
                    <Check className="h-4 w-4" />
                    저장
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    취소
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-48">
              <ImageWithFallback
                src={book.coverImage || "https://images.unsplash.com/photo-1551300329-dc0a750a7483?w=400"}
                alt={book.title}
                className="w-full aspect-[3/4] object-cover rounded-lg shadow-md"
              />
            </div>
            <div className="flex-1 space-y-3">
              {!isEditing ? (
                <>
                  <div>
                    <h3>제목</h3>
                    <p className="text-sm text-gray-700">{book.title}</p>
                  </div>
                  <div>
                    <h3>저자</h3>
                    <p className="text-sm text-gray-700">{book.author}</p>
                  </div>
                  {book.description && (() => {
                    // 텍스트 길이가 250자 이상이거나, 줄바꿈이 6개 이상이면 축소 표시
                    const hasNewlines = book.description.includes('\n');
                    const lines = hasNewlines ? book.description.split('\n').filter((line: string) => line.trim()) : [book.description];
                    const isLongText = book.description.length > 250;
                    const shouldTruncate = lines.length >= 6 || isLongText;
                    
                    return (
                      <div>
                        <h3>설명</h3>
                        <div className="text-sm text-gray-700">
                          {!shouldTruncate ? (
                            // 짧은 텍스트는 그대로 표시
                            hasNewlines ? (
                              lines.map((line: string, idx: number) => (
                                <p key={idx}>{line}</p>
                              ))
                            ) : (
                              <p>{book.description}</p>
                            )
                          ) : (
                            // 긴 텍스트는 축소/확장 가능하도록
                            <>
                              <div className={showFullDescription ? '' : 'line-clamp-5'}>
                                {hasNewlines ? (
                                  lines.map((line: string, idx: number) => (
                                    <p key={idx}>{line}</p>
                                  ))
                                ) : (
                                  <p>{book.description}</p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="link"
                                onClick={() => setShowFullDescription(!showFullDescription)}
                                className="px-0 h-auto text-blue-600 hover:text-blue-700 mt-1"
                              >
                                {showFullDescription ? '간략히 보기' : '자세히 보기'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {(book.publisher || book.pubdate || book.isbn) && (
                    <div className="text-xs text-gray-500 space-y-1">
                      {book.publisher && <div>출판사: {book.publisher}</div>}
                      {book.pubdate && <div>출판일: {book.pubdate}</div>}
                      {book.isbn && <div>ISBN: {book.isbn}</div>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm">제목</label>
                    <Input
                      value={editData.title || ''}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm">저자</label>
                    <Input
                      value={editData.author || ''}
                      onChange={(e) => setEditData({ ...editData, author: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm">설명</label>
                    <Textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm">표지 URL</label>
                    <Input
                      value={editData.coverImage || ''}
                      onChange={(e) => setEditData({ ...editData, coverImage: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="mb-3">감정·추상 키워드</h3>
            <KeywordInput
              onAddKeyword={handleAddKeyword}
              placeholder="책의 감정/추상 (쉼표로 여러 개 입력 가능)"
              disabled={loading}
              existingKeywords={ownKeywords ? Array.from(ownKeywords) : []}
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 쉼표 입력: <code className="bg-gray-100 px-1 rounded">마법,판타지,환상</code>
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">
                다른 독자들이 등록한 키워드 ({keywords.length})
              </p>
              {keywords.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMergeKeywordsWithAI}
                  disabled={aiMerging}
                  className="gap-2"
                >
                  <Sparkles className="h-3 w-3" />
                  {aiMerging ? 'AI 분석 중...' : 'AI 통합'}
                </Button>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded space-y-1">
              <div>⚠️ 싫어요가 좋아요보다 5표 이상 많으면 키워드가 자동으로 삭제됩니다 (예: 좋아요 2, 싫어요 7)</div>
              <div>ℹ️ AI 통합 정보: 유사한 단어가 없어 통합되지 않는 단어는 표기되지 않습니다.</div>
            </p>

            {keywords.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                아직 등록된 키워드가 없습니다. 첫 번째 키워드를 등록해보세요!
              </p>
            ) : (
              <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="original">
                    통합 전 ({keywords.length}개)
                  </TabsTrigger>
                  <TabsTrigger value="merged" disabled={mergedGroups.length === 0}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    통합 후 ({mergedGroups.length}개 그룹)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="original" className="space-y-2 mt-4 max-h-96 overflow-y-auto">
                  {keywords.map((kw) => (
                    <div key={kw.id} className="relative">
                      <KeywordBadge
                        keyword={kw}
                        onVote={(voteType) => handleVote(kw.keyword, voteType)}
                        showVoting={!myVotes.has(kw.keyword) && !ownKeywords.has(kw.keyword)}
                      />
                      {myVotes.has(kw.keyword) && (
                        <Badge variant="outline" className="absolute right-2 top-2 text-xs">
                          투표완료
                        </Badge>
                      )}
                      {ownKeywords.has(kw.keyword) && (
                        <Badge variant="outline" className="absolute right-2 top-2 text-xs">
                          내 키워드
                        </Badge>
                      )}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="merged" className="space-y-3 mt-4 max-h-96 overflow-y-auto">
                  {mergedGroups.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      AI 통합 버튼을 눌러 유사 키워드를 그룹화하세요
                    </p>
                  ) : (
                    mergedGroups.map((group, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-600">
                              대표
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`${group.representative.length >= 13 ? 'break-all whitespace-normal max-w-[200px]' : ''}`}
                            >
                              {group.representative}
                            </Badge>
                          </div>
                          <div className="flex gap-2 text-sm">
                            <span className="text-green-600">+{group.totalUpvotes}</span>
                            <span className="text-red-600">-{group.totalDownvotes}</span>
                            <span className={group.totalScore > 0 ? 'text-green-600' : 'text-gray-600'}>
                              ({group.totalScore > 0 ? '+' : ''}{group.totalScore})
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-2">
                          유사 키워드 ({group.group.length}개):
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.group.map((kw: string, kwIdx: number) => {
                            const kwData = keywords.find(k => k.keyword === kw);
                            return (
                              <Badge 
                                key={kwIdx} 
                                variant="secondary"
                                className={`text-xs ${kw.length >= 13 ? 'break-all whitespace-normal' : ''}`}
                              >
                                {kw}
                                {kwData && (
                                  <span className="ml-1 text-xs text-gray-500">
                                    ({kwData.score > 0 ? '+' : ''}{kwData.score})
                                  </span>
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}