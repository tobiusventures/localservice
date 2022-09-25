const fg = require('fast-glob');
const { dockerCommand } = require('docker-cli-js');

/**
 * Execute Docker command
 * @return {Promise<String>} result
 */
const executeDocker = async (command) => {
  const cmd = command.replace(/ +/g, ' ').trim();
  const response = await dockerCommand(cmd, {
    machineName: undefined,
    currentWorkingDirectory: undefined,
    echo: false,
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
 * @return {Promise<String>} containerId (undefined on failure)
 */
const getContainerId = (containerName) => executeDocker(`ps -aqf "name=${containerName}"`);

/**
 * Determine if container is running
 * @param {String} containerName
 * @return {Promise<Boolean>} running
 */
const isContainerRunning = async (containerName) => {
  const result = await executeDocker('ps --format \'{{.Names}}\'');
  const containerNames = result.split('\n');
  return containerNames.includes(containerName);
};

/**
 * Print config information
 * @param {String} displayServiceName
 * @param {Object} env
 * @return {Promise}
 */
const printConfig = async (displayServiceName, env) => {
  console.info(`${displayServiceName} Configuration:`);
  console.info('');
  const keys = Object.keys(env);
  const values = Object.values(env).map((obj) => obj.value || '');
  const defaultValues = Object.values(env).map((obj) => obj.defaultValue || '');
  const lengthComparator = (a, b) => ((a.length > b.length) ? a : b);
  const keyLength = keys.reduce(lengthComparator, '').length + 3;
  const defaultValueLength = defaultValues.reduce(lengthComparator, '').length + 3;
  const valueLength = values.reduce(lengthComparator, '').length + 3;
  console.info([
    '  ',
    'Key'.padEnd(keyLength),
    'Default'.padEnd(defaultValueLength),
    'Value'.padEnd(valueLength),
    'Required'.padEnd(11),
  ].join(''));
  console.info([
    '  ',
    '-'.repeat(keyLength - 3), '   ',
    '-'.repeat(defaultValueLength - 3), '   ',
    '-'.repeat(valueLength - 3), '   ',
    '-'.repeat(8),
  ].join(''));
  keys.forEach((key) => {
    console.info([
      '  ',
      key.padEnd(keyLength),
      (env[key].defaultValue || '').padEnd(defaultValueLength),
      (env[key].value || 'none').padEnd(valueLength),
      (env[key].required ? 'Y' : 'N').padEnd(11),
    ].join(''));
  });
};

/**
 * Print status information
 * @param {String} displayServiceName
 * @param {String} containerId
 * @param {Boolean} containerRunning
 * @param {Boolean} serviceReady
 * @return {Promise}
 */
const printStatus = async (displayServiceName, containerId, containerRunning, serviceReady) => {
  console.info(`${displayServiceName} Status:`);
  console.info('');
  console.info(`  Container ID      ${containerId || 'Unknown'}`);
  console.info(`  Container Status  ${!containerId ? 'N/A' : (containerRunning ? 'Running' : 'Stopped')}`);
  console.info(`  Service Status    ${!containerId ? 'N/A' : (serviceReady ? 'Ready' : 'Not Ready')}`);
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

module.exports = {
  executeDocker,
  findFilePaths,
  getContainerId,
  isContainerRunning,
  printConfig,
  printStatus,
  verifyEnvironment,
};
