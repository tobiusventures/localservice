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
 * MySQL Service
 * @class MySQLService
 */
class MySQLService {

  /**
   * Instantiate MySQL Service
   * @constructor
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.options = options;
    this.options.cwd = this.options.cwd || process.cwd();
    this.options.verbose = this.options.verbose || false;
    this.env = {
      MYSQL_CHARSET: {
        key: 'MYSQL_CHARSET',
        required: false,
        description: 'Character set used to create a new MySQL database',
        value: process.env.MYSQL_CHARSET || 'utf8mb4',
        defaultValue: 'utf8mb4',
      },
      MYSQL_COLLATE: {
        key: 'MYSQL_COLLATE',
        required: false,
        description: 'Character collate used to create a new MySQL database',
        value: process.env.MYSQL_COLLATE || 'utf8mb4_bin',
        defaultValue: 'utf8mb4_bin',
      },
      MYSQL_CONTAINER_NAME: {
        key: 'MYSQL_CONTAINER_NAME',
        required: true,
        description: 'Name used to identify MySQL Service Docker container',
        value: process.env.MYSQL_CONTAINER_NAME || undefined,
        defaultValue: undefined,
      },
      MYSQL_DATABASE: {
        key: 'MYSQL_DATABASE',
        required: true,
        description: 'Name used to identify MySQL Service database',
        value: process.env.MYSQL_DATABASE || undefined,
        defaultValue: undefined,
      },
      MYSQL_EXPOSED_PORT: {
        key: 'MYSQL_EXPOSED_PORT',
        required: true,
        description: 'Local network port used to expose MySQL Service',
        value: process.env.MYSQL_EXPOSED_PORT || '3306',
        defaultValue: '3306',
      },
      MYSQL_IMAGE: {
        key: 'MYSQL_IMAGE',
        required: true,
        description: 'MySQL Server Docker image for your processor: https://hub.docker.com/r/mysql/mysql-server/tags',
        value: process.env.MYSQL_IMAGE || undefined,
        defaultValue: undefined,
      },
      MYSQL_PATH: {
        key: 'MYSQL_PATH',
        required: true,
        description: 'Path to the preferred MySQL Service library file folder',
        value: process.env.MYSQL_PATH || '/var/lib/mysql',
        defaultValue: '/var/lib/mysql',
      },
      MYSQL_PUSH_FILES: {
        key: 'MYSQL_PUSH_FILES',
        required: false,
        description: 'Path to SQL file glob(s) to push (execute) during first time setup (separated by commas)',
        value: process.env.MYSQL_PUSH_FILES || process.env.MYSQL_SEED_FILES || undefined,
        defaultValue: undefined,
      },
      MYSQL_ROOT_PASSWORD: {
        key: 'MYSQL_ROOT_PASSWORD',
        required: true,
        description: 'Password to use when creating the MySQL Service database root user',
        value: process.env.MYSQL_ROOT_PASSWORD || undefined,
        defaultValue: undefined,
      },
      MYSQL_SERVICE_WAIT_INTERVAL: {
        key: 'MYSQL_SERVICE_WAIT_INTERVAL',
        required: false,
        description: 'Number of milliseconds to wait between MySQL service uptime test retries',
        value: process.env.MYSQL_SERVICE_WAIT_INTERVAL || 1000,
        defaultValue: 1000,
      },
      MYSQL_SERVICE_WAIT_MAX_RETRIES: {
        key: 'MYSQL_SERVICE_WAIT_MAX_RETRIES',
        required: false,
        description: 'Maximum number of times to retry MySQL service uptime test before timing out',
        value: process.env.MYSQL_SERVICE_WAIT_MAX_RETRIES || 30,
        defaultValue: 30,
      },
    };
  }

  /**
   * Determine if the MySQL container service is ready for connections
   * @return {Promise<Boolean>} running
   */
  async _isServiceReady() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerRunning) {
      return false;
    }
    const command = `exec \
      -e MYSQL_PWD=${this.env.MYSQL_ROOT_PASSWORD.value} \
      -i ${this.env.MYSQL_CONTAINER_NAME.value} \
      mysqladmin -u root status`;
    try {
      const result = await executeDocker(command, this.options.verbose);
      if (result) {
        const uptime = parseInt(
          result.replace(/^Uptime: (\d+).*$/, '$1'),
          10,
        );
        if (uptime > 0) {
          return true;
        }
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Wait until the MySQL container service is ready for connections
   * @return {Promise<Boolean>} isReady
   */
  async _waitUntilServiceIsReady() {
    let count = 0;
    let isReady = false;
    const sleep = () => setTimeout(() => undefined, this.env.MYSQL_SERVICE_WAIT_INTERVAL.value);
    /* eslint-disable no-await-in-loop */
    while (count < this.env.MYSQL_SERVICE_WAIT_MAX_RETRIES.value) {
      isReady = await this._isServiceReady();
      if (isReady) {
        return true;
      }
      count += 1;
      await sleep();
    }
    /* eslint-enable no-await-in-loop */
    throw new Error('MySQL service took too long to start, please try again (or update `MYSQL_SERVICE_WAIT_*` settings)');
  }

  /**
   * Prepare the root user inside the MySQL database
   * @return {Promise<Boolean>} prepared
   */
  async _prepareRootUser() {
    await verifyEnvironment(this.env);
    const sql = [
      'UPDATE mysql.user SET host=\'%\' WHERE user=\'root\';',
      'FLUSH PRIVILEGES;',
      `ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '${this.env.MYSQL_ROOT_PASSWORD.value}';`,
      'FLUSH PRIVILEGES;',
    ].join('\n');
    const command = `exec \
      -e MYSQL_PWD=${this.env.MYSQL_ROOT_PASSWORD.value} \
      -i ${this.env.MYSQL_CONTAINER_NAME.value} \
      mysql -u root -e "${sql}"`;
    await executeDocker(command, this.options.verbose);
    console.info('Prepared MySQL root user');
    return true;
  }

  /**
   * Create the MySQL database
   * @return {Promise<Boolean>} created
   */
  async _createDatabase() {
    await verifyEnvironment(this.env);
    const sql = `CREATE DATABASE IF NOT EXISTS ${this.env.MYSQL_DATABASE.value} CHARACTER SET ${this.env.MYSQL_CHARSET.value} COLLATE ${this.env.MYSQL_COLLATE.value};`;
    const command = `exec \
      -e MYSQL_PWD=${this.env.MYSQL_ROOT_PASSWORD.value} \
      -i ${this.env.MYSQL_CONTAINER_NAME.value} \
      mysql -u root -e "${sql}"`;
    await executeDocker(command, this.options.verbose);
    console.info('Created MySQL database');
    return true;
  }

  /**
   * Seed the MySQL database
   * @return {Promise<Boolean>} seeded
   */
  async _seedDatabase() {
    await verifyEnvironment(this.env);
    if (!this.env.MYSQL_PUSH_FILES.value) {
      throw new Error('Required configuration `MYSQL_PUSH_FILES` is undefined');
    }
    const configuredPaths = this.env.MYSQL_PUSH_FILES.value.trim().split(',').sort();
    const sqlFilePaths = await findFilePaths(configuredPaths);
    if (!sqlFilePaths.length) {
      throw new Error('No valid file paths discovered in `MYSQL_PUSH_FILES`');
    }
    let command;
    const dockerCommands = sqlFilePaths.map((sqlFilePath) => () => {
      console.info(`  Execute SQL: ${sqlFilePath}`);
      command = `exec \
        -e MYSQL_PWD=${this.env.MYSQL_ROOT_PASSWORD.value} \
        -i ${this.env.MYSQL_CONTAINER_NAME.value} \
        mysql -u root < ${path.join(this.options.cwd, sqlFilePath)}`;
      return executeDocker(command, this.options.verbose);
    });
    await Promise.all(dockerCommands);
    console.info('Pushed MySQL data');
    return true;
  }

  /**
   * Create a new MySQL Service container
   * @return {Promise<String>} containerId
   */
  async create() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (containerId) {
      throw new Error('MySQL container already exists');
    }
    const command = `run -d \
      --name ${this.env.MYSQL_CONTAINER_NAME.value} \
      -p ${this.env.MYSQL_EXPOSED_PORT.value}:3306 \
      -v ${this.env.MYSQL_CONTAINER_NAME.value}:${this.env.MYSQL_PATH.value} \
      -e MYSQL_ROOT_PASSWORD=${this.env.MYSQL_ROOT_PASSWORD.value} \
      ${this.env.MYSQL_IMAGE.value}`;
    const newContainerId = await executeDocker(command, this.options.verbose);
    await this._waitUntilServiceIsReady();
    await this._prepareRootUser();
    await this._createDatabase();
    console.info('Created MySQL container');
    return newContainerId;
  }

  /**
   * Print service container information
   * @return {Promise}
   */
  async info() {
    printInfo('MySQL', this.env, this.verbose);
  }

  /**
   * Push seed data to the existing MySQL Service container database
   * @return {Promise<Boolean>} pushed
   */
  async push() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerRunning) {
      throw new Error('MySQL container is not running');
    }
    await this._waitUntilServiceIsReady();
    await this._seedDatabase();
    return true;
  }

  /**
   * Start the existing MySQL Service container
   * @return {Promise<Boolean>} started
   */
  async start() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (containerRunning) {
      throw new Error('MySQL container is already running');
    }
    const command = `container start ${this.env.MYSQL_CONTAINER_NAME.value}`;
    const containerName = await executeDocker(command, this.options.verbose);
    if (containerName !== this.env.MYSQL_CONTAINER_NAME.value) {
      throw new Error('Failed to start MySQL container');
    }
    console.info('Started MySQL container');
    return true;
  }

  /**
   * Stop the existing MySQL Service container
   * @return {Promise<Boolean>} stopped
   */
  async stop() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerRunning) {
      throw new Error('MySQL container is not running');
    }
    const command = `container stop ${this.env.MYSQL_CONTAINER_NAME.value}`;
    const containerName = await executeDocker(command, this.options.verbose);
    if (containerName !== this.env.MYSQL_CONTAINER_NAME.value) {
      throw new Error('Failed to stop MySQL container');
    }
    console.info('Stopped MySQL container');
    return true;
  }

  /**
   * Remove the existing MySQL Service container
   */
  async remove() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.MYSQL_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (containerRunning) {
      await this.stop();
    }
    const containerCommand = `container rm ${this.env.MYSQL_CONTAINER_NAME.value}`;
    const containerName = await executeDocker(containerCommand, this.options.verbose);
    if (containerName !== this.env.MYSQL_CONTAINER_NAME.value) {
      throw new Error('Failed to remove MySQL container');
    }
    console.info('Removed MySQL container');
    const volumeCommand = `volume rm ${this.env.MYSQL_CONTAINER_NAME.value}`;
    const volumeName = await executeDocker(volumeCommand, this.options.verbose);
    if (volumeName !== this.env.MYSQL_CONTAINER_NAME.value) {
      throw new Error('Failed to remove MySQL volume');
    }
    console.info('Removed MySQL volume');
    return true;
  }
}

module.exports = (options) => new MySQLService(options);
