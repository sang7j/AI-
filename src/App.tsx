import { useState, useEffect } from "react";

// ========== 컴포넌트 임포트 ==========
import { BookCard } from "./components/BookCard";
import { BookDetailModal } from "./components/BookDetailModal";
import { AddBookModal } from "./components/AddBookModal";
import { NaverBookSearchModal } from "./components/NaverBookSearchModal";
import { AuthModal } from "./components/AuthModal";
import { AIKeywordMergeModal } from "./components/AIKeywordMergeModal";

// ========== UI 컴포넌트 임포트 ==========
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

// ========== API 및 유틸리티 임포트 ==========
import { getBooks, searchBooks } from "./utils/api";
import { getCurrentUser, signOut } from "./utils/supabase/client";

// ========== 아이콘 임포트 ==========
import {
  Plus,
  Search,
  BookOpen,
  X,
  Home,
  LogIn,
  LogOut,
  User,
  Sparkles,
} from "lucide-react";

// ========== 알림 시스템 임포트 ==========
import { toast, Toaster } from "sonner@2.0.3";

// ========== 메인 앱 컴포넌트 ==========
export default function App() {
  // ========== 상태 관리 (State) ==========
  // 도서 관련 상태
  const [allBooks, setAllBooks] = useState<any[]>([]); // 전체 도서 목록
  const [displayedBooks, setDisplayedBooks] = useState<any[]>([]); // 화면에 표시될 도서 목록
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null); // 선택된 도서 ID

  // 검색 관련 상태
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]); // 현재 검색 중인 키워드 목록
  const [keywordInput, setKeywordInput] = useState(""); // 키워드 입력창 값
  const [bookNameInput, setBookNameInput] = useState(""); // 도서명/저자 입력창 값
  const [searchMode, setSearchMode] = useState<"exact" | "fuzzy">("fuzzy"); // 검색 모드 (완전일치/퍼지)

  // 정렬 관련 상태
  const [sortBy, setSortBy] = useState<"popularity" | "views" | "upvotes" | "downvotes">("popularity");

  // 모달 관련 상태
  const [showAddModal, setShowAddModal] = useState(false); // 직접 책 추가 모달
  const [showNaverModal, setShowNaverModal] = useState(false); // 네이버 책 검색 모달
  const [showAuthModal, setShowAuthModal] = useState(false); // 로그인/회원가입 모달
  const [showAIMergeModal, setShowAIMergeModal] = useState(false); // AI 키워드 통합 모달

  // 기타 상태
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [currentUser, setCurrentUser] = useState<any>(null); // 현재 로그인한 사용자

  // ========== 생명주기 (Lifecycle) ==========
  // 앱 초기 로드 시 실행
  useEffect(() => {
    loadBooks(); // 도서 목록 불러오기
    checkUser(); // 사용자 로그인 상태 확인
  }, []);

  // 정렬 방식 변경 시 도서 목록 재로드
  useEffect(() => {
    loadBooks();
  }, [sortBy]);

  // ========== 사용자 관련 함수 ==========
  /**
   * 현재 로그인된 사용자 정보 확인
   */
  const checkUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  /**
   * 로그아웃 처리
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentUser(null);
      toast.success("로그아웃 되었습니다");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("로그아웃에 실패했습니다");
    }
  };

  // ========== 도서 목록 관리 함수 ==========
  /**
   * 도서 목록 불러오기
   */
  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await getBooks(sortBy);
      setAllBooks(data.books || []);

      // 검색 키워드가 없으면 전체 책 표시
      if (searchKeywords.length === 0 && bookNameInput.trim() === "") {
        setDisplayedBooks(data.books || []);
      }
    } catch (error) {
      console.error("Error loading books:", error);
      toast.error("도서 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  // ========== 검색 관련 함수 ==========
  /**
   * 도서 검색 실행
   */
  const handleSearch = async () => {
    // 키워드 입력창에 값이 있으면 먼저 파싱
    let finalKeywords: string[] = [];
    const input = keywordInput.trim();

    if (input) {
      // 쉼표 기반 여러 키워드 입력
      if (input.includes(",")) {
        finalKeywords = input
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k);
      } 
      // 띄어쓰기 기반 여러 키워드 (# 없는 경우만)
      else if (input.includes(" ") && !input.startsWith("#")) {
        finalKeywords = input.split(/\s+/).filter((w) => w);
      } 
      // 단일 키워드
      else {
        finalKeywords = [input];
      }

      // 입력창 초기화
      setKeywordInput("");
    }

    const hasBookName = bookNameInput.trim().length > 0;
    const hasKeywords = finalKeywords.length > 0;

    // 아무것도 입력하지 않은 경우
    if (!hasBookName && !hasKeywords) {
      toast.error("검색할 내용을 작성해주세요");
      return;
    }

    // 검색 시작 전에 기존 키워드 초기화하고 새로운 키워드 설정
    setSearchKeywords(finalKeywords);

    setLoading(true);
    try {
      const data = await searchBooks({
        bookName: bookNameInput.trim(),
        keywords: finalKeywords,
        searchMode: searchMode,
      });

      setDisplayedBooks(data.results || []);

      if (data.results.length === 0) {
        toast.info("검색 결과가 없습니다");
      } else {
        const modeText = searchMode === "exact" ? "완전 일치" : "퍼지";
        toast.success(`${modeText} 검색: ${data.results.length}권 찾음`);
      }
    } catch (error) {
      console.error("Error searching books:", error);
      toast.error("검색에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 키워드 추가 처리 (검색창에서 Enter 시)
   */
  const handleAddKeyword = () => {
    const input = keywordInput.trim();
    if (!input) return;

    let newKeywords: string[] = [];

    // # 기반 여러 키워드 입력 처리
    if (input.includes("#")) {
      newKeywords = input
        .split("#")
        .map((k) => k.trim())
        .filter((k) => k);
    } 
    // 쉼표 기반 여러 키워드 입력
    else if (input.includes(",")) {
      newKeywords = input
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);
    } 
    // 단일 키워드 또는 띄어쓰기 기반 여러 키워드
    else {
      newKeywords = input.split(/\s+/).filter((w) => w);
    }

    if (newKeywords.length > 0) {
      setSearchKeywords(newKeywords);
      if (newKeywords.length > 1) {
        toast.success(`${newKeywords.length}개 키워드 입력됨`);
      }
    }

    setKeywordInput("");
  };

  /**
   * 키워드 제거
   */
  const handleRemoveKeyword = (keyword: string) => {
    setSearchKeywords(searchKeywords.filter((k) => k !== keyword));
  };

  /**
   * 키보드 Enter 키 처리
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const input = keywordInput.trim();
      if (input) {
        handleAddKeyword();
        // 키워드 추가 후 바로 검색
        setTimeout(() => handleSearch(), 100);
      } else {
        // 키워드 입력이 없으면 바로 검색
        handleSearch();
      }
    }
  };

  /**
   * 키워드 클릭 시 해당 키워드로 검색
   */
  const handleKeywordClick = (keyword: string) => {
    setSearchKeywords([keyword]);
    setTimeout(() => {
      searchBooks({
        bookName: bookNameInput.trim(),
        keywords: [keyword],
        searchMode: searchMode,
      }).then((data) => {
        setDisplayedBooks(data.results || []);
        const modeText = searchMode === "exact" ? "완전 일치" : "퍼지";
        toast.success(`${modeText} 검색: ${data.results.length}권 찾음`);
      });
    }, 100);
  };

  /**
   * 전체 도서 보기 (검색 초기화)
   */
  const handleShowAll = () => {
    setSearchKeywords([]);
    setBookNameInput("");
    setDisplayedBooks(allBooks);
  };

  // ========== UI 렌더링 ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* 알림 시스템 */}
      <Toaster position="top-center" richColors />

      {/* ========== 헤더 ========== */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          {/* 타이틀 및 버튼 영역 */}
          <div className="flex items-center justify-between mb-4">
            {/* 로고 및 타이틀 */}
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <div>
                <h1>감정으로 찾는 책</h1>
                <p className="text-sm text-gray-600">느낌 기반 도서 추천 시스템</p>
              </div>
            </div>

            {/* 우측 버튼 그룹 */}
            <div className="flex gap-2">
              {/* 로그인/로그아웃 버튼 */}
              {currentUser ? (
                <>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    {currentUser.email?.split("@")[0]}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  로그인
                </Button>
              )}

              {/* AI 키워드 통계 버튼 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIMergeModal(true)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI 키워드 통계
              </Button>

              {/* 책 등록 버튼 */}
              <Button onClick={() => setShowNaverModal(true)} className="gap-2">
                <Search className="h-4 w-4" />
                책 등록
              </Button>

              {/* 직접 책 추가 버튼 */}
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                직접 책 추가
              </Button>
            </div>
          </div>

          {/* ========== 검색 영역 ========== */}
          <div className="space-y-3">
            {/* 검색 모드 선택 */}
            <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm">검색 방법:</span>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  variant={searchMode === "exact" ? "default" : "outline"}
                  onClick={() => setSearchMode("exact")}
                  className="gap-2"
                >
                  완전 일치 검색
                </Button>
                <Button
                  size="sm"
                  variant={searchMode === "fuzzy" ? "default" : "outline"}
                  onClick={() => setSearchMode("fuzzy")}
                  className="gap-2"
                >
                  퍼지 검색
                </Button>
              </div>
              <div className="text-xs text-gray-600 ml-auto">
                {searchMode === "exact" ? (
                  <span>💡 정확히 일치해야만 검색됩니다</span>
                ) : (
                  <span>
                    💡 완벽하게 일치하지 않더라도 비슷한 항목이 검색됩니다 (단, 아예
                    일치하지 않으면 찾지 못합니다)
                  </span>
                )}
              </div>
            </div>

            {/* 책 이름/저자 검색 */}
            <div className="flex gap-2">
              <Input
                value={bookNameInput}
                onChange={(e) => setBookNameInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="책 이름 또는 저자 검색"
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading} className="gap-2">
                <Search className="h-4 w-4" />
                검색
              </Button>
              {/* 전체보기 버튼 */}
              {(searchKeywords.length > 0 ||
                bookNameInput.trim() ||
                displayedBooks.length !== allBooks.length) && (
                <Button
                  onClick={() => {
                    setSearchKeywords([]);
                    setBookNameInput("");
                    handleShowAll();
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  전체보기
                </Button>
              )}
            </div>

            {/* 감정/추상 키워드 검색 */}
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="감정/추상 키워드 (예: 따뜻한, 감동적인 또는 #마법 #판타지)"
                className="flex-1"
              />
            </div>

            {/* 검색 팁 */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>
                💡 <strong>여러 키워드:</strong>{" "}
                <code className="bg-gray-100 px-1 rounded">마법, 판타지</code> 또는
                띄어쓰기로 구분
              </div>
              <div>
                🔒 <strong>필수 키워드 (AND 조건):</strong>{" "}
                <code className="bg-gray-100 px-1 rounded">#판타지, #마법</code> → 두
                키워드 모두 있어야 검색됨
              </div>
            </div>

            {/* 현재 검색 중인 키워드 표시 */}
            {searchKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">검색 중:</span>
                {searchKeywords.map((keyword, idx) => (
                  <Badge
                    key={idx}
                    variant={keyword.startsWith("#") ? "default" : "secondary"}
                    className={`gap-1 cursor-pointer ${
                      keyword.startsWith("#")
                        ? "bg-purple-600 hover:bg-purple-700"
                        : ""
                    }`}
                  >
                    {keyword}
                    <X
                      className="h-3 w-3 hover:text-red-200"
                      onClick={() => handleRemoveKeyword(keyword)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========== 메인 콘텐츠 ========== */}
      <main className="container mx-auto px-4 py-8">
        {/* 정렬 옵션 (검색하지 않았을 때만 표시) */}
        {searchKeywords.length === 0 &&
          bookNameInput.trim() === "" &&
          allBooks.length > 0 && (
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-600">
                총 <span className="text-purple-600">{allBooks.length}</span>권의 도서
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">정렬:</span>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">인기순</SelectItem>
                    <SelectItem value="views">조회순</SelectItem>
                    <SelectItem value="upvotes">좋아요순</SelectItem>
                    <SelectItem value="downvotes">싫어요순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

        {/* 로딩 상태 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        ) : displayedBooks.length === 0 ? (
          /* 도서가 없을 때 */
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              {allBooks.length === 0
                ? "아직 등록된 도서가 없습니다. 책을 검색하거나 추가해보세요!"
                : "검색 결과가 없습니다. 다른 키워드로 시도해보세요."}
            </p>
          </div>
        ) : (
          /* 도서 목록 */
          <>
            {/* 검색 결과 개수 */}
            {(searchKeywords.length > 0 || bookNameInput.trim()) && (
              <div className="mb-4 text-sm text-gray-600">
                총 <span className="text-purple-600">{displayedBooks.length}</span>권
                검색됨
              </div>
            )}

            {/* 도서 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedBooks.map((item) => {
                const book = item.book || item;
                const matchedKeywords = item.matchedKeywords;
                const score = item.score;

                return (
                  <BookCard
                    key={book.id}
                    book={book}
                    matchedKeywords={matchedKeywords}
                    score={score}
                    onClick={() => setSelectedBookId(book.id)}
                    onKeywordClick={handleKeywordClick}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* 시작 가이드 (도서가 없을 때만 표시) */}
        {allBooks.length === 0 && (
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-md border border-purple-100">
              <h2 className="mb-4">시작하기</h2>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  🔍 <strong>1단계:</strong> "책 등록"과 "직접 책 추가" 버튼으로 책
                  정보를 가져오세요
                </p>
                <p>
                  💭 <strong>2단계:</strong> 책을 클릭하여 감정 키워드를 추가하세요
                </p>
                <p>
                  👍 <strong>3단계:</strong> 다른 사람의 키워드에 동의/비동의
                  투표를 하세요 (1인 1회, 본인 키워드 제외)
                </p>
                <p>
                  🔍 <strong>4단계:</strong> 상단 검색창에서 느낌으로 책을
                  찾아보세요
                </p>
                <p>
                  📊 <strong>5단계:</strong> "AI 키워드 통계" 버튼으로 인기
                  키워드와 AI 통합을 확인하세요
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========== 모달 컴포넌트들 ========== */}
      {/* 도서 상세 모달 */}
      <BookDetailModal
        bookId={selectedBookId}
        open={!!selectedBookId}
        onClose={() => setSelectedBookId(null)}
        onBookDeleted={loadBooks}
        onBookUpdated={loadBooks}
        onAuthRequired={() => setShowAuthModal(true)}
      />

      {/* 직접 책 추가 모달 */}
      <AddBookModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onBookAdded={loadBooks}
      />

      {/* 네이버 책 검색 모달 */}
      <NaverBookSearchModal
        open={showNaverModal}
        onClose={() => setShowNaverModal(false)}
        onBookAdded={loadBooks}
      />

      {/* 로그인/회원가입 모달 */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={checkUser}
      />

      {/* AI 키워드 통합 모달 */}
      <AIKeywordMergeModal
        open={showAIMergeModal}
        onClose={() => setShowAIMergeModal(false)}
        onMergeComplete={loadBooks}
      />
    </div>
  );
}
