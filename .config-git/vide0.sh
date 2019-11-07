#!/usr/bin/env bash

# Generating a GPG key
#  https://help.github.com/articles/generating-a-new-gpg-key/
#  gpg --full-generate-key
#  gpg --list-secret-keys --keyid-format LONG
#  gpg --export --armor 852C3C5D62302480
#
# Add public key into ssh-agent
#  eval "$(ssh-agent)"
#  ssh-add private-keys
#
GPG_SUBKEY="852C3C5D62302480";
SSH_PUBKEY_END="Z7cXBQ==";
USERNAME="vide0";
EMAIL="vide0-helper@gmx.com";
REPO="git@github-${USERNAME}:download-online-video/chrome-avgle-helper.git";

fatal() { echo -e "Fatal: $1"; exit 1; }
find_gpg_key() { gpg --list-secret-keys --keyid-format LONG | grep -e "rsa4096/$GPG_SUBKEY"; }
find_git_remote() { git remote -v | grep -e "git@github-$USERNAME:"; }
find_ssh_pubkey() { ssh-add -L | grep -e "$SSH_PUBKEY_END"; }


# Script entrypoint (main)
HERE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
pushd "$HERE/.." >/dev/null || fatal "goto project directory failed!";

echo "Script for config git account: vide0";
echo;
echo "Email: ${EMAIL}";
echo "GPG Subkeys: ${GPG_SUBKEY}";
echo;

echo "Checking git ...";
[[ -d ".git" ]] || fatal "$(pwd) is not a git project!"
[[ -n "$(find_git_remote)" ]] ||
	fatal "git remote \"github-$USERNAME\" is not existed!\n  (git remote add origin $REPO)";

echo "Checking SSH ...";
[[ -n "$(find_ssh_pubkey)" ]] || fatal "ssh public key for \"github-$USERNAME\" is not existed in \`ssh-add -L\` !";

echo "Checking GPG ...";
[[ -n "$(which gpg)" ]] || fatal "gpg is not installed!";
[[ -n "$(find_gpg_key)" ]] || fatal "gpg key \"$GPG_SUBKEY\" is not existed!";

echo "All checkpoints are passed. And waiting 2s then configure git for this project ...\n";
sleep 2;

set -x;
git config user.name "$USERNAME";
git config user.email "$EMAIL";
git config user.signingkey "$GPG_SUBKEY";
git config commit.gpgsign true;
git config commit.verbose true;
set +x;

echo;
echo 'Checking `git fetch` ...';
git fetch || fatal "git fetch failed!";

echo;
echo "Success: configured git done!";
