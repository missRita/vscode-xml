import { createHash, Hash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ExtensionContext } from "vscode";
import { Executable } from "vscode-languageclient/node";
import { getProxySettings, getProxySettingsAsEnvironmentVariables, ProxySettings } from '../../settings/proxySettings';
import { getXMLConfiguration } from "../../settings/settings";
import { getTrustedHashes } from './binaryHashManager';
import glob = require('glob');

const JAR_ZIP_AND_HASH_REJECTOR = /(?:\.jar)|(?:\.zip)|(?:\.sha256)$/;

export const ABORTED_ERROR: Error = new Error('XML Language Server download cancelled by user');

/**
 * Returns the executable to launch LemMinX (the XML Language Server) as a binary
 *
 * @param context the extension context
 * @throws if the binary doesn't exist and can't be downloaded, or if the binary is not trusted
 * @returns Returns the executable to launch LemMinX (the XML Language Server) as a binary
 */
export async function prepareBinaryExecutable(context: ExtensionContext): Promise<Executable> {
  const binaryArgs: string = getXMLConfiguration().get("server.binary.args");
  
  let binaryExecutable: Executable;
  return getServerBinaryPath()
    .then((binaryPath: string) => {
      binaryExecutable = {
        args: [binaryArgs],
        command: binaryPath,
        options: {
          env: getBinaryEnvironment()
        }
      } as Executable;
      return binaryPath;
    })
    .then(checkBinaryHash)
    .then((hashOk: boolean) => {
      if (hashOk) {
        return binaryExecutable;
      } else {
        throw new Error("The binary XML language server is not trusted");
      }
    });
}

/**
 * Returns the path to the LemMinX binary
 *
 * Downloads it if it is missing
 *
 * @returns The path to the LemMinX binary
 * @throws If the LemMinX binary can't be located or downloaded
 */
async function getServerBinaryPath(): Promise<string> {
  const server_home: string = path.resolve(__dirname, '../server');
  let binaries: Array<string> = glob.sync(`**/${getServerBinaryNameWithoutExtension()}*`, { cwd: server_home });
  binaries = binaries.filter((path) => { return !JAR_ZIP_AND_HASH_REJECTOR.test(path) });
  if (binaries.length) {
    return Promise.resolve(path.resolve(server_home, binaries[0]));
  }
}

/**
 * Returns true if the hash of the binary matches the expected hash and false otherwise
 *
 * @param binaryPath the path to the binary to check
 * @returns true if the hash of the binary matches the expected hash and false otherwise
 */
async function checkBinaryHash(binaryPath: string): Promise<boolean> {
  const hash: Hash = createHash('sha256');
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(binaryPath), (err, fileContents) => {
      if (err) {
        reject(err)
      }
      resolve(fileContents);
    });
  })
    .then((fileContents: string) => {
      hash.update(fileContents);
      const hashDigest: string = hash.digest('hex').toLowerCase();
      let expectedHashPath: string = path.resolve(path.dirname(binaryPath), `${getServerBinaryNameWithoutExtension()}.sha256`);
      if (!fs.existsSync(expectedHashPath)) {
        expectedHashPath = path.resolve(__dirname, `../${getServerBinaryNameWithoutExtension()}.sha256`);
      }
      if (getTrustedHashes().includes(hashDigest)) {
        return true;
      }

      return false;
    })
    .catch((err: any) => {
      return false;
    });
}

/**
 * Returns the environment variables to use to run the server as an object
 *
 * @returns the environment variables to use to run the server as an object
 */
function getBinaryEnvironment(): any {
  const proxySettings: ProxySettings = getProxySettings();
  if (proxySettings) {
    return { ...process.env, ...getProxySettingsAsEnvironmentVariables(proxySettings) };
  }
  return process.env;
}

/**
 * Returns the name of the server binary file for the current OS and architecture
 *
 * @return the name of the server binary file for the current OS and architecture
 */
function getServerBinaryNameWithoutExtension(): string {
  switch (os.platform()) {
    case 'darwin':
      // FIXME: once we support Apple ARM, incorporate the architecture into this string
      return 'lemminx-osx-x86_64';
    default:
      return `lemminx-${os.platform}`;
  }
}
