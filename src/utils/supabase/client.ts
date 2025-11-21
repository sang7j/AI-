import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createSupabaseClient(supabaseUrl, publicAnonKey);

// 인증 관련 헬퍼 함수들
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // 토큰 저장
  if (data.session?.access_token) {
    localStorage.setItem('access_token', data.session.access_token);
  }
  
  return data;
}

export async function signOut() {
  localStorage.removeItem('access_token');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  
  // 토큰 업데이트
  if (data.session?.access_token) {
    localStorage.setItem('access_token', data.session.access_token);
  }
  
  return data.session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}
