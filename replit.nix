{pkgs}: {
  deps = [
    pkgs.chromium
    pkgs.mesa
    pkgs.xorg.libXrandr
    pkgs.cairo
    pkgs.pango
    pkgs.libxkbcommon
    pkgs.cups
    pkgs.at-spi2-atk
    pkgs.nspr
    pkgs.nss
    pkgs.glib
    pkgs.zip
    pkgs.postgresql
  ];
}
