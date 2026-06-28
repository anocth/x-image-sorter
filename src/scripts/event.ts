const CONTEXT_ID = 'x-image-sorter';
const ROOT_FOLDER = 'x-img';

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.removeAll(() => {
		chrome.contextMenus.create({
			type: 'normal',
			id: CONTEXT_ID,
			title: '画像をオリジナルサイズで保存して分類',
			contexts: ['image'],
			targetUrlPatterns: ['*://pbs.twimg.com/media/*']
		});
	});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (info.srcUrl && info.menuItemId === CONTEXT_ID && tab?.id != null) {
		callDownload(new URL(info.srcUrl), tab.id);
	}
});

async function callDownload(targetSrc: URL, tabId: number): Promise<void> {
	targetSrc.searchParams.set('name', 'orig');

	// 画像拡大後の右クリック
	if (targetSrc.searchParams.get('format') !== 'webp') {
		await download(targetSrc, tabId);
		return;
	}

	// ツイート内サムネイルの右クリック
	targetSrc.searchParams.set('format', 'jpg');
	const response = await fetch(targetSrc.toString());
	if (!response.ok) targetSrc.searchParams.set('format', 'png');
	await download(targetSrc, tabId);
}

async function download(targetSrc: URL, tabId: number): Promise<void> {
	let user = '_unknown';
	try {
		const res = await chrome.tabs.sendMessage(tabId, { type: 'GET_USERNAME' });
		if (res?.username) user = res.username;
	} catch {
		// content script unavailable
	}
	const baseName = `${targetSrc.pathname.replace('/media/', '')}_${targetSrc.searchParams.get('name')}.${targetSrc.searchParams.get('format')}`;
	chrome.downloads.download({
		url: targetSrc.toString(),
		filename: `${ROOT_FOLDER}/${user}/${baseName}`
	});
}
