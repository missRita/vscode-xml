import { DidChangeConfigurationNotification } from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";
import { ExternalXmlSettings } from "../settings/externalXmlSettings";
import { getXMLSettings, onConfigurationChange } from "../settings/settings";
import { XMLExtensionApi, XMLFileAssociation } from "./xmlExtensionApi";

/**
 * Returns the implementation of the vscode-xml extension API
 *
 * @param languageClient
 * @param logfile
 * @param externalXmlSettings
 * @param requirementsData
 * @return the implementation of the vscode-xml extension API
 */
export function getXmlExtensionApiImplementation(languageClient: LanguageClient, logfile: string, externalXmlSettings: ExternalXmlSettings): XMLExtensionApi {
  return {
    // add API set catalogs to internal memory
    addXMLCatalogs: (catalogs: string[]) => {
      const externalXmlCatalogs = externalXmlSettings.xmlCatalogs;
      catalogs.forEach(element => {
        if (!externalXmlCatalogs.includes(element)) {
          externalXmlCatalogs.push(element);
        }
      });
      languageClient.sendNotification(DidChangeConfigurationNotification.type, { settings: getXMLSettings(logfile, externalXmlSettings) });
      onConfigurationChange();
    },
    // remove API set catalogs to internal memory
    removeXMLCatalogs: (catalogs: string[]) => {
      catalogs.forEach(element => {
        const externalXmlCatalogs = externalXmlSettings.xmlCatalogs;
        if (externalXmlCatalogs.includes(element)) {
          const itemIndex = externalXmlCatalogs.indexOf(element);
          externalXmlCatalogs.splice(itemIndex, 1);
        }
      });
      languageClient.sendNotification(DidChangeConfigurationNotification.type, { settings: getXMLSettings(logfile, externalXmlSettings) });
      onConfigurationChange();
    },
    // add API set fileAssociations to internal memory
    addXMLFileAssociations: (fileAssociations: XMLFileAssociation[]) => {
      const externalfileAssociations = externalXmlSettings.xmlFileAssociations;
      fileAssociations.forEach(element => {
        if (!externalfileAssociations.some(fileAssociation => fileAssociation.systemId === element.systemId)) {
          externalfileAssociations.push(element);
        }
      });
      languageClient.sendNotification(DidChangeConfigurationNotification.type, { settings: getXMLSettings(logfile, externalXmlSettings) });
      onConfigurationChange();
    },
    // remove API set fileAssociations to internal memory
    removeXMLFileAssociations: (fileAssociations: XMLFileAssociation[]) => {
      const externalfileAssociations = externalXmlSettings.xmlFileAssociations;
      fileAssociations.forEach(element => {
        const itemIndex = externalfileAssociations.findIndex(fileAssociation => fileAssociation.systemId === element.systemId) //returns -1 if item not found
        if (itemIndex > -1) {
          externalfileAssociations.splice(itemIndex, 1);
        }
      });
      languageClient.sendNotification(DidChangeConfigurationNotification.type, { settings: getXMLSettings(logfile, externalXmlSettings) });
      onConfigurationChange();
    }
  } as XMLExtensionApi;
}
