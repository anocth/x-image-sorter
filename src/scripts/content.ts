let lastUsername: string | null = null;
let lastDisplayName: string | null = null;
let lastDisplayNameExpected = false;

document.addEventListener('contextmenu', (e) => {
	const target = e.target;
	if (!(target instanceof HTMLImageElement)) return;

	lastUsername = null;
	lastDisplayName = null;
	lastDisplayNameExpected = false;

	// ポスト欄: article 内の User-Name 要素からユーザ名と表示名を取得
	const article = target.closest('article[data-testid="tweet"]');
	if (article) {
		lastDisplayNameExpected = true;
		const userNameEl = article.querySelector('[data-testid="User-Name"]');
		if (userNameEl) {
			for (const link of userNameEl.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')) {
				const match = link.getAttribute('href')?.match(/^\/([A-Za-z0-9_]+)$/);
				if (match) { lastUsername = match[1]; break; }
			}
			const nameEl = userNameEl.querySelector('div[dir="ltr"]');
			lastDisplayName = nameEl?.textContent?.trim() ?? null;
		}
		return;
	}

	// メディア欄: cellInnerDiv 内の /username/status/... リンクからユーザ名を取得
	// 表示名はプロフィールヘッダーから取得
	const cell = target.closest('[data-testid="cellInnerDiv"]');
	if (cell) {
		const links = cell.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]');
		for (const link of links) {
			const match = link.getAttribute('href')?.match(/^\/([A-Za-z0-9_]+)\/status\//);
			if (match) {
				lastUsername = match[1];
				lastDisplayNameExpected = true;
				const nameEl = document.querySelector('[data-testid="UserName"] div[dir="ltr"]');
				lastDisplayName = nameEl?.textContent?.trim() ?? null;
				return;
			}
		}
	}

	// 画像拡大プレビュー: URLパターン /username/status/.../photo/N からユーザ名を取得
	const photoMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)\/status\/\d+\/photo\/\d+$/);
	if (photoMatch) {
		lastUsername = photoMatch[1];
		lastDisplayNameExpected = true;
		const suffix = `@${lastUsername}`;
		// プロフィールページから開いた場合: UserName（ハイフンなし）
		const profileEl = document.querySelector('[data-testid="UserName"]');
		if (profileEl) {
			const full = profileEl.textContent?.trim() ?? '';
			lastDisplayName = full.slice(0, full.length - suffix.length).trim() || null;
		} else {
			// タイムラインから開いた場合: ユーザへのリンクを含む User-Name（ハイフンあり）を探す
			for (const el of document.querySelectorAll('[data-testid="User-Name"]')) {
				if (el.querySelector(`a[href="/${lastUsername}"]`)) {
					const full = el.textContent?.trim() ?? '';
					lastDisplayName = full.slice(0, full.length - suffix.length).trim() || null;
					break;
				}
			}
		}
	}
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg.type === 'GET_USERNAME') {
		sendResponse({
			username: lastUsername,
			displayName: lastDisplayName,
			displayNameExpected: lastDisplayNameExpected
		});
	}
});
