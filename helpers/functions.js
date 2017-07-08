var getCommand = (str) => {
  let spacePosition = str.indexOf(' ');

  if (spacePosition === -1)
    return str;
  else
    return str.substr(0, spacePosition);
};

var getParameters = (str) => {
  let spacePosition = str.indexOf(' ');

  if (spacePosition === -1)
    return str;
  else
    return str.substr(spacePosition + 1); // get next string without space
};

module.exports = {
  getCommand,
  getParameters,
};
