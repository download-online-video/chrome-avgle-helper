#!/usr/bin/env bash

cd "$( dirname "${BASH_SOURCE[0]}" )";

set -x;
export CFG_USE_ENV_VARIABLES=true;

export CFG_RANDOM_ID='df0aa729-376f-40e6-a002-88559b6112d9';
export CFG_VIDEO_NAME='ABC-123';
export CFG_M3U8_URL='https://xxxx/xxxx';
export CFG_DECODE_M3U8='false';
export CFG_PAGE_TYPE='avgle';
export CFG_MAX_CONCURRENT_DL=;
export CFG_USER_AGENT=;
set +x;

bash ../../src/downloader.sh;
