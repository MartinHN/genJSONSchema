import { spawnSync } from "child_process"


export function genXml(fileIn, genOut) {
    const CXXFLAGS = "-x c++ -std=gnu++17".split(' ')
    // const cmd = `castxml ${CXXFLAGS} ${fileIn} --castxml-output=1 -o ${genOut}`
    const res = spawnSync("castxml", [...CXXFLAGS, fileIn, "--castxml-output=1", "-o", genOut]).output.toString()
    console.log(res);
}


export function genXmls(fileIns, outFolder) {
    const res = [];
    for (const f of fileIns) {
        const genPath = outFolder + "/" + path.basename(f) + ".xml"
        genXml(f, genPath)
        res.push(genPath);
    }
    return res;
}
