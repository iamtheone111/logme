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

var getCommandList = () => {
  let command_list = '';

  command_list += 'commands - get list of available commands' + "\n";
  command_list += 'pause - stop prompting indefinitely' + "\n";
  command_list += 'resume - start prompting again' + "\n";
  command_list += 'log - see all of today\'s entries' + "\n";
  command_list += 'sleep N - stop prompting for N hours' + "\n";
  command_list += 'frequency N - prompt me every N minutes' + "\n";
  // command_list += 'first N - start prompting at N o\'clock every day' + "\n";
  // command_list += 'last N - stop prompting at N o\'clock every day' + "\n";
  command_list += 'prompt TEXT - change the prompt text to TEXT' + "\n";
  command_list += "\n" + 'Send feedback to nat@nat.org' + "\n";
  // command_list += '' + "\n";

  return command_list;
}

module.exports = {
  getCommand,
  getParameters,
  getCommandList,
};
