/* eslint-disable class-methods-use-this */
const {
  executeDocker,
  getContainerId,
  isContainerRunning,
  printConfig,
  printStatus,
  verifyEnvironment,
} = require('./util');

/**
 * MinIO Service
 * @class MinIOService
 */
class MinIOService {

  /**
   * Instantiate MinIO Service
   * @constructor
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.options = options;
    this.options.cwd = this.options.cwd || process.cwd();
    this.options.verbose = this.options.verbose || false;
    this.env = {
      MINIO_CONTAINER_NAME: {
        key: 'MINIO_CONTAINER_NAME',
        required: true,
        description: 'Name used to identify MinIO Service Docker container',
        value: process.env.MINIO_CONTAINER_NAME || undefined,
        defaultValue: undefined,
      },
      MINIO_EXPOSED_PORT: {
        key: 'MINIO_EXPOSED_PORT',
        required: true,
        description: 'Local network port used to expose MinIO Service',
        value: process.env.MINIO_EXPOSED_PORT || '9000',
        defaultValue: '9000',
      },
      MINIO_EXPOSED_WEB_PORT: {
        key: 'MINIO_EXPOSED_WEB_PORT',
        required: true,
        description: 'Local network port used to expose MinIO Web Console',
        value: process.env.MINIO_EXPOSED_WEB_PORT || '9001',
        defaultValue: '9001',
      },
      MINIO_IMAGE: {
        key: 'MINIO_IMAGE',
        required: true,
        description: 'MinIO Server Docker image for your processor: https://hub.docker.com/r/minio/minio/tags',
        value: process.env.MINIO_IMAGE || undefined,
        defaultValue: undefined,
      },
      MINIO_PATH: {
        key: 'MINIO_PATH',
        required: true,
        description: 'Path to the preferred MinIO Service library file folder',
        value: process.env.MINIO_PATH || '/data',
        defaultValue: '/data',
      },
      MINIO_ROOT_USER: {
        key: 'MINIO_ROOT_USER',
        required: true,
        description: 'Username to use when creating the MinIO Service root user',
        value: process.env.MINIO_ROOT_USER || undefined,
        defaultValue: undefined,
      },
      MINIO_ROOT_PASSWORD: {
        key: 'MINIO_ROOT_PASSWORD',
        required: true,
        description: 'Password to use when creating the MinIO Service root user',
        value: process.env.MINIO_ROOT_PASSWORD || undefined,
        defaultValue: undefined,
      },
      MINIO_SERVICE_WAIT_INTERVAL: {
        key: 'MINIO_SERVICE_WAIT_INTERVAL',
        required: false,
        description: 'Number of milliseconds to wait between MinIO service uptime test retries',
        value: process.env.MINIO_SERVICE_WAIT_INTERVAL || 1000,
        defaultValue: 1000,
      },
      MINIO_SERVICE_WAIT_MAX_RETRIES: {
        key: 'MINIO_SERVICE_WAIT_MAX_RETRIES',
        required: false,
        description: 'Maximum number of times to retry MinIO service uptime test before timing out',
        value: process.env.MINIO_SERVICE_WAIT_MAX_RETRIES || 30,
        defaultValue: 30,
      },
      MINIO_SEED_FILES: {
        key: 'MINIO_SEED_FILES',
        required: false,
        description: 'Path to MinIO object storage seed file glob(s) to import during first time setup (separate by commas)',
        value: process.env.MINIO_SEED_FILES || undefined,
        defaultValue: undefined,
      },
    };
  }

  /**
   * Print config information
   * @param {Object} env
   * @return {Promise}
   */
  async config() {
    printConfig('MinIO', this.env);
  }

  /**
   * Print status information
   * @return {Promise}
   */
  async status() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MINIO_CONTAINER_NAME.value,
      this.options.verbose,
    );
    const containerRunning = await isContainerRunning(
      this.env.MINIO_CONTAINER_NAME.value,
      this.options.verbose,
    );
    printStatus('MinIO', containerId, containerRunning, containerRunning);
  }

  /**
   * Create a new MinIO Service container
   * @return {Promise<String>} containerId
   */
  async create() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MINIO_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (containerId) {
      throw new Error('MinIO container already exists');
    }
    const command = `run --name ${this.env.MINIO_CONTAINER_NAME.value} \
      -p ${this.env.MINIO_EXPOSED_PORT.value}:9000 \
      -p ${this.env.MINIO_EXPOSED_WEB_PORT.value}:9001 \
      -v ${this.env.MINIO_CONTAINER_NAME.value}:${this.env.MINIO_PATH.value} \
      -e MINIO_ROOT_USER=${this.env.MINIO_ROOT_USER.value} \
      -e MINIO_ROOT_PASSWORD=${this.env.MINIO_ROOT_PASSWORD.value} \
      -d ${this.env.MINIO_IMAGE.value} server \
      --console-address :${this.env.MINIO_EXPOSED_WEB_PORT.value} \
      ${this.env.MINIO_PATH.value}`;
    const newContainerId = await executeDocker(command, this.options.verbose);
    console.info('Created MinIO container');
    return newContainerId;
  }

  /**
   * Push files up to the existing MinIO Service container bucket
   * @return {Promise<Boolean>} pushed
   */
  async push() {
    console.info('Push is not implemented for MinIO');
    return false;
  }

  /**
   * Alias seed to push
   * @return {Promise<Boolean>} pushed
   */
  seed() {
    return this.push();
  }

  /**
   * Start the existing MinIO Service container
   * @return {Promise<Boolean>} started
   */
  async start() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MINIO_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('MinIO container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.MINIO_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (containerRunning) {
      throw new Error('MinIO container is already running');
    }
    const command = `container start ${this.env.MINIO_CONTAINER_NAME.value}`;
    const containerName = await executeDocker(command, this.options.verbose);
    if (containerName !== this.env.MINIO_CONTAINER_NAME.value) {
      throw new Error('Failed to start MinIO container');
    }
    console.info('Started MinIO container');
    return true;
  }

  /**
   * Stop the existing MinIO Service container
   * @return {Promise<Boolean>} stopped
   */
  async stop() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MINIO_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('MinIO container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.MINIO_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerRunning) {
      throw new Error('MinIO container is not running');
    }
    const command = `container stop ${this.env.MINIO_CONTAINER_NAME.value}`;
    const containerName = await executeDocker(command, this.options.verbose);
    if (containerName !== this.env.MINIO_CONTAINER_NAME.value) {
      throw new Error('Failed to stop MinIO container');
    }
    console.info('Stopped MinIO container');
    return true;
  }

  /**
   * Remove the existing MinIO Service container
   */
  async remove() {
    await verifyEnvironment(this.env);
    const containerId = await getContainerId(
      this.env.MINIO_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (!containerId) {
      throw new Error('MinIO container does not exist');
    }
    const containerRunning = await isContainerRunning(
      this.env.MINIO_CONTAINER_NAME.value,
      this.options.verbose,
    );
    if (containerRunning) {
      await this.stop();
    }
    const containerCommand = `container rm ${this.env.MINIO_CONTAINER_NAME.value}`;
    const containerName = await executeDocker(containerCommand, this.options.verbose);
    if (containerName !== this.env.MINIO_CONTAINER_NAME.value) {
      throw new Error('Failed to remove MinIO container');
    }
    console.info('Removed MinIO container');
    const volumeCommand = `volume rm ${this.env.MINIO_CONTAINER_NAME.value}`;
    const volumeName = await executeDocker(volumeCommand, this.options.verbose);
    if (volumeName !== this.env.MINIO_CONTAINER_NAME.value) {
      throw new Error('Failed to remove MinIO volume');
    }
    console.info('Removed MinIO volume');
    return true;
  }
}

module.exports = (options) => new MinIOService(options);

