#!/usr/bin/env bash

cd "$( dirname "${BASH_SOURCE[0]}" )";

set -x;
export CFG_USE_ENV_VARIABLES=true;

export CFG_RANDOM_ID='df0aa729-376f-40e6-a002-88559b6112d9';
export CFG_VIDEO_NAME='ABC-123';
export CFG_M3U8_URL_BASE64='anVzdCBhIHRlc3QgdXJs';
export CFG_DECODE_M3U8='false';
export CFG_PAGE_TYPE='avgle';
export CFG_MAX_CONCURRENT_DL=5;
set +x;

bash ../../src/downloader.sh;
