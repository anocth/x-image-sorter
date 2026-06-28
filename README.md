# X Image Sorter

A Chrome extension that adds a right-click context menu option to download images from X (Twitter) at their original size, automatically sorted into per-user folders.

When you right-click an image in a post, select **"画像をオリジナルサイズで保存して分類"** to save it to `Downloads/x-img/<username>/`.

Images on the X timeline are loaded as resized thumbnails (often in WebP format). This extension fetches the original JPG/PNG at full resolution instead.

## Installation

Load the `dist/` folder as an unpacked extension in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

## License

[![Creative Commons License](https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

This is a fork of [Twitter, Download Original Image](https://github.com/Y-dash/twitter-download-original-image) by Y-dash, licensed under CC BY-NC-SA 4.0.
