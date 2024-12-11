const fs = require("fs");
// Arguments
let inputFile = "./index.js"
let outputFile = "./obfuscated.js"
for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] == "--input" || process.argv[i] == "-i") {
        inputFile = process.argv[i+1]
    }
    if (process.argv[i] == "--output" || process.argv[i] == "-o") {
        outputFile = process.argv[i+1]
    }
}

const program = fs.readFileSync(inputFile).toString();

// Remove comments
const noComment = program.split`\n`.map(line =>
    line.match(/(^.*?)(\/\/|$)/m)[1].trimEnd()
)

// Group up statements onto the same line
let remainingParens = 0;
const groups = [""]
for (const line of noComment) {
    // Count the total parens
    for (const char of line) {
        if ("([{".includes(char)) {
            remainingParens++;
        } else if (")]}".includes(char)) {
            remainingParens--;
        }
    }
    // If parens are unclosed, the statement is continuing to the next line
    groups[groups.length - 1] += line
    if (remainingParens == 0) {
        groups.push("")
    }
}

// Remove white space
const trimmed = groups.map(
    line => [...line].filter(char => char.trim()).join``
).filter(line => line != "")

// Remove debug statements
const noDebug = trimmed.filter(line => !line.includes("Debug"));

// Before replacing everything with identifiers, bring it all to one line
const startOneLiner = "(Expr=bit=>bit(_=>_)(_=>Expr))(False=t=>f=>f)(True=t=>f=>t)"
const eachLine = line => `(False)(${line})`
const returnLine = line => `(True)(${line})`

let oneLiner = startOneLiner;
for (let i = 0; i < noDebug.length - 1; i++) {
    oneLiner += eachLine(noDebug[i])
}
oneLiner += returnLine(noDebug.at(-1))

// Count identifiers
const identifiers = {};
for (const id of oneLiner.matchAll(/[a-zA-Z_][a-zA-Z0-9_]*/mg).map(m => m[0])) {
    identifiers[id] ??= 0
    identifiers[id] += 1
}
let identifierCounts = [];
for (const id in identifiers) {
    identifierCounts.push({identifier: id, count: identifiers[id]})
}
// Sort by most used
identifierCounts.sort((a, b) => b.count - a.count)
// Assign each identifier a unique underscore name
for (let i = 0; i < identifierCounts.length; i++) {
    const id = identifierCounts[i].identifier;
    identifiers[identifierCounts[i].identifier] = new Array(i+1).fill("_").join``
}

const obfuscated = oneLiner.replaceAll(/[a-zA-Z_][a-zA-Z0-9_]*/mg, id => identifiers[id])
fs.writeFileSync(outputFile, obfuscated)