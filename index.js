// A useful tool for binding variables.
// I => (I => O) => O
Let = val => func => func(val)

// Bits - boolean value used for logic, individual bits of information, or choices.
// Internal representation: Bit = T => F => T | F
// Bit
True = ifTrue => ifFalse => ifTrue
// Bit
False = ifTrue => ifFalse => ifFalse
// Bit => Defer<T> => Defer<F> => T | F
Bit_If = bit => ifFactory => elseFactory => bit(ifFactory)(elseFactory)()
// Bit => Bit
Bit_Not = bit => bit(False)(True)
// Bit => Bit => Bit
Bit_And = a => b => a(b)(False)
// Bit => Bit => Bit
Bit_Or = a => b => a(True)(b)
// Bit => Bit => Bit
Bit_Xor = a => b => a(Bit_Not(b))(b)
// Bit => string
Bit_Debug = bit => bit("true")("false")

// Tuples - pairs of two elements
// Internal represntation: Tup<A, B> = Bit => A | B
// A => B => Tup<A, B>
Tup = first => second => bit => Bit_If(bit)(()=>first)(()=>second)
// Tup<A, _> => A
Tup_First = tup => tup(True)
// Tup<_, B> => B
Tup_Second = tup => tup(False)
// Tup<A, B> => Bit => A | B
Tup_Select = tup => bit => tup(bit)
// Tup<A, B> => (A => B => O) => O
Tup_Let = tup => func => func(Tup_First(tup))(Tup_Second(tup))
// (A => string) => (B => string) => Tup<A, B> => string
Tup_Debug = dbgFirst => dbgSecond => tup => "(" + dbgFirst(Tup_First(tup)) + ", " + dbgSecond(Tup_Second(tup)) + ")"

// Options - optional values which might be replaced by an error value of another type
// Internal representation: Tup<Bit, T | E>
// T => Opt<T, _>
Some = value => Tup(True)(value)
// E => Opt<_, E>
Err = err => Tup(False)(err)
// Opt<_, ()>
None = Tup(False)(False)
// Opt<_, _> => Bit
Opt_IsSome = opt => Tup_First(opt)
// Opt<_, _> => Bit
Opt_IsErr = opt => Bit_Not(Opt_IsSome(opt))
// Opt<T, E> => T | E
Opt_Unchecked = opt => Tup_Second(opt)
// Opt<T, E> => (E => T) => T
Opt_OrElse = opt => onErr => Bit_If(Opt_IsSome(opt))(
    ()=>Opt_Unchecked(opt)
)(
    ()=>onErr(Opt_Unchecked(opt))
)
// Opt<T, E> => (T => O) => (E => O) => O
Opt_Match = opt => onSome => onErr => Bit_If(Opt_IsSome(opt))(
    ()=>onSome(Opt_Unchecked(opt))
)(
    ()=>onErr(Opt_Unchecked(opt))
)
// (T => string) => (E => string) => Opt<T, E> => string
Opt_Debug = dbgSome => dbgErr => opt => Opt_Match(opt)(t=>`Some(${dbgSome(t)})`)(e=>`Err(${dbgErr(e)})`)

// Lists - lists of any number of values that can also contain a tail.
// Internal representation: Opt<Tup<T, Lst<T, L>>, L>
// Lst<_, ()>
Empty = None
// L => Lst<_, L>
Tail = tail => Err(tail)
// T => Lst<T, L> => Lst<T, L>
List = first => rest => Some(Tup(first)(rest))
// Lst<_, _> => Bit
Lst_IsEmpty = Opt_IsErr
// Lst<T, L> => (O => T => O) => O => Int => Tup<O, Lst<T, L>>
Lst_LeftReduceN = list => reduce => start => count => Opt_Match(count)(
    tup => Tup_Let(tup)(bit => shifted =>
        Tup_Let(
            Bit_If(bit)(
                ()=>Opt_Match(list)(
                    tup => Tup_Let(tup)(first => rest => 
                        Tup(reduce(start)(first))(rest)
                    )
                )(
                    tail => Tup(start)(list)
                )
            )(
                ()=>Tup(start)(list)
            )
        )(start => list =>
            Tup_Let(
                Lst_LeftReduceN(list)(reduce)(start)(shifted)
            )(start => list =>
                Lst_LeftReduceN(list)(reduce)(start)(shifted)
            )
        )
    )
)(
    sign => Tup(start)(list)
)
// Lst<T, L> => (O => T => O) => (O => L => O) => O => Int => O
Lst_LeftReduceI = list => reduce => reduceTail => start => count =>Tup_Let(
        Lst_LeftReduceN(list)(reduce)(start)(count)
)(start => list =>
    Opt_Match(list)(
        tup => Lst_LeftReduceI(list)(reduce)(reduceTail)(start)(List(False)(count))
    )(
        tail => reduceTail(start)(tail)
    )
)
// Lst<T, L> => (O => T => O) => (O => L => O) => O => O
Lst_LeftReduce = list => reduce => reduceTail => start => Lst_LeftReduceI(list)(reduce)(reduceTail)(start)(One)
// Lst<T, L> => T
Lst_Tail = list => Lst_LeftReduce(list)(
    total => elem => total
)(
    total => tail => tail
)(
    None
)
// Lst<T, L> => N => Tup<L, Lst<T, N>>
Lst_Reverse = list => newTail => Lst_LeftReduce(list)(
    total => elem => List(elem)(total)
)(
    total => tail => Tup(tail)(total)
)(
    Tail(newTail)
)
// Lst<T, L> => (T => O => O) => (L => O) => O
Lst_RightReduce = list => reduce => mapTail => Tup_Let(
    Lst_Reverse(list)(None)
)(tail => reversed =>
    Lst_LeftReduce(reversed)(
        total => elem => reduce(elem)(total)
    )(
        total => tail => total
    )(
        mapTail(tail)
    )
)
// Lst<T, L> => (T => O) => Lst<O, L>
Lst_Map = list => map => Lst_RightReduce(list)(
    elem => total => List(map(elem))(total)
)(
    tail => Tail(tail)
)
// Lst<T, L> => (L => O) => Lst<T, O>
Lst_MapTail = list => mapTail => Lst_RightReduce(list)(
    elem => total => List(elem)(total)
)(
    tail => Tail(mapTail(tail))
)
// Lst<T, L> => (T => Bit) => Lst<T, L>
Lst_Filter = list => filter => Lst_RightReduce(list)(
    elem => total => Bit_If(filter(elem))(
        ()=>List(elem)(total)
    )(
        ()=>total
    )
)(
    tail => Tail(tail)
)
// Lst<T, L> => (T => Bit) => Int
Lst_Count = list => filter => Lst_RightReduce(list)(
    elem => total => Bit_If(filter(elem))(
        ()=>Int_Increment(total)
    )(
        ()=>total
    )
)(
    tail => Zero
)
// Lst<Lst<T, _>, L>  => Lst<T, L>
Lst_Flatten = list => Lst_RightReduce(list)(
    elem => total => Lst_RightReduce(elem)(
        elem => total => List(elem)(total)
    )(
        tail => total
    )
)(
    tail => Tail(tail)
)
// Lst<T, _> => Lst<T, L> => Lst<T, L>
Lst_Concat = left => right => Lst_RightReduce(left)(
    elem => total => List(elem)(total)
)(
    tail => right
)
// Lst<T, L> => Int => Lst<T, L>
Lst_PadRight = list => count => fill => Lst_Concat(list)(
    Lst_MapTail(
        Lst_Map(
            Int_Range(Lst_Len(list))(count)
        )(_ => fill)
    )(_ => Lst_Tail(list))
)
// Lst<T, L> => Int => Lst<T, L>
Lst_PadRightExact = list => count => fill => Tup_First(
    Opt_Unchecked(Lst_Take(
        Lst_PadRight(list)(count)(fill)
    )(count))
)
// Lst<_, _> => Int
Lst_Len = list => Lst_RightReduce(list)(
    elem => total => Int_Increment(total)
)(
    tail => Zero
)
// Lst<T, L> => Int => Opt<Tup<Lst<T, L>, Lst<T, L>>, Lst<T, L>>
Lst_Take = list => count => Tup_Let(Lst_LeftReduceN(list)(
    total => elem => List(elem)(total)
)(Empty)(count))(rev => rest =>
    Bit_If(Int_Equals(count)(Lst_Len(rev)))(
        ()=>Some(Tup(Tup_Second(Lst_Reverse(rev)(False)))(rest))
    )(
        ()=>list
    )
)
// Lst<T, L> => Int => Opt<T, L>
Lst_Index = list => index => Opt_Match(Lst_Take(list)(index))(
    result => Opt_Match(Tup_Second(result))(
        tup => Some(Tup_First(tup))
    )(
        err => None
    )
)(
    err => None
)

// Lst<T, L> => Int => T
Lst_IndexUnchecked = list => index => Tup_First(Opt_Unchecked( // take first elem from rest
    Tup_Second( // get rest
        Opt_Unchecked(Lst_Take(list)(index)) // take first N from list
    )
))


// Lst<T, L> => Num => Lst<Lst<T, ()>, Lst<T, L>>
Lst_Chunks = list => count => Let(Lst_Take(list)(count))(result =>
    bit => Bit_If(bit)(
        ()=>Opt_IsSome(result)
    )(
        ()=>Opt_Match(result)(
            tup => Tup_Let(tup)(taken => rest =>
                Tup(taken)(Lst_Chunks(rest)(count))
            )
        )(
            rest => rest
        )
    )
)

// Lst<T, L> => (T => T => Bit) => Lst<T, L>
Lst_InsertionSort = list => cmp => Lst_RightReduce(list)(
    elem => total => Lst_RightReduce(total)(
        e => t => Bit_If(cmp(e)(elem))(
            ()=>List(elem)(List(e)(Tup_Second(Opt_Unchecked(t))))
        )(
            ()=>List(e)(t)
        )
    )(
        tail => List(elem)(Tail(tail))
    )
)(
    tail => Tail(tail)
)
// Lst<A, L> => Lst<B, M> => Lst<Tup<A, B>, Tup<L, M>>
Lst_ZipUnchecked = a => b => Opt_Match(a)(
    tup => Tup_Let(tup)(aFirst => aRest =>
        Tup_Let(Opt_Unchecked(b))(bFirst => bRest =>
            List(Tup(aFirst)(bFirst))(Lst_ZipUnchecked(aRest)(bRest))
        )
    )
)(
    aTail => Tail(Tup(aTail)(Opt_Unchecked(b)))
)
// Lst<A, L> => Lst<B, M> => Opt<Lst<Tup<A, B>, Tup<L, M>>>
Lst_Zip = a => b => Bit_If(Int_Equals(Lst_Len(a))(Lst_Len(b)))(
    ()=>Some(Lst_ZipUnchecked(a)(b))
)(
    ()=>None
)

// (T => string) => (L => string) => Lst<T, L> => string
Lst_Debug_Helper = dbgElem => dbgTail => lst => Opt_Match(lst)(
    tup=>Tup_Let(tup)(first => rest => (
        dbgElem(first) + ", " + Lst_Debug_Helper(dbgElem)(dbgTail)(rest)
    ))
)(
    tail=>"tail="+dbgTail(tail)
)
Lst_Debug = dbgElem => dbgTail => lst => "["+Lst_Debug_Helper(dbgElem)(dbgTail)(lst)+"]"

// Integers - can be positive or negative and any size, using binary.
// First element is the LSB (1s place). Tail is the sign / infinite extension (representing 2scomp sign)
// Internal representation: Lst<Bit, Bit>
// Int
Zero = Tail(False)
// Int
One = List(True)(Tail(False))
Two = List(False)(List(True)(Tail(False)))
Three = List(True)(List(True)(Tail(False)))
Four = List(False)(List(False)(List(True)(Tail(False))))
Five = List(True)(List(False)(List(True)(Tail(False))))
Six = List(False)(List(True)(List(True)(Tail(False))))
Seven = List(True)(List(True)(List(True)(Tail(False))))
Eight = List(False)(List(False)(List(False)(List(True)(Tail(False)))))
Nine = List(True)(List(False)(List(False)(List(True)(Tail(False)))))
Ten = List(False)(List(True)(List(False)(List(True)(Tail(False)))))
// Int => Tup(Bit, Int)
Int_Pad = int => Opt_OrElse(int)(sign=>Tup(sign)(Tail(sign)))
// Int => Int
Int_Increment = a => Opt_Match(a)(
    aa => Tup_Let(aa)(first => rest =>
        Bit_If(first)(
            ()=>List(False)(Int_Increment(rest))
        )(
            ()=>List(True)(rest)
        )
    )
)(
    sign => List(Bit_Not(sign))(Tail(False))
)
// Int => Int
Int_Decrement = a => Opt_Match(a)(
    aa => Tup_Let(aa)(first => rest => 
        Bit_If(first)(
            ()=>List(False)(rest)
        )(
            ()=>List(True)(Int_Decrement(rest))
        )
    )
)(
    sign => List(Bit_Not(sign))(Tail(True))
)
// Int => Int
Int_Not = a => Opt_Match(a)(
    aa => Tup_Let(aa)(first => rest =>List(Bit_Not(first))(Int_Not(rest)))
)(
    sign => Tail(Bit_Not(sign))
)
// Int => Int
Int_Negate = a => Int_Increment(Int_Not(a))
// Int => Bit
Int_IsNonzero = a => Opt_Match(a)(tup=>
    Tup_Let(tup)(first => rest =>
        Bit_Or(first)(Int_IsNonzero(rest))
    )
)(
    tail => tail
)
// Int => Bit
Int_IsZero = a => Bit_Not(Int_IsNonzero(a))
// Int => Bit
Int_IsNegative = a => Opt_Match(a)(tup=>
    Tup_Let(tup)(first => rest =>
        Int_IsNegative(rest)
    )
)(
    tail => tail
)
// Int => Int => Bit
Int_Equals = a => b => Int_IsZero(Int_Sub(a)(b))
// Int => Int => Bit
Int_NotEq = a => b => Bit_Not(Int_Equals(a)(b))
// Int => Int => Bit
Int_Less = a => b => Int_IsNegative(Int_Sub(a)(b))
// Int => Int => Bit
Int_Greater = a => b => Int_Less(b)(a)
// Int => Int => Bit
Int_LessEq = a => b => Bit_Not(Int_Greater(a)(b))
// Int => Int => Bit
Int_GreaterEq = a => b => Bit_Not(Int_Less(a)(b))
// Int => Int
Int_Abs = a => Bit_If(Int_IsNegative(a))(
    ()=>Int_Negate(a)
)(
    ()=>a
)
// Bit => Int => Int => Int
Int_AddCarry = carry => a => b => Opt_Match(a)(
    aa => Tup_Let(aa)(aFirst => aRest =>
        Tup_Let(Int_Pad(b))(bFirst => bRest =>
            Let(Bit_Xor(carry)(Bit_Xor(aFirst)(bFirst)))(bit =>
                Let(Bit_Or(Bit_And(aFirst)(bFirst))(Bit_And(carry)(Bit_Or(aFirst)(bFirst))))(carryRest =>
                    List(bit)(Int_AddCarry(carryRest)(aRest)(bRest))
                )
            )
        )
    )
)(
    sign=>Let(
        Bit_If(sign)(
            ()=>Int_Decrement(b)
        )(
            ()=>b
        )
    )(nocarry=>
        Bit_If(carry)(
            ()=>Int_Increment(nocarry)
        )(
            ()=>nocarry
        ) 
    )
)
// Int => Int => Int
Int_Add = a => b => Int_AddCarry(False)(a)(b)
// Int => Int => Int
Int_Sub = a => b => Int_AddCarry(True)(a)(Int_Not(b))
// Int => Int => Int
Int_Mul = a => b => Lst_RightReduce(a)(
    // We need to find (elem+2*rest)*b and we have total=rest*b. So we just need to do elem*b + 2*total.
    elem => total => Int_Add(
        // Multiply by a bit is either 1*b or 0*b
        Bit_If(elem)(
            ()=>b
        )(
            ()=>Zero
        )
    )(
        // Double by appending a zero
        List(False)(total)
    )
)(
    // If the tail is present, -1*b (negation) otherwise 0*b (zero)
    tail => Bit_If(tail)(
        ()=>Int_Negate(a)
    )(
        ()=>Zero
    )
)
// Int => Int => Tup<Int, Int>
Int_DivPos = a => b => Lst_RightReduce(a)(
    bit => total => Tup_Let(total)(quotient => remainder =>
        Let(List(bit)(remainder))(remainder => // Shift new bit into remainder
            Bit_If(Int_GreaterEq(remainder)(b))( // Check if the dividend can be taken out
                ()=>Tup(List(True)(quotient))(Int_Sub(remainder)(b)) // Take the dividend out
            )(
                ()=>Tup(List(False)(quotient))(remainder) // Leave the remainder to grow
            )
        )
    )
)(
    tail => Tup(Zero)(Zero)
)
// Int => Int => Tup<Int, Int>
Int_Div = a => b => Tup_Let(Int_DivPos(Int_Abs(a))(Int_Abs(b)))(quotient => remainder =>
    Tup(
        Bit_If(Bit_Xor(Int_IsNegative(a))(Int_IsNegative(b)))( // 2 negs make a pos
            () => Int_Negate(quotient)
        )(
            () => quotient
        )
    )(
        Bit_If(Int_IsNegative(a))( // remainder based on a
            () => Int_Negate(remainder)
        )(
            () => remainder
        )
    )
)
// Int => Int => Int
Int_Quotient = a => b => Tup_First(Int_Div(a)(b))
// Int => Int => Int
Int_Remainder = a => b => Tup_Second(Int_Div(a)(b))
// Int => Str
Int_ToStringHelper = int => Bit_If(Int_IsZero(int))(
    ()=>Empty
)(
    ()=>Tup_Let(Int_DivPos(int)(Ten))(quotient => remainder => 
        List(
            Int_Add(Int_Add(Int_Mul(Four)(Ten))(Eight))(remainder)
        )(Int_ToStringHelper(quotient))
    )
)
// Int => Str
Int_ToString = int => Bit_If(Int_IsZero(int))(
    ()=>List(
        Int_Add(Int_Mul(Four)(Ten))(Eight)
    )(Empty)
)(
    ()=>Bit_If(Int_IsNegative(int))(
        ()=>List(
            Int_Add(Int_Mul(Four)(Ten))(Five)
        )(
            Tup_Second(Lst_Reverse(
                Int_ToStringHelper(Int_Negate(int))
            )(False))
        )
    )(

        ()=>Tup_Second(Lst_Reverse(
            Int_ToStringHelper(int)
        )(False))
    )
)
// Int => Lst<Int, Int>
Int_Range = start => end => bit => Bit_If(bit)(
    ()=>Int_Less(start)(end)
)(
    ()=>Bit_If(Int_Less(start)(end))(
        ()=>Tup(start)(Int_Range(Int_Increment(start))(end))
    )(
        ()=>end
    )
)
// Int => number
Int_Debug = int => Opt_Match(int)(aa =>
    Tup_Let(aa)(first => rest =>
        Bit_If(first)(
            ()=>1
        )(
            ()=>0
        ) + 2 * Int_Debug(rest)
    )
)(
    sign => Bit_If(sign)(
        ()=>-1
    )(
        ()=>0
    )
)

// Strings - lists of characters.
// Internal representation: Lst<Int, ()> (where each integer is an ASCII character code)
// Lst<Bit, ()> => Str
Str_FromBits = bits => Lst_Chunks(bits)(Eight)
// Str => Lst<Bit, ()>
Str_ToBits = str => Lst_Flatten(Lst_Map(str)(char =>
    // Pad each character out to 8 bits
    Lst_PadRightExact(char)(Eight)(False)
))
// Str => Bit
Str_IsEmpty = Lst_IsEmpty
// Str => Int => Lst<Str, ()>
Str_Split = str => splitChar => Lst_RightReduce(str)(
    char => total => Bit_If(Int_Equals(splitChar)(char))(
        ()=>List(Empty)(total)
    )(
        // We know we can assume the list has a first element as it starts with one.
        ()=>Tup_Let(Opt_Unchecked(total))(
            first => rest => List(List(char)(first))(rest)
        )
    )
)(
    tail => List(Empty)(Empty)
)
// Str => Opt<Int, ()>
Str_ToInteger = str => Lst_LeftReduce(str)(
    total => elem => Opt_Match(total)(
        total => Let(Int_Sub(elem)(Int_Add(Int_Mul(Four)(Ten))(Eight)))(
            digit => Bit_If(Int_IsNegative(digit))(
                ()=>None
            )(
                ()=>Bit_If(Int_GreaterEq(digit)(Ten))(
                    ()=>None
                )(
                    ()=>Some(Int_Add(Int_Mul(total)(Ten))(digit))
                )
            )
        )
    )(
        _ => None
    )
)(
    total => tail => total   
)(
    Some(Zero)
)
Str_ToIntegerUnchecked = str => Opt_Unchecked(Str_ToInteger(str))
// Int
Newline = Ten
// Int
Space = Int_Add(Int_Mul(Three)(Ten))(Two)
// Str => string
Str_Debug = str => "\"" + Lst_RightReduce(str)(char => total => String.fromCharCode(Int_Debug(char)) + total)(tail => "\"")

// Bit => T => Expr | T
Expr = bit => Bit_If(bit)(
    ()=>ret=>ret
)(
    ()=>_=>Expr
)

bits => Expr(False)(
)(False)(string = Str_FromBits(bits)
)(False)(split = Str_Split(string)(Newline)
)(False)(trim = Lst_Filter(split)(str => Bit_Not(Str_IsEmpty(str)))
)(False)(trimSpace = Lst_Map(trim)(s => Str_Split(s)(Space))
)(False)(first = Lst_Map(trimSpace)(l => Lst_IndexUnchecked(l)(Zero))
)(False)(second = Lst_Map(trimSpace)(l => Lst_IndexUnchecked(l)(Three))
)(False)(firstInts = Lst_Map(first)(s => Str_ToIntegerUnchecked(s))
)(False)(secondInts = Lst_Map(second)(s => Str_ToIntegerUnchecked(s))
)(False)(firstSorted = Lst_InsertionSort(firstInts)(Int_Greater)
)(False)(secondSorted = Lst_InsertionSort(secondInts)(Int_Greater)
)(False)(zip = Lst_ZipUnchecked(firstSorted)(secondSorted)
)(False)(diff = Lst_Map(zip)(tup => Tup_Let(tup)(a => b => Int_Abs(Int_Sub(a)(b))))
)(False)(part1 = Lst_RightReduce(diff)(e => t => Int_Add(e)(t))(tail => Zero)
)(False)(duplicates = Lst_Map(firstInts)(i => Int_Mul(i)(Lst_Count(secondInts)(j => Int_Equals(i)(j))))
)(False)(part2 = Lst_RightReduce(duplicates)(e => t => Int_Add(e)(t))(tail => Zero)
)(False)(outString = Lst_Concat(Int_ToString(part1))(List(Newline)(Int_ToString(part2)))
)(True)(Str_ToBits(outString))