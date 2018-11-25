#!/usr/bin/env bash

TEST_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
pushd "$TEST_DIR" || exit 1;

echo "[.] get_better_file_list";
./get_better_file_list/test.sh || exit 1;

echo "[+] all tests passed!";
