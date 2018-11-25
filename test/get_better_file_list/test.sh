#!/usr/bin/env bash

__DIRNAME=`cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd`;
pushd "$__DIRNAME" > /dev/null;

if [[ -t 1 ]]; then # is terminal?
	COLOR_MODE=`tput colors`;
	if [[ -n "$COLOR_MODE" ]] && [[ "$COLOR_MODE" -ge 8 ]]; then
		BOLD="\x1b[1m"; RESET="\x1b[0m";
	fi
fi

for file in *.in; do
	ACTUAL=`gawk -f ./get_better_file_list.awk $file`;
	EXPECTED=`cat ${file%%.in}.out`;
	if [[ "$ACTUAL" == "$EXPECTED" ]]; then
		echo "[pass] ${file}";
	else
		echo "[fail] ${file}";
		echo -e "\n${BOLD}expected:${RESET}\n${EXPECTED}\n${BOLD}actual:${RESET}\n${ACTUAL}\n";
		exit 1;
	fi
done

popd > /dev/null;
