let lastUsername: string | null = null;

document.addEventListener('contextmenu', (e) => {
	const target = e.target;
	if (!(target instanceof HTMLImageElement)) return;

	const article = target.closest('article[data-testid="tweet"]');
	if (!article) { lastUsername = null; return; }

	// ユーザー名リンクは href="/username" の形式（"/home" 等を除外）
	const links = article.querySelectorAll<HTMLAnchorElement>('a[href^="/"]');
	for (const link of links) {
		const match = link.getAttribute('href')?.match(/^\/([A-Za-z0-9_]+)$/);
		if (match) { lastUsername = match[1]; return; }
	}
	lastUsername = null;
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg.type === 'GET_USERNAME') {
		sendResponse({ username: lastUsername });
	}
});
