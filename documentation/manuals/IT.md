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

For production, keep VM-specific configuration outside the Git checkout. Put the config files in:

```text
/etc/gameplan/application.yaml
/etc/gameplan/application-prod.yaml
```

Create `/etc/gameplan` to hold production config outside the Git checkout. This keeps VM-specific settings and secrets from being overwritten by `git pull`.

```bash
sudo mkdir -p /etc/gameplan
```

## `/etc/gameplan/application.yaml`

This file contains settings shared by all profiles. Production database credentials can live here because the systemd service loads this external config directory.

```yaml
server:
  port: 8080

spring:
  profiles:
    default: prod
  datasource:
    url: jdbc:mysql://localhost:3306/gameplan_db
    username: gameplan_user
    password: Your_password_here
  jpa:
    hibernate:
      ddl-auto: none
    show-sql: false
```

## `/etc/gameplan/application-prod.yaml`

This file contains production-only settings. The app binds to `127.0.0.1` so nginx can expose it publicly while port `8080` stays local to the VM.

```yaml
server:
  port: 8080
  address: 127.0.0.1
  forward-headers-strategy: framework

spring:
  jpa:
    hibernate:
      ddl-auto: none
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

logging:
  level:
    root: INFO
    edu.carroll.gameplan: INFO
    org.springframework.security: INFO
    org.springframework.security.oauth2: INFO
    org.springframework.web: INFO
  pattern:
    console: "%d{HH:mm:ss.SSS} %-5level [req:%X{requestId:-}] [user:%X{principal:-}] %logger{36} - %msg%n"

gameplan:
  logging:
    dir: /var/log/gameplan

app:
  security:
    success-url: "http://gameplan.carroll.edu/app/home"
    logout-url: "http://gameplan.carroll.edu/"
    allowed-origins:
      - "http://gameplan.carroll.edu"
    base-uri: "/authorization-code/callback"
```

Replace `Your_password_here`, `Your_okta_client_id`, and `Your_okta_client_secret` with production values. Keep secrets out of the repository.

Lock down the config files so `root` owns them, `csadmin` can read them, and other users cannot read production secrets.

```bash
sudo chown -R root:csadmin /etc/gameplan
sudo chmod 750 /etc/gameplan
sudo chmod 640 /etc/gameplan/application.yaml /etc/gameplan/application-prod.yaml
```

# Build the Project

Clone the repository into the `csadmin` home directory. This is where systemd will run the app from, and keeping the checkout under `csadmin` lets normal deploy commands run without changing file ownership.

```bash
cd /home/csadmin
git clone https://github.com/mollyoconnorr/GamePlan.git
```

Build the production JAR on the VM:

```bash
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
ExecStart=/usr/bin/java -jar /home/csadmin/GamePlan/backend/build/libs/GamePlan-0.0.1.jar --spring.profiles.active=prod --spring.config.additional-location=file:/etc/gameplan/
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

Application logs are written to `/var/log/gameplan/gameplan.log` when `gameplan.logging.dir` is set as shown in `application-prod.yaml`.

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
