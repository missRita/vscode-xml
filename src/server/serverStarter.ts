import { ExtensionContext, window } from "vscode";
import { Executable } from "vscode-languageclient/node";
import { ABORTED_ERROR, prepareBinaryExecutable } from "./binary/binaryServerStarter";
import { RequirementsData } from "./requirements";

/**
 * Returns the executable to use to launch LemMinX (the XML Language Server)
 *
 * @param requirements the java information, or an empty object if there is no java
 * @param xmlJavaExtensions a list of all the java extension jars
 * @param context the extensions context
 * @throws if neither the binary nor the java version of the extension can be launched
 * @returns the executable to launch LemMinX with (the XML language server)
 */
export async function prepareExecutable(
  requirements: RequirementsData,
  xmlJavaExtensions: string[],
  context: ExtensionContext): Promise<Executable> {

  return prepareBinaryExecutable(context)
    .catch((e) => {
      const javaServerMessage = 'Cannot start XML language server, since Java is missing.';
      if (e === ABORTED_ERROR) {
        window.showWarningMessage(`${e.message}. ${javaServerMessage}`);
      } else {
        window.showErrorMessage(`${e}. ${javaServerMessage}`);
      }

      return null;
    });


}
