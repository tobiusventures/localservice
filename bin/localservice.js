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
  .description(`Supported Services:
  minio             MinIO object storage (s3 compatible)
  mysql             MySQL database
  postgres          PostgreSQL database`)
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
  .description('Display service info (env vars and container status)')
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

// auto correct deprecated command line argument order
// @todo: remove this workaround before version 1.0.0 is released
const args = [...process.argv];
const services = ['minio', 'mysql', 'postgres'];
const commands = program.commands.map((command) => command._name);
const legacy = [-1, -1];
args.forEach((arg, idx) => {
  if (legacy[0] === -1 && services.includes(arg)) {
    legacy[0] = idx;
  }
  if (legacy[1] === -1 && commands.includes(arg)) {
    legacy[1] = idx;
  }
});
if (legacy.reduce((a, b) => a + b) !== -2) {
  const swap = [args[legacy[0]], args[legacy[1]]];
  /* eslint-disable prefer-destructuring */
  args[legacy[0]] = swap[1];
  args[legacy[1]] = swap[0];
  /* eslint-enable prefer-destructuring */
  console.warn(`  ${['!!', '~ '.repeat(39)].join(' ').padEnd(81)}!!`);
  console.warn(`  ${'!! WARNING'.padEnd(81, ' ')}!!`);
  console.warn(`  ${'!!'.padEnd(81, ' ')}!!`);
  console.warn(`  ${'!! Deprecated command line argument order was detected and auto corrected.'.padEnd(81, ' ')}!!`);
  console.warn(`  ${['!! -- npx localservice ', process.argv.slice(2).join(' ')].join('').padEnd(81, ' ')}!!`);
  console.warn(`  ${['!! ++ npx localservice ', args.slice(2).join(' ')].join('').padEnd(81, ' ')}!!`);
  console.warn(`  ${'!!'.padEnd(81, ' ')}!!`);
  console.warn(`  ${'!! Update your implementation, this workaround will be removed in the future.'.padEnd(81, ' ')}!!`);
  console.warn(`  ${['!!', '~ '.repeat(39)].join(' ').padEnd(81)}!!`);
  console.warn();
}

// parse command line arguments
program.parse(args);
