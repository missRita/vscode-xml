import * as fs from "fs-extra";
import { commands, ExtensionContext, window, workspace } from "vscode";
import { CloseAction, ErrorAction, ErrorHandler, Message } from "vscode-languageclient";
import { ClientCommandConstants } from "../commands/commandConstants";
import { HEAP_DUMP_LOCATION } from "../server/java/jvmArguments";
import glob = require("glob");

/**
 * An error handler that restarts the language server,
 * unless it has been restarted 5 times in the last 10 minutes,
 * or if it crashed due to an Out Of Memory Error
 *
 * Adapted from [vscode-java](https://github.com/redhat-developer/vscode-java)
 */
export class ClientErrorHandler implements ErrorHandler {

  private restarts: number[];
  private name: string;
  private context: ExtensionContext;
  private heapDumpFolder: string;

  constructor(name: string, context: ExtensionContext) {
    this.name = name;
    this.restarts = [];
    this.context = context;
    this.heapDumpFolder = getHeapDumpFolderFromSettings() || context.globalStorageUri.fsPath;
  }

  error(_error: Error, _message: Message, _count: number): ErrorAction {
    return ErrorAction.Continue;
  }

  closed(): CloseAction {
    this.restarts.push(Date.now());
    const heapProfileGlob = new glob.GlobSync(`${this.heapDumpFolder}/java_*.hprof`);
    if (heapProfileGlob.found.length) {
      // Only clean heap dumps that are generated in the default location.
      // The default location is the extension global storage
      // This means that if users change the folder where the heap dumps are placed,
      // then they will be able to read the heap dumps,
      // since they aren't immediately deleted.
      cleanUpHeapDumps(this.context);
      showOOMMessage();
      return CloseAction.DoNotRestart;
    }
    if (this.restarts.length < 5) {
      return CloseAction.Restart;
    } else {
      const diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
      if (diff <= 10 * 60 * 1000) {
        window.showErrorMessage(`The ${this.name} language server crashed 5 times in the last 10 minutes. The server will not be restarted.`);
        return CloseAction.DoNotRestart;
      }
      this.restarts.shift();
      return CloseAction.Restart;
    }
  }

}

/**
 * Deletes all the heap dumps generated by Out Of Memory errors
 *
 * @returns when the heap dumps have been deleted
 */
export async function cleanUpHeapDumps(context: ExtensionContext): Promise<void> {
  const heapProfileGlob = new glob.GlobSync(`${context.globalStorageUri.fsPath}/java_*.hprof`);
  for (let heapProfile of heapProfileGlob.found) {
    await fs.remove(heapProfile);
  }
}

/**
 * Shows a message about the server crashing due to an out of memory issue
 */
async function showOOMMessage(): Promise<void> {
  const DOCS = 'More info...';
  const result = await window.showErrorMessage('The XML Language Server crashed due to an Out Of Memory Error, and will not be restarted. ', //
    DOCS);
  if (result === DOCS) {
    await commands.executeCommand(ClientCommandConstants.OPEN_DOCS,
      {
        page: 'Troubleshooting',
        section: 'the-language-server-crashes-due-to-an-out-of-memory-error'
      }
    );
  }
}

const HEAP_DUMP_FOLDER_EXTRACTOR = new RegExp(`${HEAP_DUMP_LOCATION}(?:'([^']+)'|"([^"]+)"|([^\\s]+))`);

/**
 * Returns the heap dump folder defined in the user's preferences, or undefined if the user does not set the heap dump folder
 *
 * @returns the heap dump folder defined in the user's preferences, or undefined if the user does not set the heap dump folder
 */
function getHeapDumpFolderFromSettings(): string {
  const jvmArgs: string = workspace.getConfiguration('xml.server').get('vmargs');
  const results = HEAP_DUMP_FOLDER_EXTRACTOR.exec(jvmArgs);
  if (!results || !results[0]) {
    return undefined;
  }
  return results[1] || results[2] || results[3];
}

const XMX_EXTRACTOR = /-Xmx([^\s]+)/;

/**
 * Returns the value that the user set for Xmx, or DEFAULT if the user didn't set Xmx
 *
 * @returns the value that the user set for Xmx, or DEFAULT if the user didn't set Xmx
 */
function getXmxFromSettings(): string {
  const vmargs: string = workspace.getConfiguration('xml.server').get('vmargs', null);
  if (vmargs != null) {
    const extractOfVmargs: RegExpExecArray = XMX_EXTRACTOR.exec(vmargs);
    if (extractOfVmargs.length && extractOfVmargs[1]) {
      return extractOfVmargs[1];
    }
  }
  return 'DEFAULT';
}