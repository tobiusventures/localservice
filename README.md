# Local Service

Install and manage services for your local development environments.

### Pre-requisites

* Docker
* Node (14+)

## Usage

```text
[~] npm install localservice
[~] npx localservice -h

Usage: localservice [options] <service> <command>

Options
  -v, --verbose   Show verbose info (e.g. raw docker commands, etc)
  -h, --help      Show this help screen

Services (implemented)
  minio     MinIO object storage (s3 compatible)
  mysql     MySQL database

Commands (universal)
  create    Create new service container
  info      Get service config and container info
  push      Push data to running service container
  remove    Remove existing service container
  start     Start stopped service container
  stop      Stop running service container
```

### MinIO Environment Variables

Key																| Default	| Description
---																| ---			| ---
`MINIO_CONTAINER_NAME`						| _none_	| Name used to identify MinIO Service Docker container
`MINIO_EXPOSED_PORT`							| 9000		| Local network port used to expose MinIO Service
`MINIO_EXPOSED_WEB_PORT`					| 9001		| Local network port used to expose MinIO Web tool
`MINIO_IMAGE`											| _none_	| MinIO Server Docker image for your processor: https://hub.docker.com/r/minio/minio/tags
`MINIO_PATH`											| _none_	| Path to the preferred MinIO Service library file folder
`MINIO_ROOT_PASSWORD`							| _none_	| Username to use when creating the MinIO Service root user
`MINIO_ROOT_USER`									| _none_	| Password to use when creating the MinIO Service root user
`MINIO_SERVICE_WAIT_INTERVAL`			| 1000		| Number of milliseconds to wait between MinIO service uptime test retries
`MINIO_SERVICE_WAIT_MAX_RETRIES`	| 30			| Maximum number of times to retry MinIO service uptime test before timing out
`MINIO_SEED_FILES`								| _none_	| Path to MinIO object storage seed file glob(s) to import during first time setup (separate by commas)

### MySQL Environment Variables

Key																| Default					| Description
---																| ---							| ---
`MYSQL_CHARSET`										| utf8mb4					| Character set used to create a new MySQL database
`MYSQL_COLLATE`										| utf8mb4_bin			| Character collate used to create a new MySQL database
`MYSQL_CONTAINER_NAME`						| _none_					| Name used to identify MySQL Service Docker container
`MYSQL_DATABASE`									| _none_					| Name used to identify MySQL Service database
`MYSQL_EXPOSED_PORT`							| 3306						| Local network port used to expose MySQL Service
`MYSQL_IMAGE`											| _none_					| MySQL Server Docker image for your processor: https://hub.docker.com/r/mysql/mysql-server/tags
`MYSQL_PATH`											| /var/lib/mysql	| Path to the preferred MySQL Service library file folder
`MYSQL_ROOT_PASSWORD`							| _none_					| Password to use when creating the MySQL Service database root user
`MYSQL_SEED_FILES`								| _none_					| Path to SQL seed file glob(s) to execute during first time setup (separate by commas)
`MYSQL_SERVICE_WAIT_INTERVAL`			| 1000						| Number of milliseconds to wait between MySQL service uptime test retries
`MYSQL_SERVICE_WAIT_MAX_RETRIES`	| 30							| Maximum number of times to retry MySQL service uptime test before timing out

<!--

Official Docker Images
https://github.com/docker-library/official-images/tree/master/library

-->
