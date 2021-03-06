const moment = require('moment');
const sendResponse = require('../utilities/sendFormattedResponse');

module.exports = (req, res, next) => {
	const { date_from, date_to } =
		req.params.date_from && req.params.date_to ? req.params : req.body;
	const format = 'YYYYMMDD';

	if (!moment(date_from, format, true).isValid() || !moment(date_to, format, true).isValid()) {
		return sendResponse(req, res, 400, { message: 'Bad request: Invalid date formats' });
	}

	if (moment(date_from, format, true).diff(date_to, format, true) >= 0) {
		return sendResponse(req, res, 400, {
			message: 'Bad request: date_from should be smaller than date_to'
		});
	}

	req.dateTimeNow = moment().format('YYYY-MM-DD HH:mm:ss');

	return next();
};
