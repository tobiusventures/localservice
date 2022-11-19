#!/usr/bin/env node

require('dotenv/config');

const { Command } = require('commander');
const { version } = require('../package.json');

const program = new Command();

/**
 * Local Service
 * @class LocalService
 */
class LocalService {
  /**
   * Instantiate Local Service
   * @constructor
   * @param {String} serviceName
   * @param {Object} [options]
   */
  constructor(serviceName, options = {}) {
    // @todo add an info command
    // @todo add a help command
    this.name = serviceName;
    try {
      // eslint-disable-next-line import/no-dynamic-require
      this.service = require(`../library/${serviceName}.js`)(options);
    } catch (err) {
      console.error(err);
      throw new Error(`"${serviceName}" is not a supported service`);
    }
  }
}

/**
 * Execute service command
 * @param {String} serviceName
 * @param {String} commandName
 */
const execute = (serviceName, commandName) => {
  const localService = new LocalService(serviceName, {
    cwd: process.cwd(),
    verbose: process.env.VERBOSE && (process.env.VERBOSE === 'true'),
  });
  localService.service[commandName]().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
};

// configure program
program
  .name('npx localservice')
  .description('Manage local services (utilizes Docker)')
  .version(version)
  .option('-v, --verbose', 'output verbose info (e.g. raw Docker commands)')
  .helpOption('-h, --help', 'display general help and usage info')
  .addHelpCommand('help <command>', 'Display help for specific <command>');

// support verbose option
program.on('option:verbose', () => {
  process.env.VERBOSE = program.opts().verbose;
});

// support info command
program.command('info')
  // .aliases(['config', 'status'])
  .description('Display service info')
  .argument('<service>', 'container service')
  .action((service) => execute(service, 'info'));

// support create command
program.command('create')
  .description('Create service container')
  .argument('<service>', 'container service')
  .action((service) => execute(service, 'create'));

// support stop command
program.command('stop')
  .description('Stop service container')
  .argument('<service>', 'container service')
  .action((service) => execute(service, 'stop'));

// support start command
program.command('start')
  .description('Start service container')
  .argument('<service>', 'container service')
  .action((service) => execute(service, 'start'));

// support push command
program.command('push')
  // .alias('seed')
  .description('Push data to service')
  .argument('<service>', 'container service')
  // @todo only env vars are supported right now, add support for this optional arg
  // .argument('[data]', 'data to push to service (comma separated file globs)')
  .action((service) => execute(service, 'push'));

// support remove command
program.command('remove')
  .description('Remove service container')
  .argument('<service>', 'container service')
  .action((service) => execute(service, 'remove'));

// parse command line arguments
program.parse();
