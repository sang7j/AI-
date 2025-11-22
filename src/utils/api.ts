import { projectId, publicAnonKey } from './supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-5a8db632`;

async function apiCall(endpoint: string, options: RequestInit = {}, useAuth = false) {
  const url = `${API_BASE}${endpoint}`;
  
  // 인증 토큰 가져오기
  let authToken = publicAnonKey;
  if (useAuth) {
    const token = localStorage.getItem('access_token');
    if (token) {
      authToken = token;
    }
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`API Error on ${endpoint}:`, data);
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

export async function signup(email: string, password: string, name?: string) {
  return apiCall('/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function searchNaverBooks(query: string) {
  return apiCall(`/naver/books?query=${encodeURIComponent(query)}`);
}

export async function mergeKeywordsWithAI(keywords: string[]) {
  return apiCall('/ai/merge-keywords', {
    method: 'POST',
    body: JSON.stringify({ keywords }),
  }, true);
}

export async function saveMergedGroups(groups: any[]) {
  return apiCall('/ai/save-merged-groups', {
    method: 'POST',
    body: JSON.stringify({ groups }),
  }, true);
}

export async function getMergedGroups() {
  return apiCall('/ai/merged-groups');
}

export async function getBooks(sortBy?: 'popularity' | 'views' | 'upvotes' | 'downvotes') {
  const query = sortBy ? `?sortBy=${sortBy}` : '';
  return apiCall(`/books${query}`);
}

export async function getBook(id: string) {
  return apiCall(`/books/${id}`);
}

export async function createBook(book: {
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  isbn?: string;
  publisher?: string;
  pubdate?: string;
}) {
  return apiCall('/books', {
    method: 'POST',
    body: JSON.stringify(book),
  });
}

export async function updateBook(id: string, updates: Partial<{
  title: string;
  author: string;
  description: string;
  coverImage: string;
  isbn: string;
  publisher: string;
  pubdate: string;
}>) {
  return apiCall(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteBook(id: string) {
  return apiCall(`/books/${id}`, {
    method: 'DELETE',
  });
}

export async function addKeyword(bookId: string, keyword: string) {
  return apiCall(
    '/keywords',
    {
      method: 'POST',
      body: JSON.stringify({ bookId, keyword }),
    },
    true // 🔹 로그인 토큰 사용
  );
}

export async function voteKeyword(bookId: string, keyword: string, voteType: 'up' | 'down') {
  return apiCall(`/keywords/${bookId}/${encodeURIComponent(keyword)}/vote`, {
    method: 'POST',
    body: JSON.stringify({ voteType }),
  }, true);
}

export async function getMyVotes(bookId: string) {
  return apiCall(`/my-votes/${bookId}`, {}, true);
}

export async function searchBooks(params: {
  bookName?: string;
  keywords?: string[];
  searchMode?: 'exact' | 'fuzzy';
}) {
  return apiCall('/search', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getKeywordStats() {
  return apiCall('/keywords/stats');
}