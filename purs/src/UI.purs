module UI where

import Data.Lens
import Data.Lens.Record
import Data.Maybe
import Data.Symbol
import Prelude
import Data.Lens.At

type User =
  { firstName :: String
  , lastName :: String
  , maritalStatus :: MaritalStatus
  }

data MaritalStatus = Single | Married

firstName :: Lens' User String
firstName = prop (SProxy :: SProxy "firstName")

lastName :: Lens' User String
lastName = prop (SProxy :: SProxy "lastName")

maritalStatus :: Lens' User MaritalStatus
maritalStatus = lens _.maritalStatus (\x s -> x { maritalStatus = s })

single :: Iso' MaritalStatus Boolean
single = iso isSingle (\x -> if x then Single else Married)
  where isSingle Single = true
        isSingle Married = false

data VNode = Div (Array VNode) | Text String | Checkbox Boolean

fromDiv :: VNode -> Maybe (Array VNode)
fromDiv (Div ns) = pure ns
fromDiv _ = Nothing

fromText :: VNode -> Maybe String
fromText (Text s) = pure s
fromText _ = Nothing

fromCheckbox :: VNode -> Maybe Boolean
fromCheckbox (Checkbox b) = pure b
fromCheckbox _ = Nothing

div :: Prism' VNode (Array VNode)
div = prism' Div fromDiv

div' :: Iso' VNode (Array VNode)
div' = iso (fromMaybe [] <<< fromDiv) Div

text :: Prism' VNode String
text = prism' Text fromText

checkbox' :: Iso' Boolean VNode
checkbox' = iso Checkbox (fromMaybe false <<< fromCheckbox)

user :: Iso' User User
user = identity

app = user <<< maritalStatus <<< single <<< checkbox'
