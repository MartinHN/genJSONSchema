import { execSync } from "child_process"
import { genXml } from "../genXml"
import { convertToJSON } from "../parseXml"

const xmlPath = "gen/RootAPI.xml"
const originalPath = "simple/RootAPI.h"
genXml(originalPath, xmlPath)

convertToJSON(xmlPath, originalPath, "gen/RootAPI.json")
