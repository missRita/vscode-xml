import { XMLFileAssociation } from "../api/xmlExtensionApi";

/**
 * Represents vscode-xml settings that other vscode extensions can contribute to
 */
export class ExternalXmlSettings {

  private _xmlCatalogs: string[]
  private _xmlFileAssociations: XMLFileAssociation[]

  constructor() {
    this._xmlCatalogs = [];//["/home/serman/Downloads/Telegram Desktop/schema/v1.3/catalog_dtd.xml"];
    this._xmlFileAssociations = [];
  }

  get xmlCatalogs(): string[] {
    return this._xmlCatalogs;
  }

  get xmlFileAssociations(): any[] {
    return this._xmlFileAssociations;
  }

}