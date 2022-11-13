#!/usr/bin/env node

require('dotenv/config');

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
 * Show usage instructions
 * @return Void
 */
function showUsage() {
  console.info('Usage: localservice [options] <service> <command>');
  console.info('');
  console.info('Services:');
  console.info('');
  console.info('  minio     MinIO object storage (s3 compatible)');
  console.info('  mysql     MySQL database');
  console.info('');
  console.info('Options:');
  console.info('');
  console.info('  -v, --verbose   Show verbose info (e.g. raw docker commands, etc)');
  console.info('  -h, --help      Show this help screen');
  console.info('');
  console.info('Commands:');
  console.info('');
  console.info('  config    Get service container config info');
  console.info('  create    Create new service container');
  console.info('  remove    Remove service container');
  console.info('  seed      Populate service container with seed data');
  console.info('  start     Start service container');
  console.info('  status    Get service container status info');
  console.info('  stop      Stop service container');
  process.exit();
}

// cli args
const args = process.argv.slice(2);
let verbose = false;
if (args.length && (args[0] === '-v' || args[0] === '--verbose')) {
  verbose = true;
  args.shift();
}
const serviceName = args[0];
const commandName = args[1];

// usage
const commands = [
  'config',
  'create',
  'remove',
  'seed',
  'start',
  'status',
  'stop',
];
if (!serviceName || !commandName || !commands.includes(commandName)) {
  showUsage();
}

// run
const localService = new LocalService(serviceName, {
  cwd: process.cwd(),
  verbose,
});
localService.service[commandName]().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
