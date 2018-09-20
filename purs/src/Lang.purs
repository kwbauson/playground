module Lang where

import Prelude hiding (between)

import Control.Alt ((<|>))
import Control.Lazy (fix)
import Data.Array (some, (:))
import Data.Either (Either, either)
import Data.Foldable (null, product, sum)
import Data.Maybe (Maybe(..))
import Data.String (trim)
import Data.String.CodeUnits (fromCharArray)
import Data.String.Regex (replace)
import Data.String.Regex.Flags (global, multiline)
import Data.String.Regex.Unsafe (unsafeRegex)
import Data.Tuple (Tuple(..), lookup)
import Partial (crash)
import Partial.Unsafe (unsafePartial)
import Text.Parsing.Parser (ParseError, Parser, runParser)
import Text.Parsing.Parser.Combinators (between)
import Text.Parsing.Parser.Expr (Assoc(..), Operator(..), buildExprParser)
import Text.Parsing.Parser.String (eof, string)
import Text.Parsing.Parser.Token (alphaNum)

data Lang
    = Union Lang Lang
    | Empty
    | Concat Lang Lang
    | Null

    | Word String
    | Quot Lang Lang
    | Bind String Lang
    | Var String

instance langSemiring :: Semiring Lang where
    add Empty x = x
    add x Empty = x
    add x y = Union x y
    zero = Empty

    mul Null x = x
    mul x Null = x
    mul x y = Concat x y
    one = Null

instance showLang :: Show Lang where
    show = case _ of
        Union l r -> show l <> "\n" <> show r
        x -> showInline 0 x

showInline :: Int -> Lang -> String
showInline indent = case _ of
    Empty -> "{}"
    Null -> "()"
    Word i -> i
    Union l r -> par l " | " r
    Concat (Bind i x) (Var i') | i == i' -> i <> "'" <> showInline indent x
    Concat l r -> par l " " r
    Quot (Var "[]") x -> "[" <> showInline indent x <> "]"
    Quot l r -> par l " ~ " r
    Bind i x -> i <> "@" <> showInline indent x
    Var i -> "$" <> i
  where par l s r = "(" <> sep l s r <> ")"
        sep l s r = showInline indent l <> s <> showInline indent r

flatten :: forall s. Semiring s => Array (Array s) -> s
flatten = sum <<< map product

makeRoot :: Lang -> Lang
makeRoot root = Bind "[]" root * Var "[]"

langParser :: Parser String Lang
langParser = fix \p -> langParser' p

langParser' :: Parser String Lang -> Parser String Lang
langParser' expr' = expr where
    expr = buildExprParser table term
    term = parens <|> squares <|> word
    table = [ [ Prefix (string "$" $> Var <<< unsafeFromWord) ]
            , [ Infix (string "@" $> bind) AssocRight
              , Infix (string "'" $> bindVar) AssocRight
              ]
            , [ Infix (string " " $> Concat) AssocRight ]
            , [ Infix (string "~" $> Quot) AssocRight ]
            , [ Infix (string "|" $> Union) AssocRight ]
            , [ Infix (string ":" $> Concat) AssocRight ]
            , [ Infix (string "\n" $> Union) AssocRight ]
            ]
    parens = between (string "(") (string ")") expr'
    squares = between (string "[") (string "]") (expr' <#> Quot (Var "[]"))
    word = (Word <<< fromCharArray) <$> some alphaNum
    bind w l = Bind (unsafeFromWord w) l
    bindVar w l = bind w l * Var (unsafeFromWord w)

unsafeFromWord :: Lang -> String
unsafeFromWord (Word s) = s
unsafeFromWord _ = unsafePartial crash

tryParse :: String -> Either ParseError Lang
tryParse s = runParser (preProcess s) (langParser <* eof)

preProcess :: String -> String
preProcess = replace (unsafeRegex "(\\s)\\s*" $ global <> multiline) "$1"
         >>> replace (unsafeRegex "\\s*([:|~])\\s*" $ global <> multiline) "$1"
         >>> replace (unsafeRegex "([([])\\s*" $ global <> multiline) "$1"
         >>> replace (unsafeRegex "\\s*([)\\]])" $ global <> multiline) "$1"
         >>> trim

parseOrEmpty :: String -> Lang
parseOrEmpty = either (const Empty) identity <<< tryParse

testLangString :: String
testLangString = """
Type Bool
Bool : True | False

Type Nat
Nat : Z | S [Nat]

A@[Type] (
    Type Maybe $A
    Maybe $A : Nothing | Just [$A]

    Type List $A
    List $A : Nil | Cons [$A] [List $A]
)
"""

testLang :: Lang
testLang = makeRoot $ parseOrEmpty testLangString

testEnv :: Env
testEnv = Env [] testLang

step :: Env -> Result
step env@(Env e lang) = case lang of
    Concat (Bind i l) r -> Result $ Env ((Tuple i l) : e) r
    Var i -> case lookup i e of
        Nothing -> Error ("var not found: " <> i) env
        Just l -> Result $ Env e l
    Union _ _ -> Result env
    _ -> Error "not implemented" env

descend :: Lang -> Env -> Result
descend l (Env e l') = step $ Env e (Quot l l')

stepN :: Int -> Env -> Result
stepN 0 e = Result e
stepN i e = case step e of
    Result e' -> stepN (i - 1) e'
    error -> error

data Env = Env (Array (Tuple String Lang)) Lang

instance showEnv :: Show Env where
    show (Env env lang) = if null env
        then show lang
        else show lang
          <> "\n\n"
          <> show (sum (map (\(Tuple i l) -> Bind i l) env))

data Result = Result Env | Error String Env

instance showResult :: Show Result where
    show (Result env) = show env
    show (Error message env) = "Error: " <> message <> "\n\n" <> show env
