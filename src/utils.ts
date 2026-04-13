import * as vscode from 'vscode';
import * as markers from './markers.json';

export function getStartPattern(languageId: string): string | undefined {
	const config = vscode.workspace.getConfiguration();
	const markersOverrides = config.get<{[lang: string]: { start: string }}>('region-viewer');
	return markersOverrides?.[languageId]?.start ?? (markers as any)[languageId]?.start;
}

export function getMarkerColors() {
	// Nested keys under contributed "region-viewer" object must be read via that section,
	// otherwise workspace merges may not resolve "region-viewer.colors" reliably.
	const regionConfig = vscode.workspace.getConfiguration('region-viewer');
	const colorsOverride = regionConfig.get<{ foreground?: string; background?: string }>('colors');

	return {
		foreground: colorsOverride?.foreground ?? (markers as any).colors.foreground,
		background: colorsOverride?.background ?? (markers as any).colors.background
	};
}
