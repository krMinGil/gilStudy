/*
 * Supabase 프로젝트 접속 설정.
 *
 * SUPABASE_ANON_KEY는 "publishable"(공개용) 키라서 브라우저에 그대로 노출돼도 안전하다.
 * 실제 보안은 이 키가 아니라 Supabase 쪽 boards/posts 테이블에 걸어둔 RLS 정책
 * (로그인한 사용자만 접근 허용)이 담당한다.
 *
 * 절대 이 파일에 secret / service_role 키를 넣지 말 것 — 그 키는 RLS를 전부
 * 무시하는 관리자 키라, 정적 사이트 코드에 들어가는 순간 누구나 브라우저
 * 개발자 도구로 꺼내서 DB 전체를 마음대로 조작할 수 있게 된다.
 */
const SUPABASE_URL = "https://bhmaqezhymfimcqftltx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4YIKsRhIbh2JfgE7Kozwow_TPAPC66F";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
