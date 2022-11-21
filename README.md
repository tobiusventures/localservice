# Local Service

Install and manage services for your local development environments.

### Pre-requisites

* Docker
* Node (14+)

## Usage

```text
[~] npm i localservice
[~] npx localservice -h
Usage: npx localservice [options] [command]

Manage local services (utilizes Docker)

Options:
  -V, --version     output the version number
  -v, --verbose     output verbose info (e.g. raw Docker commands)
  -h, --help        display general help and usage info

Commands:
  info <service>    Display service info (env vars and container status)
  create <service>  Create service container
  stop <service>    Stop service container
  start <service>   Start service container
  push <service>    Push data to service
  remove <service>  Remove service container
  help <command>    Display help for specific <command>
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

### PostgreSQL

Key																	| Required	| Default										| Description
---																	| ---				| ---												| ---
`POSTGRES_CONTAINER_NAME`						| Y         | _none_										| Name used to identify PostgreSQL Service Docker container
`POSTGRES_DATABASE`									| Y         | _none_										| Name used to identify PostgreSQL Service database
`POSTGRES_EXPOSED_PORT`							| Y         | 5432											| Local network port used to expose PostgreSQL Service
`POSTGRES_IMAGE`										| Y         | _none_										| PostgreSQL Server Docker image for your processor: https://hub.docker.com/_/postgres/tags
`POSTGRES_PATH`											| Y         | /var/lib/postgresql/data  | Path to the preferred PostgreSQL Service library file folder
`POSTGRES_PUSH_FILES`								| N         | _none_                    | Path to SQL file glob(s) to push (execute) during first time setup (separated by commas)
`POSTGRES_SUPER_USER`								| Y         | _none_                    | Username to use when creating the PostgreSQL Service database SuperUser account
`POSTGRES_SUPER_PASSWORD`						| Y         | _none_                    | Password to use when creating the PostgreSQL Service database SuperUser account
`POSTGRES_SERVICE_WAIT_INTERVAL`		| N         | 1000                      | Number of milliseconds to wait between PostgreSQL service uptime test retries
`POSTGRES_SERVICE_WAIT_MAX_RETRIES` | N         | 30                        | Maximum number of times to retry PostgreSQL service uptime test before timing out

## License

[MIT License](LICENSE)

