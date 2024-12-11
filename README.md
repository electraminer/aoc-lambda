This repo is my solution to Advent of Code problems using only 5 characters: `_=>()`

runner.js will run the code, passing in input data and returning output data - the code itself just returns a lambda function which will parse a Church-style encoding of individual bits. 
Command line arguments: --input / -i for the input data, --program / -p for the program file

obfuscator.js will convert the actually readable code (contains comments, debug statements, and identifier names) into the 5-character version, mainly by replacing all identifiers with underscores.
Command line arguments: --input / -i for the input program, --output / -o for the output program

The actual way this works is using lambda calculus and functional programming techniques - building every data structure from the ground up from lambda functions.
