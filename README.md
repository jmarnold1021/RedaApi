ReDa-Api
========

Node Application for serving ReDa data over REST

Development
===========

Projects
--------
The Docs and Schema directories are organized by the projects they
support to configure the api to use a specific doc/schema set the 
REDA_SCHEMA env variable to the desired project name (sb2, ab. etc...).
See configuration section for more information.

Docs
----

* [apiDoc Documetation](http://apidocjs.com/)
* [apiDoc Versioning Documentation](http://apidocjs.com/#example-versioning)

Schemas
-------

All lowercase keys in the below examples are application specific.
The rest are configured based on the desired api/db schema requirments.

### Conversions Section

The conversions section is used for mapping Api Resources and Attributes to
Database Resources and Attributes. The db-driver will convert the api keys to the
db keys before making a database request.

```javascript

  // General Example
  "conversions" : {
    "resources" : {
      "ApiResource" : "DBResource"
    },
    "attributes" : {
      "ApiResource": {
        "ApiAttribute" : "DBAttribute" 
      }
    }
  }

  // With actual keys from old redas
  "conversions" : {
    "resources" : {
      "Runs" : "GroupInfo"
    },
    "attributes" : {
      "Runs": {
        "RunName" : "GroupName" 
      }
    }
  }
```

### Constraints Section

The constraints section ensures that required combinations of attributes are provided
to each repective **Action X ApiResource** in either the query(read/delete) or
body(create/update) request objects. Each action has a public method in the db-driver.
Only Api Attributes/Resources should be referenced in the constraints section.

```javascript
  "constraints" : {
    "create" : {
      "Runs" : {
        "blacklist" : [
          "RunID"
        ],
        "required": [
          "TestCase",
          ["RunName","User"]
        ] 
      }
    },
    "update": {...},
    "delete": {...},
    "read": {...}
  }
}
```

The above example says that A POST/Create request to Runs must not contain a RunId
and must contain either a **TestCase OR (Runname AND User) Fields**.
In order for the data to be inserted. See Schemas directory for more examples.

Installation
============

### Installing Dokku

Basically just need a system with ubuntu 14-18. Then get and run the install script with
the version tag. [Getting Started with Dokku](http://dokku.viewdocs.io/dokku/getting-started/installation/)

```
   # for debian systems, installs Dokku via apt-get
   wget https://raw.githubusercontent.com/dokku/dokku/v0.14.5/bootstrap.sh;
   sudo DOKKU_TAG=v0.14.5 bash bootstrap.sh
```

### Installing Dokku Plugins

The Reda Apis Mysql Database(for sb2 and v3g) is installed with [Dokku Mysql](https://github.com/dokku/dokku-mysql)

```
# Install Plugin
sudo dokku plugin:install https://github.com/dokku/dokku-mysql.git mysql

#Create and Link Service
dokku mysql:create v3g-reda
dokku mysql:link v3g-reda v3g
```

Otherwise the api connects to the Legacy mysql services hosted on using
through db-driver env variables.


for ab

### Installing/Configuring phpMyAdmin for mysql administration

phpMyadmin is installed directly through docker for sb2/v3g. [Installing phpMyadmin to Dokku](https://stevescodingblog.co.uk/deploying-phpmyadmin-to-a-dokku-instance/)

```
  # Retrieve Docker Image
  docker pull phpmyadmin/phpmyadmin

  # Create a Dokku application
  dokku apps:create admin

  # Tag the docker image
  docker tag phpmyadmin/phpmyadmin dokku/admin

  # Deploy to dokku
  dokku tags:deploy admin

  # Link the mysql service to the admin app.
  dokku mysql:link v3g-reda admin

  # Get dokku connection info
  dokku mysql:info v3g-reda

  # Set the PMA_HOST ENV variable to the mysql service hostname returned
  dokku config:set admin PMA_HOST=dokku-mysql-v3g-reda

  # OR If you need to administer multiple mysql services you can set PMA_ARBITRARY=1 
  dokku config:set admin PMA_ARBITRARY=1

  #the host field in the login page can be filled with the internal ip returned
  #from the mysql info.

  # Example mysql info
  dokku mysql:info v3g-reda
```

Deployment
===========

Reda Api is currently deployed using Dokku Containers. The steps required for deploying 
and configuring ReDa Api on an existing Dokku server can be found in the 
[Dokku deployment docs](http://dokku.viewdocs.io/dokku/deployment/application-deployment/). 

Currently there are two redaapi dokku servers in use,

The key steps are outlined below,

1) Clone the Reda Api repository, NOT onto the actual Dokku Server.

2) Generate/add an ssh key to dokku from the machine the repo is cloned too. This is done a bit differently, 
   since the there is no access to the actual dokku user on the dokku host.

```
   cat /path/to/public_key | ssh [-i root_ssh_key] root@yourdokkuinstance "sudo sshcommand acl-add dokku [description]"
```

The root user is any user on the Dokku host that does not require a password to ssh. The -i option can be used if the root 
user requires a key.

3) Ssh to the dokku server as the root user and create the application's container.

```
   dokku apps:create <appname>
```

4) Configure the apps environment variables on the dokku host, see Configuration  section below.

5) Back in the cloned repo, add the dokku container to the git configs. 

```
   git remote add dokku dokku@yourdokkuinstance:appname
```

6) To deploy the application run,

```
   git push dokku master
```

Once the process completes a url will be provided. Enter this into the browser and the Reda Api docs
should load.


Configuration
=============

Reda Api is configured using environment variables. They are set using the dokku config:[set/unset] command on the 
Dokku host prior to pushing the application. For more information about setting Dokku environment vars see 
[Dokku configuration docs](http://dokku.viewdocs.io/dokku/configuration/environment-variables/).

The important environment variables for starting Reda API are listed below.

0) Staging configs

```
   # Each config:set or config:unset command will restart the application,
   # if the currently deployed application does not yet support the new env, the
   # changes can be staged using the --no-restart flag.

   dokku config:set --no-restart <appname> ENV=new
   dokku config:unset --no-restart <appname> ENV
  
   # The staged env will be applied during the next git push(new image) or 
   # ps:rebuild <appname> (rebuild existing image) or
   # config:set/unset <appname> (without --no-restart flag)  command.
   # See the above link for more info on this behavior.

```

1) Server Configurations

```

   # Sets the app name for document generation should match the appname of the dokku container
   dokku config:set <appname> APP_NAME=test-ab

   # Sets the hostname of the for document generation, should usually be the dokku host 

   # Sets the API/DB Schema to apply
   dokku config:set <appname> REDA_SCHEMA=ab

   # Request/Error logs output path defaults to /tmp
   dokku config:set <appname> REDA_RESULTS_PATH=/results
 
   # Request/Error logs output path defaults to /tmp 
   dokku config:set <appname> LOG_PATH=/app/logs

   # Increases startup and request logging verbosity, choices are ['error','warn',info',verbose'], default is 'error'
   dokku config:set <appname> LOGGING=verbose

   # Turn on lib debuging 
   dokku config:set <appname> DEBUG=server,lib:*,routes:*

   # This should always be 5000 for a normal dokku deployment, defaults to '5000'
   dokku config:set <appname> PORT=5000
  
```

2) DB Driver Configurations (DBUSER, DBPASS, DBNAME are required to start service) 

```
   # Set database host, default is localhost
   dokku config:set <appname> DBHOST='reda.com'
    
   # Set database port, default is 3306, not nedded for any current reda deployments 
   dokku config:set <appname> DBPORT=9589
   
   # Set database user, required, no default
   
   # Set database password, required, no default

   # Set database name, required, no default

   # OR ..

   # set the DATABASE_URL variable, usually used in conjunction with dokku plugins and is set during the link command.
   # https://github.com/dokku/dokku-mysql
   dokku config:set <appname> DATABASE_URL mysql://user:pass@hostname:port/db-name

```

3) Authorization Configs

```    
   # Turns on active directory authorization, once on, the LDAP configs are required 
   dokku config:set <appname> AUTH=true

   # Turns off active directory authorization, LDAP configs are ignored 
   dokku config:unset <appname> AUTH

   # Set ldap server url 
   dokku config:set <appname> LDAP_URL='ldap://host'

   # Set the base_dn for records lookups 
   dokku config:set <appname> LDAP_BASE_DN='DC=domain,DC=com'

   # Set ldap user performing the auth requests  
   dokku config:set <appname> LDAP_USERNAME='user-ldap-bind@domain.com'

   # Set password for the ldap user 
   dokku config:set <appname> LDAP_PASSWORD='super_secret'
```

4) Databus Ingestion Configs 

```    
   # Turns Ingestion on
   dokku config:set <appname> DATABUS_INGEST=true

   # Turns Ingestion off 
   dokku config:unset <appname> DATABUS_INGEST 

   # Set the the Ingestion Service url 
```

Scaling
=======

Scaling is achieved through the DOKKU_SCALE/Procfile.
If DOKKU_SCALE has web=4 then the Procfile must have
4 lines for processes to launch.
<br>
**Ensure to manage the db-driver connection pool connections 
accordingly. Most db services have maximum connection limit and
each pool instance(web proc) needs to share them.**

### Fs Service Vs Data Service

The nginx.conf.sigil file has the ability to partition
the above web processes between fs(results route) calls and
data(data table restource routes). At the bottom of the config
there will be a variable len_fs_listeners 

```
# FYI the language below is a subset of
# the full functionality provided by Go's
# text template package.
# https://github.com/gliderlabs/sigil

# NUMBER of pure fs containers, this is what is set
{{ $len_fs_listeners := 2 }}
```

if it is set to be > 0 and < the number of web processes in DOKKU_SCALE
it will reserve len_fs_listener processes for results and the rest for data.
otherwise all web processes are used for both routes(default usage). 


Mounts
======

In order to view files writtin to LOG_PATH and REDA_RESULTS_PATH outside the container, 
they should be exposed using dokku mount commands.
[Dokku mount docs](http://dokku.viewdocs.io/dokku/advanced-usage/persistent-storage/#persistent-storage)

The important mounts for Reda Api are listed below.

```
   # lists the currently mounted directories <host-dir:container-dir>
   dokku storage:list <appname>

   dokku storage:mount <appname> /var/lib/dokku/data/storage/logs:/app/logs

   dokku storage:mount <appname> /mnt/ab_results:/results
```

Backups
=======

### Mysql S3 Backup Configuration

The mysql is backed up to its corresponding sea-proj-mysql bucket
through the dokku-mysql plugin as follows.
**Currently in use for sb2/v3g**

```
$ dokku mysql:backup-auth v3g-reda AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

# Initial 1 off backup can be done anytime
$ dokku mysql:backup v3g-reda sea-v3g-mysql
2019-07-19-17-39-04: The backup for mysql-v3g-reda finished successfully.

# Scheduled Backups can be managed like so...
dokku mysql:backup-schedule v3g-reda "* 3 * * *" sea-v3g-mysql

# ls -lah
total 20K
drwx------   2 root root   54 Jul 19 19:32 .
drwxr-xr-x 104 root root 8.0K Jul 12 21:54 ..
-rw-r--r--   1 root root   68 Jul 19 19:32 dokku-mysql-v3g-reda
-rw-r--r--   1 root root  102 Apr  5  2016 .placeholder

# cat dokku-mysql-v3g-reda 
* 3 * * * dokku /usr/bin/dokku mysql:backup v3g-reda sea-v3g-mysql

# Running....Removes the file from /etc/cron.d/
$ dokku mysql:backup-unschedule v3g-reda
```

### Results S3 Backup Configuration

The results are backed up to their corresponding 
sea-proj-results bucket using a 1 off container that with
a duplicat image of the exsiting service containers. 
This way the process will not  be interupted during 
new deploy/scaling operations.

More info about this workflow can be found here,
* [Dokku Cron 1 Off](http://dokku.viewdocs.io/dokku/deployment/one-off-processes/#using-run-for-cron-tasks)
* [Dokku Cron Existing with Scaling](http://dokku.viewdocs.io/dokku/deployment/one-off-processes/#using-enter-for-cron-tasks)
* [Dokku Crontab Example with above 2 solutions](http://dokku.viewdocs.io/dokku/deployment/one-off-processes/#general-cron-recommendations)


1) Set The S3 Backup Env vars within the service

```
# Turns on Results S3 Backups
dokku config:set <appname> S3_RESULTS_BACKUP=true

# Turns off Results S3 Backups(skipped essentially)
dokku config:unset <appname> S3_RESULTS_BACKUP

# Set the the number of days a result is backed up after
# based of its last modification time.
dokku config:set <appname> S3_RESULTS_BACKUP_DAYS=30

# Set The S3 Bucket
dokku config:set <appname> S3_RESULTS_BACKUP_BUCKET=sea-<appname>-results

# Set The S3 Credentials 
dokku config:set <appname> S3_RESULTS_BACKUP_AKEY=secret
dokku config:set <appname> S3_RESULTS_BACKUP_SKEY=secret-2

# Set whether the result should be removed after a successful backup
dokku config:set <appname> S3_RESULTS_BACKUP_CLEAN=true
```

2) Run a one off backup
```
dokku --rm run <appname> './scripts/s3_results_backup.js'
```

3) Scheduling a Backup
```
sudo -i
echo "0 2 * * * dokku /usr/bin/dokku --rm run <appname> './scripts/s3_results_backup.js'" > /etc/cron.d/dokku-results-<appname>-backup
```

4) Unschedule a backup(remove the cron file)
```
sudo -i
rm /etc/cron.d/dokku-results-<appname>-backup
```

