import { kMaxLength } from 'buffer';
import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename, dirname } from 'path';
import { exit } from 'process';


//xml file from https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ms762271(v=vs.85)

export class XFile {

    json: any = {}
    filtered: any = {}
    fileId: string = ''
    constructor(public fileIn: string, public originalPath: string) {
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

    printObj(o: any) {
        const onlyNames = (key: string, value: any) => { if (key.startsWith("@") && !(key.startsWith("@_name"))) return undefined; else return value }
        console.log(JSON.stringify(o, onlyNames, 1))
    }

    getFileId(fileName: string) {
        for (let f of Object.values(this.json.File) as any[]) {
            if (f["@_name"].includes(fileName))
                return f["@_id"];
            // for (let a of Object.values(f)) { console.log(a); }
        }
    }

    getContextName(s: any) {
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

    findId(id: string, allowedTypes: string[]): any {
        for (let k of allowedTypes) {
            let arr = this.json[k]
            // if (!Array.isArray(arr))
            //     arr = [arr];
            // console.log(k, arr)
            const res = arr.find((e: any) => e["@_id"] == id)
            if (res !== undefined) {
                if (res["@_name"] == undefined) { return this.findId(res["@_type"], allowedTypes) }
                return [res, k];
            }
        }
        return [undefined, undefined]
    }


    findTypeFromID(id: string, allowPtr = false) {
        const TypeNodes = ["Typedef", "FundamentalType", "Class", "Struct", "ElaboratedType", "AtomicType"].concat(allowPtr ? ["ReferenceType"
            , "PointerType"] : [])

        return this.findId(id, TypeNodes)
    }


    getFieldMetaData(f: any) {
        const tid = f["@_type"]
        const [to, foundType] = this.findTypeFromID(tid)
        if (to == undefined)
            throw Error("type of member or arg can not be resolved from xml, name is : " + f["@_name"] + " :: " + tid + " :::::" + JSON.stringify(f))
        let type = to["@_name"];
        let typeContext = this.getContextName(to);
        if (typeContext) type = typeContext + "::" + type
        // // prepend std:: for classic types
        // for(const stdT of ["vector","map","string"])
        // if(type.startsWith(stdT))
        //     type = type.replace(stdT,"std::"+stdT)
        if (type == undefined)
            throw Error("type does not have name or ctx : " + JSON.stringify(to))
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

    getMethodMetadata(f: any) {
        const rtid = f["@_returns"]
        const [to, foundType] = this.findTypeFromID(rtid)
        if (to == undefined)
            throw Error("type of return value can not be resolved from xml (" + f["@_name"] + ")")
        let returnType = to["@_name"];
        let typeContext = this.getContextName(to);
        if (typeContext) returnType = typeContext + "::" + returnType

        let args = f["Argument"]
        if (args == undefined)
            args = []
        else if (!Array.isArray(args))
            args = [args];

        const aF = args.map((e: any) => this.getFieldMetaData(e))
        const meta = {
            name: f["@_name"],
            returnType,
            args: aF,
            opts: undefined as (undefined | string[])
            // entry: f,

        }
        const opts = this.getCommentsAtLine(f["@_file"], parseInt(f["@_line"]) - 1)
        if (opts && opts.length)
            meta.opts = opts;
        // console.log(foundType, to)
        return meta;
    }

    getCommentsAtLine(fileId: string, lineN: number) {
        const [fileObj, t] = this.findId(fileId, ["File"]);
        const fileP = fileObj["@_name"]
        const fileL = readFileSync(fileP).toString().split('\n')[lineN]
        const comments = fileL.split("//")[1]
        if (!comments)
            return []
        return comments.split(",").map(e => e.trim())
    }

    parseFieldOfStruct(structID: string) {
        let res: any[] = []
        if (this.filtered.Field === undefined) return res;
        for (const f of this.filtered.Field.filter((e: any) => e["@_context"] == structID)) {
            const m = this.getFieldMetaData(f);
            res.push(m);

        }
        return res;
    }


    parseMethodsOfStruct(structID: string) {
        let res: any[] = []
        if (this.filtered.Method === undefined) return res;
        for (const f of this.filtered.Method.filter((e: any) => e["@_context"] == structID)) {
            const m = this.getMethodMetadata(f);
            res.push(m);
        }
        return res;
    }

    writeTo(toPath: string, originalFileName: string) {
        this.fileId = this.getFileId(originalFileName);

        let filtered: any = {}
        // console.log(this.json, Object.keys(this.json), "<<<<")
        // return
        for (let [k, v] of Object.entries(this.json)) {
            if (k.startsWith("@"))
                continue
            if (k.startsWith("AtomicType"))
                continue

            // console.log(">>>>>>", Object.keys(this.json), k, this.json[k])
            filtered[k] = this.json[k].filter((e: any) => e["@_file"]?.includes(this.fileId));
            if (filtered[k].length == 0)
                delete filtered[k]
        }

        this.filtered = filtered;
        // this.printObj(filtered)

        let jsonOut: any = { metadata: { originalFile: this.originalPath } }
        let classLike: any[] = []
        if (filtered.Struct) classLike = classLike.concat(filtered.Struct)
        if (filtered.Class) classLike = classLike.concat(filtered.Class)
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


export function convertToJSON(fromPath: string, originalPath: string, toPath: string) {
    const xf = new XFile(fromPath, originalPath)
    xf.writeTo(toPath, originalPath);
}


