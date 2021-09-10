import { IStepper, IExtensionConstructor, TWorld } from '@haibun/core/build/lib/defs';
import { actionNotOK, actionOK } from '@haibun/core/build/lib/util';

const sslLabsApiOK = require('../res/ssllabs-api-ok.json');

type TScanResult = {
  endpoints: [
    {
      grade: string;
    }
  ];
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
    return sslLabsApiOK;
  }
}

const pjson = require('../package.json');

const summary = `SSL scan via SSLLabs (v${pjson.version})`;

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
    if (scannerName === 'SSLLabs') {
      this.scanner = new SSLLabsScanner(this.world);
    }
    if (!this.scanner) {
      throw Error(`unknown SSL scanner type ${scannerName}`);
    }
    return this.scanner;
  }

  steps = {
    sslScanning: {
      gwta: `SSL scanning passes with the highest rating`,
      action: async () => {
        const scanner = this.getScanner();
        const result = scanner.scan();

        if (result.endpoints[0].grade === 'A+') {
          return actionOK({ evidence: { summary, details: result } });
        }
        return actionNotOK(result.endpoints[0].grade, { topics: { issues: { summary, details: result } } });
      },
    },
  };
};

export default SSLScanner;
