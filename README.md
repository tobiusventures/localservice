# Local Service

Install and manage services for your local development environments.

### Pre-requisites

* Docker
* Node (14+)

## Usage

```text
[~] npm i localservice
[~] npx localservice -h

Usage: localservice [options] <service> <command>

Options
  -v, --verbose   Show verbose info (e.g. raw docker commands, etc)
  -h, --help      Show this help screen

Services (implemented)
  minio     MinIO object storage (s3 compatible)
  mysql     MySQL database
	pgsql     PostgreSQL database

Commands (universal)
  create    Create new service container
  info      Get service env and container info
  push      Push data to running service container
  remove    Remove existing service container
  start     Start stopped service container
  stop      Stop running service container
```

## Environment Variables

### MinIO

Key																| Required	| Default	| Description
---																| ---				| ---			| ---
`MINIO_CONTAINER_NAME`						| Y					| _none_	| Name used to identify MinIO Service Docker container
`MINIO_EXPOSED_PORT`							| Y					| 9000		| Local network port used to expose MinIO Service
`MINIO_EXPOSED_WEB_PORT`					| Y					| 9001		| Local network port used to expose MinIO Web tool
`MINIO_IMAGE`											| Y					| _none_	| MinIO Server Docker image for your processor: https://hub.docker.com/r/minio/minio/tags
`MINIO_PATH`											| Y					| _none_	| Path to the preferred MinIO Service library file folder
`MINIO_PUSH_FILES`								| N					| _none_	| Path to MinIO object storage file glob(s) to push (upload) during first time setup (separated by commas)
`MINIO_ROOT_PASSWORD`							| Y					| _none_	| Username to use when creating the MinIO Service root user
`MINIO_ROOT_USER`									| Y					| _none_	| Password to use when creating the MinIO Service root user
`MINIO_SERVICE_WAIT_INTERVAL`			| N					| 1000		| Number of milliseconds to wait between MinIO service uptime test retries
`MINIO_SERVICE_WAIT_MAX_RETRIES`	| N					| 30			| Maximum number of times to retry MinIO service uptime test before timing out

### MySQL

Key																| Required	| Default					| Description
---																| ---				| ---							| ---
`MYSQL_CHARSET`										| N					| utf8mb4					| Character set used to create a new MySQL database
`MYSQL_COLLATE`										| N					| utf8mb4_bin			| Character collate used to create a new MySQL database
`MYSQL_CONTAINER_NAME`						| Y					| _none_					| Name used to identify MySQL Service Docker container
`MYSQL_DATABASE`									| Y					| _none_					| Name used to identify MySQL Service database
`MYSQL_EXPOSED_PORT`							| Y					| 3306						| Local network port used to expose MySQL Service
`MYSQL_IMAGE`											| Y					| _none_					| MySQL Server Docker image for your processor: https://hub.docker.com/r/mysql/mysql-server/tags
`MYSQL_PATH`											| Y					| /var/lib/mysql	| Path to the preferred MySQL Service library file folder
`MYSQL_PUSH_FILES`								| N					| _none_					| Path to SQL file glob(s) to push (execute) during first time setup (separated by commas)
`MYSQL_ROOT_PASSWORD`							| Y					| _none_					| Password to use when creating the MySQL Service database root user
`MYSQL_SERVICE_WAIT_INTERVAL`			| N					| 1000						| Number of milliseconds to wait between MySQL service uptime test retries
`MYSQL_SERVICE_WAIT_MAX_RETRIES`	| N					| 30							| Maximum number of times to retry MySQL service uptime test before timing out

## License

[MIT License](LICENSE)

