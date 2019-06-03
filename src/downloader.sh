#!/usr/bin/env bash

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Video Config >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
if [[ "$CFG_USE_ENV_VARIABLES" != true ]]; then
	CFG_RANDOM_ID='{{ CFG_RANDOM_ID }}';
	CFG_VIDEO_NAME='{{ CFG_VIDEO_NAME }}';
	CFG_M3U8_URL_BASE64='{{ CFG_M3U8_URL_BASE64 }}';
	CFG_DECODE_M3U8='{{ CFG_DECODE_M3U8 }}';
	CFG_PAGE_TYPE='{{ CFG_PAGE_TYPE }}';
	CFG_MAX_CONCURRENT_DL='{{ CFG_MAX_CONCURRENT_DL }}';
fi
# end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Script Config >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
UPDATE_AT="2019-06-03";

# Windows library files located in
WINDOWS_LIBS_DIR="$HOME/bin";

# The idea why add user-agent header is from fork repository by [mywarr](https://github.com/mywarr)
# And the following User-Agent is reference from: (Last Updated: Thu, 30 May 2019 09:33:12 +0000)
# https://techblog.willshouse.com/2012/01/03/most-common-user-agents/
HTTP_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36";

# Add this referer for fix forbidden download action on CDN
HTTP_REFERER="https://avgle.com"
HTTP_REFERER_XVIDEOS="https://www.xvideos.com";
# enable referer header by default, but it will be turn off (false) after download first file failed.
ENABLE_REFERER=true

# wget/aria2c binary file
# it will be a path to a binary file in `windows-libs` directory if this script is running in git bash
WGET_BIN="wget";
ARIA2C_BIN="aria2c";
DOWNLOADER_TYPE="wget"; # or "aria2c"

# ffmpeg binary file
# it will be a path to a binary file in `windows-libs` directory if this script is running in git bash
FFMPEG_BIN="ffmpeg";

ARIA2C_OPT_J=""; # https://aria2.github.io/manual/en/html/aria2c.html#cmdoption-j

# these files are relative to temporary directory
DOWNLOAD_LOG="aria2.log";
SELF_LOG="avgle-downloader.log"
LIST_FILE="concat.list"
TARGET_FILE="../${CFG_VIDEO_NAME}.mp4"

SUPPORTED_PAGE_TYPE=(avgle xvideos);
# end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Utility Functions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
function isColorful() {
	test -t 1 || return 1; # if it is not a terminal
	local CM="$(tput colors)";
	[[ -n "$CM" ]] && [[ "$CM" -ge 8 ]] && return 0;
	return 1;
}
if isColorful; then
	BOLD="\x1b[1m";      DIM="\x1b[2m";           RESET="\x1b[0m";
	RED="\x1b[0;31m";    RED_BOLD="\x1b[1;31m";
	YELLOW="\x1b[0;33m"; YELLOW_BOLD="\x1b[1;33m";
	GREEN="\x1b[0;32m";  GREEN_BOLD="\x1b[1;32m";
	BLUE="\x1b[0;34m";   BLUE_BOLD="\x1b[1;34m";
	GREY="\x1b[37m";     CYAN_BOLD="\x1b[1;36m";
fi

function confirm() {
	local yn;
	while read -p "Confirm (y/n) > " yn; do
		if [[ "$yn" == y* ]] || [[ "$yn" == Y* ]]; then return 0; fi
		if [[ "$yn" == n* ]] || [[ "$yn" == N* ]]; then return 1; fi
	done
}

function title() { echo -e "${BLUE_BOLD}# ${1}${RESET}"; }
function finish() { echo -e "\n${GREEN_BOLD}# Finish!${RESET}\n"; exit 0; }
function userAbort() { echo -e "\n${YELLOW_BOLD}# Abort by user!${RESET}\n"; exit 0; }
function warn() { echo -e "${YELLOW_BOLD}  Warning: ${1} ${RESET}"; }
function success() { echo -e "${GREEN}  Success: ${1} ${RESET}"; }
function error() { echo -e "${RED_BOLD}  Error:   ${RED}$1${RESET}\n"; exit 1; }

# ===========================
# Windows User
WIN_USER=false
UNAME_S="$(uname -s)";
if [[ "$UNAME_S" == MINGW* ]] || [[ "$UNAME_S" == CYGWIN* ]]; then
	WIN_USER=true;
fi

# =============================
# 1. Checking dependencies
# 2. Searching and binding downloader: wget or aria2c

# Find a executable binary file
# Usage:  searchExec <exec_name> [required] [package-name]
searchExecResult=""
function searchExec() {
	searchExecResult="$(which "$1" 2>/dev/null)";
	[[ -n "$searchExecResult" ]] && return 0;

	if [[ $WIN_USER == true ]]; then
		searchExecResult="$(find "$WINDOWS_LIBS_DIR" -type f -iname "$1.exe" | head -n1)";
		if [[ -z "$searchExecResult" ]]; then
			if [[ "$2" == required ]]; then
				FIX_IT="(How to fix this error: read windows-libs/README.md)"
				error "$1 is missng in directory \"windows-libs\". $FIX_IT";
			else
				return 1;
			fi
		fi
		return 0;
	fi

	if [[ "$2" == required ]]; then
		error "\"$1\" is missing! (You can exec \"sudo apt install $3\" to fix it on Ubuntu)";
	else
		return 1;
	fi
}

function resolveDependencies() {
	[[ -z `which gawk` ]] && error "\"gawk\" is missing! (Ubuntu: sudo apt install gawk)";

	searchExec "$FFMPEG_BIN" required && FFMPEG_BIN="$searchExecResult";

	if searchExec "$ARIA2C_BIN" optional; then
		ARIA2C_BIN="$searchExecResult";
		DOWNLOADER_TYPE="aria2c";
		echo -e "${CYAN_BOLD}🚀  aria2 mode is enabled! 🚀${RESET}"

	elif searchExec "$WGET_BIN" required "$WGET_BIN"; then
		WGET_BIN="$searchExecResult";
		DOWNLOADER_TYPE="wget";
	fi
}

function printBanner() {
	#=======================================================
	# Banner color palette: #EF413F #FFB938 #3484EE #21A658
	local C0 C1 C2 C3 C4 C5;
	C0="$RESET"; C1="$RED"; C2="$YELLOW"; C3="$BLUE"; C4="$GREEN"; C5="$GREY"
	if [[ -n "$C0" ]]; then
		if [[ "$COLORTERM" = truecolor ]] || [[ "$COLORTERM" = 24bit ]]; then
			C1="\x1b[38;2;239;65;63m";   C2="\x1b[38;2;255;185;56m";
			C3="\x1b[38;2;52;132;238m";  C4="\x1b[38;2;33;166;88m";
		fi
	fi
	# Print banner
	echo -e '     '$C1'_'$C0'        '$C0'        '$C4'_   '$C1'         '$C0
	echo -e '    '$C1'/ \\'$C2'    __'$C3'  __ _  '$C4'| | '$C1'  ___    '$C0
	echo -e '   '$C1'/ _ \\'$C2'  / /'$C3' / _` | '$C4'| | '$C1' / _ \\  '$C0
	echo -e '  '$C1'/ ___ '$C2'\\/ / '$C3'| (_| | '$C4'| | '$C1'|  __/   '$C0
	echo -e ' '$C1'/_/   '$C2'\\__/  '$C3' \\__, |'$C4' |_|'$C1'  \\___| '$C5
	echo -e '  '$C0'      '$C0'      '$C3'|___/   '$C4'    '$C1'         '$C0
	echo -e ''
	echo -e "${DIM} Updated date: ${UPDATE_AT}${RESET}"
	echo -e ''
}
# end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<



# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Generator Functions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
#
# Generate aria2c download list file by gawk
# Syntax of download list:
#   https://aria2.github.io/manual/en/html/aria2c.html#id2
# Usage:
#   generateDownloadListForAria2FromStdin <<< "link1 link2 link3 ..."
#   generateDownloadListForAria2FromStdin "xxx.m3u8" <<< "link1"
function generateDownloadListForAria2FromStdin() {
	gawk -vout_name="$1" '{
		if (NF==1 && out_name) { # only one column and has output filename
			print $1;
			print "  out=" out_name;
		} else {
			for (i=1;i<=NF;i++) {
				print $i;
				out_name = $i;
				gsub(/^.*\//, "", out_name); # remove prefix of url
				gsub(/\?.*$/, "", out_name); # remove querystring in url
				print "  out=" out_name;
			}
		}
	}'
}
function generateBetterDownloadQueue() {
	local MAX_STEP=50;
	[[ "$DOWNLOADER_TYPE" == aria2c ]] && MAX_STEP=100; # aria2c use multi-threads

	echo -e "$1" | gawk -vMAX_STEP=$MAX_STEP '
	function printRange() {
		if(i!=from) print "{" from ".." i "}";
		else print from;
	}
	function resetTo(num) { from = num; i = num; }
	BEGIN {
		maxTo = MAX_STEP - 1; # max step is 50: 50-1=49
		resetTo(-128);
	}
	!/^\s*$/ { # ignore empty line
		if($1 != i + 1) {
			if(from != -128) printRange();
			resetTo($1);
		} else {
			i = $1;
			if(i - from == maxTo) {
				printRange();
				resetTo(-128);
			}
		}
	}
	END { if(from >= 0) printRange(); }'
}
# end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<



# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Network Functions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
function cleanDownloadLogOnce() {
	[[ -n "$__CLEANED_UP_LOG" ]] && return;
	[[ -f "$DOWNLOAD_LOG" ]] && rm "$DOWNLOAD_LOG";
}
function isLastDownload403() {
	[[ -f "$DOWNLOAD_LOG" ]] && [[ -n "$(grep -e "HTTP/1.1 403 Forbidden" "$DOWNLOAD_LOG")" ]]
}
function isLastDownload410() {
	[[ -f "$DOWNLOAD_LOG" ]] && [[ -n "$(grep -e "HTTP/1.1 410 Gone" "$DOWNLOAD_LOG")" ]]
}
function downloadFailed() {
	local msg="download $1 failed!";
	if [[ -n "$2" ]]; then msg="${msg} $2";
	elif [[ -f "$DOWNLOAD_LOG" ]]; then msg="${msg} (log file: $DOWNLOAD_LOG)"; fi
	error "$msg";
}

function _download() {
	# declare `referer` as a local variable, because it should be reset after
	#    "with_referer" to "no_referer"
	local referer ref1 ref2 out1 out2;
	if [[ "$DOWNLOADER_TYPE" == aria2c ]]; then
		cleanDownloadLogOnce;
		[[ "$1" == with_referer ]] && referer="--referer=$HTTP_REFERER";

		generateDownloadListForAria2FromStdin "$3" <<< "$2" |
			"$ARIA2C_BIN" "$referer" --user-agent="$HTTP_USER_AGENT" \
				--show-files --continue=true --input-file=- "$ARIA2C_OPT_J" \
				--log="$DOWNLOAD_LOG" --log-level=info;
		return $?;
	fi
	# wget
	if [[ "$1" == with_referer ]]; then ref1="--header"; ref2="Referer: $HTTP_REFERER"; fi
	if [[ -n "$3" ]]; then  out1="-O"; out2="$3"; fi
	"$WGET_BIN" "$ref1" "$ref2" --header "User-Agent: $HTTP_USER_AGENT" "$out1" "$out2" $2;
}

# Usage: betterDownloader <description> <urlArray> [targetFile]
# Example:
#   betterDownloader "download m3u8 file" "https://xxx.xx/xx.m3u8" "xxx.m3u8"
#   betterDownloader "download 1..100" "https://xxx.xx/xx-1.ts https://xxx.xx/xx-2.ts ..."
function betterDownloader() {
	local download_ok=true;
	if [[ $ENABLE_REFERER == true ]]; then
		_download with_referer "$2" "$3" || download_ok=false;

		if [[ $download_ok != true ]]; then
			isLastDownload410 && downloadFailed "$1" "Reason: link is expired!";
			if [[ -f "$DOWNLOAD_LOG" ]]; then
				# If download log was generated, but there no traces of 403. then just exit script
				isLastDownload403 || downloadFailed "$1";
			fi
			warn "download with 'Referer' header failed! (trying to download again without 'Referer' header)";
			ENABLE_REFERER=false;
			_download no_referer "$2" "$3" || downloadFailed "$1";
		fi
	else
		_download no_referer "$2" "$3" || downloadFailed "$1";
	fi
}
# end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Arguments Validate Functions >>>>>>>>>>>>>>>>>>>>>>
function isSupportedPageType() {
	local PAGE_TYPE_OK=false;
	for _type in "${SUPPORTED_PAGE_TYPE[@]}"; do
		if [[ $_type == "$CFG_PAGE_TYPE" ]]; then
			PAGE_TYPE_OK=true;
		fi
	done
	[[ "$PAGE_TYPE_OK" == true ]] && return 0 || return 1;
}
# end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Main Function >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

printBanner;
resolveDependencies;

ARIA2C_OPT_J="--max-concurrent-downloads=${CFG_MAX_CONCURRENT_DL}";

[[ -n "$CFG_VIDEO_NAME" ]] || error "option \"CFG_VIDEO_NAME\" is missing!";
[[ -n "$CFG_M3U8_URL_BASE64" ]] || error "option \"CFG_M3U8_URL_BASE64\" is missing!";
isSupportedPageType "$CFG_PAGE_TYPE" || error "invalid type: \"${CFG_PAGE_TYPE}\" ";

echo -e "${GREY}Video name:${DIM} ${CFG_VIDEO_NAME}${RESET}";
echo -e "${GREY}Base64 of m3u8 URL:${DIM} ${CFG_M3U8_URL_BASE64}${RESET}";

printf "${GREY}Extra options:${DIM}";
[[ "$CFG_DECODE_M3U8" == true ]] && printf " decode";
[[ -n "$ARIA2C_OPT_J" ]] && printf " $ARIA2C_OPT_J";
[[ -n "$CFG_PAGE_TYPE" ]] && printf " $CFG_PAGE_TYPE";
printf "${RESET}\n";

# fix HTTP referer
[[ "$CFG_PAGE_TYPE" == xvideos ]] && HTTP_REFERER="$HTTP_REFERER_XVIDEOS";


echo "$CFG_M3U8_URL_BASE64" | base64 --decode >/dev/null || error "input m3u8 url is invalid!";
M3U8_URL=`echo "$CFG_M3U8_URL_BASE64" | base64 --decode`
echo -e "${GREY}Decoded m3u8 URL:${DIM} ${M3U8_URL}${RESET}";

TEMP_WORKSPACE=".tmp-${CFG_PAGE_TYPE}~${CFG_VIDEO_NAME}";
if [[ ! -d "$TEMP_WORKSPACE" ]]; then
	mkdir "$TEMP_WORKSPACE" || error "create temp workspace failed: $TEMP_WORKSPACE";
fi

M3U8_FILE="${CFG_VIDEO_NAME}.m3u8"
if [[ -f "$M3U8_FILE" ]]; then
	# TODO: check CFG_RANDOM_ID in m3u8
	if [[ ! -s "$M3U8_FILE" ]]; then # clean invalid m3u8
		rm "$M3U8_FILE" || error "could not delete invalid m3u8 file";
		warn "deleted invalid m3u8 file \"$M3U8_FILE\"";
	fi
fi

if [[ ! -f "${M3U8_FILE}" ]]; then
	title "downloading m3u8 file ...";

	DOWNLOAD_TARGET_FILE="${M3U8_FILE}";
	[[ "$CFG_DECODE_M3U8" == true ]] && DOWNLOAD_TARGET_FILE="${M3U8_FILE}.base64";

	# save log into temporary workspace
	OLD_DOWNLOAD_LOG="${DOWNLOAD_LOG}";
	DOWNLOAD_LOG="${TEMP_WORKSPACE}/${OLD_DOWNLOAD_LOG}";

	betterDownloader 'm3u8 file' "$M3U8_URL" "$DOWNLOAD_TARGET_FILE";
	success "downloaded m3u8 file to \"$DOWNLOAD_TARGET_FILE\"";

	# restore log location
	DOWNLOAD_LOG="${OLD_DOWNLOAD_LOG}";

	if [[ "$CFG_DECODE_M3U8" == true ]]; then
		title "decoding m3u8 file ...";
		base64 --decode "$DOWNLOAD_TARGET_FILE" > "$M3U8_FILE" ||
			error "content of m3u8 is invalid base64!";
		rm "$DOWNLOAD_TARGET_FILE" || warn "delete temporary file failed: $DOWNLOAD_TARGET_FILE";
		success "decoded to $M3U8_FILE";
	fi
fi

# get total file count:
function getLastVideoFragment() { cat "$M3U8_FILE" | gawk '!/^#/ {print $0}' | tail -n1; }
LAST_FRAGMENT_URL=`getLastVideoFragment`;

if [[ "$CFG_PAGE_TYPE" == xvideos ]]; then
	LAST_FRAGMENT="${LAST_FRAGMENT_URL##*/}"; # get base name of video file
	LAST_FRAGMENT="${LAST_FRAGMENT%%\?*}"; # remove query string
	LAST_FRAGMENT_ID="$(echo "$LAST_FRAGMENT" |
		gawk '{if(match($0,/hls-[0-9]+p([0-9]+)/,r))print r[1];}')"

	FIRST_FRAGMENT_ID=0;

	FILE_NAME_PREFIX="${LAST_FRAGMENT%%p*}p";
	FILE_NAME_SUFFIX=".ts";
	DOWNLOAD_URL_PREFIX="${M3U8_URL%/*}";
	DOWNLOAD_URL_SUFFIX="?${LAST_FRAGMENT_URL##*\?}";
	# echo "$DOWNLOAD_URL_PREFIX" " <...> " "$DOWNLOAD_URL_SUFFIX";

else # avgle
	LAST_FRAGMENT="${LAST_FRAGMENT_URL##*/}"; # get base name of video file
	LAST_FRAGMENT_ID="${LAST_FRAGMENT##seg-}"; # remove prefix of file name
	LAST_FRAGMENT_ID="${LAST_FRAGMENT_ID%%-*}"; # remove suffix

	FIRST_FRAGMENT_ID=1;

	FILE_NAME_PREFIX="seg-";
	FILE_NAME_SUFFIX="-v1-a1.ts";
	DOWNLOAD_URL_PREFIX="${LAST_FRAGMENT_URL%/*}";
fi
echo -e "${GREY}Fragments info:${DIM}\
    LastID(${LAST_FRAGMENT_ID})\
	LastFile(${FILE_NAME_PREFIX}${LAST_FRAGMENT_ID}${FILE_NAME_SUFFIX})\
    LastFragment(${LAST_FRAGMENT})${RESET}";

[[ -z "$LAST_FRAGMENT_ID" ]] && error "could not get last video fragment id from m3u8 file!";


title "downloading missing files ...";
pushd "$TEMP_WORKSPACE" || error "goto temp workspace failed: $TEMP_WORKSPACE";

MISSING_FILE="";
MISSING_FILE_COUNT=0;
for (( i=$FIRST_FRAGMENT_ID ; i<=$LAST_FRAGMENT_ID ; i++ )); do
	DOWNLOAD_TO="${FILE_NAME_PREFIX}${i}${FILE_NAME_SUFFIX}";
	if [[ -e "${DOWNLOAD_TO}" ]]; then
		# there has aria2 continue download mark file
		if [[ ! -e "${DOWNLOAD_TO}.aria2" ]] || [[ "$DOWNLOADER_TYPE" != aria2c ]]; then
			SIZE=$(stat --printf="%s" "${DOWNLOAD_TO}");
			if [[ $SIZE -lt 10240 ]]; then # less than 10k (is broken or download failed)
				rm "${DOWNLOAD_TO}" || error "could not delete broken file \"${DOWNLOAD_TO}\"";
				warn "cleaned broken downloaded file: \"${DOWNLOAD_TO}\"";
			else
				continue;
			fi
		fi
	fi
	MISSING_FILE="${MISSING_FILE}${i}\n";
	MISSING_FILE_COUNT=$((MISSING_FILE_COUNT+1));
	# echo -e "  downloading: ${BOLD}${i}/${LAST_FRAGMENT_ID}${RESET}";
done

if [[ "$MISSING_FILE_COUNT" == "0" ]]; then
	success "all files have been downloaded!";
else
	generateBetterDownloadQueue "$MISSING_FILE" | while read range; do
		P0="${DOWNLOAD_URL_PREFIX}/${FILE_NAME_PREFIX}";
		P1="${FILE_NAME_SUFFIX}${DOWNLOAD_URL_SUFFIX}";
		DOWNLOAD_URL="$(eval "echo $range" |
			gawk -vp0="$P0" -vp1="$P1" '{for(i=1;i<=NF;i++)printf("%s ",p0 $i p1);}')";

		title "downloading ${range}/${LAST_FRAGMENT_ID} ...";
		betterDownloader "\"${FILE_NAME_PREFIX}${range}${FILE_NAME_SUFFIX}\", please try again!" "$DOWNLOAD_URL";
		success "progress ${range}/${LAST_FRAGMENT_ID}";

	done || exit 1;
	success "all files are downloaded!";
fi

FFMPEG_LIST_FILE_CONTENT="";

for (( i=$FIRST_FRAGMENT_ID ; i<=$LAST_FRAGMENT_ID ; i++ )) do
	FNAME="${FILE_NAME_PREFIX}${i}${FILE_NAME_SUFFIX}";
	FFMPEG_LIST_FILE_CONTENT="${FFMPEG_LIST_FILE_CONTENT}file ${FNAME}\n";
done

if [[ -e "$LIST_FILE" ]]; then
	echo -e "\nList file ($LIST_FILE) is existed! Do you want to delete it and continue?";
	confirm || userAbort;
	rm -f $LIST_FILE || error "could not delete ${LIST_FILE}";
fi
echo -e "$FFMPEG_LIST_FILE_CONTENT" > "$LIST_FILE" || error "generate list file failed!";
title "Concat file $LIST_FILE generated"

# ===========================
# Converting .ts file
title "Converting ts file to mp4 files ..."
if [[ -e "$TARGET_FILE" ]]; then
	echo -e "\nTarget file is existed! do you want to delete and continue? ($TARGET_FILE)";
	confirm || userAbort;
	rm -f $TARGET_FILE || error "could not delete ${TARGET_FILE}";
fi

# -f concat can be performed in ffmpeg, reduce disk usage and time
# -c copy is equal to -acodec copy -vcodec copy, we just don't want to re-encode the file
# -bsf: Bitstream Filters  -bsf:a audio stream filter
# aac_adtstoasc: https://ffmpeg.org/ffmpeg-bitstream-filters.html#aac_005fadtstoasc
#   Convert MPEG-2/4 AAC ADTS to an MPEG-4 Audio Specific Configuration bitstream.
#   Reference from repo: https://github.com/mywarr/chrome-avgle-helper
"$FFMPEG_BIN" -f concat -i "${LIST_FILE}" -bsf:a aac_adtstoasc -c copy "${TARGET_FILE}" -loglevel error \
	|| error "ffmpeg convert response exception!"
title "Converted ${LIST_FILE} file to ${TARGET_FILE}";

popd >/dev/null || error "got back to parent directory failed!";

# ===========================
# Deleting files
echo -e "\nDo you want to delete temp directory and m3u8 file ?";
confirm || finish

title "Deleting temp directory ${TEMP_WORKSPACE} ..."
rm -r "${TEMP_WORKSPACE}" || error "delete failed!";

title "Deleting m3u8 file ${M3U8_FILE} ..."
rm "${M3U8_FILE}" || error "delete failed!";
title "All temporary files are deleted!"

finish
