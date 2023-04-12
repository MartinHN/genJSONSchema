import { kMaxLength } from 'buffer';
import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename, dirname } from 'path';


//xml file from https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ms762271(v=vs.85)

export class XFile {

    constructor(fileIn, originalPath) {
        const options = {
            ignoreAttributes: false,
            parseAttributeValue: true,
            allowBooleanAttributes: true
        };

        // parse
        this.originalPath = resolve(originalPath);
        const xmlFile = readFileSync(fileIn, 'utf8');
        const parser = new XMLParser(options);
        this.json = parser.parse(xmlFile).CastXML;


    }

    printObj(o) {
        const onlyNames = (key, value) => { if (key.startsWith("@") && !(key.startsWith("@_name"))) return undefined; else return value }
        console.log(JSON.stringify(o, onlyNames, 1))
    }

    getFileId(fileName) {
        for (let f of Object.values(this.json.File)) {
            if (f["@_name"].includes(fileName))
                return f["@_id"];
            // for (let a of Object.values(f)) { console.log(a); }
        }
    }

    getContextName(s) {
        const ctxId = s["@_context"];

        if ((ctxId !== undefined) && ctxId != "_1") {
            const TypeNodes = ["Namespace", "Struct"]
            const [pns, type] = this.findId(ctxId, TypeNodes)
            const parentCtx = this.getContextName(pns)
            let res = pns["@_name"]
            if (parentCtx) { res = parentCtx + "::" + res; }
            return res
        }
        return "";
    }

    findId(id, allowedTypes) {
        for (let k of allowedTypes) {
            const res = this.json[k].find(e => e["@_id"] == id)
            if (res !== undefined) return [res, k];
        }
    }


    findTypeFromID(id) {
        const TypeNodes = ["Typedef", "FundamentalType", "Class", "Struct"]
        return this.findId(id, TypeNodes)
    }


    getFieldMetaData(f) {
        const tid = f["@_type"]
        const [to, foundType] = this.findTypeFromID(tid)
        let type = to["@_name"];
        let typeContext = this.getContextName(to);
        if (typeContext) type = typeContext + "::" + type
        // // prepend std:: for classic types
        // for(const stdT of ["vector","map","string"])
        // if(type.startsWith(stdT))
        //     type = type.replace(stdT,"std::"+stdT)
        const cppType = type;
        const meta = {
            name: f["@_name"],
            type,
            init: f["@_init"],
            // entry: f,

        }
        // console.log(foundType, to)
        return meta;
    }

    getMethodMetadata(f) {
        const rtid = f["@_returns"]
        const [to, foundType] = this.findTypeFromID(rtid)
        let returnType = to["@_name"];
        let typeContext = this.getContextName(to);
        if (typeContext) returnType = typeContext + "::" + returnType

        let args = []
        for (const [k, v] of Object.entries(f)) {
            if (!k.startsWith("@"))
                args.push(v)
        }

        const aF = args.map(e => this.getFieldMetaData(e))
        const meta = {
            name: f["@_name"],
            returnType,
            args: aF
            // entry: f,

        }
        // console.log(foundType, to)
        return meta;
    }

    parseFieldOfStruct(structID) {
        let res = []
        if (this.filtered.Field === undefined) return res;
        for (const f of this.filtered.Field.filter(e => e["@_context"] == structID)) {
            const m = this.getFieldMetaData(f);
            res.push(m);

        }
        return res;
    }


    parseMethodsOfStruct(structID) {
        let res = []
        if (this.filtered.Method === undefined) return res;
        for (const f of this.filtered.Method.filter(e => e["@_context"] == structID)) {
            const m = this.getMethodMetadata(f);
            res.push(m);
        }
        return res;
    }

    writeTo(toPath, originalFileName) {
        this.fileId = this.getFileId(originalFileName);

        let filtered = {}
        for (let [k, v] of Object.entries(this.json)) {
            if (k.startsWith("@"))
                continue
            filtered[k] = this.json[k].filter(e => e["@_file"]?.includes(this.fileId));
            if (filtered[k].length == 0)
                delete filtered[k]
        }

        this.filtered = filtered;
        // this.printObj(filtered)

        let jsonOut = { metadata: { originalFile: this.originalPath } }
        let classLike = []
        if (filtered.Struct) classLike = classLike.concat(filtered.Struct)
        if (filtered.Class) classLike = classLike.concat[filtered.Class]
        for (const s of classLike) {
            const sID = s["@_id"];
            let sName = s["@_name"];
            const nameSpace = this.getContextName(s)
            if (nameSpace != "")
                sName = nameSpace + "::" + sName;
            console.log("struct ", sName)
            console.log("members")
            const members = this.parseFieldOfStruct(sID)
            console.log(members);

            console.log("methods")
            const methods = this.parseMethodsOfStruct(sID)
            console.log(methods);

            jsonOut[sName] = {
                members,
                methods,
            }
        }


        // const localStructs = this.json.Struct.filter(e => e["@_file"].includes(this.fileId))
        // console.log(localStructs)


        writeFileSync(toPath, JSON.stringify(jsonOut, null, 2));

    }


};


export function convertToJSON(fromPath, originalPath, toPath) {
    const xf = new XFile(fromPath, originalPath)
    xf.writeTo(toPath, originalPath);
}


