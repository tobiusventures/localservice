const path = require('path');
const {
  executeDocker,
  findFilePaths,
  getContainerId,
  isContainerRunning,
  printConfig,
  printStatus,
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
    this.options.serviceWaitInterval = this.options.serviceWaitInterval || 1000;
    this.options.serviceWaitMaxRetries = this.options.serviceWaitMaxRetries || 30;
    this.env = {
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
      MYSQL_ROOT_PASSWORD: {
        key: 'MYSQL_ROOT_PASSWORD',
        required: true,
        description: 'Password to use when creating the MySQL Service database root user',
        value: process.env.MYSQL_ROOT_PASSWORD || undefined,
        defaultValue: undefined,
      },
      MYSQL_SEED_FILES: {
        key: 'MYSQL_SEED_FILES',
        required: false,
        description: 'Path to SQL seed file glob(s) to execute during first time setup (separate by commas)',
        value: process.env.MYSQL_SEED_FILES || undefined,
        defaultValue: undefined,
      },
    };
  }

  /**
   * Determine if the MySQL container service is ready for connections
   * @return {Promise<Boolean>} running
   */
  async _isServiceReady() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(this.env.MYSQL_CONTAINER_NAME.value);
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(this.env.MYSQL_CONTAINER_NAME.value);
    if (!containerRunning) {
      return false;
    }
    try {
      const command = `exec \
        -e MYSQL_PWD=${this.env.MYSQL_ROOT_PASSWORD.value} \
        -i ${this.env.MYSQL_CONTAINER_NAME.value} \
        mysqladmin -u root status`;
      const data = await executeDocker(command);
      if (data.raw) {
        const uptime = parseInt(
          data.raw.trim().replace(/^Uptime: (\d+).*$/, '$1'),
          10,
        );
        if (uptime > 0) {
          return true;
        }
      }
    } catch(err) {
      return false;
    }
    return false;
  }

  /**
   * Wait until the MySQL container service is ready for connections
   * @return {Promise<Boolean>} isReady
   */
  async _waitUntilServiceIsReady() {
    let count = 0;
    let isReady = false;
    const sleep = () => setTimeout(() => undefined, this.options.serviceWaitInterval);
    while (count < this.options.serviceWaitMaxRetries) {
      isReady = await this._isServiceReady();
      if (isReady) {
        return true;
      } else {
        count += 1;
        await sleep();
      }
    }
    throw new Error('MySQL service took too long to start, please try again');
  }

  /**
   * Determine if the MySQL database is prepared
   * @return {Promise<Boolean>} prepared
   */
  async _isDatabasePrepared() {
    throw new Error('_isDatabasePrepared is not implemented');
  }

  /**
   * Prepare the root user inside the MySQL database
   * @return {Promise<Boolean>} prepared
   */
  async _prepareRootUser() {
    await verifyEnvironment(this.env);
    const sql = `UPDATE mysql.user SET host='%' WHERE user='root'; \
      FLUSH PRIVILEGES;`;
    const command = `exec \
      -e MYSQL_PWD=${this.env.MYSQL_ROOT_PASSWORD.value} \
      -i ${this.env.MYSQL_CONTAINER_NAME.value} \
      mysql -u root -e "${sql}"`;
    await executeDocker(command);
    console.info('Prepared MySQL root user');
    return true;
  }

  /**
   * Create the MySQL database
   * @return {Promise<Boolean>} created
   */
  async _createDatabase() {
    await verifyEnvironment(this.env);
    const sql = `CREATE DATABASE IF NOT EXISTS ${this.env.MYSQL_DATABASE.value};`;
    const command = `exec \
      -e MYSQL_PWD=${this.env.MYSQL_ROOT_PASSWORD.value} \
      -i ${this.env.MYSQL_CONTAINER_NAME.value} \
      mysql -u root -e "${sql}"`;
    await executeDocker(command);
    console.info('Created MySQL database');
    return true;
  }

  /**
   * Seed the MySQL database
   * @return {Promise<Boolean>} seeded
   */
  async _seedDatabase() {
    await verifyEnvironment(this.env);
    const seedFilePaths = await findFilePaths(this.env.MYSQL_SEED_FILES.value.trim().split(',').sort());
    let command;
    for (const seedFilePath of seedFilePaths) {
      console.info(`  Execute SQL: ${seedFilePath}`);
      command = `exec \
        -e MYSQL_PWD=${this.env.MYSQL_ROOT_PASSWORD.value} \
        -i ${this.env.MYSQL_CONTAINER_NAME.value} \
        mysql -u root < ${path.join(this.options.cwd, seedFilePath)}`;
      await executeDocker(command);
    }
    // seedFilePaths.forEach(async (seedFilePath) => {
    // });
    console.info('Seeded MySQL database');
    return true;
  }

  /**
   * Print config information
   * @param {Object} env
   * @return {Promise}
   */
  async config() {
    printConfig('MySQL', this.env);
  }

  /**
   * Print status information
   * @return {Promise}
   */
  async status() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(this.env.MYSQL_CONTAINER_NAME.value);
    const containerRunning = await isContainerRunning(this.env.MYSQL_CONTAINER_NAME.value);
    const serviceReady = await this._isServiceReady();
    printStatus('MySQL', containerId, containerRunning, serviceReady);
  }

  /**
   * Create a new MySQL Service container
   * @todo Should create call prepare?
   * @return {Promise<String>} containerId
   */
  async create() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(this.env.MYSQL_CONTAINER_NAME.value);
    if (containerId) {
      throw new Error('MySQL container already exists');
    }
    const command = `run --name ${this.env.MYSQL_CONTAINER_NAME.value} \
      -p ${this.env.MYSQL_EXPOSED_PORT.value}:3306 \
      -v ${this.env.MYSQL_CONTAINER_NAME.value}:${this.env.MYSQL_PATH.value} \
      -e MYSQL_ROOT_PASSWORD=${this.env.MYSQL_ROOT_PASSWORD.value} \
      -d ${this.env.MYSQL_IMAGE.value}`;
    const data = await executeDocker(command);
    await this._waitUntilServiceIsReady();
    console.info('Created MySQL container');
    return data.containerId;
  }

  /**
   * Prepare a new MySQL Service container for first time use
   * @return {Promise<Boolean>} prepared
   */
  async prepare() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(this.env.MYSQL_CONTAINER_NAME.value);
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(this.env.MYSQL_CONTAINER_NAME.value);
    if (!containerRunning) {
      throw new Error('MySQL container is not running');
    }
    await this._waitUntilServiceIsReady();
    // @todo add isDatabasePrepared support
    // const databasePrepared = await isDatabasePrepared();
    // if (databasePrepared) {
    //   throw new Error('MySQL database is already prepared');
    // }
    await this._prepareRootUser();
    await this._createDatabase();
    if (this.env.MYSQL_SEED_FILES.value) {
      await this._seedDatabase();
    }
    console.info('Prepared MySQL container');
    return true;
  }

  /**
   * Start the existing MySQL Service container
   * @return {Promise<Boolean>} started
   */
  async start() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(this.env.MYSQL_CONTAINER_NAME.value);
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(this.env.MYSQL_CONTAINER_NAME.value);
    if (containerRunning) {
      throw new Error('MySQL container is already running');
    }
    const command = `container start ${this.env.MYSQL_CONTAINER_NAME.value}`;
    const data = await executeDocker(command);
    const containerName = data.raw.trim();
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
    const containerId = await getContainerId(this.env.MYSQL_CONTAINER_NAME.value);
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(this.env.MYSQL_CONTAINER_NAME.value);
    if (!containerRunning) {
      throw new Error('MySQL container is not running');
    }
    const command = `container stop ${this.env.MYSQL_CONTAINER_NAME.value}`;
    const data = await executeDocker(command);
    const containerName = data.raw.trim();
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
    const containerId = await getContainerId(this.env.MYSQL_CONTAINER_NAME.value);
    if (!containerId) {
      throw new Error('MySQL container does not exist');
    }
    const containerRunning = await isContainerRunning(this.env.MYSQL_CONTAINER_NAME.value);
    if (containerRunning) {
      await this.stop();
    }
    const command = `container rm ${this.env.MYSQL_CONTAINER_NAME.value}`;
    const data = await executeDocker(command);
    const containerName = data.raw.trim();
    if (containerName !== this.env.MYSQL_CONTAINER_NAME.value) {
      throw new Error('Failed to remove MySQL container');
    }
    console.info('Removed MySQL container');
    return true;
  }
}

module.exports = (options) => new MySQLService(options);
