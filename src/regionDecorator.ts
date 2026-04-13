import * as vscode from 'vscode';
import { getStartPattern, getMarkerColors } from './utils';

export class RegionDecorator {
	private decorationType!: vscode.TextEditorDecorationType;

	constructor() {
		this.updateDecorationType();
	}

	private updateDecorationType(): void {
		if (this.decorationType) {
			this.decorationType.dispose();
		}

		const colors = getMarkerColors();
		this.decorationType = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			fontWeight: "bold",
			color: colors.foreground,
			backgroundColor: colors.background
		});
	}

	public updateDecorations(): void {
		const showDecorations = vscode.workspace.getConfiguration('region-viewer').get<boolean>('showDecorations', true);

		for (const editor of vscode.window.visibleTextEditors) {
			if (!showDecorations) {
				editor.setDecorations(this.decorationType, []);
				continue;
			}

			const startPattern = getStartPattern(editor.document.languageId);
			if (!startPattern) {
				editor.setDecorations(this.decorationType, []);
				continue;
			}

			const text = editor.document.getText();
			const decorations: vscode.DecorationOptions[] = [];
			const regEx = new RegExp(startPattern, 'g');
			let match: RegExpExecArray | null;

			while ((match = regEx.exec(text)) !== null) {
				const startPos = editor.document.positionAt(match.index);
				decorations.push({ range: new vscode.Range(startPos, startPos) });
			}

			editor.setDecorations(this.decorationType, decorations);
		}
	}

	public refreshColors(): void {
		this.updateDecorationType();
		// New decoration type starts with no ranges; re-apply to the active editor.
		this.updateDecorations();
	}

	public dispose(): void {
		this.decorationType.dispose();
	}
}
