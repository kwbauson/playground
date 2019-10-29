{-
Welcome to a Spago project!
You can edit this file as you like.
-}
{ name =
    "purs"
, dependencies =
    [ "console"
    , "effect"
    , "parsing"
    , "prelude"
    , "profunctor-lenses"
    , "psci-support"
    , "strings"
    ]
, packages =
    ./packages.dhall
, sources =
    [ "src/**/*.purs", "test/**/*.purs" ]
}
