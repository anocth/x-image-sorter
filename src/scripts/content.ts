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
