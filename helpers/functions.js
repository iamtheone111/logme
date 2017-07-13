var splitString = (str, separator) => {
  let separatorPosition = str.indexOf(separator);

  if (separatorPosition === -1)
    return [
      str,
      '',
    ];
  else
    return [
      str.substr(0, separatorPosition),
      str.substr(separatorPosition + separator.length),
    ];
};

var getCommandList = () => {
  let command_list = '';

  command_list += 'log - see all of today\'s entries' + "\n";
  command_list += 'pause - stop prompting indefinitely' + "\n";
  command_list += 'resume - start prompting again' + "\n";
  command_list += 'undo - remove the last entry from the log' + "\n";
  command_list += 'sleep N - stop prompting for N hours' + "\n";
  command_list += 'frequency N - prompt me every N minutes' + "\n";
  // command_list += 'first N - start prompting at N o\'clock every day' + "\n";
  // command_list += 'last N - stop prompting at N o\'clock every day' + "\n";
  command_list += 'prompt TEXT - change the prompt text to TEXT' + "\n";
  command_list += 'today - combine logs' + "\n";
  command_list += 'week - combine logs for past week' + "\n";

  command_list += "\n" + 'Send feedback to nat@nat.org' + "\n";
  // command_list += '' + "\n";

  return command_list;
}

module.exports = {
  splitString,
  getCommandList,
};
