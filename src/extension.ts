import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { ExtensionContext, languages } from "vscode";
import { Executable, LanguageClient } from 'vscode-languageclient/node';
import { XMLExtensionApi } from './api/xmlExtensionApi';
import { getXmlExtensionApiImplementation } from './api/xmlExtensionApiImplementation';
import { cleanUpHeapDumps } from './client/clientErrorHandler';
import { getIndentationRules } from './client/indentation';
import { startLanguageClient } from './client/xmlClient';
import { registerClientOnlyCommands } from './commands/registerCommands';
import { prepareExecutable } from './server/serverStarter';
import { ExternalXmlSettings } from "./settings/externalXmlSettings";

let languageClient: LanguageClient;

export async function activate(context: ExtensionContext): Promise<XMLExtensionApi> {

  registerClientOnlyCommands(context);

  languages.setLanguageConfiguration('xml', getIndentationRules());
  languages.setLanguageConfiguration('xsl', getIndentationRules());

  let storagePath: string = os.homedir() + "/.lemminx";
  
  const logfile = path.resolve(storagePath + '/lemminx.log');
  await fs.ensureDir(context.globalStorageUri.fsPath);
  await cleanUpHeapDumps(context);

  //getXMLConfiguration().update("server.binary.args", "-Djdk.xml.entityExpansionLimit=100000");
  //getXMLConfiguration().update("catalogs", "/home/serman/Downloads/Telegram Desktop/schema/v1.3/catalog_dtd.xml");
  //getXMLConfiguration().update("validation.resolveExternalEntities", true);

  const externalXmlSettings: ExternalXmlSettings = new ExternalXmlSettings();

  const serverOptions: Executable = await prepareExecutable(context);

  languageClient = await startLanguageClient(context, serverOptions, logfile, externalXmlSettings);

  return getXmlExtensionApiImplementation(languageClient, logfile, externalXmlSettings);
}

export async function deactivate(): Promise<void> {
  if (languageClient) {
    await languageClient.stop();
  }
}
