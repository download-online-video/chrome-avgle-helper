#!/usr/bin/env bash


UPDATE_AT="2019-12-30";

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Video Config >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
if [[ "$CFG_USE_ENV_VARIABLES" != true ]]; then
	CFG_RANDOM_ID='{{ CFG_RANDOM_ID }}';
	CFG_VIDEO_NAME='{{ CFG_VIDEO_NAME }}';
	CFG_PAGE_TYPE='{{ CFG_PAGE_TYPE }}';
	CFG_MAX_CONCURRENT_DL='{{ CFG_MAX_CONCURRENT_DL }}';
	CFG_USER_AGENT='{{ CFG_USER_AGENT }}';
	CFG_REFERENCE='{{ CFG_REFERENCE }}';
	CFG_PROXY='{{ CFG_PROXY }}';
	CFG_DELETE_TMP_FILES='{{ CFG_DELETE_TMP_FILES }}';
	CFG_DELETE_DOWNLOADER='{{ CFG_DELETE_DOWNLOADER }}';
	CFG_SEGMENTS='{{ CFG_SEGMENTS }}';
	CFG_SEGMENT_COUNT='{{ CFG_SEGMENT_COUNT }}'
fi

# Default config
DEFAULT_CFG_MAX_CONCURRENT_DL="5";
# The idea why add user-agent header is from fork repository by [mywarr](https://github.com/mywarr)
# And the following User-Agent is reference from: (Last Updated: Thu, 30 May 2019 09:33:12 +0000)
# https://techblog.willshouse.com/2012/01/03/most-common-user-agents/
DEFAULT_CFG_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36";

# Use default values if variables are unset
[[ -n "$CFG_MAX_CONCURRENT_DL" ]] || CFG_MAX_CONCURRENT_DL="$DEFAULT_CFG_MAX_CONCURRENT_DL";
[[ -n "$CFG_USER_AGENT" ]] || CFG_USER_AGENT="$DEFAULT_CFG_USER_AGENT";
[[ -n "$CFG_DELETE_TMP_FILES" ]] || CFG_DELETE_TMP_FILES=yes;
[[ -n "$CFG_DELETE_DOWNLOADER" ]] || CFG_DELETE_DOWNLOADER=ask;

# validate variables
function validateVariables() {
	[[ -n "$CFG_SEGMENTS" ]] || fatal "variable \"CFG_SEGMENTS\" is missing!";
	[[ -n "$CFG_VIDEO_NAME" ]] || fatal "variable \"CFG_VIDEO_NAME\" is missing!";

	isSupportedPageType "$CFG_PAGE_TYPE" || fatal "invalid type: \"${CFG_PAGE_TYPE}\" ";
}

# end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Script Config >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# Windows library files located in
WINDOWS_LIBS_DIR="$HOME/bin";

# Add this referer for fix forbidden download action on CDN
HTTP_REFERER="https://avgle.com"
# enable referer header by default, but it will be turn off (false) after download first file failed.
ENABLE_REFERER=true

# wget, aria2c and ffmpeg binary files
# it will be a path to a binary file in `windows-libs` directory if this script is running in git bash
WGET_BIN="wget";
ARIA2C_BIN="aria2c";
FFMPEG_BIN="ffmpeg";
DOWNLOADER_TYPE="wget"; # or "aria2c"

ARIA2C_OPT_J=""; # https://aria2.github.io/manual/en/html/aria2c.html#cmdoption-j

# these files are relative to temporary directory
DOWNLOAD_LOG="aria2.log";
SELF_LOG="avgle-downloader.log"
LIST_FILE="concat.list"
TARGET_FILE="../${CFG_VIDEO_NAME}.mp4"

SUPPORTED_PAGE_TYPE=(avgle xvideos todo);
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
	CYAN="\x1b[0;36m";   CYAN_BOLD="\x1b[1;36m";
fi

function isYes() { [[ "$1" == y* ]] || [[ "$1" == Y* ]]; }
function isNo() { [[ "$1" == n* ]] || [[ "$1" == N* ]]; }

# usage confirm "question" "pre-chosen value"
function confirm() {
	if isYes "$2"; then return 0; fi
	if isNo "$2"; then return 1; fi

	local yn;
	beginAsk "$1";
	while read -p "Confirm (y/n) > " yn; do
		if isYes "$yn"; then endAsk; return 0; fi
		if isNo "$yn"; then endAsk; return 1; fi
	done
}

function logStart() { echo -e "${BLUE_BOLD}>> start: ${BLUE}${1}${RESET}"; }
function logInfo() { echo -e "${CYAN_BOLD}>> info:  ${CYAN}${1}${RESET}"; }
function logWarn() { echo -e "${YELLOW_BOLD}>> warn:  ${YELLOW}${1}${RESET}"; }
function logError() { echo -e "${RED_BOLD}>> error: ${RED}${1}${RESET}"; }
function logOk() { echo -e "${GREEN_BOLD}>> ok:    ${GREEN}${1}${RESET}"; }
function logBlank() { echo ''; }

function fatal() { logError "$1"; exit 1; }
function userCancel() {
	echo -e "${RESET}\n${YELLOW_BOLD}>> exit:  ${YELLOW}cancel by user${RESET}";
	exit 0;
}

function beginAsk() { echo -e "\n${BLUE_BOLD}>> ${BLUE}${1}"; }
function endAsk() { printf "${RESET}"; }
function beginDim() { printf "${DIM}"; }
function endDim() { printf "${RESET}"; }

function deleteIfItExists() {
	if [[ -d "$1" ]]; then rm -r "$1" || fatal "can not delete ${2:-directory} ${1}";
	elif [[ -e "$1" ]]; then rm "$1" || fatal "can not delete ${2:-file} ${1}";
	fi
}
function readFileSize() {
	local SIZE="$(stat --printf="%s" "$1" 2>/dev/null)";
	[[ -z "$SIZE" ]] && SIZE="$(stat -f "%z" "$1")";
	echo "$SIZE";
}

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
				fatal "$1 is missng in directory \"windows-libs\". $FIX_IT";
			else
				return 1;
			fi
		fi
		return 0;
	fi

	local brewDir="/usr/local/Cellar";
	if [[ "$1" == "$ARIA2C_BIN" ]] && [[ -d "$brewDir/aria2" ]]; then
		searchExecResult="$(find "$brewDir/aria2" -type f -path '*/bin/*' -iname "$1" | head -n1)";
		[[ -n "$searchExecResult" ]] && return 0 || return 1;
	fi

	if [[ "$2" == required ]]; then
		fatal "\"$1\" is missing! (You can exec \"sudo apt install $3\" to fix it on Ubuntu)";
	else
		return 1;
	fi
}

function resolveDependencies() {
	[[ -z `which gawk` ]] && fatal "\"gawk\" is missing! (Ubuntu: sudo apt install gawk)";

	searchExec "$FFMPEG_BIN" required && FFMPEG_BIN="$searchExecResult";

	if searchExec "$ARIA2C_BIN" optional; then
		ARIA2C_BIN="$searchExecResult";
		DOWNLOADER_TYPE="aria2c";
		logInfo "aria2 mode is enabled! 🚀🚀"

	elif searchExec "$WGET_BIN" required "$WGET_BIN"; then
		WGET_BIN="$searchExecResult";
		DOWNLOADER_TYPE="wget";
	fi
}

function printBanner() {
	#=======================================================
	# Banner color palette: #EF413F #FFB938 #3484EE #21A658
	local C0 C1 C2 C3 C4 C5;
	C0="$RESET"; C1="$RED"; C2="$YELLOW"; C3="$BLUE"; C4="$GREEN"; C5="\x1b[37m"; # grey
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
	echo -e "${DIM} Updated date:    ${UPDATE_AT}${RESET}"
	echo -e "${DIM} Downloader type: for hls.js${RESET}"
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
function normalizeURL() {
	echo "$1" | gawk '{
		gsub(/^[ \t\r\n]+/, "", $0);
		gsub(/[ \t\r\n]+$/, "", $0);
		if(length($0) > 0 && index($0, ".") > 0) {
			if(match($0, /^[a-zA-Z]+:\/\//)) printf("%s", $0);
			else printf("http://%s", $0);
		}
	}';
}
function setupProxy() {
	[[ -z "$CFG_PROXY" ]] && return;

	local proxyURL="$(normalizeURL "$CFG_PROXY")";
	[[ -z "$proxyURL" ]] && fatal "invalid proxy url: ${CFG_PROXY}";

	export http_proxy="$proxyURL";
	export https_proxy="$proxyURL";
	logInfo 'export `http_proxy` and `https_proxy` as '"$proxyURL";
}

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
	fatal "$msg";
}

function _download() {
	# declare `referer` as a local variable, because it should be reset after
	#    "with_referer" to "no_referer"
	local referer ref1 ref2 out1 out2 exitCode;
	if [[ "$DOWNLOADER_TYPE" == aria2c ]]; then
		cleanDownloadLogOnce;
		[[ "$1" == with_referer ]] && referer="--referer=$HTTP_REFERER";

		# default console log level: notice
		beginDim;
		generateDownloadListForAria2FromStdin "$3" <<< "$2" |
			"$ARIA2C_BIN" "$referer" --user-agent="$CFG_USER_AGENT" \
				--console-log-level=warn --log-level=debug \
				--max-download-result="${CFG_MAX_CONCURRENT_DL}" \
				--keep-unfinished-download-result=true \
				--enable-color=false \
				--summary-interval=120 \
				--show-files --continue=true --input-file=- "$ARIA2C_OPT_J" \
				--log="$DOWNLOAD_LOG" --log-level=info;
		exitCode=$?;
		endDim;
		return $exitCode;
	fi
	# wget
	if [[ "$1" == with_referer ]]; then ref1="--header"; ref2="Referer: $HTTP_REFERER"; fi
	if [[ -n "$3" ]]; then  out1="-O"; out2="$3"; fi

	beginDim;
	"$WGET_BIN" "$ref1" "$ref2" --header "User-Agent: $CFG_USER_AGENT" "$out1" "$out2" $2;
	exitCode=$?;
	endDim;
	return $exitCode;
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
			logWarn "download with 'Referer' header failed! (trying to download again without 'Referer' header)";
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

validateVariables;
printBanner;
setupProxy;
resolveDependencies;

ARIA2C_OPT_J="--max-concurrent-downloads=${CFG_MAX_CONCURRENT_DL}";

LOG_EXTRA="";
[[ -n "$ARIA2C_OPT_J" ]] && LOG_EXTRA="${LOG_EXTRA}${ARIA2C_OPT_J} ";
[[ -n "$CFG_PAGE_TYPE" ]] && LOG_EXTRA="${LOG_EXTRA}${CFG_PAGE_TYPE} ";

logInfo "video name:     ${CFG_VIDEO_NAME}";
logInfo "segments count: ${CFG_SEGMENT_COUNT}";
logInfo "extra opts:     ${LOG_EXTRA}";
logBlank;

TEMP_WORKSPACE=".tmp-${CFG_PAGE_TYPE}~${CFG_VIDEO_NAME}";
if [[ ! -d "$TEMP_WORKSPACE" ]]; then
	mkdir "$TEMP_WORKSPACE" || fatal "create temp workspace failed: $TEMP_WORKSPACE";
fi

# get total file count:
function getLastVideoFragment() { echo "$CFG_SEGMENTS" | gawk '!/^[ \t]*$/ {print $0}' | tail -n1; }
LAST_FRAGMENT_URL=`getLastVideoFragment`;

if [[ "$CFG_PAGE_TYPE" == avgle ]]; then
	LAST_FRAGMENT="${LAST_FRAGMENT_URL##*/}"; # get base name of video file
	LAST_FRAGMENT_ID="${LAST_FRAGMENT##seg-}"; # remove prefix of file name
	LAST_FRAGMENT_ID="${LAST_FRAGMENT_ID%%-*}"; # remove suffix

	FIRST_FRAGMENT_ID=1;

	FILE_NAME_PREFIX="seg-";
	FILE_NAME_SUFFIX="-v1-a1.ts";
	DOWNLOAD_URL_PREFIX="${LAST_FRAGMENT_URL%/*}";
fi
logInfo "video fragments: lastId=${LAST_FRAGMENT_ID} prefix=${FILE_NAME_PREFIX} suffix=${FILE_NAME_SUFFIX} last=${LAST_FRAGMENT}";

[[ -z "$LAST_FRAGMENT_ID" ]] && fatal "could not get last video fragment id from segment urls!";


logStart "downloading missing files ...";
pushd "$TEMP_WORKSPACE" || fatal "goto temp workspace failed: $TEMP_WORKSPACE";

MISSING_FILE="";
MISSING_FILE_COUNT=0;
for (( i=$FIRST_FRAGMENT_ID ; i<=$LAST_FRAGMENT_ID ; i++ )); do
	DOWNLOAD_TO="${FILE_NAME_PREFIX}${i}${FILE_NAME_SUFFIX}";
	if [[ -e "${DOWNLOAD_TO}" ]]; then
		# there has aria2 continue download mark file
		if [[ ! -e "${DOWNLOAD_TO}.aria2" ]] || [[ "$DOWNLOADER_TYPE" != aria2c ]]; then
			SIZE="$(readFileSize "${DOWNLOAD_TO}")";
			if [[ $SIZE -lt 10240 ]]; then # less than 10k (is broken or download failed)
				rm "${DOWNLOAD_TO}" || fatal "could not delete broken file \"${DOWNLOAD_TO}\"";
				logWarn "cleaned broken downloaded file: \"${DOWNLOAD_TO}\"";
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
	logOk "all files have been downloaded!";
else
	generateBetterDownloadQueue "$MISSING_FILE" | while read range; do
		P0="${DOWNLOAD_URL_PREFIX}/${FILE_NAME_PREFIX}";
		P1="${FILE_NAME_SUFFIX}${DOWNLOAD_URL_SUFFIX}";
		DOWNLOAD_URL="$(eval "echo $range" |
			gawk -vp0="$P0" -vp1="$P1" '{for(i=1;i<=NF;i++)printf("%s ",p0 $i p1);}')";

		logStart "downloading ${range}/${LAST_FRAGMENT_ID} ...";
		betterDownloader "\"${FILE_NAME_PREFIX}${range}${FILE_NAME_SUFFIX}\", please try again!" "$DOWNLOAD_URL";
		logOk "downloaded ${range}/${LAST_FRAGMENT_ID}";
		logBlank;

	done || exit 1;
	logOk "all files are downloaded!";
fi

FFMPEG_LIST_FILE_CONTENT="";

for (( i=$FIRST_FRAGMENT_ID ; i<=$LAST_FRAGMENT_ID ; i++ )) do
	FNAME="${FILE_NAME_PREFIX}${i}${FILE_NAME_SUFFIX}";
	FFMPEG_LIST_FILE_CONTENT="${FFMPEG_LIST_FILE_CONTENT}file ${FNAME}\n";
done

deleteIfItExists "$LIST_FILE" "existed list file";
echo -e "$FFMPEG_LIST_FILE_CONTENT" > "$LIST_FILE" || fatal "generate list file failed!";
logOk "Concat file $LIST_FILE generated"

# ===========================
# Converting .ts file
logStart "Converting ts file to mp4 files ..."
deleteIfItExists "$TARGET_FILE" "existed target file";

# -f concat can be performed in ffmpeg, reduce disk usage and time
# -c copy is equal to -acodec copy -vcodec copy, we just don't want to re-encode the file
# -bsf: Bitstream Filters  -bsf:a audio stream filter
# aac_adtstoasc: https://ffmpeg.org/ffmpeg-bitstream-filters.html#aac_005fadtstoasc
#   Convert MPEG-2/4 AAC ADTS to an MPEG-4 Audio Specific Configuration bitstream.
#   Reference from repo: https://github.com/mywarr/chrome-avgle-helper
"$FFMPEG_BIN" -f concat -i "${LIST_FILE}" -bsf:a aac_adtstoasc -c copy "${TARGET_FILE}" -loglevel error \
	|| fatal "ffmpeg convert response exception!"
logOk "Converted ${LIST_FILE} file to ${TARGET_FILE}";

popd >/dev/null || fatal "got back to parent directory failed!";

# ===========================
# Deleting files
confirm "Do you want to delete temp directory?" "$CFG_DELETE_TMP_FILES";
if [[ "$?" == 0 ]]; then
	logStart "Deleting temp directory ${TEMP_WORKSPACE} ...";
	deleteIfItExists "${TEMP_WORKSPACE}";
	logOk "All temporary files are deleted!"
fi

SELF_FILE="${BASH_SOURCE[0]}";
if [[ -n "$SELF_FILE" ]] && [[ -f "$SELF_FILE" ]]; then
	confirm "Do you want to delete this downloader script?" "$CFG_DELETE_DOWNLOADER";
	if [[ "$?" == 0 ]]; then
		gawk '/\{\{/ && /\}\}/ {exit(1)}' "${SELF_FILE}" || fatal "can not delete template file!";

		logStart "Deleting this downloader script ${SELF_FILE} ...";
		deleteIfItExists "${SELF_FILE}";
	fi
fi

logOk 'finished!';
exit 0;
