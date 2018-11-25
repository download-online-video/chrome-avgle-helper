#!/usr/bin/env bash

# Generating a GPG key
#  https://help.github.com/articles/generating-a-new-gpg-key/
#  gpg --full-generate-key
#  gpg --list-secret-keys --keyid-format LONG
#  gpg --export --armor 852C3C5D62302480
GPG_SUBKEY="852C3C5D62302480";
SSH_PUBKEY_END="Z7cXBQ==";
USERNAME="vide0";
EMAIL="vide0-helper@gmx.com";

echo "Script for config git account: vide0";

fatal() { echo "fatal: $1"; exit 1; }
find_gpg_key() { gpg --list-secret-keys --keyid-format LONG | grep -e "rsa4096/$GPG_SUBKEY"; }
find_git_remote() { git remote -v | grep -e "git@github-$USERNAME:"; }
find_ssh_pubkey() { ssh-add -L | grep -e "$SSH_PUBKEY_END"; }


HERE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
pushd "$HERE/.." >/dev/null || fatal "goto project directory failed!";

echo -e "\nEmail: ${EMAIL}";
echo -e "GPG Subkeys: ${GPG_SUBKEY}\n";

echo -e "[.] checking git ...";
[[ -d ".git" ]] || fatal "$(pwd) is not a git project!"
[[ -n "$(find_git_remote)" ]] || fatal "git remote \"github-$USERNAME\" is not existed!";

echo -e "[.] checking SSH ...";
[[ -n "$(find_ssh_pubkey)" ]] || fatal "ssh public key for \"github-$USERNAME\" is not existed in \`ssh-add -L\` !";

echo -e "[.] checking GPG ...";
[[ -n "$(which gpg)" ]] || fatal "gpg is not installed!";
[[ -n "$(find_gpg_key)" ]] || fatal "gpg key \"$GPG_SUBKEY\" is not existed!";

echo -e "\nAll check done, And waiting 2s ...\n";
sleep 2;

set -x;
git config user.name "$USERNAME";
git config user.email "$EMAIL";
git config user.signingkey "$GPG_SUBKEY";
git config commit.gpgsign true;
git config commit.verbose true;
set +x;

echo -e "\n[.] Checking \`git fetch\` ...";
git fetch || fatal "git fetch failed!";

echo -e "\n[+] Config git done!";
