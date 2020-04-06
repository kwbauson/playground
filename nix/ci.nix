{ sources ? import ./sources.nix }:
with import sources.nixpkgs {};
{
  inherit hello neovim;
}
