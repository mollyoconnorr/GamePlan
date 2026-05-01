---
output:
  word_document: default
  html_document: default
---
# GamePlan IT Manual

This manual documents how to set up a Ubuntu VM for GamePlan and run the app as a `systemd` service. The production deployment uses one Spring Boot JAR that contains both the backend and the built frontend.

# Software Installation

## Java

GamePlan requires Java 21.

```bash
sudo apt update
sudo apt install -y openjdk-21-jdk
java --version
```

The version output should show OpenJDK 21.

## MySQL

```bash
sudo apt update
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
sudo systemctl status mysql
```

Secure the installation:

```bash
sudo mysql_secure_installation
```

Typical choices:

- Set root password: yes
- Remove anonymous users: yes
- Disallow remote root login: yes
- Remove test database: yes
- Reload privileges: yes

## Node.js and npm

The Gradle production build runs the frontend build, so Node.js and npm must be installed wherever `./gradlew bootJar` is run.

```bash
sudo apt update
sudo apt install -y nodejs npm
node -v
npm -v
```

## Git

The VM should clone the repository and build the application locally.

```bash
sudo apt update
sudo apt install -y git
git --version
```

# Database Setup

Log in to MySQL as root:

```bash
sudo mysql -u root -p
```

Create the database and application user:

```sql
CREATE DATABASE gameplan_db;
CREATE USER 'gameplan_user'@'localhost' IDENTIFIED BY 'Your_password_here';
GRANT ALL PRIVILEGES ON gameplan_db.* TO 'gameplan_user'@'localhost';
FLUSH PRIVILEGES;
```

Replace `Your_password_here` with a secure password. Use the same database name, username, and password in the production YAML files below.

# Application Directories

Create a log directory for GamePlan so the app can write log files outside the repository, and give `csadmin` permission because the systemd service runs as `csadmin`.

```bash
sudo mkdir -p /var/log/gameplan
sudo chown -R csadmin:csadmin /var/log/gameplan
```

# Configuration YAML Files

The repository tracks a main-resource example YAML and the test YAML. The active main app YAML files under `backend/src/main/resources` are ignored local files, and the backend developer guide documents what those local files should look like when a developer creates them.

For the deployed VM, keep VM-specific configuration outside the Git checkout. Put production overrides in:

```text
/etc/gameplan/application-prod.yaml
```

Create `/etc/gameplan` to hold production config outside the Git checkout. This keeps VM-specific settings and secrets from being overwritten by `git pull`.

```bash
sudo mkdir -p /etc/gameplan
```

Because `/etc/gameplan` is owned by `root`, create and edit this file with `sudo`:

```bash
sudo nano /etc/gameplan/application-prod.yaml
```

If the files do not exist yet and you want to create them before editing, run:

```bash
sudo install -o root -g csadmin -m 640 /dev/null /etc/gameplan/application-prod.yaml
```

## `/etc/gameplan/application-prod.yaml`

This file contains production settings. The app binds to `127.0.0.1` so nginx can expose it publicly while port `8080` stays local to the VM. Production database credentials can live here because the systemd service loads this external config directory and the file is permission-restricted.

```yaml
server:
  port: 8080
  address: 127.0.0.1
  forward-headers-strategy: framework

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/gameplan_db
    username: gameplan_user
    password: Your_password_here
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
  security:
    oauth2:
      client:
        registration:
          okta:
            redirect-uri: "{baseUrl}/authorization-code/callback"
            client-id: Your_okta_client_id
            client-secret: Your_okta_client_secret
            scope:
              - openid
              - profile
              - email
            authorization-grant-type: authorization_code
        provider:
          okta:
            issuer-uri: https://carroll.okta.com

app:
  security:
    success-url: "http://gameplan.carroll.edu/app/home"
    logout-url: "http://gameplan.carroll.edu/"
    allowed-origins:
      - "http://gameplan.carroll.edu"
    base-uri: "/authorization-code/callback"
```

Replace `Your_password_here`, `Your_okta_client_id`, and `Your_okta_client_secret` with production values. Keep secrets out of the repository. The production deployment currently uses `spring.jpa.hibernate.ddl-auto: update`, so Hibernate updates the schema at startup from the entity model.

The application fallback profile is `prod`, so production starts with `application-prod.yaml` unless another active profile is supplied. Leave production schema management at `spring.jpa.hibernate.ddl-auto: update` unless the deployment process changes to explicit migrations.

Lock down the config files so `root` owns them, `csadmin` can read them, and other users cannot read production secrets.

```bash
sudo chown -R root:csadmin /etc/gameplan
sudo chmod 750 /etc/gameplan
sudo chmod 640 /etc/gameplan/application-prod.yaml
```

# Okta Configuration

Production uses Carroll Okta through the `okta` OAuth client in `/etc/gameplan/application-prod.yaml`.

The values that must match the Okta application are:

- `spring.security.oauth2.client.registration.okta.client-id`
- `spring.security.oauth2.client.registration.okta.client-secret`
- `spring.security.oauth2.client.provider.okta.issuer-uri`
- `spring.security.oauth2.client.registration.okta.redirect-uri`
- `app.security.base-uri`

For the standard production deployment, the issuer is `https://carroll.okta.com`, the redirect URI pattern is `{baseUrl}/authorization-code/callback`, and `app.security.base-uri` is `/authorization-code/callback`. With the nginx config in this manual, Okta should allow the sign-in redirect URI `http://gameplan.carroll.edu/authorization-code/callback`.

If the site moves to HTTPS or a different hostname, update these places together:

- the Okta app's allowed sign-in redirect URI
- `app.security.success-url`
- `app.security.logout-url`
- `app.security.allowed-origins`
- the nginx `server_name`

After changing Okta settings, restart the service:

```bash
sudo systemctl restart gameplan
sudo systemctl status gameplan
```

# Seeded Accounts and Data

GamePlan seeds baseline data at startup for every non-test profile, including production. The production seed is idempotent: it checks for existing records before creating the baseline rows, so normal restarts should not duplicate the seeded data.

Production baseline seed:

- app settings: week-based calendar display, 15-minute time steps, 30-minute max reservation time, 7 visible days, 8:00 AM to 5:00 PM hours, and weekend auto-blocking disabled
- equipment types: `Wired Boots`, `Wireless Boots`, and `Bath`
- equipment: `Ice Bath #1`, `Ice Bath #2`, `Ice Bath #3`, `Hot Bath`, `Large Wired Boots`, `Small Wireless Boots`, and `Medium Wireless Boots`
- admin user: `kward@carroll.edu` with role `ADMIN`

The seeded admin has no Okta subject stored at first. When that user logs in, GamePlan matches the Okta email address to `kward@carroll.edu`, stores the Okta subject, and keeps the `ADMIN` role. If Okta sends a different email or alias, GamePlan may create a separate pending user instead.

Development mode also seeds extra test data, but that data is only created when the `dev` profile is active. Dev-only data includes `testuser@carroll.edu`, `admin@carroll.edu`, `trainer@carroll.edu`, `athlete@carroll.edu`, several example bath reservations, and example schedule blocks named `Team lift block`, `Facility event`, and `Coach-only window`.

# Build the Project

Clone the repository into the `csadmin` home directory. This is where systemd will run the app from, and keeping the checkout under `csadmin` lets normal deploy commands run without changing file ownership.

Before cloning or building, make sure the `csadmin` home directory is owned by `csadmin`. Gradle and npm write caches under `/home/csadmin`, so a root-owned home directory can cause `java.io.IOException: Permission denied` during `./gradlew bootJar`.

```bash
sudo chown -R csadmin:csadmin /home/csadmin
chmod 750 /home/csadmin
```

```bash
cd /home/csadmin
git clone https://github.com/mollyoconnorr/GamePlan.git
```

Build the production JAR on the VM:

```bash
cd /home/csadmin/GamePlan/backend
./gradlew bootJar
```

Do not run the Gradle build with `sudo`. If the build fails with `Permission denied`, fix the ownership of `/home/csadmin` and the checkout, then run the build again as `csadmin`:

```bash
sudo chown -R csadmin:csadmin /home/csadmin
cd /home/csadmin/GamePlan/backend
./gradlew bootJar
```

The `bootJar` task builds the frontend from `frontend/`, copies the built assets into the backend JAR, and writes the deployable artifact to:

```text
/home/csadmin/GamePlan/backend/build/libs/GamePlan-0.0.1.jar
```

# Run GamePlan with systemd

Create the service file:

This file tells systemd how to start GamePlan, which user to run it as, where the JAR is located, and when to restart it.

```bash
sudo nano /etc/systemd/system/gameplan.service
```

Use this service definition:

```ini
[Unit]
Description=GamePlan Spring Boot App
After=network-online.target mysql.service
Wants=network-online.target

[Service]
User=csadmin
Group=csadmin
WorkingDirectory=/home/csadmin/GamePlan
ExecStart=/usr/bin/java -jar /home/csadmin/GamePlan/backend/build/libs/GamePlan-0.0.1.jar --spring.config.additional-location=file:/etc/gameplan/ --gameplan.logging.dir=/var/log/gameplan
SuccessExitStatus=143
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Load and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gameplan
sudo systemctl start gameplan
sudo systemctl status gameplan
```

`enable` starts the app automatically after reboot. `Restart=always` starts it again if the Java process exits unexpectedly.

## Updating the App

Pull the latest code, rebuild the JAR, and restart the service:

```bash
cd /home/csadmin/GamePlan
git pull
cd backend
./gradlew bootJar
sudo systemctl restart gameplan
sudo systemctl status gameplan
```

## Useful systemd Commands

```bash
sudo systemctl status gameplan
sudo systemctl restart gameplan
sudo systemctl stop gameplan
sudo systemctl start gameplan
sudo systemctl disable gameplan
```

# Logging

Application logs are written to `/var/log/gameplan/gameplan.log` when the service starts with `--gameplan.logging.dir=/var/log/gameplan`.

View service logs from systemd:

```bash
sudo journalctl -u gameplan -f
```

View the application log file:

```bash
sudo tail -f /var/log/gameplan/gameplan.log
```

# NGINX

NGINX exposes the app at `gameplan.carroll.edu` and proxies requests to the Spring Boot app on `127.0.0.1:8080`.

Install nginx:

```bash
sudo apt install -y nginx
nginx -version
```

Create the nginx site config. This file tells nginx to accept traffic for `gameplan.carroll.edu` and forward it to the local Spring Boot server.

```bash
sudo nano /etc/nginx/sites-available/gameplan
```

Use this config:

```nginx
server {
    listen 80;
    server_name gameplan.carroll.edu;

    location / {
        proxy_pass http://127.0.0.1:8080;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site by linking it into `sites-enabled`, which is the directory nginx reads for active site configs.

```bash
sudo ln -s /etc/nginx/sites-available/gameplan /etc/nginx/sites-enabled/
```

If the default site conflicts, remove it:

```bash
sudo rm /etc/nginx/sites-enabled/default
```

Test and reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

# Add an Admin User

Log in to MySQL with the GamePlan user:

```bash
mysql -u gameplan_user -p
```

Select the database:

```sql
USE gameplan_db;
```

Insert the admin user:

```sql
INSERT INTO users (
    pending_approval,
    auth_version,
    created_at,
    email,
    first_name,
    last_name,
    oidc_user_id,
    role
)
VALUES (
    FALSE,
    0,
    NOW(),
    'newuser@carroll.edu',
    'New',
    'User',
    NULL,
    'ADMIN'
);
```

Replace the email, first name, and last name with the real admin's information.

The OIDC ID can stay `NULL`. When the admin logs in, GamePlan matches the Okta email, fills in the OIDC ID automatically, and keeps the seeded role.

Make sure the seeded email exactly matches the email Okta sends, ignoring case. If Okta sends a different alias, GamePlan may create a separate pending student account.

The application already seeds `kward@carroll.edu` as an admin on startup. Use the manual insert only when adding another initial admin or repairing a production database where the seeded admin row is missing.
