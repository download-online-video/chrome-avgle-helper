#!/usr/bin/env bash

# ==================================================================
# Notes:
#   Please execute this script in any one of following environment:
#     Most Linux Systems / OS X
#     Windows Subsytem for Linux / Git Bash on Windows / Cygwin
# ==================================================================

INSTALL_TO="$1";
SCRIPT_NAME="${BASH_SOURCE[0]}";
THIS_DIR=`cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd`;

function throw() { echo -e "[-] FATAL: $1\nexit with code 1"; exit 1; }

# ===========================
# Is Windows User
uname -s > /dev/null || throw "get system information failed! (uname -s)";
UNAME_S="$(uname -s)";

if [[ "$UNAME_S" == MINGW* ]] || [[ "$UNAME_S" == CYGWIN* ]]; then
	# Windows (Git Bash/Cygwin) User
	echo "=====================================================";
	echo "  Install Script for Windows User (Git Bash/Cygwin)";
	echo "=====================================================";
	RUN_AS_ADMIN="(Have you \"Run as administrator\"?)"
	INSTALL_DEPS="(How to fix this error: read windows-libs/README.md)";

	pushd "$THIS_DIR"> /dev/null;
	echo "[.] checking windows libraries (dependencies) ...";
	echo "[.] ffmpeg.exe";
	[[ -z "$(find windows-libs -type f -name 'ffmpeg.exe')" ]] && throw "ffmpeg.exe is missing! $INSTALL_DEPS";
	echo "[.] wget.exe";
	[[ -z "$(find windows-libs -type f -name 'wget.exe')" ]] && throw "ffmpeg.exe is missing! $INSTALL_DEPS";
	echo "[~] dependencies have been checked!";


	if [[ -z "$INSTALL_TO" ]]; then
		[[ -z "$HOME" ]] && throw "get user home directory from env \$HOME failed!";
		INSTALL_TO="$HOME/bin";
		echo -e "INFO: Files will be installed to the default location: \n";
		echo -e "        $INSTALL_TO\n";

		if [[ ! -e "$INSTALL_TO" ]]; then
			echo "[.] creating install directory ...";
			mkdir -p "$INSTALL_TO" || throw "create directory failed! $RUN_AS_ADMIN";
		else
			[[ -w "$INSTALL_TO" ]] || throw "directory is not writable! $RUN_AS_ADMIN";
		fi
	else
		echo "INFO: install into: $INSTALL_TO\n";

		[[ -d "$INSTALL_TO" ]] || throw "$INSTALL_TO is not a directory!";
		[[ -w "$INSTALL_TO" ]] || throw "$INSTALL_TO is not writable! $RUN_AS_ADMIN";
	fi

	echo '[.] copying `windows-libs` ...';
	cp -r windows-libs "$INSTALL_TO/" || throw 'Copy `windows-libs` failed!';
	echo '[~] copied `windows-libs`';

else # Linux/WSL/OS X User
	if [[ -z "$INSTALL_TO" ]]; then
		echo;
		echo "Usage: $SCRIPT_NAME \${install_to}";
		echo;
		echo '  Install `Avgle` and `AvgleDownloader to special directory`';
		echo "  For example: $SCRIPT_NAME ~/bin";
		echo;
		exit 0;
	fi

	[[ -d "$INSTALL_TO" ]] || throw "$INSTALL_TO is not a directory!";
	[[ -w "$INSTALL_TO" ]] || throw "$INSTALL_TO is not writable!";
fi

pushd "$THIS_DIR" > /dev/null;

echo '[.] copying `Avgle` ...';
cp Avgle "$INSTALL_TO/" || throw 'Copy `Avgle` failed!';
echo '[~] copied `Avgle`';

echo '[.] copying `AvgleDownloader` ...';
cp AvgleDownloader "$INSTALL_TO/" || throw 'Copy `AvgleDownloader` failed!';
echo '[~] copied `AvgleDownloader`';

echo "[+] success: installed to $INSTALL_TO";
