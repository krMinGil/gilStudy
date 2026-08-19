/*
 * 데이터 접근 계층 (Supabase 구현)
 *
 * index.html / selectMenu.html / board.html은 이 파일이 노출하는 DataStore 객체를
 * 통해서만 로그인 상태와 데이터를 다룬다. 예전에는 localStorage를 감싼 구현이었는데,
 * 지금은 그 자리를 Supabase 호출로 교체했다 — 처음부터 모든 메서드를 async로
 * 설계해둔 덕분에 호출부(await DataStore.xxx) 코드는 거의 그대로다.
 *
 * 보안 모델: 이 클라이언트는 publishable(공개) 키만 사용한다. boards/posts 테이블은
 * RLS(행 단위 보안)가 켜져 있고 "authenticated" 역할에게만 접근을 허용하므로,
 * 로그인(Supabase Auth) 세션이 없는 요청은 무엇을 시도하든 DB가 자체적으로 거부한다.
 */
const DataStore = (() => {
    // --- 인증 ---
    async function signIn(email, password) {
        return supabaseClient.auth.signInWithPassword({ email, password });
    }

    async function signOut() {
        await supabaseClient.auth.signOut();
    }

    async function getSession() {
        const { data } = await supabaseClient.auth.getSession();
        return data.session;
    }

    // --- 게시판(메뉴) 목록 ---
    async function getMenuList() {
        const { data, error } = await supabaseClient
            .from("boards")
            .select("id, title")
            .order("sort_order", { ascending: true });
        if (error) {
            console.error("게시판 목록을 불러오지 못했습니다:", error);
            return [];
        }
        return data;
    }

    async function addMenu(title) {
        const id = `m${Date.now()}`;
        const { data: rows, error: fetchError } = await supabaseClient
            .from("boards")
            .select("sort_order")
            .order("sort_order", { ascending: false })
            .limit(1);
        if (fetchError) throw fetchError;
        const nextOrder = rows && rows.length ? rows[0].sort_order + 1 : 1;

        const { error } = await supabaseClient
            .from("boards")
            .insert({ id, title, sort_order: nextOrder });
        if (error) throw error;
        return id;
    }

    async function deleteMenu(id) {
        // posts.board_id가 on delete cascade로 걸려있어서, 게시판을 지우면
        // 그 안의 게시글도 DB가 알아서 같이 지운다.
        const { error } = await supabaseClient.from("boards").delete().eq("id", id);
        if (error) throw error;
    }

    // --- 게시판별 게시글 목록 ---
    async function getItems(boardId) {
        const { data, error } = await supabaseClient
            .from("posts")
            .select("id, title, content, memos, sort_order")
            .eq("board_id", boardId)
            .order("sort_order", { ascending: true });
        if (error) {
            console.error("게시글을 불러오지 못했습니다:", error);
            return [];
        }
        return data;
    }

    // items 배열을 통째로 반영한다(배열 순서 = sort_order). 배열에서 빠진 기존 행은
    // 삭제된 것으로 간주해 지운다. board.html이 "전체를 읽고 - 배열째로 수정하고 -
    // 통째로 저장"하는 기존 방식을 그대로 유지할 수 있도록 여기서 upsert/delete로 변환한다.
    async function saveItems(boardId, items) {
        const { data: existingRows, error: fetchError } = await supabaseClient
            .from("posts")
            .select("id")
            .eq("board_id", boardId);
        if (fetchError) throw fetchError;

        const nextIds = items.map((item) => item.id);
        const idsToDelete = (existingRows || [])
            .map((row) => row.id)
            .filter((id) => !nextIds.includes(id));

        if (idsToDelete.length > 0) {
            const { error } = await supabaseClient.from("posts").delete().in("id", idsToDelete);
            if (error) throw error;
        }

        if (items.length > 0) {
            const rows = items.map((item, index) => ({
                id: item.id,
                board_id: boardId,
                title: item.title,
                content: item.content,
                memos: item.memos || {},
                sort_order: index,
            }));
            const { error } = await supabaseClient.from("posts").upsert(rows);
            if (error) throw error;
        }
    }

    return { signIn, signOut, getSession, getMenuList, addMenu, deleteMenu, getItems, saveItems };
})();
