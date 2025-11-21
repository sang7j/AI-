import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { getKeywordStats, mergeKeywordsWithAI, saveMergedGroups, getMergedGroups } from "../utils/api";
import { BarChart, Sparkles, ArrowRight, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface AIKeywordMergeModalProps {
  open: boolean;
  onClose: () => void;
  onMergeComplete?: () => void;
}

export function AIKeywordMergeModal({ open, onClose, onMergeComplete }: AIKeywordMergeModalProps) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiMerging, setAiMerging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mergedGroups, setMergedGroups] = useState<any[]>([]);
  const [hasMerged, setHasMerged] = useState(false);

  useEffect(() => {
    if (open) {
      loadStats();
      loadSavedMergedGroups();
    }
  }, [open]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getKeywordStats();
      setStats(data.keywords || []);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('통계를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedMergedGroups = async () => {
    try {
      const data = await getMergedGroups();
      if (data.groups && data.groups.length > 0) {
        // 저장된 그룹에 통계 정보 추가
        const groupsWithStats = data.groups.map((groupData: any) => {
          const group = groupData.group || [];
          const groupKeywords = group.map((kw: string) => 
            stats.find(s => s.keyword === kw)
          ).filter(Boolean);
          
          const totalUpvotes = groupKeywords.reduce((sum, kw) => sum + (kw?.totalUpvotes || 0), 0);
          const totalDownvotes = groupKeywords.reduce((sum, kw) => sum + (kw?.totalDownvotes || 0), 0);
          const totalScore = groupKeywords.reduce((sum, kw) => sum + (kw?.totalScore || 0), 0);
          const bookCount = groupKeywords.reduce((sum, kw) => sum + (kw?.bookCount || 0), 0);
          
          return {
            group: groupData.group,
            representative: groupData.representative,
            totalUpvotes,
            totalDownvotes,
            totalScore,
            bookCount,
            keywords: groupKeywords
          };
        });
        
        setMergedGroups(groupsWithStats);
        setHasMerged(true);
        console.log('Loaded saved merged groups:', groupsWithStats.length);
      }
    } catch (error) {
      console.error('Error loading saved merged groups:', error);
      // 저장된 그룹이 없는 경우 에러 무시
    }
  };

  const handleAIMerge = async () => {
    if (stats.length === 0) {
      toast.error('통합할 키워드가 없습니다');
      return;
    }

    setAiMerging(true);
    try {
      const keywords = stats.map(s => s.keyword);
      const data = await mergeKeywordsWithAI(keywords);
      
      if (data.groups && data.groups.length > 0) {
        toast.success(`AI가 ${data.groups.length}개의 유사 키워드 그룹을 찾았습니다!`);
        
        // 각 그룹의 통계 합산
        const mergedGroupsWithStats = data.groups.map((group: any) => {
          const groupKeywords = group.group.map((kw: string) => 
            stats.find(s => s.keyword === kw)
          ).filter(Boolean);
          
          const totalUpvotes = groupKeywords.reduce((sum, kw) => sum + (kw?.totalUpvotes || 0), 0);
          const totalDownvotes = groupKeywords.reduce((sum, kw) => sum + (kw?.totalDownvotes || 0), 0);
          const totalScore = groupKeywords.reduce((sum, kw) => sum + (kw?.totalScore || 0), 0);
          const bookCount = groupKeywords.reduce((sum, kw) => sum + (kw?.bookCount || 0), 0);
          
          return {
            ...group,
            totalUpvotes,
            totalDownvotes,
            totalScore,
            bookCount,
            keywords: groupKeywords
          };
        });
        
        setMergedGroups(mergedGroupsWithStats);
        setHasMerged(true);
        console.log('AI Keyword Groups:', mergedGroupsWithStats);
        
      } else {
        const message = data.message || '유사한 키워드가 발견되지 않았습니다';
        toast.info(message);
        console.log('AI Merge Result:', data);
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

  const handleSaveMergedGroups = async () => {
    if (mergedGroups.length === 0) {
      toast.error('저장할 통합 그룹이 없습니다');
      return;
    }

    setSaving(true);
    try {
      // 저장할 때는 group과 representative만 전송
      const groupsToSave = mergedGroups.map(g => ({
        group: g.group,
        representative: g.representative
      }));
      
      await saveMergedGroups(groupsToSave);
      toast.success(`${mergedGroups.length}개의 키워드 그룹이 저장되었습니다! 이제 검색에서 유사 키워드가 함께 검색됩니다.`);
      
      if (onMergeComplete) {
        onMergeComplete();
      }
    } catch (error: any) {
      console.error('Error saving merged groups:', error);
      toast.error(`저장 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI 유사 키워드 통계 대시보드</DialogTitle>
          <DialogDescription>
            💡 AI 통합 정보:
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-700 space-y-1">
          <div>• Hugging Face KoSimCSE-roberta-multitask 모델 사용</div>
          <div>• 의미적 유사도 80% 이상인 키워드를 자동으로 그룹화</div>
          <div>• 그룹화된 키워드의 통계는 합산되어 표시됩니다</div>
          <div>• 13자 이상의 긴 키워드는 자동으로 줄바꿈됩니다</div>
          <div>• 유사한 단어가 없어 통합되지 않는 단어는 표기되지 않습니다</div>
          <div className="mt-2 pt-2 border-t border-blue-300">
            <strong>✨ 검색 기능:</strong> 통합 그룹을 저장하면 검색 시 유사 키워드가 자동으로 함께 검색됩니다!
            <br />
            예: \"어린이\" 검색 → \"어린이\", \"아이\" 키워드가 모두 검색됨
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                총 <span className="text-purple-600">{stats.length}</span>개 키워드
              </div>
              {hasMerged && mergedGroups.length > 0 && (
                <div className="text-sm text-gray-600">
                  <ArrowRight className="inline h-4 w-4 mx-2" />
                  <span className="text-green-600">{mergedGroups.length}</span>개 그룹으로 통합
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleAIMerge}
              disabled={aiMerging || stats.length === 0}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {aiMerging ? 'AI 분석 중...' : hasMerged ? 'AI 재분석' : 'AI 통합 실행'}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 등록된 키워드가 없습니다
            </div>
          ) : (
            <Tabs defaultValue="original" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="original">
                  <BarChart className="h-4 w-4 mr-2" />
                  통합 전 ({stats.length}개)
                </TabsTrigger>
                <TabsTrigger value="merged" disabled={!hasMerged}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  통합 후 ({mergedGroups.length}개 그룹)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="original" className="space-y-2 mt-4">
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-600 px-2 pb-2 border-b">
                  <div className="col-span-4">키워드</div>
                  <div className="col-span-2 text-center">도서 수</div>
                  <div className="col-span-2 text-center">좋아요</div>
                  <div className="col-span-2 text-center">싫어요</div>
                  <div className="col-span-2 text-center">점수</div>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  {stats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="col-span-4 flex items-center gap-2">
                        {idx < 3 && (
                          <span className="text-lg">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                          </span>
                        )}
                        {idx >= 3 && <span className="text-xs text-gray-500 w-6">{idx + 1}</span>}
                        <Badge 
                          variant={stat.totalScore > 10 ? "default" : "secondary"} 
                          className={stat.keyword.length >= 13 ? "break-all whitespace-normal" : ""}
                        >
                          {stat.keyword}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-center text-sm">{stat.bookCount}</div>
                      <div className="col-span-2 text-center text-sm text-green-600">{stat.totalUpvotes}</div>
                      <div className="col-span-2 text-center text-sm text-red-600">{stat.totalDownvotes}</div>
                      <div className="col-span-2 text-center">
                        <span className={`text-sm ${
                          stat.totalScore > 0 ? 'text-green-600' : 
                          stat.totalScore < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {stat.totalScore > 0 ? '+' : ''}{stat.totalScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="merged" className="space-y-3 mt-4">
                {mergedGroups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    AI 통합을 실행하여 유사 키워드를 분석하세요
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto space-y-3">
                    {mergedGroups.map((group, idx) => (
                      <div key={idx} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {idx < 3 && (
                              <span className="text-xl">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                              </span>
                            )}
                            {idx >= 3 && <span className="text-sm text-gray-500">{idx + 1}위</span>}
                            <Badge className="bg-purple-600">
                              대표 키워드
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-base ${group.representative.length >= 13 ? 'break-all whitespace-normal max-w-[300px]' : ''}`}
                            >
                              {group.representative}
                            </Badge>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-600">도서 {group.bookCount}</span>
                            <span className="text-green-600">+{group.totalUpvotes}</span>
                            <span className="text-red-600">-{group.totalDownvotes}</span>
                            <span className={group.totalScore > 0 ? 'text-green-600' : 'text-gray-600'}>
                              ({group.totalScore > 0 ? '+' : ''}{group.totalScore})
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          유사 키워드 ({group.group.length}개):
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.group.map((kw: string, kwIdx: number) => {
                            const kwStat = stats.find(s => s.keyword === kw);
                            return (
                              <Badge 
                                key={kwIdx} 
                                variant="secondary"
                                className={kw.length >= 13 ? "break-all whitespace-normal" : ""}
                              >
                                {kw}
                                {kwStat && (
                                  <span className="ml-1 text-xs text-gray-500">
                                    ({kwStat.totalScore > 0 ? '+' : ''}{kwStat.totalScore})
                                  </span>
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {hasMerged && mergedGroups.length > 0 && (
          <div className="mt-4">
            <Button
              size="sm"
              onClick={handleSaveMergedGroups}
              disabled={saving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? '저장 중...' : '통합 그룹 저장'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}