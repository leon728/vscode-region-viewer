import * as vscode from 'vscode';
import { RegionTreeDataProvider } from './regionTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
	const regionTreeDataProvider = new RegionTreeDataProvider();
	context.subscriptions.push(vscode.window.registerTreeDataProvider('regionViewer', regionTreeDataProvider));

	// If a TreeView item is selected, the cursor moves to that location.
	context.subscriptions.push(vscode.commands.registerCommand('region-viewer.reveal', (line) =>
	{
		const editor = vscode.window.activeTextEditor;
		if (editor == undefined)
			return;
			
		const pos = new vscode.Position(line, 0);
		editor.selection = new vscode.Selection(pos, pos);
		editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
	}));

	// When the document is changed, the list of regions in the document is checked and updated.
	let refreshTimeout: NodeJS.Timeout | undefined;
	const scheduleRefresh = () => {
		if (refreshTimeout) {
			clearTimeout(refreshTimeout);
		}
		refreshTimeout = setTimeout(() => {
			regionTreeDataProvider.refresh();
			refreshTimeout = undefined;
		}, 300); // 300ms debounce
	};

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
		regionTreeDataProvider.refresh(); // Immediate refresh on file switch
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
		if (e.document === vscode.window.activeTextEditor?.document) {
			scheduleRefresh(); // Debounced refresh on active document change
		}
	}));

	//
	context.subscriptions.push(vscode.commands.registerCommand('region-viewer.activeDocumentLanguageId', () =>
	{
		var languageId = vscode.window.activeTextEditor?.document?.languageId ?? 'Unknown language';

		vscode.window.showInformationMessage(`Language ID for active document: ${languageId}`);
	}));
}

export function deactivate() {}
