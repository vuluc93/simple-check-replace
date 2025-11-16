import * as vscode from 'vscode';
import OpenAI from "openai";

const SECRET_KEY_NAME = 'openai.apiKey';

export async  function activate(context: vscode.ExtensionContext) {
	console.log('OpenAI example extension active');

  	const disposableSetKey = vscode.commands.registerCommand('extension.setOpenAIKey', async () => {
    const key = await vscode.window.showInputBox({
			placeHolder: 'Paste your OpenAI API key (sk-...)',
			ignoreFocusOut: true,
			password: true
		});
		if (!key) {
			vscode.window.showWarningMessage('No key provided.');
			return;
		}
		await context.secrets.store(SECRET_KEY_NAME, key);
		vscode.window.showInformationMessage('OpenAI API key saved to VSCode Secret Storage.');
	});

	let disposable = vscode.commands.registerCommand('extension.callOpenai', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const functionList = [
			{
				"name": "calculate_total",
				"language": "python",
				"indent": 4,
				"code": "def calculate_total(items):\n    total = sum(i.price for i in items)\n    return total"
			},
			{
				"name": "handle_request",
				"language": "typescript",
				"indent": 0,
				"code": "export function handleRequest(req: Request) {\n  return process(req.body);\n}"
			}
		]

		try {
			const apiKey = await context.secrets.get(SECRET_KEY_NAME);
			const client = new OpenAI({ apiKey }); // SDK client

			const response = await client.responses.create({
				model: "gpt-4.1",
				input: `
				You are a tool for generating docstrings for multiple functions in a source file.

				IMPORTANT RULES:
				- You MUST NOT modify the function code.
				- You MUST NOT rewrite, reorder, reformat, or fix any code.
				- You MUST NOT output the full file.
				- ONLY generate docstrings.
				- For each function, return a JSON object containing:
				- "name": the function name
				- "can_generate": true | false
				- "reason": explain if cannot generate
				- "docstring": the exact docstring text (without indentation)
				- "indent": number of spaces to indent the docstring (so the editor can insert it)
				
				Additional rules:
				- Infer parameter types if possible.
				- Keep docstrings concise but meaningful.

				Now generate docstrings for the following list of functions:

				${JSON.stringify(functionList, null, 2)}
				`,			
				// reasoning: { effort: "medium" },
				// max_output_tokens: 200
				});

			const answer = response.output_text ?? '<no answer>';
			const output = vscode.window.createOutputChannel("Call API");
			output.clear();
			output.appendLine(`--------------------[answer1]--------------------`);
			output.appendLine(answer);
			output.show(true);

		} catch (err: any) {
			console.error('OpenAI call failed:', err);
			vscode.window.showErrorMessage(`OpenAI error: ${err.message ?? String(err)}`);
		}
	});

	context.subscriptions.push(disposableSetKey, disposable);
}

export function deactivate() {}
