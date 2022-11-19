const path = require('path');
const {
  executeDocker,
  findFilePaths,
  getContainerId,
  isContainerRunning,
  printInfo,
  verifyEnvironment,
} = require('./util');

/**
 * PostgreSQL Service
 * @class PostgreSQLService
 */
class PostgreSQLService {

  /**
   * Instantiate PostgreSQL Service
   * @constructor
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.options = options;
    this.options.cwd = this.options.cwd || process.cwd();
    this.options.verbose = this.options.verbose || false;
    this.env = {
      PGSQL_CHARSET: {
        key: 'PGSQL_CHARSET',
        required: false,
        description: 'Character set used to create a new PostgreSQL database',
        value: process.env.PGSQL_CHARSET || 'utf8mb4',
        defaultValue: 'utf8mb4',
      },
      PGSQL_COLLATE: {
        key: 'PGSQL_COLLATE',
        required: false,
        description: 'Character collate used to create a new PostgreSQL database',
        value: process.env.PGSQL_COLLATE || 'utf8mb4_bin',
        defaultValue: 'utf8mb4_bin',
      },
      PGSQL_CONTAINER_NAME: {
        key: 'PGSQL_CONTAINER_NAME',
        required: true,
        description: 'Name used to identify PostgreSQL Service Docker container',
        value: process.env.PGSQL_CONTAINER_NAME || undefined,
        defaultValue: undefined,
      },
      PGSQL_DATABASE: {
        key: 'PGSQL_DATABASE',
        required: true,
        description: 'Name used to identify PostgreSQL Service database',
        value: process.env.PGSQL_DATABASE || undefined,
        defaultValue: undefined,
      },
      PGSQL_EXPOSED_PORT: {
        key: 'PGSQL_EXPOSED_PORT',
        required: true,
        description: 'Local network port used to expose PostgreSQL Service',
        value: process.env.PGSQL_EXPOSED_PORT || '5432',
        defaultValue: '3306',
      },
      PGSQL_IMAGE: {
        key: 'PGSQL_IMAGE',
        required: true,
        description: 'PostgreSQL Server Docker image for your processor: https://hub.docker.com/_/postgres/tags',
        value: process.env.PGSQL_IMAGE || undefined,
        defaultValue: undefined,
      },
      PGSQL_PATH: {
        key: 'PGSQL_PATH',
        required: true,
        description: 'Path to the preferred PostgreSQL Service library file folder',
        value: process.env.PGSQL_PATH || '/var/lib/postgresql/data',
        defaultValue: '/var/lib/postgresql/data',
      },
      PGSQL_PUSH_FILES: {
        key: 'PGSQL_PUSH_FILES',
        required: false,
        description: 'Path to SQL file glob(s) to push (execute) during first time setup (separated by commas)',
        value: process.env.PGSQL_PUSH_FILES || process.env.PGSQL_SEED_FILES || undefined,
        defaultValue: undefined,
      },
      PGSQL_ROOT_PASSWORD: {
        key: 'PGSQL_ROOT_PASSWORD',
        required: true,
        description: 'Password to use when creating the PostgreSQL Service database root user',
        value: process.env.PGSQL_ROOT_PASSWORD || undefined,
        defaultValue: undefined,
      },
      PGSQL_SERVICE_WAIT_INTERVAL: {
        key: 'PGSQL_SERVICE_WAIT_INTERVAL',
        required: false,
        description: 'Number of milliseconds to wait between PostgreSQL service uptime test retries',
        value: process.env.PGSQL_SERVICE_WAIT_INTERVAL || 1000,
        defaultValue: 1000,
      },
      PGSQL_SERVICE_WAIT_MAX_RETRIES: {
        key: 'PGSQL_SERVICE_WAIT_MAX_RETRIES',
        required: false,
        description: 'Maximum number of times to retry PostgreSQL service uptime test before timing out',
        value: process.env.PGSQL_SERVICE_WAIT_MAX_RETRIES || 30,
        defaultValue: 30,
      },
    };
  }

  /**
   * Determine if the PostgreSQL container service is ready for connections
   * @return {Promise<Boolean>} running
   */
  async _isServiceReady() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('PostgreSQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerRunning) {
      return false;
    }
    const command = `exec \
      -e POSTGRES_PASSWORD=${this.env.PGSQL_ROOT_PASSWORD.value} \
      -i ${this.env.PGSQL_CONTAINER_NAME.value} \
      pg_isready`;
    try {
      const result = await executeDocker(command, this.options.verbose);
      return /accepting connections/.test(result);
    } catch (err) {
      // console.warn('_isServiceReady', { err });
      return false;
    }
  }

  /**
   * Wait until the PostgreSQL container service is ready for connections
   * @return {Promise<Boolean>} isReady
   */
  async _waitUntilServiceIsReady() {
    let count = 0;
    let isReady = false;
    const sleep = () => setTimeout(() => undefined, this.env.PGSQL_SERVICE_WAIT_INTERVAL.value);
    /* eslint-disable no-await-in-loop */
    while (count < this.env.PGSQL_SERVICE_WAIT_MAX_RETRIES.value) {
      isReady = await this._isServiceReady();
      if (isReady) {
        return true;
      }
      count += 1;
      await sleep();
    }
    /* eslint-enable no-await-in-loop */
    throw new Error('PostgreSQL service took too long to start, please try again (or update `PGSQL_SERVICE_WAIT_*` settings)');
  }

  /**
   * Prepare the root user inside the PostgreSQL database
   * @return {Promise<Boolean>} prepared
   */
  async _prepareRootUser() {
    await verifyEnvironment(this.env);
    const sql = [
      'UPDATE mysql.user SET host=\'%\' WHERE user=\'root\';',
      'FLUSH PRIVILEGES;',
      `ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '${this.env.PGSQL_ROOT_PASSWORD.value}';`,
      'FLUSH PRIVILEGES;',
    ].join('\n');
    const command = `exec \
      -e POSTGRES_PASSWORD=${this.env.PGSQL_ROOT_PASSWORD.value} \
      -i ${this.env.PGSQL_CONTAINER_NAME.value} \
      mysql -u root -e "${sql}"`;
    await executeDocker(command, this.options.verbose);
    console.info('Prepared PostgreSQL root user');
    return true;
  }

  /**
   * Create the PostgreSQL database
   * @return {Promise<Boolean>} created
   */
  async _createDatabase() {
    await verifyEnvironment(this.env);
    const sql = `CREATE DATABASE IF NOT EXISTS ${this.env.PGSQL_DATABASE.value}`; // CHARACTER SET ${this.env.PGSQL_CHARSET.value} COLLATE ${this.env.PGSQL_COLLATE.value};`;
    const command = `exec \
      -e POSTGRES_PASSWORD=${this.env.PGSQL_ROOT_PASSWORD.value} \
      -i ${this.env.PGSQL_CONTAINER_NAME.value} \
      postgres psql -U postgres -w -e "${sql}"`;
    await executeDocker(command, this.options.verbose);
    console.info('Created PostgreSQL database');
    return true;
  }

  /**
   * Seed the PostgreSQL database
   * @return {Promise<Boolean>} seeded
   */
  async _seedDatabase() {
    await verifyEnvironment(this.env);
    const seedFilePaths = await findFilePaths(this.env.PGSQL_SEED_FILES.value.trim().split(',').sort());
    let command;
    const dockerCommands = seedFilePaths.map((seedFilePath) => () => {
      console.info(`  Execute SQL: ${seedFilePath}`);
      command = `exec \
        -e POSTGRES_PASSWORD=${this.env.PGSQL_ROOT_PASSWORD.value} \
        -i ${this.env.PGSQL_CONTAINER_NAME.value} \
        mysql -u root < ${path.join(this.options.cwd, seedFilePath)}`;
      return executeDocker(command, this.options.verbose);
    });
    await Promise.all(dockerCommands);
    console.info('Seeded PostgreSQL database');
    return true;
  }

  /**
   * Create a new PostgreSQL Service container
   * @return {Promise<String>} containerId
   */
  async create() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (containerId) {
      throw new Error('PostgreSQL container already exists');
    }
    const command = `run --name ${this.env.PGSQL_CONTAINER_NAME.value} \
      -p ${this.env.PGSQL_EXPOSED_PORT.value}:5432 \
      -v ${this.env.PGSQL_CONTAINER_NAME.value}:${this.env.PGSQL_PATH.value} \
      -e POSTGRES_PASSWORD=${this.env.PGSQL_ROOT_PASSWORD.value} \
      -d ${this.env.PGSQL_IMAGE.value}`;
    const newContainerId = await executeDocker(command, this.options.verbose);
    await this._waitUntilServiceIsReady();
    // await this._prepareRootUser();
    await this._createDatabase();
    console.info('Created PostgreSQL container');
    return newContainerId;
  }

  /**
   * Print service container information
   * @return {Promise}
   */
  async info() {
    printInfo('PostgreSQL', this.env, this.verbose);
  }

  /**
   * Push seed data to the existing PostgreSQL Service container database
   * @return {Promise<Boolean>} pushed
   */
  async push() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('PostgreSQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerRunning) {
      throw new Error('PostgreSQL container is not running');
    }
    await this._waitUntilServiceIsReady();
    await this._seedDatabase();
    return true;
  }

  /**
   * Start the existing PostgreSQL Service container
   * @return {Promise<Boolean>} started
   */
  async start() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('PostgreSQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (containerRunning) {
      throw new Error('PostgreSQL container is already running');
    }
    const command = `container start ${this.env.PGSQL_CONTAINER_NAME.value}`;
    const containerName = await executeDocker(command, this.options.verbose);
    if (containerName !== this.env.PGSQL_CONTAINER_NAME.value) {
      throw new Error('Failed to start PostgreSQL container');
    }
    console.info('Started PostgreSQL container');
    return true;
  }

  /**
   * Stop the existing PostgreSQL Service container
   * @return {Promise<Boolean>} stopped
   */
  async stop() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('PostgreSQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerRunning) {
      throw new Error('PostgreSQL container is not running');
    }
    const command = `container stop ${this.env.PGSQL_CONTAINER_NAME.value}`;
    const containerName = await executeDocker(command, this.options.verbose);
    if (containerName !== this.env.PGSQL_CONTAINER_NAME.value) {
      throw new Error('Failed to stop PostgreSQL container');
    }
    console.info('Stopped PostgreSQL container');
    return true;
  }

  /**
   * Remove the existing PostgreSQL Service container
   */
  async remove() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('PostgreSQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.PGSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (containerRunning) {
      await this.stop();
    }
    const containerCommand = `container rm ${this.env.PGSQL_CONTAINER_NAME.value}`;
    const containerName = await executeDocker(containerCommand, this.options.verbose);
    if (containerName !== this.env.PGSQL_CONTAINER_NAME.value) {
      throw new Error('Failed to remove PostgreSQL container');
    }
    console.info('Removed PostgreSQL container');
    const volumeCommand = `volume rm ${this.env.PGSQL_CONTAINER_NAME.value}`;
    const volumeName = await executeDocker(volumeCommand, this.options.verbose);
    if (volumeName !== this.env.PGSQL_CONTAINER_NAME.value) {
      throw new Error('Failed to remove PostgreSQL volume');
    }
    console.info('Removed PostgreSQL volume');
    return true;
  }
}

module.exports = (options) => new PostgreSQLService(options);
