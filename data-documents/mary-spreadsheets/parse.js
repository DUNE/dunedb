var xlsx = require('xlsx');

var workbook = xlsx.readFile('copy.xlsx');

for(sheetname of workbook.SheetNames) {
	var ws = workbook.Sheets[sheetname]
	var data = xlsx.utils.sheet_to_json(ws, {header:1});
	console.log(sheetname);
	console.log(data);
}
