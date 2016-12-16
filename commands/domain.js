// Register a custom domain for a website
const chalk = require('chalk');
const _ = require('lodash');
const config = require('config');
const log = require('winston');
const wordwrap = require('wordwrap');
const urlJoin = require('url-join');
const output = require('../lib/output');
const api = require('../lib/api');
const urls = require('../lib/urls');

// Command to create a new application
module.exports = program => {
  // Validate that the domain name is valid.
  if (_.isString(program.name)) {
    return registerDomain(program);
  }

  // If the command is run without a name arg then check the status of the domain
  return domainStatus();
};

function registerDomain(program) {
  output.blankLine();

  // Check if the current website already has a custom domain.
  if (!_.isEmpty(program.website.domainName)) {
    throw Error.create('This website is already bound to the custom domain '
      + chalk.yellow(program.website.domainName), {formatted: true});
  }

  // Cursory check that the domain name looks ok.
  if (!/^[\.a-z0-9_-]+$/.test(program.name)) {
    throw Error.create('Domain name has invalid characters', {formatted: true});
  }

  if (_.isEmpty(program.subdomain)) {
    throw Error.create('Missing --subdomain argument.', {formatted: true});
  }

  if (program.subdomain !== '@' && !/^[a-z0-9-]{3,50}$/.test(program.subdomain)) {
    throw Error.create('Invalid sub-domain. Valid characters are ' +
      'letters, numbers, and dashes.', {formatted: true});
  }

  output('Register custom domain ' + chalk.bold(program.name));
  output.blankLine();

  // Validate that this website is on a paid plan.
  if (_.isEmpty(program.website.subscriptionPlan)) {
    const errorMessage = 'You first need to upgrade this website to the paid ' +
      'plan in order to register a custom domain. Visit the following URL to upgrade:';

    output(wordwrap(4, 70)(errorMessage));
    output.blankLine();
    output('    ' + chalk.yellow(urls.upgradeWebsite(program.website)));
    output.blankLine();

    return Promise.resolve();
  }

  return createDomain(program)
    .then(domain => {
      // Update the application with the domain name.
      log.info('Updating website %s to custom domain %s', program.website.appId, program.name);
      return api.put({
        url: urlJoin(program.apiUrl, `/apps/${program.website.appId}`),
        authToken: program.authToken,
        body: {
          domainName: domain.domainName,
          customerId: program.customerId
        }
      })
      .then(() => domain);
    })
    .then(domain => {
      displayNextSteps(domain);
      return domain;
    });
}

function domainStatus() {
  return Promise.resolve();
}

function createDomain(program) {
  // Make api call to create the domain.
  return api.post({
    url: urlJoin(program.apiUrl, `/customers/${program.customerId}/domains`),
    authToken: program.authToken,
    body: {
      customerId: program.customerId,
      domainName: program.name
    }
  })
  .catch(error => {
    if (error.status === 400) {
      throw Error.create(error.message, {formatted: true});
    }
    throw error;
  });
}

function displayNextSteps() {
  // Display next steps to the user.
  output(wordwrap(4, 80)('A verification email should arrive shortly from ' +
  chalk.underline(config.awsCertificatesEmail) + ' containing a link to ' +
  'approve the provisioning of your SSL certificate. Click the link and ' +
  'also the approve button in the launched webpage.'));

  output.blankLine();
  output(wordwrap(4, 80)('Once you\'ve approved the certificate, the domain ' +
  'provisioning process will begin. This takes anywhere from 20-40 minutes to ' +
  'fully propagate across our global CDN. Once complete, you\'ll get a second ' +
  'email from ' + chalk.underline('support@aerobatic.com') + ' with next steps for configuring the ' +
  'necessary records with your DNS provider.'));

  output.blankLine();
  output(wordwrap(4, 80)('If you don\'t receive the verification email within ' +
    'a few minutes, read through these troubleshooting tips:'));
  output('    ' + chalk.yellow('https://www.aerobatic.com/docs/custom-domains-ssl#troubleshooting'));

  output.blankLine();
  output(wordwrap(4, 80)('You can run the command ' + chalk.green.underline('aero domain') +
    ' in this same directory (with no arguments) to get a status ' +
    ' update on the domain provisioning process.'));
  output.blankLine();

  output(wordwrap(4, 80)('If you still need assistance, don\'t hesitate to contact us at ' +
    chalk.underline('support@aerobatic.com')));
  output.blankLine();
}