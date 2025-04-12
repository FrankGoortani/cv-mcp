# MCP Server Timeout Fix Verification Process (Synology NAS)

## Goal

This document outlines the steps to verify that the recent fixes implemented for MCP server timeouts have resolved the Docker container crashing issues on the Synology NAS environment.

## Prerequisites

- Ensure the latest code changes (including updated `docker-compose.yml`, `src/server/http-server.ts`, and any global error handling) are pulled or merged into the deployment branch/directory on the Synology NAS or the machine used for building the Docker image.
- Access to the Synology NAS via SSH or its web interface (Docker package).
- Docker and Docker Compose are installed and running on the Synology NAS.

## Step 1: Rebuild and Redeploy the Container

1.  **Navigate to the Project Directory:**
    Open an SSH session to your Synology NAS and navigate to the directory containing the `docker-compose.yml` file and the project source code.
    ```bash
    cd /path/to/your/cv-mcp/project
    ```
    *(Replace `/path/to/your/cv-mcp/project` with the actual path)*

2.  **Pull Latest Changes (if necessary):**
    If your code is managed via Git, ensure you have the latest version:
    ```bash
    git pull origin main # Or your deployment branch
    ```

3.  **Stop and Remove Existing Container (if running):**
    This ensures a clean start with the new image and configuration.
    ```bash
    docker-compose down
    ```
    *(Optional but recommended: Remove the old image to ensure a clean build)*
    ```bash
    docker image rm <your_image_name>:<tag> # Replace with your actual image name and tag, e.g., cv-mcp:latest
    ```

4.  **Rebuild the Docker Image:**
    Force a rebuild to include the latest code changes and dependency updates.
    ```bash
    docker-compose build --no-cache
    ```
    *The `--no-cache` flag ensures all layers are rebuilt using the updated code and Dockerfile instructions.*

5.  **Start the New Container:**
    Deploy the container using the updated configuration defined in `docker-compose.yml`.
    ```bash
    docker-compose up -d
    ```
    *The `-d` flag runs the container in detached mode (in the background).*

## Step 2: Monitor Container Health

1.  **Check Container Status:**
    Verify that the container started successfully and is running.
    ```bash
    docker ps
    ```
    *Look for your container (e.g., `cv-mcp`) in the list and ensure its STATUS is 'Up' and shows a recent start time.*

2.  **Monitor Container Logs:**
    Actively monitor the container logs for errors, especially timeout-related messages or crash indicators.
    ```bash
    docker-compose logs -f --tail 200
    ```
    *The `-f` flag follows the log output in real-time. `--tail 200` shows the last 200 lines upon starting.*
    *Look for:*
    *   Successful startup messages without immediate errors.
    *   Any specific log messages you added for handling `McpError -32001` or other timeout scenarios in `http-server.ts`.
    *   Any logs from the global exception handler indicating it caught an unexpected error (the container should *not* crash if this happens).
    *   Absence of repeating crash loops or sudden termination messages.

3.  **Monitor Resource Usage (Optional but Recommended):**
    Use the Synology NAS Resource Monitor (via the web interface) or Docker stats command to check the container's CPU and memory usage. Ensure it stays within the increased limits defined in `docker-compose.yml` and doesn't show signs of uncontrolled growth (memory leak) or excessive CPU usage.
    ```bash
    docker stats $(docker ps -q --filter name=cv-mcp) # Replace cv-mcp if your service name differs
    ```

## Step 3: Verify Timeout Handling

1.  **Simulate Timeout Conditions (If Possible):**
    If you have a method to reliably trigger the conditions that previously led to timeouts (e.g., sending specific complex requests, simulating network latency if applicable), use this method now.

2.  **Observe Logs and Behavior During Simulated Timeout:**
    While triggering the timeout condition, closely watch the `docker-compose logs -f` output and the container status (`docker ps`).
    *   **Expected:** You should see the specific log messages indicating the timeout error was caught and handled by the code in `http-server.ts`. The server might return an error response to the client, but it should *not* crash.
    *   **Verify:** The container must remain in the 'Up' state throughout and after the simulated timeout event.

## Step 4: Verify Global Exception Handling and Stability

1.  **Long-Term Monitoring:**
    Allow the container to run under its typical workload for an extended period (e.g., 24-72 hours, or a duration that previously reliably resulted in crashes).

2.  **Check for Unexpected Errors in Logs:**
    Periodically review the logs (`docker-compose logs`) for any messages logged by the global exception handler. If such messages appear, it means an unexpected error occurred.
    *   **Verify:** The critical verification here is that even if the global handler logs an error, the container *did not crash* and continued operating. Check `docker ps` to confirm the container's uptime is still increasing.

3.  **Confirm Absence of Crashes:**
    The ultimate verification is that the container no longer crashes spontaneously. Check the container's uptime using `docker ps`. If the container has been running continuously for the monitoring period without restarts, it indicates the stability improvements are effective.

## Step 5: Troubleshooting

If the container continues to crash or exhibits the same timeout issues:

1.  **Collect Detailed Logs:**
    Immediately after a crash/restart, collect a larger portion of the logs preceding the event.
    ```bash
    docker-compose logs --tail 1000 > mcp_server_crash_$(date +%Y%m%d_%H%M%S).log
    ```
    *This saves the last 1000 lines to a timestamped file.*

2.  **Check Synology System Logs:**
    Review the Synology NAS system logs via the 'Log Center' application in the DSM web interface. Look for any system-level errors (e.g., out-of-memory events, disk issues, kernel panics) that coincide with the container crashes.

3.  **Review Docker & Compose Configuration:**
    Double-check `docker-compose.yml` for typos or incorrect values in memory/CPU limits, ports, volumes, or environment variables. Verify the `Dockerfile` and ensure the `docker-compose build` command completed without errors.

4.  **Analyze Error Messages:**
    Carefully examine the exact error messages from the container logs (`mcp_server_crash_...log`). Identify the last few messages before the crash. These often provide the best clues to the root cause.

5.  **Isolate the Trigger:**
    If crashes seem linked to specific actions or times, try to reproduce the issue consistently while monitoring logs closely to pinpoint the exact trigger.

6.  **Resource Constraints:**
    Even with increased limits, consider if the Synology NAS itself is fundamentally under-resourced for the workload. Monitor overall system resource usage (CPU, RAM, Disk I/O) on the NAS during peak operation.

## Conclusion

Following these steps provides a structured approach to verifying the effectiveness of the fixes for the MCP server timeouts and container crashes on your Synology NAS. Consistent stability over the monitoring period, coupled with successful handling of simulated timeouts and logged exceptions (without crashes), indicates the problem is resolved. If issues persist, the troubleshooting steps and collected logs will be crucial for further diagnosis.
