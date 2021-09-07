import { IStepper, IExtensionConstructor, OK, TWorld,  } from '@haibun/core/build/lib/defs';
import { actionNotOK } from '@haibun/core/build/lib/util';

const snykApiNotOk = require('../res/snyk-api-notok.json');

type TScanResult = {
  ok: boolean;
  issues: {
    vulnerabilities: [{ id: string; uri: string; title: string; description: string; from: string; disclosureTime: string; isPatchable: boolean }];
  };
};

abstract class TSASTScanner {
  world: TWorld;
  constructor(world: TWorld) {
    this.world = world;
  }
  abstract scan(): TScanResult;
}

class SnykScanner extends TSASTScanner {
  scan() {
    return snykApiNotOk;
  }
}

const SASTScanner: IExtensionConstructor = class SASTSCanner implements IStepper {
  world: TWorld;

  scanner: TSASTScanner;

  constructor(world: TWorld) {
    this.world = world;
  }
  getScanner(): TSASTScanner {
    if (this.scanner) {
      return this.scanner;
    }
    const scannerName = this.world.shared.get('SAST scanner');
    if (scannerName === 'Snyk') {
      this.scanner = new SnykScanner(this.world);
    }
    if (!this.scanner) {
      throw Error(`unknown SAST scanner type ${scannerName}`);
    }
    return this.scanner;
  }

  steps = {
    sastScanning: {
      gwta: `SAST scanning passes`,
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

export default SASTScanner;
