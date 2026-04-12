import * as vscode from 'vscode';
import * as markers from './markers.json';

export function getStartPattern(languageId: string): string | undefined {
	const config = vscode.workspace.getConfiguration();
	const markersOverrides = config.get<{[lang: string]: { start: string }}>('region-viewer');
	return markersOverrides?.[languageId]?.start ?? (markers as any)[languageId]?.start;
}

export interface MarkerColors {
	foreground: string;
	background: string;
}

/**
 * @returns MarkerColors null if decorator is disabled, otherwise returns the colors to use for decorations
 */
export function getMarkerColors(): MarkerColors | null {
	const config = vscode.workspace.getConfiguration();
	const colorsOverride = config.get<MarkerColors>('region-viewer.colors');
	
	// if colors is set to an empty object {}, disable the decorator
	if (colorsOverride && Object.keys(colorsOverride).length === 0) {
		return null;
	}
	
	return {
		foreground: colorsOverride?.foreground ?? (markers as any).colors.foreground,
		background: colorsOverride?.background ?? (markers as any).colors.background
	};
}
