function printRange() {
	if(i!=from) print "{" from ".." i "}";
	else print from;
}
BEGIN { i=-1; from=-1; }
!/^\s*$/ { # ignore empty line
	if($1!=i+1) {
		if(from!=-1) printRange();
		from=$1; i=$1; # reset
	} else {
		i=$1;
		if(i-from==49) { # max step is 50: 50-1=49
			printRange();
			from=-1; i=-1;
		}
	}
}
END { if(from>0) printRange(); }
