import { execSync } from "child_process"
import { genXml } from "../genXml.mjs"
import { convertToJSON } from "../parseXml.mjs"

const xmlPath = "gen/RootAPI.xml"
const originalPath = "simple/RootAPI.h"
genXml(originalPath, xmlPath)

convertToJSON(xmlPath, originalPath, "gen/RootAPI.json")
