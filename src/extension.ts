import * as vscode from 'vscode';
import { RepairController } from './controller';

export function activate(context: vscode.ExtensionContext) {
	console.log('DevForge Debugger is now active!');

	const controller = new RepairController();

	const disposable = vscode.commands.registerCommand('devforge.repairCode', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('DevForge: No active editor found.');
			return;
		}

		await controller.startRepair(editor.document);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
