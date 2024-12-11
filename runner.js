const fs = require("fs");
// Arguments
let inputFile = "./input.txt"
let programFile = "./index.js"
for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] == "--input" || process.argv[i] == "-i") {
        inputFile = process.argv[i+1]
    }
    if (process.argv[i] == "--program" || process.argv[i] == "-p") {
        programFile = process.argv[i+1]
    }
}

// Read input string
const input = fs.readFileSync(inputFile).toString();
// Convert input string to bits (Only works with ASCII encoding)
const bits = []
for (const char of input) {
    const code = char.charCodeAt(0);
    for (let i = 0; i < 8; i++) {
        const bit = (code >> i) & 1;
        bits.push(bit);
    }
}
// Iterator over string is returned as a pair, the first elem is a T/F, the second is the next pair.
const True = a=>b=>a;
const False = a=>b=>b;
function iterator(i) {
    const elem = bits[i]
    return cond1 => cond1(i < bits.length ? True : False)(i < bits.length ? 
        cond2 => cond2([False, True][elem])(iterator(i+1))
    : False)
}
// Run the user's program. Its result is interpretred as a function from input string to output string.
const program = fs.readFileSync(programFile).toString();
const lambda = eval?.(program);
console.log("Compiled");
const result = lambda(iterator(0))
console.log("Ran");
// Gather the output.
let output = ""
let iter = result;
let halt = false;
while (true) {
    let code = 0;
    for (let i = 0; i < 8; i++) {
        if (iter(True)(false)(true)) {
            halt = true;
            break;
        }
        const bit = iter(False)(True)(1)(0);
        code += bit << i;
        iter = iter(False)(False);
    }
    if (halt) {
        break;
    }
    output += String.fromCharCode(code);
}

console.log(output);
