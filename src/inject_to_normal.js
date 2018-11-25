import helper from "./inject_utils";

// display car number
document.querySelectorAll('.video-title').forEach(e => {
	let carName = helper.parseCarNumber(e.innerText);

	let dom = document.createElement('div');
	dom.className = carName ? "text-success" : "text-muted";
	dom.innerHTML = `<b>${carName||"unknown"}</b>`;
	e.parentNode.appendChild(dom);
});
