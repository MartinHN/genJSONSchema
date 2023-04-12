#! /usr/bin/env node


console.log(process.argv)

function getOpts() {
    const args = process.argv.slice(2);
    const res = {
        inputFiles: [],
        outF: "",

    }
    let fillOutput = false;
    while (true) {
        if (args.length == 0) break;
        let carg = args.shift();
        console.log(carg)
        if (!fillOutput) {
            if (carg == "-i" || carg == "--input") {
                continue;
            }
            else if (carg == "-o" || carg == "--output") {
                fillOutput = true;
                continue;
            }
        }
        if (!fillOutput) {
            res.inputFiles.push(carg)
        }
        else {
            res.outF = carg;
            break;
        }
    }

    return res;
}

const opts = getOpts();

import { genXmls } from "./genXml.mjs"
import { convertToJSON } from "./parseXml.mjs"

console.log(opts)
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));
const xmls = genXmls(opts.inputFiles, tmpDir)

const xmlPath = xmls[0]
const cppFile = opts.inputFiles[0];
// do only one for now
const originalCppFileBaseName = path.basename(xmlPath)
convertToJSON(xmlPath, cppFile, opts.outF + originalCppFileBaseName);

// const xmlPath = "gen/RootAPI.xml"
// const originalPath = "simple/RootAPI.h"
// genXml(originalPath, xmlPath)

