import fs from 'fs';
import path from 'path';

export function mediaSrc(url:string): string {

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    copyAssetToReveal(url, '../Presentations/assets', '../Reveal/assets');
    return `./assets/${url}`;
}

function copyAssetToReveal(url: string, sourceDir: string, revealDir: string): void {
    const srcPath = path.resolve(sourceDir, url);
    const destPath = path.resolve(revealDir, url);

    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    fs.copyFileSync(srcPath, destPath);
}

export function renderVideo(url: string, className: string, extraAttrs: string = ''): string {
    const attrs = extraAttrs ? ` ${extraAttrs.trim()}` : '';
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
        let videoId: string;
        if (url.includes('youtu.be')) {
            videoId = url.split('/').pop()!;
        } else {
            const params = new URL(url).searchParams;
            videoId = params.get('v')!;
        }
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        return `<iframe src="${embedUrl}" class="${className}"${attrs} frameborder="0" allowfullscreen></iframe>`;
    }
    return `<video src="${url}" class="${className}"${attrs} controls></video>`;
}