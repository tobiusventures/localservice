const fg = require('fast-glob');
const { dockerCommand } = require('docker-cli-js');

/**
 * Execute Docker command
 * @param {String} command
 * @param {Boolean} verbose [default=false]
 * @return {Promise<String>} result
 */
const executeDocker = async (command, verbose = false) => {
  const cmd = command.replace(/ +/g, ' ').trim();
  if (verbose) {
    console.info(`> docker ${cmd}`);
  }
  const response = await dockerCommand(cmd, {
    machineName: undefined,
    currentWorkingDirectory: undefined,
    echo: verbose,
    env: undefined,
    stdin: undefined,
  });
  return response.raw.trim();
};

/**
 * Find file paths
 * @param {Array.String} globs
 * @return {Promise<Array.String>} paths
 */
const findFilePaths = (globs) => fg(globs, { dot: true });

/**
 * Get container ID
 * @param {String} containerName
 * @param {Boolean} verbose [default=false]
 * @return {Promise<String>} containerId (undefined on failure)
 */
const getContainerId = async (containerName, verbose = false) => {
  const result = await executeDocker(`ps -aqf "name=${containerName}"`, verbose);
  if (verbose) {
    console.info(`> "${result}"`);
  }
  return result;
};

/**
 * Determine if container is running
 * @param {String} containerName
 * @param {Boolean} verbose [default=false]
 * @return {Promise<Boolean>} running
 */
const isContainerRunning = async (containerName, verbose = false) => {
  const result = await executeDocker('ps --format \'{{.Names}}\'', verbose);
  const containerNames = result.split('\n');
  return containerNames.includes(containerName);
};

/**
 * Verify service defined environment variables
 * @param {Object} env
 * @return {Promise<Boolean>}
 */
const verifyEnvironment = async (env) => {
  const missing = [];
  Object.keys(env).forEach((key) => {
    if (env[key].required) {
      if (!env[key].value) {
        missing.push(key);
      }
    }
  });
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return true;
};

/**
 * Print service container information
 * @param {String} displayServiceName
 * @param {Object} env
 * @param {Boolean} verbose [default=false]
 * @return {Promise}
 */
const printInfo = async (displayServiceName, env, verbose = false) => {
  const headerCharacter = '=';
  const minWidth = 16;

  // Environment Variables
  let verifiedError;
  try {
    await verifyEnvironment(env);
  } catch (err) {
    verifiedError = err.message;
  }
  const keys = Object.keys(env);
  const values = Object.values(env).map((obj) => obj.value || '');
  const defaultValues = Object.values(env).map((obj) => obj.defaultValue || '');
  const lengthComparator = (a, b) => ((a.toString().length > b.toString().length) ? a : b);
  const keyLength = Math.max(minWidth, keys.reduce(lengthComparator, '').length + 3);
  const defaultValueLength = Math.max(minWidth, defaultValues.reduce(lengthComparator, '').length + 3);
  const valueLength = Math.max(minWidth, values.reduce(lengthComparator, '').length + 3);
  console.info(`  ${headerCharacter.repeat(keyLength + 11 + defaultValueLength + valueLength - 3)}`);
  console.info(`  ${displayServiceName} Environment Variables`);
  console.info(`  ${headerCharacter.repeat(keyLength + 11 + defaultValueLength + valueLength - 3)}`);
  console.info([
    '  ',
    'Key'.padEnd(keyLength),
    'Required'.padEnd(11),
    'Default'.padEnd(defaultValueLength),
    'Value'.padEnd(valueLength),
  ].join(''));
  console.info([
    '  ',
    '-'.repeat(keyLength - 3).padEnd(keyLength),
    '-'.repeat(8).padEnd(11),
    '-'.repeat(defaultValueLength - 3).padEnd(defaultValueLength),
    '-'.repeat(valueLength - 3).padEnd(valueLength),
  ].join(''));
  keys.forEach((key) => {
    console.info([
      '  ',
      key.padEnd(keyLength),
      (env[key].required ? 'Y' : 'N').padEnd(11),
      (env[key].defaultValue || '').toString().padEnd(defaultValueLength),
      (env[key].value || '').toString().padEnd(valueLength),
    ].join(''));
  });
  if (verifiedError) {
    console.info(`  ${'~ '.repeat((keyLength + 11 + defaultValueLength + valueLength - 3) / 2)}`);
    console.info('  ERROR');
    console.info(`  ${verifiedError}`);
  }

  // Divider
  console.info();

  // Container Status
  console.info(`  ${headerCharacter.repeat((minWidth + 3) * 2 - 3)}`);
  console.info(`  ${displayServiceName} Container Status`);
  console.info(`  ${headerCharacter.repeat((minWidth + 3) * 2 - 3)}`);
  if (verifiedError) {
    console.info('  ERROR');
    console.info('  Container status commands will not run until env var errors are resolved');
    return;
  }
  const containerName = Object.keys(env).find((key) => /_CONTAINER_NAME$/.test(key));
  const containerId = await getContainerId(
    env[containerName].value,
    verbose,
  );
  const containerRunning = await isContainerRunning(
    env[containerName].value,
    verbose,
  );
  console.info([
    '  ',
    'Subject'.padEnd(minWidth + 3),
    'Value'.padEnd(minWidth + 3),
  ].join(''));
  console.info([
    '  ',
    '-'.repeat(minWidth).padEnd(minWidth + 3),
    '-'.repeat(minWidth).padEnd(minWidth + 3),
  ].join(''));
  console.info([
    '  ',
    'Container Name'.padEnd(minWidth + 3),
    `${env[containerName].value || 'Undefined'}`.padEnd(minWidth),
  ].join(''));
  console.info([
    '  ',
    'Container ID'.padEnd(minWidth + 3),
    `${containerId || 'Unknown'}`.padEnd(minWidth),
  ].join(''));
  console.info([
    '  ',
    'Container Status'.padEnd(minWidth + 3),
    `${!containerId ? 'N/A' : (containerRunning ? 'Running' : 'Stopped')}`.padEnd(minWidth),
  ].join(''));
};

/**
 * Sleep for x milliseconds
 * @param {Integer} ms
 * @return {Promise}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  executeDocker,
  findFilePaths,
  getContainerId,
  isContainerRunning,
  printInfo,
  sleep,
  verifyEnvironment,
};
