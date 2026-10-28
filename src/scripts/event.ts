const CONTEXT_ID = 'x-image-sorter';
const ROOT_FOLDER = 'x-img';

interface ProfileEntry {
	name: string;
	since: string;
}

interface Profile {
	displayName: string;
	history: ProfileEntry[];
}

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

// 自拡張が開始したダウンロードの保存先（URL → filename）
const pendingFilenames = new Map<string, string>();

// 他の拡張機能が onDeterminingFilename でファイル名を書き換えると
// download() の filename が無視されて Downloads 直下に保存されるため、ここで改めて指定する
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
	if (item.byExtensionId !== chrome.runtime.id) return;
	const filename = pendingFilenames.get(item.url);
	if (!filename) return;
	pendingFilenames.delete(item.url);
	suggest({ filename, conflictAction: 'overwrite' });
});

function startDownload(url: string, filename: string): void {
	pendingFilenames.set(url, filename);
	chrome.downloads.download({
		url,
		filename,
		conflictAction: 'overwrite',
		saveAs: false
	});
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (info.srcUrl && info.menuItemId === CONTEXT_ID && tab?.id != null) {
		callDownload(new URL(info.srcUrl), tab.id);
	}
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg.type === 'EXPORT_STORAGE') {
		chrome.storage.local.get(null, (data) => sendResponse(data));
		return true;
	}
	if (msg.type === 'IMPORT_STORAGE') {
		chrome.storage.local.set(msg.data as Record<string, unknown>, () => sendResponse({ ok: true }));
		return true;
	}
	if (msg.type === 'REBUILD_PROFILES') {
		chrome.storage.local.get(null, (data) => {
			for (const [username, profile] of Object.entries(data)) {
				downloadProfileJson(username, profile as Profile);
			}
			sendResponse({ ok: true });
		});
		return true;
	}
	return false;
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
	let displayName: string | null = null;
	let displayNameExpected = false;
	try {
		const res = await chrome.tabs.sendMessage(tabId, { type: 'GET_USERNAME' });
		if (res?.username) user = res.username;
		if (res?.displayName) displayName = res.displayName;
		if (res?.displayNameExpected) displayNameExpected = res.displayNameExpected;
	} catch {
		// content script unavailable
	}

	const baseName = `${targetSrc.pathname.replace('/media/', '')}_${targetSrc.searchParams.get('name')}.${targetSrc.searchParams.get('format')}`;

	// 同名ファイルが既にディスク上に存在するか（Chrome のダウンロード履歴 + exists:true で判定）
	const existed = (await chrome.downloads.search({
		filenameRegex: escapeRegex(baseName),
		exists: true,
		state: 'complete'
	})).length > 0;

	startDownload(targetSrc.toString(), `${ROOT_FOLDER}/${user}/${baseName}`);

	if (existed) {
		notify('上書きしました', baseName);
	}

	if (user === '_unknown') {
		notify('Failed to get username', 'The DOM structure may have changed');
		return;
	}
	if (!displayName && displayNameExpected) {
		notify('Failed to get display name', `The DOM structure for @${user} may have changed`);
		return;
	}
	if (displayName) {
		const updated = await saveProfile(user, displayName);
		if (updated) {
			downloadProfileJson(user, updated);
		}
	}
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function notify(title: string, message: string): void {
	chrome.notifications.create({
		type: 'basic',
		iconUrl: chrome.runtime.getURL('icons/icon48.png'),
		title,
		message
	});
}

async function saveProfile(username: string, displayName: string): Promise<Profile | null> {
	const today = new Date().toISOString().slice(0, 10);
	const data = await chrome.storage.local.get(username);
	const existing = data[username] as Profile | undefined;

	if (existing?.history[0]?.name === displayName) {
		return null;
	}

	const history = existing?.history ?? [];
	const updated: Profile = {
		displayName,
		history: [{ name: displayName, since: today }, ...history]
	};
	await chrome.storage.local.set({ [username]: updated });
	return updated;
}

function downloadProfileJson(username: string, profile: Profile): void {
	const payload = JSON.stringify({ username, ...profile }, null, 2);
	const url = `data:application/json;charset=utf-8,${encodeURIComponent(payload)}`;
	startDownload(url, `${ROOT_FOLDER}/${username}/profile.json`);
}
