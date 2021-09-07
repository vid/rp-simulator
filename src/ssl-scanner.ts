import { IStepper, IExtensionConstructor, OK, TWorld, TNamed } from '@haibun/core/build/lib/defs';
import { actionNotOK } from '@haibun/core/build/lib/util';

const snykApiNotOk = require('../res/snyk-api-notok.json');

type TScanResult = {
  ok: boolean;
  issues: {
    vulnerabilities: [{ id: string; uri: string; title: string; description: string; from: string; disclosureTime: string; isPatchable: boolean }];
  };
};

abstract class TSSLScanner {
  world: TWorld;
  constructor(world: TWorld) {
    this.world = world;
  }
  abstract scan(): TScanResult;
}

class SSLLabsScanner extends TSSLScanner {
  constructor(world: TWorld) {
    super(world);
  }
  scan() {
    return snykApiNotOk;
  }
}

const SSLScanner: IExtensionConstructor = class SSLScanner implements IStepper {
  world: TWorld;

  scanner: TSSLScanner;

  constructor(world: TWorld) {
    this.world = world;
  }
  getScanner(): TSSLScanner {
    if (this.scanner) {
      return this.scanner;
    }
    const scannerName = this.world.shared.get('SSL scanner');
    if (scannerName === 'Snyk') {
      this.scanner = new SSLLabsScanner(this.world);
    }
    if (!this.scanner) {
      throw Error(`unknown SAST scanner type ${scannerName}`);
    }
    return this.scanner;
  }

  steps = {
    sastScanning: {
      gwta: `SSL scanning passes with the highest rating`,
      action: async () => {
        const scanner = this.getScanner();
        const result = scanner.scan();
        if (result.ok) {
          return OK;
        }
        return actionNotOK(result.issues.vulnerabilities[0].title, result.issues);
      },
    },
  };
};

export default SSLScanner;
