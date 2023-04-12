import { spawnSync } from "child_process"
import * as path from 'path'

export function genXml(fileIn: string, genOut: string) {
    const CXXFLAGS = "-x c++ -std=gnu++17".split(' ')
    // const cmd = `castxml ${CXXFLAGS} ${fileIn} --castxml-output=1 -o ${genOut}`
    const res = spawnSync("castxml", [...CXXFLAGS, fileIn, "--castxml-output=1", "-o", genOut]).output.toString()
    console.log(res);
}


export function genXmls(fileIns: string[], outFolder: string) {
    const res = [];
    for (const f of fileIns) {
        const genPath = outFolder + "/" + path.basename(f) + ".xml"
        genXml(f, genPath)
        res.push(genPath);
    }
    return res;
}
