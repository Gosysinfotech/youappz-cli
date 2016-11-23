const log = require('winston');
const _ = require('lodash');
const urlJoin = require('url-join');
const api = require('../lib/api');
const output = require('../lib/output');
const chalk = require('chalk');

// Command to create a new application
module.exports = program => {
  output.blankLine();

  log.debug('List applications for customer %s', program.customerId);
  return api.get({
    url: urlJoin(program.apiUrl, `/customers/${program.customerId}`),
    authToken: program.authToken
  })
  .then(customer => {
    output('Details for account ' + chalk.underline.bold(customer.name));
    output.blankLine();

    output(chalk.dim('CustomerId:'));
    output(customer.customerId);
    output.blankLine();

    return api.get({
      url: urlJoin(program.apiUrl, `/customers/${program.customerId}/apps`),
      authToken: program.authToken
    });
  })
  .then(apps => {
    output(chalk.dim('Apps:'));
    output.blankLine();

    if (apps.length === 0) {
      output('You don\'t have any apps yet.');
      output('Run ' + chalk.green.underline('aero create') + ' in the root of your project directory.');
    } else {
      apps.forEach(app => {
        process.stdout.write(_.padEnd(app.name, 25, ' '));
        process.stdout.write(_.padEnd(app.url, 50, ' '));
        process.stdout.write(_.padEnd(app.subscriptionPlan ? 'PAID' : 'FREE'));
        process.stdout.write('\n');
      });
    }

    output.blankLine();
  });
};
