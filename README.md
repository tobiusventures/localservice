# Local Service

Install and manage services for your local development environments.

## Pre-requisites

* Docker
* Node (14+)

## Setup

```
[~] npm install localservice
[~] npx localservice

Usage: localservice [options] <service> <command>

Options:

  -v, --verbose   Show verbose info (e.g. raw docker commands, etc)
  -h, --help      Show this help screen

Services:

  minio     MinIO object storage (s3 compatible)
  mysql     MySQL database

Commands:

  config    Get service container config info
  create    Create new service container
  remove    Remove service container
  seed      Populate service container with seed data
  start     Start service container
  status    Get service container status info
  stop      Stop service container
```

<!--

Official Docker Images
https://github.com/docker-library/official-images/tree/master/library

-->
