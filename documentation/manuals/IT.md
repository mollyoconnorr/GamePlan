This manual documents how to set up a remote Virtual Machine and run GamePlan on that VM. It covers installing the required dependencies and compiling / running the app.
# Software installation
## Java
GamePlan was built with Java 21, to install on a Ubuntu VM:
1. Update package list
```bash
$ sudo apt update
```
2. Install OpenJDK 21
```bash
$ sudo apt install openjdk-17-jdk
```
3. Verify Installation
```bash
$ java --version
# Should Show something like: 
openjdk 21.0.10 2026-01-20
OpenJDK Runtime Environment (build 21.0.10+7-Ubuntu-124.04)
OpenJDK 64-Bit Server VM (build 21.0.10+7-Ubuntu-124.04, mixed mode, sharing)
```
## MySQL


## Node.js / npm

## NGINX
To allow access to the app via `gameplan.carroll.edu` instead of `gameplan.carroll.edu:8080` we set up a reverse proxy on the VM using nginx. Here are the steps we followed for setting this up:
1. Install nginx
```bash
$ sudo apt install nginx
```

Verify installation with: 
```bash
$ nginx -version
# Should show something like
nginx version: nginx/1.24.0 (Ubuntu)
```
2. Make sure the app is bound locally <br>
This means running the app on `127.0.0.1:8080`. This keeps port `8080` off the public internet.
We did this by adding the following to our production yaml file:
```yaml
server:
	port: 8080
	address: 127.0.0.1
```

3. Create an nginx site config
Create:
```bash
$ sudo nano /etc/nginx/sites-available/gameplan
```
And we put the following in it:
```bash
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

`server_name` is how nginx matches requests for the alias to the correct server block, and nginx’s docs describe using `proxy_pass` for proxying plus special handling for WebSocket upgrade headers when needed.
4. Enable the site
```bash
$ sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
```

Optional: remove the default site if it is conflicting:

```bash
$ sudo rm /etc/nginx/sites-enabled/default
```

5. Test and reload nginx
```bash
$ sudo nginx -t  

# Should show something like
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful

$ sudo systemctl reload nginx
```
The nginx guide documents testing config and reloading after changes.
# Build Project

Navigate to `gameplan/backend`
```bash
$ cd backend # If in root folder
```

```
$ ./gradlew bootJar
```

This will build the React project into the `resources/static` folder of the Spring Boot / Java backend. Then, it builds the backend and the frontend into a runnable application JAR. This is built into the `build/libs` folder, and the full path and name looks something like
```bash
$ build/libs/GamePlan-0.0.1.jar
```

To run this jar, run
```bash
$ java -jar build/libs/GamePlan-0.0.1.jar --spring.profiles.active=prod
```

`--spring.profiles.active=prod` runs the app in **production mode**. To run in **development mode**, change `prod` to `dev`.
## What happens

- Starts embedded server (Tomcat by default)
- Runs on port `8080` (unless configured otherwise)
- Serves:
    - API endpoints (e.g., `/api/...`)
    - frontend (`index.html` + assets)

## Copy jar to VM
If you don't have the project on the VM, you can copy just the jar to the VM
```
$ scp build/libs/gameplan-0.0.1.jar user@your-vm-ip:/home/user/
```
Replace user with your username on the vm and `your-vm-ip` ewit hthe ip address

**NOTE**:
This will replace the file on the VM if it exists with the same name. If a process is running that file, it will be unaffected so it'll need to be restarted to apply the new code.
# Run app
1. SSH into the VM
```bash
$ ssh user@your-vm-ip
```
2. Make sure Java is installed
```bash
$ java --version
```
3. Run the app
**Before doing this, make sure to stop any running instances, see [Stop app](#Stop app) FIX LINK**
```bash
$ nohup java -jar gameplan-0.0.1.jar --spring.profiles.active=prod > app.log 2>&1 &
```
What this command does:
*  `nohup`
	- “no hang up”
	- prevents the process from stopping when your SSH session ends
	- without this, the app dies when you close the terminal
* `java -jar gameplan-0.0.1.jar --spring.profiles.active=prod`
	- starts the Spring Boot app in production mode
* * `> app.log`
	- redirects **standard output (stdout)** to `app.log`
	- this includes normal logs (e.g., Spring Boot startup logs)
* `2>&1`
	- redirects **standard error (stderr)** to the same place as stdout
	- so errors also go into `app.log`
* `&`
	- runs the process in the background
	- returns your terminal immediately
<a id="stop-app"></a> 
# Stop app

There's probably a few ways to stop running the app, but here's the way we used:
1. Find the process ID:
```bash
$ ps aux | grep gameplan
```
This will show something like:
```bash
csadmin   139223  0.1  5.5 5817644 448448 ?      Sl   Apr09   1:41 java -jar **gameplan**-0.0.1.jar --spring.profiles.active=prod # This shows only if the app is running 

csadmin   144169  0.0  0.0   6544  2456 pts/0    S+   14:04   0:00 grep --color=auto **gameplan** # This is you searching for the app
```

From the output, the process ID (PID) is `139223`.
2. Kill the process
```bash
$ kill <PID> # 139223 would go here
```

# Useful commands
### Check logs:
```bash
$ tail -f app.log
```
This looks at the tail of the file and then streams it, so any new lines written will be shown while this command is being ran. 

### Find the process:
```bash
$ ps aux | grep gameplan
```

### Kill it:
```bash
$ kill <PID>
```