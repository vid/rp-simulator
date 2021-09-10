import { IStepper, IExtensionConstructor, TWorld } from '@haibun/core/build/lib/defs';
import { actionNotOK, actionOK } from '@haibun/core/build/lib/util';

const snykApiOk = require('../res/snyk-api-ok.json');

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
    return snykApiOk;
  }
}
const pjson = require('../package.json');
const summary = `SAST Scan via Snyk (v${pjson.version})`;

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
          return actionOK({ evidence: { summary, details: result } });
        }
        return actionNotOK(result.issues.vulnerabilities[0].title, { topics: { issues: { summary, details: result.issues } } });
      },
    },
  };
};

export default SASTScanner;
