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
		if (!colors) {
			// if color is null, it means decorator is disabled, so we create a dummy decoration type that does nothing
			this.decorationType = vscode.window.createTextEditorDecorationType({});
			return;
		}
		
		this.decorationType = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			fontWeight: "bold",
			color: colors.foreground,
			backgroundColor: colors.background
		});
	}

	public updateDecorations(): void {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		// if decorator is disabled, clear decorations and return early
		if (!getMarkerColors()) {
			editor.setDecorations(this.decorationType, []);
			return;
		}

		const startPattern = getStartPattern(editor.document.languageId);
		if (!startPattern) {
			editor.setDecorations(this.decorationType, []);
			return;
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

	public refreshColors(): void {
		this.updateDecorationType();
	}

	public dispose(): void {
		this.decorationType.dispose();
	}
}
