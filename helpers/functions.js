var getFirstWord = (str) => {
  let spacePosition = str.indexOf(' ');

  if (spacePosition === -1)
    return str;
  else
    return str.substr(0, spacePosition);
};

var getFormattedDate = (type) => {
  var today = new Date();
  var weekday = new Array(7);
  weekday[0] = 'Sunday';
  weekday[1] = 'Monday';
  weekday[2] = 'Tuesday';
  weekday[3] = 'Wednesday';
  weekday[4] = 'Thursday';
  weekday[5] = 'Friday';
  weekday[6] = 'Saturday';

  var date = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
  var time = today.getHours() + ":" + today.getMinutes();
  var week_date = (today.getMonth() + 1) + '/' + today.getDate() + '/' + today.getFullYear() + ' ' + weekday[today.getDay()];

  if (type == 'date') return date;
  else if (type == 'time') return time;
  else if (type == 'week_date') return week_date;
  else return date + ' ' + time;
}

module.exports = {
  getFirstWord,
  getFormattedDate,
};
