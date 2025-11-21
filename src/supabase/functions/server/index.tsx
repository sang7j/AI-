import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

// ========== 서버 초기화 ==========
const app = new Hono();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// 로깅 미들웨어
app.use('*', logger(console.log));

// CORS 설정
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ========== 유틸리티 함수 ==========

/**
 * Authorization 헤더에서 사용자 정보 추출
 */
async function getUserFromToken(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * 코사인 유사도 계산 (AI 키워드 통합용)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ========== API 엔드포인트 ==========

/**
 * 헬스 체크
 */
app.get("/make-server-5a8db632/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== 사용자 인증 ==========

/**
 * 회원가입
 */
app.post("/make-server-5a8db632/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;
    
    if (!email || !password) {
      return c.json({ success: false, error: "Email and password are required" }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || email.split('@')[0] },
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ success: false, error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log(`Error during signup: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ========== 도서 관리 ==========

/**
 * 네이버 책 검색 API 연동
 */
app.get("/make-server-5a8db632/naver/books", async (c) => {
  try {
    const query = c.req.query('query');
    
    if (!query) {
      return c.json({ success: false, error: "Query is required" }, 400);
    }

    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return c.json({ 
        success: false, 
        error: "Naver API credentials not configured. Please set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET environment variables." 
      }, 500);
    }

    console.log(`Requesting Naver API with query: ${query}`);

    const response = await fetch(
      `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=10`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Naver API error: ${response.status} - ${errorText}`);
      
      if (response.status === 401) {
        return c.json({ 
          success: false, 
          error: "Naver API authentication failed. Please verify your Client ID and Client Secret are correct.",
          details: errorText
        }, 401);
      }
      
      return c.json({ 
        success: false, 
        error: `Naver API request failed: ${response.status}`,
        details: errorText
      }, response.status);
    }

    const data = await response.json();
    console.log(`Naver API returned ${data.items?.length || 0} books`);
    
    const books = (data.items || []).map((item: any) => ({
      title: item.title.replace(/<\/?b>/g, ''),
      author: item.author,
      description: item.description.replace(/<\/?b>/g, ''),
      coverImage: item.image,
      isbn: item.isbn,
      publisher: item.publisher,
      pubdate: item.pubdate,
    }));

    return c.json({ success: true, books });
  } catch (error) {
    console.log(`Error searching Naver books: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * AI 키워드 통합 (Hugging Face API)
 */
app.post("/make-server-5a8db632/ai/merge-keywords", async (c) => {
  try {
    const body = await c.req.json();
    const { keywords } = body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return c.json({ success: false, error: "Keywords array is required" }, 400);
    }

    const hfToken = Deno.env.get('HF_TOKEN');
    if (!hfToken) {
      console.log('HF_TOKEN not configured - AI merge feature disabled');
      return c.json({ 
        success: false, 
        error: "AI keyword merging is not available. Hugging Face API token is not configured.",
        needsToken: true
      }, 500);
    }

    console.log(`Processing ${keywords.length} keywords for similarity analysis`);
    console.log(`Keywords to process:`, keywords);
    
    const API_URL = "https://router.huggingface.co/hf-inference/models/BM-K/KoSimCSE-roberta-multitask";
    const embeddings: { keyword: string; vector: number[] }[] = [];
    const errors: string[] = [];
    
    for (const keyword of keywords) {
      try {
        console.log(`Fetching embedding for keyword: "${keyword}"`);
        
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: keyword,
            options: { wait_for_model: true }
          }),
        });

        const responseText = await response.text();
        console.log(`Response status for "${keyword}": ${response.status}`);
        console.log(`Response text for "${keyword}": ${responseText.substring(0, 200)}`);

        if (response.ok) {
          const data = JSON.parse(responseText);
          console.log(`Response type for "${keyword}":`, typeof data, Array.isArray(data));
          
          let vector = null;
          
          if (Array.isArray(data)) {
            if (data.length > 0 && Array.isArray(data[0]) && typeof data[0][0] === 'number') {
              vector = data[0];
            } else if (data.length > 0 && typeof data[0] === 'number') {
              vector = data;
            }
          }
          
          if (vector && Array.isArray(vector) && vector.length > 0 && typeof vector[0] === 'number') {
            embeddings.push({ keyword, vector });
            console.log(`Successfully added embedding for "${keyword}", vector length: ${vector.length}`);
          } else {
            const errorMsg = `Invalid vector format for "${keyword}": ${JSON.stringify(data).substring(0, 100)}`;
            console.log(errorMsg);
            errors.push(errorMsg);
          }
        } else {
          const errorMsg = `API error for "${keyword}": ${response.status} - ${responseText}`;
          console.log(errorMsg);
          errors.push(errorMsg);
          
          if (response.status === 503) {
            console.log(`Model is loading, waiting 10 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            const retryResponse = await fetch(API_URL, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: keyword,
                options: { wait_for_model: true }
              }),
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              let vector = null;
              
              if (Array.isArray(retryData)) {
                if (Array.isArray(retryData[0]) && typeof retryData[0][0] === 'number') {
                  vector = retryData[0];
                } else if (typeof retryData[0] === 'number') {
                  vector = retryData;
                }
              }
              
              if (vector && Array.isArray(vector) && vector.length > 0) {
                embeddings.push({ keyword, vector });
                console.log(`Successfully added embedding for "${keyword}" after retry`);
              }
            } else {
              console.log(`Retry also failed for "${keyword}": ${retryResponse.status}`);
            }
          }
        }
      } catch (error) {
        const errorMsg = `Exception getting embedding for "${keyword}": ${error}`;
        console.log(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Successfully processed ${embeddings.length} out of ${keywords.length} keywords`);
    if (errors.length > 0) {
      console.log(`Errors encountered:`, errors);
    }

    if (embeddings.length === 0) {
      return c.json({ 
        success: false, 
        error: "Failed to get any embeddings from Hugging Face API. Please check the server logs for details.",
        details: errors.slice(0, 3),
        totalErrors: errors.length
      }, 500);
    }

    if (embeddings.length < 2) {
      return c.json({ 
        success: true, 
        groups: [],
        message: `Only ${embeddings.length} keyword(s) could be processed. Need at least 2 for comparison.`,
        processedCount: embeddings.length,
        totalCount: keywords.length
      });
    }

    const groups: { group: string[]; representative: string }[] = [];
    const used = new Set<string>();

    for (let i = 0; i < embeddings.length; i++) {
      if (used.has(embeddings[i].keyword)) continue;

      const group = [embeddings[i].keyword];
      used.add(embeddings[i].keyword);

      for (let j = i + 1; j < embeddings.length; j++) {
        if (used.has(embeddings[j].keyword)) continue;

        const similarity = cosineSimilarity(embeddings[i].vector, embeddings[j].vector);
        console.log(`Similarity between "${embeddings[i].keyword}" and "${embeddings[j].keyword}": ${similarity}`);
        
        if (similarity > 0.8) {
          group.push(embeddings[j].keyword);
          used.add(embeddings[j].keyword);
        }
      }

      if (group.length > 1) {
        groups.push({
          group,
          representative: group[0],
        });
      }
    }

    console.log(`Found ${groups.length} groups of similar keywords`);

    return c.json({ 
      success: true, 
      groups,
      processedCount: embeddings.length,
      totalCount: keywords.length 
    });
  } catch (error) {
    console.log(`Error merging keywords with AI: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * AI 통합 결과 저장
 */
app.post("/make-server-5a8db632/ai/save-merged-groups", async (c) => {
  try {
    const body = await c.req.json();
    const { groups } = body;
    
    if (!groups || !Array.isArray(groups)) {
      return c.json({ success: false, error: "Groups array is required" }, 400);
    }

    console.log(`Saving ${groups.length} merged keyword groups`);
    
    // 기존 통합 정보 삭제
    const existingGroups = await kv.getByPrefix("keyword_group:");
    if (existingGroups.length > 0) {
      await kv.mdel(existingGroups.map((g: any) => g.id));
    }
    
    // 새로운 통합 정보 저장
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupId = `keyword_group:${i}`;
      
      await kv.set(groupId, {
        id: groupId,
        representative: group.representative,
        group: group.group,
        createdAt: new Date().toISOString(),
      });
      
      console.log(`Saved group ${i}: ${group.representative} -> [${group.group.join(', ')}]`);
    }
    
    return c.json({ success: true, savedCount: groups.length });
  } catch (error) {
    console.log(`Error saving merged groups: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * AI 통합 그룹 조회
 */
app.get("/make-server-5a8db632/ai/merged-groups", async (c) => {
  try {
    const groups = await kv.getByPrefix("keyword_group:");
    console.log(`Retrieved ${groups.length} merged keyword groups`);
    return c.json({ success: true, groups });
  } catch (error) {
    console.log(`Error fetching merged groups: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 도서 목록 조회
 */
app.get("/make-server-5a8db632/books", async (c) => {
  try {
    const sortBy = c.req.query('sortBy') || 'popularity';
    
    const books = await kv.getByPrefix("book:");
    
    const booksWithStats = await Promise.all(
      books.map(async (book: any) => {
        const keywords = await kv.getByPrefix(`keyword:${book.id}:`);
        
        const totalUpvotes = keywords.reduce((sum: number, kw: any) => sum + (kw.upvotes || 0), 0);
        const totalDownvotes = keywords.reduce((sum: number, kw: any) => sum + (kw.downvotes || 0), 0);
        const totalScore = totalUpvotes - totalDownvotes;
        
        return {
          ...book,
          views: book.views || 0,
          totalUpvotes,
          totalDownvotes,
          totalScore,
          keywordCount: keywords.length,
        };
      })
    );

    let sortedBooks = [...booksWithStats];
    
    switch (sortBy) {
      case 'views':
        sortedBooks.sort((a, b) => b.views - a.views);
        break;
      case 'upvotes':
        sortedBooks.sort((a, b) => b.totalUpvotes - a.totalUpvotes);
        break;
      case 'downvotes':
        sortedBooks.sort((a, b) => b.totalDownvotes - a.totalDownvotes);
        break;
      case 'popularity':
      default:
        sortedBooks.sort((a, b) => {
          const scoreA = a.views + (a.totalScore * 2) + a.keywordCount;
          const scoreB = b.views + (b.totalScore * 2) + b.keywordCount;
          return scoreB - scoreA;
        });
        break;
    }

    return c.json({ success: true, books: sortedBooks });
  } catch (error) {
    console.log(`Error fetching books: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 도서 상세 정보 조회
 */
app.get("/make-server-5a8db632/books/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const book = await kv.get(`book:${id}`);
    
    if (!book) {
      return c.json({ success: false, error: "Book not found" }, 404);
    }

    book.views = (book.views || 0) + 1;
    await kv.set(`book:${id}`, book);

    const keywords = await kv.getByPrefix(`keyword:${id}:`);
    
    return c.json({ success: true, book, keywords });
  } catch (error) {
    console.log(`Error fetching book details: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 도서 추가
 */
app.post("/make-server-5a8db632/books", async (c) => {
  try {
    const body = await c.req.json();
    const { title, author, description, coverImage, isbn, publisher, pubdate } = body;
    
    if (!title || !author) {
      return c.json({ success: false, error: "Title and author are required" }, 400);
    }

    const id = isbn || `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const book = {
      id,
      title,
      author,
      description: description || "",
      coverImage: coverImage || "",
      isbn: isbn || "",
      publisher: publisher || "",
      pubdate: pubdate || "",
      views: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`book:${id}`, book);
    
    return c.json({ success: true, book });
  } catch (error) {
    console.log(`Error creating book: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 도서 수정
 */
app.put("/make-server-5a8db632/books/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const existingBook = await kv.get(`book:${id}`);
    if (!existingBook) {
      return c.json({ success: false, error: "Book not found" }, 404);
    }

    const updatedBook = {
      ...existingBook,
      ...body,
      id,
      views: existingBook.views,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`book:${id}`, updatedBook);
    
    return c.json({ success: true, book: updatedBook });
  } catch (error) {
    console.log(`Error updating book: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 도서 삭제
 */
app.delete("/make-server-5a8db632/books/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existingBook = await kv.get(`book:${id}`);
    if (!existingBook) {
      return c.json({ success: false, error: "Book not found" }, 404);
    }

    const keywords = await kv.getByPrefix(`keyword:${id}:`);
    const keywordIds = keywords.map((kw: any) => kw.id);
    
    if (keywordIds.length > 0) {
      await kv.mdel(keywordIds);
    }
    
    const votes = await kv.getByPrefix(`vote:${id}:`);
    const voteIds = votes.map((v: any) => v.id);
    
    if (voteIds.length > 0) {
      await kv.mdel(voteIds);
    }

    await kv.del(`book:${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting book: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ========== 키워드 관리 ==========

/**
 * 키워드 추가
 */
app.post("/make-server-5a8db632/keywords", async (c) => {
  try {
    const body = await c.req.json();
    const { bookId, keyword } = body;
    
    const user = await getUserFromToken(c.req.header('Authorization'));
    const userId = user?.id || 'anonymous';
    
    if (!bookId || !keyword) {
      return c.json({ success: false, error: "BookId and keyword are required" }, 400);
    }

    const normalizedKeyword = keyword.trim().toLowerCase().replace(/\s+/g, ' ');
    
    if (!normalizedKeyword) {
      return c.json({ success: false, error: "Invalid keyword" }, 400);
    }

    const keywordId = `keyword:${bookId}:${normalizedKeyword}`;
    
    const existingKeyword = await kv.get(keywordId);
    
    if (existingKeyword) {
      existingKeyword.upvotes = (existingKeyword.upvotes || 0) + 1;
      existingKeyword.score = (existingKeyword.upvotes || 0) - (existingKeyword.downvotes || 0);
      await kv.set(keywordId, existingKeyword);
      return c.json({ success: true, keyword: existingKeyword, existed: true });
    }

    const newKeyword = {
      id: keywordId,
      bookId,
      keyword: normalizedKeyword,
      creatorId: userId,
      upvotes: 1,
      downvotes: 0,
      score: 1,
      createdAt: new Date().toISOString(),
    };

    await kv.set(keywordId, newKeyword);
    
    return c.json({ success: true, keyword: newKeyword, existed: false });
  } catch (error) {
    console.log(`Error adding keyword: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 키워드 투표
 */
app.post("/make-server-5a8db632/keywords/:bookId/:keyword/vote", async (c) => {
  try {
    const bookId = c.req.param("bookId");
    const keyword = decodeURIComponent(c.req.param("keyword"));
    const body = await c.req.json();
    const { voteType } = body;
    
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }
    
    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      return c.json({ success: false, error: "Invalid vote type" }, 400);
    }

    const keywordId = `keyword:${bookId}:${keyword}`;
    const existingKeyword = await kv.get(keywordId);
    
    if (!existingKeyword) {
      return c.json({ success: false, error: "Keyword not found" }, 404);
    }

    if (existingKeyword.creatorId === user.id) {
      return c.json({ success: false, error: "Cannot vote on your own keyword", isOwnKeyword: true }, 400);
    }

    const voteId = `vote:${bookId}:${keyword}:${user.id}`;
    const existingVote = await kv.get(voteId);
    
    if (existingVote) {
      return c.json({ success: false, error: "Already voted on this keyword", alreadyVoted: true }, 400);
    }

    if (voteType === 'up') {
      existingKeyword.upvotes = (existingKeyword.upvotes || 0) + 1;
    } else {
      existingKeyword.downvotes = (existingKeyword.downvotes || 0) + 1;
    }

    existingKeyword.score = existingKeyword.upvotes - existingKeyword.downvotes;
    
    // 싫어요가 좋아요보다 5표 이상 많으면 자동 삭제
    if (existingKeyword.score <= -5) {
      console.log(`Auto-deleting keyword "${keyword}" due to low score: ${existingKeyword.score}`);
      
      // 키워드와 관련된 투표도 모두 삭제
      const relatedVotes = await kv.getByPrefix(`vote:${bookId}:${keyword}:`);
      if (relatedVotes.length > 0) {
        await kv.mdel(relatedVotes.map((v: any) => v.id));
      }
      await kv.del(keywordId);
      
      return c.json({ 
        success: true, 
        deleted: true,
        message: "키워드가 부정적인 평가로 인해 삭제되었습니다"
      });
    }
    
    await kv.set(keywordId, existingKeyword);
    
    await kv.set(voteId, {
      id: voteId,
      userId: user.id,
      bookId,
      keyword,
      voteType,
      createdAt: new Date().toISOString(),
    });
    
    return c.json({ success: true, keyword: existingKeyword });
  } catch (error) {
    console.log(`Error voting on keyword: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 사용자 투표 조회
 */
app.get("/make-server-5a8db632/my-votes/:bookId", async (c) => {
  try {
    const bookId = c.req.param("bookId");
    const user = await getUserFromToken(c.req.header('Authorization'));
    
    if (!user) {
      return c.json({ success: true, votes: [], ownKeywords: [] });
    }

    const votes = await kv.getByPrefix(`vote:${bookId}:`);
    const userVotes = votes.filter((v: any) => v.userId === user.id);
    
    const keywords = await kv.getByPrefix(`keyword:${bookId}:`);
    const ownKeywords = keywords
      .filter((kw: any) => kw.creatorId === user.id)
      .map((kw: any) => kw.keyword);
    
    return c.json({ success: true, votes: userVotes, ownKeywords });
  } catch (error) {
    console.log(`Error fetching user votes: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ========== 검색 ==========

/**
 * 책 검색
 */
app.post("/make-server-5a8db632/search", async (c) => {
  try {
    const body = await c.req.json();
    const { bookName, keywords, searchMode = 'fuzzy' } = body;
    
    console.log(`Search request - bookName: ${bookName}, keywords: ${JSON.stringify(keywords)}, mode: ${searchMode}`);
    
    const allBooks = await kv.getByPrefix("book:");
    const allKeywords = await kv.getByPrefix("keyword:");
    
    // AI 통합 그룹 정보 조회
    const mergedGroups = await kv.getByPrefix("keyword_group:");
    console.log(`Found ${mergedGroups.length} merged keyword groups`);
    
    // 책 이름/저자 검색 결과
    const bookNameMatches = new Set<string>();
    if (bookName && bookName.trim()) {
      const normalizedBookName = bookName.trim().toLowerCase();
      
      for (const book of allBooks) {
        const title = (book.title || '').toLowerCase();
        const author = (book.author || '').toLowerCase();
        
        let isMatch = false;
        if (searchMode === 'exact') {
          // 완전 일치 검색
          isMatch = title === normalizedBookName || author === normalizedBookName;
        } else {
          // 퍼지 검색 (부분 일치, 띄어쓰기 무시)
          const titleNoSpace = title.replace(/\s+/g, '');
          const authorNoSpace = author.replace(/\s+/g, '');
          const searchNoSpace = normalizedBookName.replace(/\s+/g, '');
          
          isMatch = title.includes(normalizedBookName) || normalizedBookName.includes(title) ||
                    author.includes(normalizedBookName) || normalizedBookName.includes(author) ||
                    titleNoSpace.includes(searchNoSpace) || searchNoSpace.includes(titleNoSpace) ||
                    authorNoSpace.includes(searchNoSpace) || searchNoSpace.includes(authorNoSpace);
        }
        
        if (isMatch) {
          bookNameMatches.add(book.id);
        }
      }
      console.log(`Book name matches: ${bookNameMatches.size} books`);
    }
    
    // 키워드 검색 결과
    const keywordMatches = new Map<string, { score: number; matchedKeywords: string[] }>();
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      // 필수 키워드(#로 시작)와 선택 키워드 분리
      const requiredKeywords: string[] = [];
      const optionalKeywords: string[] = [];
      
      for (const kw of keywords) {
        const trimmed = kw.trim();
        if (trimmed.startsWith('#')) {
          // # 제거하고 필수 키워드에 추가
          requiredKeywords.push(trimmed.substring(1).toLowerCase().replace(/\s+/g, ' '));
        } else {
          optionalKeywords.push(trimmed.toLowerCase().replace(/\s+/g, ' '));
        }
      }
      
      console.log(`Required keywords: ${JSON.stringify(requiredKeywords)}, Optional keywords: ${JSON.stringify(optionalKeywords)}`);
      
      // AI 통합 그룹에 속한 키워드 확장
      const expandKeyword = (keyword: string): string[] => {
        const normalized = keyword.toLowerCase().replace(/\s+/g, ' ');
        
        // 해당 키워드가 속한 그룹 찾기
        for (const groupData of mergedGroups) {
          const group = groupData.group || [];
          const normalizedGroup = group.map((kw: string) => kw.toLowerCase().replace(/\s+/g, ' '));
          
          if (normalizedGroup.includes(normalized)) {
            console.log(`Keyword "${keyword}" found in group: [${group.join(', ')}]`);
            return normalizedGroup;
          }
        }
        
        // 그룹에 속하지 않으면 원본만 반환
        return [normalized];
      };
      
      // 필수 키워드 확장
      const expandedRequiredKeywords = requiredKeywords.flatMap(kw => expandKeyword(kw));
      console.log(`Expanded required keywords: ${JSON.stringify(expandedRequiredKeywords)}`);
      
      // 선택 키워드 확장
      const expandedOptionalKeywords = optionalKeywords.flatMap(kw => expandKeyword(kw));
      console.log(`Expanded optional keywords: ${JSON.stringify(expandedOptionalKeywords)}`);
      
      // 책별로 키워드 수집
      const bookKeywordsMap = new Map<string, Set<string>>();
      for (const keywordData of allKeywords) {
        const { bookId, keyword } = keywordData;
        const normalizedKeyword = keyword.trim().toLowerCase().replace(/\s+/g, ' ');
        
        if (!bookKeywordsMap.has(bookId)) {
          bookKeywordsMap.set(bookId, new Set());
        }
        bookKeywordsMap.get(bookId)!.add(normalizedKeyword);
      }
      
      // 각 책에 대해 검색 조건 검사
      for (const [bookId, bookKeywords] of bookKeywordsMap.entries()) {
        let meetsRequirements = true;
        const matchedKeywords: string[] = [];
        let totalScore = 0;
        
        // 필수 키워드 검사 - 확장된 키워드 중 하나라도 있으면 됨
        if (expandedRequiredKeywords.length > 0) {
          // 원본 필수 키워드별로 그룹화 (각 원본 키워드마다 하나라도 매칭되어야 함)
          const requiredGroups = new Map<string, string[]>();
          for (const originalKw of requiredKeywords) {
            requiredGroups.set(originalKw, expandKeyword(originalKw));
          }
          
          for (const [originalKw, expandedKws] of requiredGroups) {
            let foundInGroup = false;
            
            for (const expandedKw of expandedKws) {
              for (const bookKw of bookKeywords) {
                let isMatch = false;
                
                if (searchMode === 'exact') {
                  isMatch = bookKw === expandedKw;
                } else {
                  // 퍼지 검색
                  if (bookKw === expandedKw || 
                      bookKw.includes(expandedKw) || 
                      expandedKw.includes(bookKw)) {
                    isMatch = true;
                  } else {
                    // 단어 단위 매칭
                    const bookKwWords = bookKw.split(' ');
                    const expandedKwWords = expandedKw.split(' ');
                    
                    if (bookKwWords.some((bw: string) => 
                      expandedKwWords.some((ew: string) => bw.includes(ew) || ew.includes(bw))
                    )) {
                      isMatch = true;
                    }
                  }
                }
                
                if (isMatch) {
                  foundInGroup = true;
                  // 원본 키워드 찾기
                  const originalKeyword = allKeywords.find(
                    kd => kd.bookId === bookId && 
                          kd.keyword.trim().toLowerCase().replace(/\s+/g, ' ') === bookKw
                  );
                  if (originalKeyword && originalKeyword.score > 0) {
                    matchedKeywords.push(originalKeyword.keyword);
                    totalScore += originalKeyword.score;
                  }
                  break;
                }
              }
              
              if (foundInGroup) break;
            }
            
            if (!foundInGroup) {
              meetsRequirements = false;
              break;
            }
          }
        }
        
        // 필수 키워드 조건을 만족하지 못하면 스킵
        if (!meetsRequirements) {
          continue;
        }
        
        // 선택 키워드 검사 - 확장된 키워드 중 하나라도 있으면 됨
        if (expandedOptionalKeywords.length > 0) {
          let hasOptional = false;
          
          for (const expandedOptionalKw of expandedOptionalKeywords) {
            for (const bookKw of bookKeywords) {
              let isMatch = false;
              
              if (searchMode === 'exact') {
                isMatch = bookKw === expandedOptionalKw;
              } else {
                // 퍼지 검색
                if (bookKw === expandedOptionalKw || 
                    bookKw.includes(expandedOptionalKw) || 
                    expandedOptionalKw.includes(bookKw)) {
                  isMatch = true;
                } else {
                  // 단어 단위 매칭
                  const bookKwWords = bookKw.split(' ');
                  const expandedOptionalKwWords = expandedOptionalKw.split(' ');
                  
                  if (bookKwWords.some((bw: string) => 
                    expandedOptionalKwWords.some((ow: string) => bw.includes(ow) || ow.includes(bw))
                  )) {
                    isMatch = true;
                  }
                }
              }
              
              if (isMatch) {
                hasOptional = true;
                // 원본 키워드 찾기
                const originalKeyword = allKeywords.find(
                  kd => kd.bookId === bookId && 
                        kd.keyword.trim().toLowerCase().replace(/\s+/g, ' ') === bookKw
                );
                if (originalKeyword && originalKeyword.score > 0) {
                  matchedKeywords.push(originalKeyword.keyword);
                  totalScore += originalKeyword.score;
                }
              }
            }
          }
          
          // 선택 키워드가 있는 경우에만 선택 키워드가 하나라도 있어야 함
          if (!hasOptional) {
            continue;
          }
        }
        
        // 매칭된 키워드가 있으면 추가
        if (matchedKeywords.length > 0 && totalScore > 0) {
          keywordMatches.set(bookId, {
            score: totalScore,
            matchedKeywords: [...new Set(matchedKeywords)]
          });
        }
      }
      
      console.log(`Keyword matches: ${keywordMatches.size} books`);
    }
    
    // 책 이름과 키워드 검색 결과를 합침 (OR 조건)
    const combinedBookIds = new Set<string>([
      ...bookNameMatches,
      ...keywordMatches.keys()
    ]);
    
    console.log(`Combined matches: ${combinedBookIds.size} books`);
    
    const results = [];
    for (const bookId of combinedBookIds) {
      const book = await kv.get(`book:${bookId}`);
      if (book) {
        const keywordData = keywordMatches.get(bookId);
        results.push({
          book,
          score: keywordData?.score || 0,
          matchedKeywords: keywordData?.matchedKeywords ? [...new Set(keywordData.matchedKeywords)] : [],
        });
      }
    }
    
    // 점수순으로 정렬 (키워드 매칭이 있는 책이 먼저, 그 다음 점수순)
    results.sort((a, b) => b.score - a.score);
    
    console.log(`Search complete: ${results.length} results`);
    return c.json({ success: true, results });
  } catch (error) {
    console.log(`Error searching books: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ========== 통계 조회 ==========

/**
 * 키워드 통계 조회
 */
app.get("/make-server-5a8db632/keywords/stats", async (c) => {
  try {
    const allKeywords = await kv.getByPrefix("keyword:");
    
    const keywordMap: Record<string, any> = {};
    
    for (const kw of allKeywords) {
      const { keyword, upvotes, downvotes, score, bookId } = kw;
      
      if (!keywordMap[keyword]) {
        keywordMap[keyword] = {
          keyword,
          totalUpvotes: 0,
          totalDownvotes: 0,
          totalScore: 0,
          bookCount: 0,
          books: [],
        };
      }
      
      keywordMap[keyword].totalUpvotes += upvotes || 0;
      keywordMap[keyword].totalDownvotes += downvotes || 0;
      keywordMap[keyword].totalScore += score || 0;
      keywordMap[keyword].bookCount += 1;
      keywordMap[keyword].books.push(bookId);
    }

    const aggregatedKeywords = Object.values(keywordMap).sort(
      (a: any, b: any) => b.totalScore - a.totalScore
    );

    return c.json({ success: true, keywords: aggregatedKeywords });
  } catch (error) {
    console.log(`Error fetching keyword stats: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);