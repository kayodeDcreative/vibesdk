const chalk = require('chalk');
const boxenModule = require('boxen');
const boxen = boxenModule.default || boxenModule;
const gradient = require('gradient-string');
const Table = require('table').Table;
const figures = require('figures');

const icons = {
  success: figures.tick || '✔',
  error: figures.cross || '✖',
  info: figures.info || 'ℹ',
  warning: figures.warning || '⚠',
  thinking: '🤔',
  code: figures.pointerSmall || '›',
  chat: '💬',
  auth: '🔐',
  rocket: figures.arrowRight || '➡',
};

function renderHeader(title, subtitle = '') {
  const lines = [title];
  if (subtitle) lines.push(subtitle);

  const content = lines.join('\n');
  console.log(
    '\n' +
      boxen(gradient.pastel(content), {
        padding: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        margin: 0,
      })
  );
}

function renderSection(title) {
  console.log(chalk.bold.magenta(`\n${figures.pointerSmall} ${title}`));
}

function success(message) {
  console.log(chalk.green(`${icons.success} ${message}`));
}

function error(message) {
  console.log(chalk.red(`${icons.error} ${message}`));
}

function info(message) {
  console.log(chalk.blue(`${icons.info} ${message}`));
}

function warn(message) {
  console.log(chalk.yellow(`${icons.warning} ${message}`));
}

function renderPanel(title, rows) {
  const body = rows
    .map(([label, value]) => `${chalk.bold(label)} ${chalk.white(value)}`)
    .join('\n');

  console.log(
    boxen(body, {
      title: chalk.bold.cyan(title),
      titleAlignment: 'left',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'magenta',
    })
  );
}

function renderTable(headers, rows) {
  const table = new Table({
    head: headers.map(h => chalk.cyan.bold(h)),
    style: { 'padding-left': 1, 'padding-right': 1, border: ['cyan'] },
  });
  rows.forEach(row => table.push(row));
  console.log(table.toString());
}

function code(label, content) {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const indexWidth = String(lines.length).length;

  console.log(chalk.gray('┌─ ' + chalk.bold(label)));
  lines.slice(0, 20).forEach((line, index) => {
    const number = String(index + 1).padStart(indexWidth, ' ');
    console.log(chalk.gray('│ ') + chalk.gray(`${number} | `) + chalk.white(line));
  });
  if (lines.length > 20) {
    console.log(chalk.gray('│ ') + chalk.dim('... (truncated)'));
  }
  console.log(chalk.gray('└─\n'));
}

function thinking(content) {
  if (!content) return;
  const text = String(content || '').trim();
  if (!text) return;

  console.log(chalk.yellow(`\n${icons.thinking} ${chalk.bold('AI Thinking')}:`));
  console.log(
    boxen(chalk.gray(text), {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
    })
  );
}

function renderMessageList(messages) {
  messages.forEach(message => {
    const color = message.role === 'user' ? 'cyan' : message.role === 'assistant' ? 'green' : 'gray';
    const role = String(message.role || 'unknown').toUpperCase();
    const content = String(message.content || '').replace(/\n/g, ' ');
    console.log(chalk[color](`${chalk.bold(role)}:`) + ' ' + chalk.white(content));
  });
}

module.exports = {
  icons,
  renderHeader,
  renderSection,
  success,
  error,
  info,
  warn,
  renderPanel,
  renderTable,
  code,
  thinking,
  renderMessageList,
};
