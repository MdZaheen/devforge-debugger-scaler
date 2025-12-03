import * as vscode from 'vscode';
import { RepairController } from './controller';

export function activate(context: vscode.ExtensionContext) {
	console.log('DevForge Debugger v0.0.3 is now active!');

	const controller = new RepairController();

	const disposable = vscode.commands.registerCommand('devforge.repairCode', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('DevForge: Please open a file to repair.');
			return;
		}

		await controller.startRepair(editor.document);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
