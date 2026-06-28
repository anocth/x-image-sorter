const statusEl = document.getElementById('status')!;

function setStatus(msg: string): void {
	statusEl.textContent = msg;
}

document.getElementById('export')!.addEventListener('click', () => {
	chrome.runtime.sendMessage({ type: 'EXPORT_STORAGE' }, (data: unknown) => {
		const json = JSON.stringify(data, null, 2);
		const date = new Date().toISOString().slice(0, 10);
		const a = document.createElement('a');
		a.href = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
		a.download = `x-image-sorter-backup-${date}.json`;
		a.click();
		setStatus('エクスポートしました');
	});
});

document.getElementById('import-btn')!.addEventListener('click', () => {
	(document.getElementById('import-file') as HTMLInputElement).click();
});

document.getElementById('import-file')!.addEventListener('change', (e) => {
	const file = (e.target as HTMLInputElement).files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => {
		try {
			const data: unknown = JSON.parse(reader.result as string);
			if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error();
			chrome.runtime.sendMessage({ type: 'IMPORT_STORAGE', data }, () => {
				setStatus('インポートしました');
			});
		} catch {
			setStatus('ファイルが不正です');
		}
	};
	reader.readAsText(file);
});

document.getElementById('rebuild')!.addEventListener('click', () => {
	chrome.runtime.sendMessage({ type: 'REBUILD_PROFILES' }, () => {
		setStatus('再生成しました');
	});
});
