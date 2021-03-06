let token = localStorage.getItem('auth_token');
let list = document.querySelector('#operators');
let days = [];

let chargesGraph,
	awayPassesGraph,
	passesGraph,
	totalGraph,
	totalPie,
	mostVisitedStations,
	passesPerDayGraph = null;

const getDatesBetweenDates = (startDate, endDate) => {
	let dates = [];
	//to avoid modifying the original date
	const theDate = new Date(startDate);
	while (theDate < endDate) {
		dates = [...dates, new Date(theDate)];
		theDate.setDate(theDate.getDate() + 1);
	}
	return dates;
};

const datesAreOnSameDay = (first, second) =>
	first.getFullYear() === second.getFullYear() &&
	first.getMonth() === second.getMonth() &&
	first.getDate() === second.getDate();

const picker = new Litepicker({
	element: document.querySelector('#litepicker'),
	numberOfColumns: 4,
	numberOfMonths: 4,
	singleMode: false,
	inlineMode: true,
	setup: function (picker) {
		picker.on('selected', function (date1, date2) {
			date2.dateInstance.setDate(date2.dateInstance.getDate() + 1);
			days = getDatesBetweenDates(date1.toJSDate(), date2.toJSDate());
			loadData(
				document.querySelector('#operators').value,
				date1.format('YYYYMMDD'),
				date2.format('YYYYMMDD')
			);
		});
	}
});

const unhide = () => {
	document.querySelector('#myTab').classList.remove('d-none');
	document.querySelector('#charges').classList.remove('d-none');
	document.querySelector('#stations').classList.remove('d-none');
	document.querySelector('#passes').classList.remove('d-none');
	document.querySelector('#date-text').classList.remove('d-none');
};

document.querySelector('#operators').addEventListener('change', () => {
	if (picker.getDate()) {
		let to = picker.getEndDate();
		to.dateInstance.setDate(to.dateInstance.getDate() + 1);
		loadData(
			document.querySelector('#operators').value,
			picker.getStartDate().format('YYYYMMDD'),
			to.format('YYYYMMDD')
		);
	}
});

document.querySelector('#stationslist').addEventListener('change', () => {
	let to = picker.getEndDate();
	to.dateInstance.setDate(to.dateInstance.getDate() + 1);
	PassesPerStation(
		document.querySelector('#stationslist').value,
		picker.getStartDate().format('YYYYMMDD'),
		to.format('YYYYMMDD')
	);
});

document.querySelector('#otheroperators').addEventListener('change', () => {
	if (picker.getDate()) {
		let to = picker.getEndDate();
		to.dateInstance.setDate(to.dateInstance.getDate() + 1);
		PassesAnalysis(
			document.querySelector('#operators').value,
			document.querySelector('#otheroperators').value,
			picker.getStartDate().format('YYYYMMDD'),
			to.format('YYYYMMDD'),
			stations
		);
	}
});

let allOperators = [];
let stations = [];
(async () => {
	try {
		allOperators = await axios({
			url: `https://localhost:9103/interoperability/api/auxiliary/getoperators`,
			method: 'get',
			headers: {
				'X-OBSERVATORY-AUTH': token
			}
		});

		allOperators = allOperators.data.operators;

		allOperators.forEach((op) => {
			let selection = document.createElement('option');
			selection.value = op.op_name;
			selection.innerHTML = `${op.op_name
				.replace(/_/g, ' ')
				.replace(/(?: |\b)(\w)/g, function (key) {
					return key.toUpperCase();
				})} (${op.op_abbr})`;
			list.appendChild(selection);
		});
	} catch (error) {
		localStorage.setItem(
			'msg',
			JSON.stringify({ msg: 'Session expired, please log in again', type: 'warning' })
		);
		localStorage.removeItem('auth_token');
		window.location.replace('http://localhost:8000/login');
	}
})();

const PassesPerStation = async (station, datefrom, dateto) => {
	try {
		let response = await axios({
			url: `https://localhost:9103/interoperability/api/passesperstation/${station}/${datefrom}/${dateto}`,
			method: 'get',
			headers: {
				'X-OBSERVATORY-AUTH': token
			}
		});

		let passesList = response.data.PassesList;

		let div = document.querySelector('#passesperstation');
		div.innerHTML = '';
		let table = document.createElement('table');
		table.id = 'tbl';
		table.classList.add('table', 'dataTable', 'mb-3');

		table.innerHTML = `
		<thead class="table-light">
			<tr>
				<th class="text-end">Index</th>
				<th>Pass ID</th>
				<th>Timestamp</th>
				<th>Vehicle ID</th>
				<th>Tag Provider</th>
				<th>Type</th>	
				<th class="text-end">Charge</th>	
			</tr>
		</thead>`;

		let tableData = document.createElement('tbody');
		let passes = [];
		allOperators.map((op) => passes.push({ op: op.op_name, sum: 0 }));

		passesList.forEach((pass) => {
			let row = document.createElement('tr');
			row.innerHTML = `
				<td class="text-end">${pass.PassIndex}</td>
				<td>${pass.PassID}</td>
				<td>${pass.PassTimeStamp}</td>
				<td>${pass.VehicleID}</td>
				<td>${pass.TagProvider.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, function (key) {
					return key.toUpperCase();
				})}</td>
				<td>${pass.PassType}</td>	
				<td class="text-end">${(Math.round(pass.PassCharge * 100) / 100).toFixed(2)}</td>
			`;
			tableData.appendChild(row);

			passes.forEach((p) => {
				if (p.op === pass.TagProvider) {
					p.sum++;
					return;
				}
			});
		});
		table.appendChild(tableData);

		div.appendChild(table);

		$('#tbl').DataTable();

		if (awayPassesGraph) awayPassesGraph.destroy();
		awayPassesGraph = new Chart(document.getElementById('awaypasses'), {
			type: 'pie',
			data: {
				labels: passes.map((p) =>
					p.op.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, function (key) {
						return key.toUpperCase();
					})
				),
				datasets: [
					{
						label: `Passes`,
						backgroundColor: [
							'rgba(255, 99, 132, 0.2)',
							'rgba(255, 159, 64, 0.2)',
							'rgba(255, 205, 86, 0.2)',
							'rgba(75, 192, 192, 0.2)',
							'rgba(54, 162, 235, 0.2)',
							'rgba(153, 102, 255, 0.2)',
							'rgba(201, 203, 207, 0.2)'
						],
						borderColor: [
							'rgb(255, 99, 132)',
							'rgb(255, 159, 64)',
							'rgb(255, 205, 86)',
							'rgb(75, 192, 192)',
							'rgb(54, 162, 235)',
							'rgb(153, 102, 255)',
							'rgb(201, 203, 207)'
						],
						borderWidth: 1,
						data: passes.map((p) => p.sum)
					}
				]
			},
			options: {
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'right'
					},
					title: {
						display: true,
						text: `Passes per Tag Provider`
					}
				}
			}
		});
	} catch (error) {
		console.log(error);
	}
};

const PassesAnalysis = async (op1, op2, datefrom, dateto, stations) => {
	try {
		let response = await axios({
			url: `https://localhost:9103/interoperability/api/PassesAnalysis/${op1}/${op2}/${datefrom}/${dateto}`,
			method: 'get',
			headers: {
				'X-OBSERVATORY-AUTH': token
			}
		});

		let passesList = response.data.PassesList;

		let div = document.querySelector('#passesanalysis');
		div.innerHTML = '';
		let table = document.createElement('table');
		table.id = 'tbl2';
		table.classList.add('table', 'dataTable', 'mb-3');

		table.innerHTML = `
		<thead class="table-light">
			<tr>
				<th class="text-end">Index</th>
				<th>Pass ID</th>
				<th>Timestamp</th>
				<th>Station ID</th>
				<th>Vehicle ID</th>
				<th class="text-end">Charge</th>	
			</tr>
		</thead>`;

		let tableData = document.createElement('tbody');
		let graphData = stations.map((st) => {
			return { id: st.st_id, name: st.st_name, sum: 0 };
		});
		passesList.forEach((pass) => {
			let row = document.createElement('tr');
			row.innerHTML = `
				<td class="text-end">${pass.PassIndex}</td>
				<td>${pass.PassID}</td>
				<td>${pass.TimeStamp}</td>
				<td>${pass.StationID}</td>
				<td>${pass.VehicleID}</td>
				<td class="text-end">${(Math.round(pass.Charge * 100) / 100).toFixed(2)}</td>
			`;
			tableData.appendChild(row);

			graphData.find((st) => st.id === pass.StationID).sum++;
		});

		table.appendChild(tableData);
		div.appendChild(table);
		$('#tbl2').DataTable();

		if (mostVisitedStations) mostVisitedStations.destroy();
		mostVisitedStations = new Chart(document.querySelector('#mostvisitedstations'), {
			type: 'bar',
			data: {
				labels: graphData.map((st) =>
					st.name.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, function (key) {
						return key.toUpperCase();
					})
				),
				datasets: [
					{
						label: 'Station Passes',
						data: graphData.map((st) => st.sum),
						borderColor: 'rgba(54, 162, 235)',
						backgroundColor: 'rgba(54, 162, 235, 0.2)'
					}
				]
			},
			options: {
				elements: {
					bar: {
						borderWidth: 1
					}
				},
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					title: {
						display: true,
						text: 'Pass Events per Tag Provider'
					}
				}
			}
		});
	} catch (error) {
		console.log(error);
	}
};

const loadData = async (current, datefrom, dateto) => {
	try {
		stations = await axios({
			url: `https://localhost:9103/interoperability/api/auxiliary/getstations/${current}`,
			method: 'get',
			headers: {
				'X-OBSERVATORY-AUTH': token
			}
		});
		let chargesBy = await axios({
			url: `https://localhost:9103/interoperability/api/ChargesBy/${current}/${datefrom}/${dateto}`,
			method: 'get',
			headers: {
				'X-OBSERVATORY-AUTH': token
			}
		});

		chargesBy = chargesBy.data;
		operators = allOperators.filter((op) => op.op_name !== current);

		stations = stations.data.stations;
		stationNames = [];
		stations.forEach((st) => {
			stationNames.push(st.st_name);
		});

		let otherOperatorsList = document.querySelector('#otheroperators');
		let selection = otherOperatorsList.value;
		otherOperatorsList.innerHTML = '';
		operators.forEach((op) => {
			let opt = document.createElement('option');
			opt.value = op.op_name;
			opt.innerHTML = op.op_name.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, function (key) {
				return key.toUpperCase();
			});
			if (selection != '' && opt.value == selection) opt.selected = true;
			otherOperatorsList.appendChild(opt);
		});

		let stationList = document.querySelector('#stationslist');
		stationList.innerHTML = '';
		stations.forEach((st) => {
			let opt = document.createElement('option');
			opt.value = st.st_id;
			opt.innerHTML = st.st_name.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, function (key) {
				return key.toUpperCase();
			});
			stationList.appendChild(opt);
		});

		PassesPerStation(document.querySelector('#stationslist').value, datefrom, dateto);
		PassesAnalysis(
			current,
			document.querySelector('#otheroperators').value,
			datefrom,
			dateto,
			stations
		);

		let home = [],
			away = [];

		let numOfPassesPerDay = [];
		days.forEach((day) =>
			numOfPassesPerDay.push({
				day: day,
				sum: 0
			})
		);

		for (const st of stations) {
			let passesPerStation = await axios({
				url: `https://localhost:9103/interoperability/api/PassesPerStation/${st.st_id}/${datefrom}/${dateto}`,
				method: 'get',
				headers: {
					'X-OBSERVATORY-AUTH': token
				}
			});

			let sum = passesPerStation.data.NumberOfPasses;
			let numOfHome = 0;
			passesPerStation.data.PassesList.forEach((pass) => {
				if (pass.PassType == 'home') numOfHome++;

				numOfPassesPerDay.find((d) =>
					datesAreOnSameDay(
						d.day,
						moment(pass.PassTimeStamp, 'YYYY-MM-DD HH:mm:ss').toDate()
					)
				).sum++;
			});

			home.push(numOfHome);
			away.push(sum - numOfHome);
		}

		let passesCosts = await Promise.all(
			operators.map(async (op) => {
				let passescost = await axios({
					url: `https://localhost:9103/interoperability/api/PassesCost/${op.op_name}/${current}/${datefrom}/${dateto}`,
					method: 'get',
					headers: {
						'X-OBSERVATORY-AUTH': token
					}
				});
				return passescost.data;
			})
		);

		unhide();

		let incomes = chargesBy.PPOList.map((el) => el.PassesCost);
		let debts = passesCosts.map((el) => el.PassesCost);
		let total = [];
		for (let i = 0; i < incomes.length; ++i) total.push(incomes[i] - debts[i]);

		document.querySelector('#table > thead').innerHTML = '';
		document.querySelector('#table > tbody').innerHTML = '';
		let cols = document.createElement('tr');
		cols.classList.add('text-center');
		let values = document.createElement('tr');
		values.classList.add('text-center');
		let sum = 0;
		for (const i in total) {
			sum += total[i];
			let th = document.createElement('th');
			th.innerHTML = `${operators[i].op_name
				.replace(/_/g, ' ')
				.replace(/(?: |\b)(\w)/g, function (key) {
					return key.toUpperCase();
				})}`;
			cols.appendChild(th);
			let td = document.createElement('td');
			td.classList.add(total[i] > 0 ? 'text-success' : 'text-danger');
			td.innerHTML = `${(Math.round(total[i] * 100) / 100).toFixed(2)}`;
			values.append(td);
		}
		let th = document.createElement('th');
		let td = document.createElement('td');
		td.classList.add(sum > 0 ? 'text-success' : 'text-danger');
		th.innerHTML = `<b>Total</b>`;
		td.innerHTML = `${(Math.round(sum * 100) / 100).toFixed(2)}`;
		cols.appendChild(th);
		values.appendChild(td);
		document.querySelector('#table > thead').appendChild(cols);
		document.querySelector('#table > tbody').appendChild(values);

		if (chargesGraph) chargesGraph.destroy();
		if (totalPie) totalPie.destroy();
		if (totalGraph) totalGraph.destroy();
		if (passesGraph) passesGraph.destroy();
		if (passesPerDayGraph) passesPerDayGraph.destroy();
		chargesGraph = new Chart(document.getElementById('chargesGraph'), {
			type: 'bar',
			data: {
				labels: operators.map((op) => op.op_abbr),
				datasets: [
					{
						label: `Income`,
						backgroundColor: 'rgba(75, 192, 192, 0.2)',
						borderColor: 'rgb(75, 192, 192)',
						borderWidth: 1,
						data: incomes
					},
					{
						label: `Debt`,
						borderColor: 'rgba(255, 99, 132)',
						backgroundColor: 'rgba(255, 99, 132, 0.2)',
						borderWidth: 1,
						data: debts
					}
				]
			},
			options: {
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: `Income and Debt per Operator`
					}
				}
			}
		});

		totalGraph = new Chart(document.getElementById('totalGraph'), {
			type: 'bar',
			data: {
				labels: operators.map((op) => op.op_abbr),
				datasets: [
					{
						label: `Net Income`,
						borderColor: 'rgba(54, 162, 235)',
						backgroundColor: 'rgba(54, 162, 235, 0.2)',
						borderWidth: 1,
						data: total
					}
				]
			},
			options: {
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					title: {
						display: true,
						text: `Net Income / Debt per Operator`
					}
				}
			}
		});

		passesGraph = new Chart(document.getElementById('homeawaypasses'), {
			type: 'bar',
			data: {
				labels: stationNames.map((st) =>
					st.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, function (key) {
						return key.toUpperCase();
					})
				),
				datasets: [
					{
						label: 'Home Passes',
						data: home,
						borderColor: 'rgba(54, 162, 235)',
						backgroundColor: 'rgba(54, 162, 235, 0.2)'
					},
					{
						label: 'Away Passes',
						data: away,
						borderColor: 'rgba(255, 99, 132)',
						backgroundColor: 'rgba(255, 99, 132, 0.2)'
					}
				]
			},
			options: {
				maintainAspectRatio: false,
				indexAxis: 'x',
				elements: {
					bar: {
						borderWidth: 1
					}
				},
				responsive: true,
				plugins: {
					legend: {
						position: 'right'
					},
					title: {
						display: true,
						text: `Home and Away Passes per Station`
					}
				}
			}
		});

		passesPerDayGraph = new Chart(document.getElementById('passesperday'), {
			type: 'line',
			data: {
				labels: numOfPassesPerDay.map((n) => moment(n.day).format('YYYY-MM-DD')),
				datasets: [
					{
						label: 'Number of Passes',
						data: numOfPassesPerDay.map((n) => n.sum),
						borderColor: 'rgba(54, 162, 235)',
						backgroundColor: 'rgba(54, 162, 235, 0.2)',
						cubicInterpolationMode: 'monotone',
						tension: 0.4
					}
				]
			},

			options: {
				maintainAspectRatio: false,
				responsive: true,
				plugins: {
					legend: {
						position: 'top',
						display: false
					},
					title: {
						display: true,
						text: 'Passes per Day'
					}
				}
			}
		});

		document.querySelector('#date-text').innerHTML = `Data from ${moment(
			datefrom,
			'YYYYMMDD'
		).format('YYYY-MM-DD HH:mm')} until ${moment(dateto, 'YYYYMMDD')
			.subtract(1, 'second')
			.format('YYYY-MM-DD HH:mm')}`;
	} catch (error) {
		if (error.response) {
			if (error.response.status === 402) {
				createAlert('No data for specified time period', 'info');
			} else createAlert(error.response.data.message, 'danger');

			if (error.response.data.message === 'Invalid token') {
				localStorage.setItem(
					'msg',
					JSON.stringify({ msg: 'Session expired, please log in again', type: 'warning' })
				);
				localStorage.removeItem('auth_token');
				window.location.replace('http://localhost:8000/login');
			}
		} else {
			console.log(error);
			createAlert('Network error, try logging in again', 'danger');
		}
	}
};
