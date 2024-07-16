import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    'spellinguo.correctSpelling',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No editor is active');
        return;
      }

      const document = editor.document;
      const selection = editor.selection;
      let range;

      // Check if there is a selection. If not, use the entire document.
      if (selection.isEmpty) {
        range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
      } else {
        range = new vscode.Range(selection.start, selection.end);
      }

      const text = document.getText(range);

      // Get API key from settings
      let apiKey = vscode.workspace
        .getConfiguration()
        .get<string>('spellinguo.openaiApiKey');

      // If API key is not set, prompt the user to enter it
      if (!apiKey) {
        apiKey = await vscode.window.showInputBox({
          prompt: 'Enter your OpenAI API key',
          ignoreFocusOut: true,
        });

        if (!apiKey) {
          vscode.window.showErrorMessage(
            'OpenAI API key is required for spell checking.'
          );
          return;
        }

        // Save the API key in settings
        await vscode.workspace
          .getConfiguration()
          .update(
            'spellinguo.openaiApiKey',
            apiKey,
            vscode.ConfigurationTarget.Global
          );
      }

      // Call the OpenAI API to correct the spelling
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'user',
                content: `Correct the spelling of the following text:\n\n${text}\n\nCorrected text:`,
              },
            ],
            temperature: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const correctedText = response.data.choices[0].message.content.trim();

        editor.edit((editBuilder) => {
          editBuilder.replace(range, correctedText);
        });
      } catch (error) {
        if (error && error === 401) {
          vscode.window.showErrorMessage(
            'Unauthorized: Please check your OpenAI API key.'
          );
        } else {
          vscode.window.showErrorMessage('Error correcting spelling: ' + error);
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
