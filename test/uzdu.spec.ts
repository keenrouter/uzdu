import { 
    expect,
    use,
    should,
} from "chai"; 
//import "chai/register-should";
import chaiAsPromised from "chai-as-promised";
import { Command } from "commander";
import { step } from "mocha-steps";
import { getDirMap, getMakeDirs } from "../src/ssh";

use(chaiAsPromised);
should();


describe.skip("Direct", () => {
    step("... wihtout attachments", () => {
      const program = new Command();
      program
        .exitOverride()
        .command("order-cake")
        .action(() => {});
      let caughtErr: { code: string};
      try {
        program.parse(["node", "udu", "order-cake", "--color"]);
      } catch (err) {
        caughtErr = err as { code: string };
        expect(caughtErr.code).to.equal("commander.unknownOption");
      }
    });
});

describe.skip("CLI", () => {
  step("--help", () => {
    const program = new Command();
    program
      .exitOverride()
      .command("order-cake")
      .action(() => {});
    let caughtErr: { code: string};
    try {
      program.parse(["node", "udu", "order-cake", "--color"]);
    } catch (err) {
      caughtErr = err as { code: string };
      expect(caughtErr.code).to.equal("commander.unknownOption");
    }
  });
});

describe.skip("Utils", () => {
  step("file map", () => {
    const files = [
      "api-server/web.xml","api-server/api/a.js",
      "api-server/apias/b.js", "api-server/opta/u.js",
      "api-server/api/opta/kupta/b.js", "api-server/opta/bivta/us.js",

    ];
    const plainFiles = [
      "/opt/youroute.app/api-server/web.xml","/opt/youroute.app/api-server/a.js",
    ];
    const fileMap = getDirMap(files);
    const dirs = getMakeDirs(fileMap, "/opt/youroute.app/");
    if(dirs) dirs.map((dir) => console.log(dir));
  });
});
